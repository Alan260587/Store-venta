import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PdfDocument, Product } from '../types';

export interface PreviewPageSlide {
  pageNumber: number;
  heading: string;
  subheading: string;
  badge: string;
  highlights: Array<{
    code: string;
    name: string;
    detail: string;
    price: string;
  }>;
  footerNote: string;
}

/**
 * Builds 8 rich preview pages for any Sheló NABEL PDF document so the 8-page preview
 * is always visible, informative, and aligned with the Product Catalog.
 */
export function buildEightPreviewPagesData(
  pdfDocInfo: PdfDocument,
  products: Product[]
): PreviewPageSlide[] {
  const safeProducts = products && products.length > 0 ? products : [];

  const getByCategory = (cat: string, fallbackSliceStart: number) => {
    const matched = safeProducts.filter(
      (p) => p.category.toLowerCase() === cat.toLowerCase()
    );
    const source = matched.length > 0 ? matched : safeProducts.slice(fallbackSliceStart, fallbackSliceStart + 4);
    return source.slice(0, 4).map((p) => ({
      code: p.clave,
      name: p.name,
      detail: `${p.size} • ${p.category}`,
      price: `$${p.price} MXN`
    }));
  };

  const starItems = safeProducts
    .filter((p) => p.isStarProduct)
    .slice(0, 4)
    .map((p) => ({
      code: p.clave,
      name: p.name,
      detail: `${p.size} • Producto Estrella`,
      price: `$${p.price} MXN`
    }));

  return [
    {
      pageNumber: 1,
      heading: pdfDocInfo.title,
      subheading: 'Portada Oficial Sheló NABEL • Jhosie Girón — "Salud al alcance de todos"',
      badge: `${pdfDocInfo.category || 'Catálogo Oficial'} • Pág. 1 de 8`,
      highlights:
        starItems.length > 0
          ? starItems
          : [
              {
                code: 'SN-2026',
                name: 'Catálogo General Sheló NABEL',
                detail: 'Nutrición, Belleza, Salud, Bienestar y Calidad de Vida',
                price: Number(pdfDocInfo.price) === 0 ? 'GRATIS ($0)' : '$20 MXN'
              }
            ],
      footerNote: 'Página 1 de 8 • Vista Previa Oficial • Pedidos WhatsApp: 6621395110'
    },
    {
      pageNumber: 2,
      heading: 'Salud y Bienestar • Nutrición Integral',
      subheading: 'Suplementos, extractos herbales, colágeno hidrolizado y adaptógenos naturales',
      badge: 'Salud y Bienestar • Pág. 2 de 8',
      highlights: getByCategory('Salud y Bienestar', 0),
      footerNote: 'Página 2 de 8 • Línea Nutrición y Salud • Sheló NABEL Jhosie Girón'
    },
    {
      pageNumber: 3,
      heading: 'Cuidado Facial • Belleza Natural',
      subheading: 'Regeneración celular, hidratación profunda, sueros concentrados y antioxidantes',
      badge: 'Cuidado Facial • Pág. 3 de 8',
      highlights: getByCategory('Cuidado Facial', 4),
      footerNote: 'Página 3 de 8 • Cuidado de la Piel • Sheló NABEL Jhosie Girón'
    },
    {
      pageNumber: 4,
      heading: 'Cuidado Capilar • Fuerza y Crecimiento',
      subheading: 'Shampoos botánicos, tónicos capilares con bergamota, cola de caballo y cebolla',
      badge: 'Cuidado Capilar • Pág. 4 de 8',
      highlights: getByCategory('Cuidado Capilar', 8),
      footerNote: 'Página 4 de 8 • Salud Capilar • Sheló NABEL Jhosie Girón'
    },
    {
      pageNumber: 5,
      heading: 'Cuidado Corporal • Confort y Descanso',
      subheading: 'Geles minerales criogénicos, cremas nutritivas de leche de burra y phyto-terapia',
      badge: 'Cuidado Corporal • Pág. 5 de 8',
      highlights: getByCategory('Cuidado Corporal', 12),
      footerNote: 'Página 5 de 8 • Bienestar Corporal • Sheló NABEL Jhosie Girón'
    },
    {
      pageNumber: 6,
      heading: 'Cosméticos, Aromas y Línea Infantil',
      subheading: 'Maquillaje multiusos enriquecido con vitamina E y nutrición infantil Vita Niños',
      badge: 'Cosméticos e Infantil • Pág. 6 de 8',
      highlights: [
        ...getByCategory('Cosméticos y Aromas', 15).slice(0, 2),
        ...getByCategory('Línea Infantil', 17).slice(0, 2)
      ],
      footerNote: 'Página 6 de 8 • Cosmética Natural y Niños • Sheló NABEL'
    },
    {
      pageNumber: 7,
      heading: 'Escolar y Accesorios • Artículos Especiales',
      subheading: 'Folders escolares en 4 colores, tijeras de acero inoxidable y crayones Crayola',
      badge: 'Escolar y Accesorios • Pág. 7 de 8',
      highlights: getByCategory('Escolar y Accesorios', 18),
      footerNote: 'Página 7 de 8 • Artículos Escolares y Accesorios • Sheló NABEL'
    },
    {
      pageNumber: 8,
      heading: 'Resumen y Pedidos Directos con Jhosie Girón',
      subheading: 'Atención personalizada en toda la República • Nutrición, Belleza y Salud',
      badge: 'Contacto y Pedidos • Pág. 8 de 8',
      highlights: [
        {
          code: 'WA-DIRECTO',
          name: 'Atención por WhatsApp Jhosie Girón',
          detail: 'Solicita tus productos o claves de descarga al instante',
          price: '6621395110'
        },
        {
          code: 'MOD-PDF',
          name: pdfDocInfo.title,
          detail: `${pdfDocInfo.pagesCount} páginas totales registradas en el documento`,
          price: Number(pdfDocInfo.price) === 0 ? 'GRATIS ($0)' : '$20 MXN'
        },
        {
          code: 'SYNC-CLOUD',
          name: 'Sincronización Multidispositivo Activa',
          detail: 'Disponible en Laptop, Celular Android, iOS y Tablet',
          price: 'En Línea'
        }
      ],
      footerNote: 'Página 8 de 8 • Fin de la Vista Previa de 8 Páginas • WhatsApp 6621395110'
    }
  ];
}

function sanitizeAscii(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');
}

/**
 * Generates a real 8-page downloadable & previewable PDF file with the official Sheló NABEL logo
 */
export async function generateDownloadablePdf(
  pdfDocInfo: PdfDocument,
  products: Product[]
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Try to embed the official Sheló NABEL logo JPEG
  let logoImage: Awaited<ReturnType<typeof pdfDoc.embedJpg>> | null = null;
  try {
    const logoRes = await fetch(`${import.meta.env.BASE_URL}assets/aistudio/shelon_logo_182b5079.jpeg`);
    if (logoRes.ok) {
      const logoBytes = await logoRes.arrayBuffer();
      logoImage = await pdfDoc.embedJpg(logoBytes);
    }
  } catch {
    // Continue without image if fetch fails offline
  }

  const slides = buildEightPreviewPagesData(pdfDocInfo, products);

  for (const slide of slides) {
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    // Header Banner (Deep Royal Blue + Gold Accent)
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

    page.drawText('SHELO NABEL - JHOSIE GIRON (6621395110)', {
      x: textStartX,
      y: height - 42,
      size: 16,
      font: fontBold,
      color: rgb(0.98, 0.85, 0.35)
    });

    page.drawText(sanitizeAscii(slide.heading).slice(0, 62), {
      x: textStartX,
      y: height - 66,
      size: 13,
      font: fontBold,
      color: rgb(1, 1, 1)
    });

    page.drawText(sanitizeAscii(slide.subheading).slice(0, 82), {
      x: textStartX,
      y: height - 85,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.85, 0.93, 1)
    });

    page.drawText(
      `Pagina ${slide.pageNumber} de 8 (Vista Previa / Catalogo) | Total documento: ${pdfDocInfo.pagesCount} pags`,
      {
        x: textStartX,
        y: height - 102,
        size: 8.5,
        font: fontBold,
        color: rgb(0.4, 0.92, 0.68)
      }
    );

    // Section Title Box
    let yPos = height - 155;
    page.drawRectangle({
      x: 36,
      y: yPos - 8,
      width: width - 72,
      height: 28,
      color: rgb(0.98, 0.95, 0.84)
    });

    page.drawText(sanitizeAscii(`${slide.badge} — SALUD AL ALCANCE DE TODOS`), {
      x: 48,
      y: yPos + 2,
      size: 11,
      font: fontBold,
      color: rgb(0.08, 0.18, 0.38)
    });

    yPos -= 42;

    // Draw Highlight Cards
    for (const item of slide.highlights) {
      if (yPos < 110) break;

      page.drawRectangle({
        x: 36,
        y: yPos - 48,
        width: width - 72,
        height: 62,
        color: rgb(0.97, 0.98, 0.99),
        borderColor: rgb(0.86, 0.78, 0.52),
        borderWidth: 1
      });

      page.drawText(sanitizeAscii(`[${item.code}] ${item.name}`).slice(0, 65), {
        x: 48,
        y: yPos - 10,
        size: 11.5,
        font: fontBold,
        color: rgb(0.06, 0.16, 0.34)
      });

      page.drawText(sanitizeAscii(item.detail).slice(0, 85), {
        x: 48,
        y: yPos - 28,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.3, 0.35, 0.4)
      });

      page.drawText(sanitizeAscii(item.price), {
        x: width - 145,
        y: yPos - 18,
        size: 12,
        font: fontBold,
        color: rgb(0.02, 0.48, 0.32)
      });

      yPos -= 76;
    }

    // Additional catalog summary rows on each page so every page looks rich and complete
    if (yPos > 140 && products.length > 0) {
      page.drawText('MAS ARTICULOS DEL CATALOGO SHELO NABEL:', {
        x: 40,
        y: yPos - 6,
        size: 10,
        font: fontBold,
        color: rgb(0.08, 0.18, 0.38)
      });
      yPos -= 24;

      const startIdx = ((slide.pageNumber - 1) * 3) % Math.max(1, products.length);
      for (let i = 0; i < 6; i++) {
        if (yPos < 75) break;
        const prod = products[(startIdx + i) % products.length];
        if (!prod) continue;
        const line = `• [${sanitizeAscii(prod.clave)}] ${sanitizeAscii(prod.name)} (${sanitizeAscii(prod.size)}) - $${prod.price} MXN`;
        page.drawText(line.slice(0, 92), {
          x: 44,
          y: yPos,
          size: 9,
          font: fontRegular,
          color: rgb(0.22, 0.25, 0.3)
        });
        yPos -= 18;
      }
    }

    // Footer
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: 44,
      color: rgb(0.06, 0.14, 0.32)
    });

    page.drawText(sanitizeAscii(slide.footerNote), {
      x: 40,
      y: 17,
      size: 9.5,
      font: fontBold,
      color: rgb(0.98, 0.85, 0.35)
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

/**
 * Extracts up to the first 8 pages of an uploaded PDF Blob for the 8-page preview,
 * or generates an 8-page Sheló NABEL PDF if no custom binary was uploaded.
 */
export async function buildEightPagePreviewBlob(
  uploadedBlob: Blob | null,
  pdfDocInfo: PdfDocument,
  products: Product[]
): Promise<{ previewBlob: Blob; fullBlob: Blob; previewPagesCount: number }> {
  if (uploadedBlob && uploadedBlob.size > 0) {
    try {
      const arrayBuffer = await uploadedBlob.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();
      const pagesToTake = Math.min(8, Math.max(1, totalPages));

      if (totalPages <= 8) {
        return {
          previewBlob: uploadedBlob,
          fullBlob: uploadedBlob,
          previewPagesCount: totalPages
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
        fullBlob: uploadedBlob,
        previewPagesCount: pagesToTake
      };
    } catch {
      // If the uploaded PDF uses a stream format that pdf-lib cannot slice, use the blob directly
      return {
        previewBlob: uploadedBlob,
        fullBlob: uploadedBlob,
        previewPagesCount: Math.min(8, pdfDocInfo.pagesCount || 8)
      };
    }
  }

  const generated8PageBlob = await generateDownloadablePdf(pdfDocInfo, products);
  return {
    previewBlob: generated8PageBlob,
    fullBlob: generated8PageBlob,
    previewPagesCount: 8
  };
}
