import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PdfDocument, Product } from '../types';
import {
  OFFICIAL_CATALOG_ID,
  OFFICIAL_CATALOG_PREVIEW5_URL,
  OFFICIAL_CATALOG_PART_URLS,
  OFFICIAL_CATALOG_TOTAL_PARTS
} from '../data/initialPdfs';

// Configure PDF.js worker using local bundled Vite asset URL
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export const PREVIEW_PAGES_LIMIT = 5;

let cachedOfficialFullBlob: Blob | null = null;
let cachedOfficialPdfJsDoc: pdfjsLib.PDFDocumentProxy | null = null;

/**
 * Strictly verifies that an ArrayBuffer starts with the '%PDF-' magic header (0x25 0x50 0x44 0x46 0x2D)
 * so an HTML security-cookie warning page can NEVER be saved or rendered as a PDF.
 */
export function isValidPdfHeader(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 8) return false;
  const bytes = new Uint8Array(buffer, 0, 5);
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d    // -
  );
}

/**
 * Fetches a single 8 MB binary part of the Official 2026 Catalog inside the browser's
 * authenticated fetch() session (with credentials: 'include'), trying both the static
 * asset part URL and the backend /api/pdf-part endpoint.
 */
async function fetchOfficialCatalogPart(partIndex: number): Promise<ArrayBuffer> {
  const urlsToTry = [
    OFFICIAL_CATALOG_PART_URLS[partIndex],
    `/api/pdf-part/${OFFICIAL_CATALOG_ID}/${partIndex}`
  ];

  for (const url of urlsToTry) {
    if (!url) continue;
    try {
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });
      if (!res.ok) continue;
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html')) {
        continue;
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength === 0) continue;
      if (partIndex === 0 && !isValidPdfHeader(buf)) {
        continue;
      }
      return buf;
    } catch {
      // try next URL
    }
  }
  throw new Error(`No se pudo descargar la parte ${partIndex + 1} del catálogo.`);
}

/**
 * Assembles the exact 47,577,479-byte (148-page) Catalogo_Shelo_NABEL2026_fd41deed.pdf
 * in memory as a verified PDF Blob using authenticated 8 MB chunk fetches.
 * Because the final download uses URL.createObjectURL(blob) (a blob: URL in RAM),
 * Android/iOS browsers save the real PDF directly from memory and NEVER trigger the
 * OS DownloadManager cookie-warning HTML page!
 */
export async function fetchOfficialCatalogFullBlob(
  onProgress?: (percent: number) => void
): Promise<Blob> {
  if (cachedOfficialFullBlob && cachedOfficialFullBlob.size > 40_000_000) {
    onProgress?.(100);
    return cachedOfficialFullBlob;
  }

  const parts: ArrayBuffer[] = new Array(OFFICIAL_CATALOG_TOTAL_PARTS);
  let completed = 0;
  onProgress?.(5);

  // Download parts in 2 parallel batches of 3 for fast mobile & desktop assembly
  const indices = Array.from({ length: OFFICIAL_CATALOG_TOTAL_PARTS }, (_, i) => i);
  const batchSize = 3;
  for (let start = 0; start < indices.length; start += batchSize) {
    const batch = indices.slice(start, start + batchSize);
    await Promise.all(
      batch.map(async (idx) => {
        const buf = await fetchOfficialCatalogPart(idx);
        parts[idx] = buf;
        completed += 1;
        const pct = Math.min(99, Math.round((completed / OFFICIAL_CATALOG_TOTAL_PARTS) * 100));
        onProgress?.(pct);
      })
    );
  }

  if (!parts[0] || !isValidPdfHeader(parts[0])) {
    throw new Error('El archivo descargado no tiene un encabezado PDF válido.');
  }

  const fullBlob = new Blob(parts, { type: 'application/pdf' });
  cachedOfficialFullBlob = fullBlob;
  onProgress?.(100);
  return fullBlob;
}

/**
 * Renders any specific page (1..148) of a full PDF Blob to a high-resolution PNG data URL
 * so mobile and desktop users can flip through all 148 pages of the catalog directly on screen.
 */
export async function renderSingleCatalogPageFromBlob(
  fullBlob: Blob,
  pageNumber: number
): Promise<{ imageDataUrl: string; totalPages: number } | null> {
  try {
    let pdfDoc = cachedOfficialPdfJsDoc;
    if (!pdfDoc || fullBlob !== cachedOfficialFullBlob) {
      const arrayBuf = await fullBlob.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuf)
      });
      pdfDoc = await loadingTask.promise;
      if (fullBlob === cachedOfficialFullBlob) {
        cachedOfficialPdfJsDoc = pdfDoc;
      }
    }
    const totalPages = pdfDoc.numPages || 148;
    const safePage = Math.max(1, Math.min(totalPages, pageNumber));
    const page = await pdfDoc.getPage(safePage);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    if (!context) return null;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvasContext: context,
      canvas,
      viewport
    }).promise;
    return {
      imageDataUrl: canvas.toDataURL('image/png'),
      totalPages
    };
  } catch (err) {
    console.warn('Error rendering catalog page:', err);
    return null;
  }
}

export interface RenderedPdfPage {
  pageNumber: number;
  totalPreviewPages: number;
  totalDocumentPages: number;
  imageDataUrl?: string;
  singlePageBlob?: Blob;
}

function sanitizeAscii(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');
}

/**
 * Fallback 5-page catalog generator ONLY used if a catalog entry was created without a binary file.
 */
export async function generateDownloadablePdf(
  pdfDocInfo: PdfDocument,
  _products?: Product[]
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let logoImage: Awaited<ReturnType<typeof pdfDoc.embedJpg>> | null = null;
  try {
    const logoRes = await fetch(`${import.meta.env.BASE_URL}assets/aistudio/shelon_logo_182b5079.jpeg`);
    if (logoRes.ok) {
      const logoBytes = await logoRes.arrayBuffer();
      logoImage = await pdfDoc.embedJpg(logoBytes);
    }
  } catch {
    // ignore
  }

  const totalPreview = Math.min(PREVIEW_PAGES_LIMIT, Math.max(1, Number(pdfDocInfo.pagesCount) || PREVIEW_PAGES_LIMIT));

  for (let pageNum = 1; pageNum <= totalPreview; pageNum++) {
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();

    page.drawRectangle({
      x: 0,
      y: height - 115,
      width,
      height: 115,
      color: rgb(0.06, 0.14, 0.32)
    });

    page.drawRectangle({
      x: 0,
      y: height - 120,
      width,
      height: 5,
      color: rgb(0.92, 0.72, 0.18)
    });

    let textStartX = 40;
    if (logoImage) {
      page.drawImage(logoImage, {
        x: 36,
        y: height - 102,
        width: 78,
        height: 78
      });
      textStartX = 128;
    }

    page.drawText(sanitizeAscii(pdfDocInfo.title).slice(0, 58), {
      x: textStartX,
      y: height - 48,
      size: 15,
      font: fontBold,
      color: rgb(0.98, 0.85, 0.35)
    });

    page.drawText(
      sanitizeAscii(`Catalogo Oficial Gratis | Pagina ${pageNum} de ${totalPreview}`),
      {
        x: textStartX,
        y: height - 74,
        size: 11,
        font: fontBold,
        color: rgb(1, 1, 1)
      }
    );

    page.drawText(
      `Total del catalogo: ${pdfDocInfo.pagesCount || totalPreview} paginas (Descarga Gratis)`,
      {
        x: textStartX,
        y: height - 96,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.85, 0.93, 1)
      }
    );

    page.drawRectangle({
      x: 40,
      y: 120,
      width: width - 80,
      height: height - 280,
      color: rgb(0.98, 0.99, 1),
      borderColor: rgb(0.85, 0.78, 0.55),
      borderWidth: 1.5
    });

    page.drawText(sanitizeAscii(`CATALOGO: ${pdfDocInfo.title}`).slice(0, 65), {
      x: 64,
      y: height - 200,
      size: 14,
      font: fontBold,
      color: rgb(0.06, 0.14, 0.32)
    });

    page.drawText(sanitizeAscii(`Pagina ${pageNum} de ${totalPreview} (Vista Previa de 5 Paginas)`), {
      x: 64,
      y: height - 230,
      size: 11,
      font: fontBold,
      color: rgb(0.04, 0.45, 0.32)
    });

    const descText = sanitizeAscii(
      pdfDocInfo.description || `Catalogo Oficial Shelo NABEL - ${pdfDocInfo.title}.`
    );
    page.drawText(descText.slice(0, 80), {
      x: 64,
      y: height - 270,
      size: 10.5,
      font: fontRegular,
      color: rgb(0.25, 0.3, 0.36)
    });

    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: 44,
      color: rgb(0.06, 0.14, 0.32)
    });

    page.drawText(
      sanitizeAscii(`${pdfDocInfo.title} - Pagina ${pageNum} de ${totalPreview} (Descarga Gratis)`),
      {
        x: 40,
        y: 17,
        size: 9.5,
        font: fontBold,
        color: rgb(0.98, 0.85, 0.35)
      }
    );
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

/**
 * Renders the REAL first 5 pages (or fewer if the catalog has < 5 pages) of the uploaded catalog
 * into high-resolution page images + single-page blobs so the 5-page preview shows
 * the exact pages of the uploaded catalog.
 */
export async function renderFirstFivePdfPages(
  sourceBlob: Blob,
  fallbackPagesCount = PREVIEW_PAGES_LIMIT
): Promise<RenderedPdfPage[]> {
  const arrayBuffer = await sourceBlob.arrayBuffer();
  const singlePageBlobs: Map<number, Blob> = new Map();
  let totalDocumentPages = fallbackPagesCount;
  let pagesToTake = Math.min(PREVIEW_PAGES_LIMIT, Math.max(1, fallbackPagesCount));

  // Step 1: Slice individual 1..5 pages with pdf-lib as exact page blobs
  try {
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    totalDocumentPages = srcDoc.getPageCount();
    pagesToTake = Math.min(PREVIEW_PAGES_LIMIT, Math.max(1, totalDocumentPages));

    for (let i = 0; i < pagesToTake; i++) {
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
      singleDoc.addPage(copiedPage);
      const singleBytes = await singleDoc.save();
      singlePageBlobs.set(
        i + 1,
        new Blob([singleBytes as unknown as BlobPart], { type: 'application/pdf' })
      );
    }
  } catch (e) {
    console.warn('Notice slicing single catalog pages with pdf-lib:', e);
  }

  // Step 2: Render each of the 1..5 real catalog pages onto a high-resolution Canvas with PDF.js
  const renderedPages: RenderedPdfPage[] = [];
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer.slice(0))
    });
    const pdfDocument = await loadingTask.promise;
    totalDocumentPages = pdfDocument.numPages || totalDocumentPages;
    pagesToTake = Math.min(PREVIEW_PAGES_LIMIT, Math.max(1, totalDocumentPages));

    for (let pageNum = 1; pageNum <= pagesToTake; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        if (context) {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({
            canvasContext: context,
            canvas,
            viewport
          }).promise;
          const imageDataUrl = canvas.toDataURL('image/png');
          renderedPages.push({
            pageNumber: pageNum,
            totalPreviewPages: pagesToTake,
            totalDocumentPages,
            imageDataUrl,
            singlePageBlob: singlePageBlobs.get(pageNum)
          });
        } else {
          renderedPages.push({
            pageNumber: pageNum,
            totalPreviewPages: pagesToTake,
            totalDocumentPages,
            singlePageBlob: singlePageBlobs.get(pageNum)
          });
        }
      } catch (pageErr) {
        console.warn(`Could not rasterize page ${pageNum}:`, pageErr);
        renderedPages.push({
          pageNumber: pageNum,
          totalPreviewPages: pagesToTake,
          totalDocumentPages,
          singlePageBlob: singlePageBlobs.get(pageNum)
        });
      }
    }
    return renderedPages;
  } catch (err) {
    console.warn('PDF.js rasterization fallback to single-page blobs:', err);
  }

  // Fallback if PDF.js worker failed: return the 1..5 single-page blobs
  for (let pageNum = 1; pageNum <= pagesToTake; pageNum++) {
    renderedPages.push({
      pageNumber: pageNum,
      totalPreviewPages: pagesToTake,
      totalDocumentPages,
      singlePageBlob: singlePageBlobs.get(pageNum) || sourceBlob
    });
  }
  return renderedPages;
}

/**
 * Extracts up to the first 5 pages of an uploaded Catalog Blob for the 5-page preview,
 * and returns the rendered 5 real pages + full downloadable blob.
 */
export async function buildFivePagePreviewBlob(
  uploadedBlob: Blob | null,
  pdfDocInfo: PdfDocument,
  products: Product[]
): Promise<{
  previewBlob: Blob;
  fullBlob: Blob;
  previewPagesCount: number;
  renderedPages: RenderedPdfPage[];
}> {
  // Fast-path for the 45.4 MB Official Catalog (148 pages): use the pre-extracted 5-page preview asset (849 KB)
  if ((!uploadedBlob || uploadedBlob.size === 0) && pdfDocInfo.id === OFFICIAL_CATALOG_ID) {
    try {
      const previewRes = await fetch(OFFICIAL_CATALOG_PREVIEW5_URL);
      if (previewRes.ok) {
        const previewBlob = await previewRes.blob();
        if (previewBlob.size > 0) {
          const renderedPages = await renderFirstFivePdfPages(
            previewBlob,
            pdfDocInfo.pagesCount || 148
          );
          const patchedPages = renderedPages.map((p) => ({
            ...p,
            totalDocumentPages: pdfDocInfo.pagesCount || 148
          }));
          return {
            previewBlob,
            fullBlob: previewBlob,
            previewPagesCount: patchedPages.length || PREVIEW_PAGES_LIMIT,
            renderedPages: patchedPages
          };
        }
      }
    } catch (err) {
      console.warn('Fallback loading official 5-page preview:', err);
    }
  }

  const activeSourceBlob =
    uploadedBlob && uploadedBlob.size > 0
      ? uploadedBlob
      : await generateDownloadablePdf(pdfDocInfo, products);

  const renderedPages = await renderFirstFivePdfPages(
    activeSourceBlob,
    pdfDocInfo.pagesCount || PREVIEW_PAGES_LIMIT
  );

  try {
    const arrayBuffer = await activeSourceBlob.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    const pagesToTake = Math.min(PREVIEW_PAGES_LIMIT, Math.max(1, totalPages));

    if (totalPages <= PREVIEW_PAGES_LIMIT) {
      return {
        previewBlob: activeSourceBlob,
        fullBlob: activeSourceBlob,
        previewPagesCount: totalPages,
        renderedPages
      };
    }

    const previewDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: pagesToTake }, (_, i) => i);
    const copiedPages = await previewDoc.copyPages(srcDoc, pageIndices);
    for (const p of copiedPages) {
      previewDoc.addPage(p);
    }
    const previewBytes = await previewDoc.save();
    const previewBlob = new Blob([previewBytes as unknown as BlobPart], {
      type: 'application/pdf'
    });

    return {
      previewBlob,
      fullBlob: activeSourceBlob,
      previewPagesCount: pagesToTake,
      renderedPages
    };
  } catch {
    return {
      previewBlob: activeSourceBlob,
      fullBlob: activeSourceBlob,
      previewPagesCount: renderedPages.length || Math.min(PREVIEW_PAGES_LIMIT, pdfDocInfo.pagesCount || PREVIEW_PAGES_LIMIT),
      renderedPages
    };
  }
}

export const buildEightPagePreviewBlob = buildFivePagePreviewBlob;
