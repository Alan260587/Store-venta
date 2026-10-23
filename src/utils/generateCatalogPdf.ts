import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PdfDocument, Product } from '../types';

// Configure PDF.js worker using local bundled Vite asset URL
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
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
 * Fallback 8-page PDF generator ONLY used if a PDF entry was created manually without a binary file.
 * Uses strictly the PDF's own title, category, and description (never unrelated store products).
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

  const totalPreview = Math.min(8, Math.max(1, Number(pdfDocInfo.pagesCount) || 8));

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
      sanitizeAscii(`${pdfDocInfo.category || 'Documento PDF'} | Pagina ${pageNum} de ${totalPreview}`),
      {
        x: textStartX,
        y: height - 74,
        size: 11,
        font: fontBold,
        color: rgb(1, 1, 1)
      }
    );

    page.drawText(
      `Total del documento: ${pdfDocInfo.pagesCount || totalPreview} paginas`,
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

    page.drawText(sanitizeAscii(`DOCUMENTO: ${pdfDocInfo.title}`).slice(0, 65), {
      x: 64,
      y: height - 200,
      size: 14,
      font: fontBold,
      color: rgb(0.06, 0.14, 0.32)
    });

    page.drawText(sanitizeAscii(`Pagina ${pageNum} de ${totalPreview} (Vista Previa)`), {
      x: 64,
      y: height - 230,
      size: 11,
      font: fontBold,
      color: rgb(0.04, 0.45, 0.32)
    });

    const descText = sanitizeAscii(
      pdfDocInfo.description || `Contenido de ${pdfDocInfo.title}.`
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
      sanitizeAscii(`${pdfDocInfo.title} - Pagina ${pageNum} de ${totalPreview}`),
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
 * Renders the REAL first 8 pages (or fewer if the PDF has < 8 pages) of the uploaded PDF
 * into high-resolution page images + single-page PDF blobs so the 8-page preview shows
 * the exact pages of the uploaded PDF document.
 */
export async function renderFirstEightPdfPages(
  sourceBlob: Blob,
  fallbackPagesCount = 8
): Promise<RenderedPdfPage[]> {
  const arrayBuffer = await sourceBlob.arrayBuffer();
  const singlePageBlobs: Map<number, Blob> = new Map();
  let totalDocumentPages = fallbackPagesCount;
  let pagesToTake = Math.min(8, Math.max(1, fallbackPagesCount));

  // Step 1: Slice individual 1..8 pages with pdf-lib as exact PDF page blobs
  try {
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    totalDocumentPages = srcDoc.getPageCount();
    pagesToTake = Math.min(8, Math.max(1, totalDocumentPages));

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
    console.warn('Notice slicing single PDF pages with pdf-lib:', e);
  }

  // Step 2: Render each of the 1..8 real PDF pages onto a high-resolution Canvas with PDF.js
  const renderedPages: RenderedPdfPage[] = [];
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer.slice(0))
    });
    const pdfDocument = await loadingTask.promise;
    totalDocumentPages = pdfDocument.numPages || totalDocumentPages;
    pagesToTake = Math.min(8, Math.max(1, totalDocumentPages));

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
    console.warn('PDF.js rasterization fallback to single-page PDF blobs:', err);
  }

  // Fallback if PDF.js worker failed: return the 1..8 single-page PDF blobs
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
 * Extracts up to the first 8 pages of an uploaded PDF Blob for the 8-page preview,
 * and returns the rendered 8 real pages of the uploaded PDF.
 */
export async function buildEightPagePreviewBlob(
  uploadedBlob: Blob | null,
  pdfDocInfo: PdfDocument,
  products: Product[]
): Promise<{
  previewBlob: Blob;
  fullBlob: Blob;
  previewPagesCount: number;
  renderedPages: RenderedPdfPage[];
}> {
  const activeSourceBlob =
    uploadedBlob && uploadedBlob.size > 0
      ? uploadedBlob
      : await generateDownloadablePdf(pdfDocInfo, products);

  const renderedPages = await renderFirstEightPdfPages(
    activeSourceBlob,
    pdfDocInfo.pagesCount || 8
  );

  try {
    const arrayBuffer = await activeSourceBlob.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    const pagesToTake = Math.min(8, Math.max(1, totalPages));

    if (totalPages <= 8) {
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
      previewPagesCount: renderedPages.length || Math.min(8, pdfDocInfo.pagesCount || 8),
      renderedPages
    };
  }
}
