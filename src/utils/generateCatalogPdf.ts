import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PdfDocument, Product } from '../types';

/**
 * Generates a real downloadable PDF file for free catalog items that don't have a custom uploaded Blob
 */
export async function generateDownloadablePdf(pdfDocInfo: PdfDocument, products: Product[]): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { height } = page.getSize();

  // Header Banner
  page.drawRectangle({
    x: 0,
    y: height - 110,
    width: 612,
    height: 110,
    color: rgb(0.02, 0.47, 0.34)
  });

  page.drawText('SHELO NABEL - CATALOGO OFICIAL', {
    x: 40,
    y: height - 50,
    size: 22,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  page.drawText(pdfDocInfo.title.replace(/[^\x00-\x7F]/g, 'o'), {
    x: 40,
    y: height - 78,
    size: 13,
    font: fontRegular,
    color: rgb(0.85, 0.98, 0.92)
  });

  page.drawText(`Paginas registradas: ${pdfDocInfo.pagesCount} | Pedidos WhatsApp: +52 662 139 5110`, {
    x: 40,
    y: height - 96,
    size: 10,
    font: fontRegular,
    color: rgb(0.95, 0.85, 0.4)
  });

  let yPos = height - 145;
  page.drawText('LISTADO DE ARTICULOS DESTACADOS DEL CATALOGO (PRECIOS MXN):', {
    x: 40,
    y: yPos,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.15)
  });

  yPos -= 25;

  const displayProducts = products.slice(0, 22);
  for (const prod of displayProducts) {
    if (yPos < 60) break;
    const cleanName = prod.name.replace(/[^\x00-\x7F]/g, '');
    const line = `[Clave: ${prod.clave}] ${cleanName} (${prod.size}) — $${prod.price} MXN`;
    page.drawText(line, {
      x: 45,
      y: yPos,
      size: 10,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2)
    });
    yPos -= 22;
  }

  page.drawText('Para solicitar productos o recibir atencion personalizada, envia WhatsApp al +52 662 139 5110', {
    x: 40,
    y: 35,
    size: 9,
    font: fontBold,
    color: rgb(0.02, 0.47, 0.34)
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}
