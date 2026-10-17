import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Generates the official downloadable Administrator Manual PDF ("Instructivo de Uso y Funcionamiento")
 * detailing:
 * 1. How the app works step by step
 * 2. What the Administrator sees (Vista Administrador)
 * 3. What the Client sees (Vista Cliente)
 * 4. What arrives to the Administrator and to the Client (Mensajes de WhatsApp y Claves de Descarga)
 */
export async function generateAdminManualPdf(): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ==================== PAGE 1: COMO FUNCIONA & VISTAS (ADMIN VS CLIENTE) ====================
  const page1 = pdfDoc.addPage([612, 792]);
  const { height } = page1.getSize();

  // Header Banner Page 1
  page1.drawRectangle({
    x: 0,
    y: height - 95,
    width: 612,
    height: 95,
    color: rgb(0.02, 0.45, 0.32)
  });

  page1.drawText('INSTRUCTIVO OFICIAL DE USO - APP SHELO NABEL', {
    x: 35,
    y: height - 42,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  page1.drawText('Guia completa: Como funciona la App, Vista Administrador, Vista Cliente y Mensajes', {
    x: 35,
    y: height - 64,
    size: 10.5,
    font: fontRegular,
    color: rgb(0.88, 0.98, 0.92)
  });

  page1.drawText('Exclusivo para el Administrador | WhatsApp Oficial: +52 662 139 5110', {
    x: 35,
    y: height - 82,
    size: 9.5,
    font: fontBold,
    color: rgb(0.98, 0.85, 0.35)
  });

  let y = height - 125;

  const drawSectionHeader = (page: any, title: string, yPos: number, bgColor = rgb(0.92, 0.97, 0.94), textColor = rgb(0.04, 0.38, 0.26)) => {
    page.drawRectangle({
      x: 35,
      y: yPos - 6,
      width: 542,
      height: 24,
      color: bgColor
    });
    page.drawText(title, {
      x: 44,
      y: yPos + 2,
      size: 11,
      font: fontBold,
      color: textColor
    });
    return yPos - 24;
  };

  const drawBullet = (page: any, boldPrefix: string, text: string, yPos: number) => {
    page.drawText(`• ${boldPrefix}`, {
      x: 42,
      y: yPos,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.2)
    });
    const prefixWidth = fontBold.widthOfTextAtSize(`• ${boldPrefix} `, 9.5);
    page.drawText(text, {
      x: 42 + prefixWidth,
      y: yPos,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.22, 0.26, 0.32)
    });
    return yPos - 16;
  };

  const drawParagraph = (page: any, text: string, yPos: number, indent = 42, isBold = false, color = rgb(0.2, 0.24, 0.3)) => {
    page.drawText(text, {
      x: indent,
      y: yPos,
      size: 9.5,
      font: isBold ? fontBold : fontRegular,
      color
    });
    return yPos - 14.5;
  };

  // SECTION 1: COMO SE USA Y FUNCIONA LA APP
  y = drawSectionHeader(page1, '1. COMO SE USA Y FUNCIONA LA APLICACION WEB', y);
  y = drawBullet(page1, 'Catalogo de Productos:', 'Muestra todos los articulos Shelo NABEL y utiles escolares.', y);
  y = drawBullet(page1, 'Seleccion de Colores y Cantidad:', 'En Folders Escolares ($25) el cliente elige color (Morado, Amarillo, Naranja o Azul).', y);
  y = drawBullet(page1, 'Carrito de Compras:', 'Suma automaticamente los subtotales y envia el pedido directo a WhatsApp.', y);
  y = drawBullet(page1, 'Tienda de PDFs:', 'Permite ofrecer catalogos Gratis ($0) o de pago ($20 MXN) protegidos con Clave de Descarga.', y);
  y = drawBullet(page1, 'Acceso Administrador:', 'Se desbloquea desde el boton "Area Admin" ingresando la clave secreta (****).', y);

  y -= 10;

  // SECTION 2: LO QUE VE EL CLIENTE (VISTA PUBLICA)
  y = drawSectionHeader(page1, '2. LO QUE VE EL CLIENTE (VISTA CLIENTE)', y, rgb(0.93, 0.96, 0.99), rgb(0.08, 0.32, 0.55));
  y = drawBullet(page1, 'En Productos:', 'Ve fotos, claves, precios en MXN, selector de color en Folders y boton "Agregar".', y);
  y = drawBullet(page1, 'En Carrito:', 'Ve el desglose de productos, colores elegidos, total a pagar y boton "Enviar pedido por WhatsApp".', y);
  y = drawBullet(page1, 'En Descargas PDF:', 'Ve el titulo del PDF, cantidad de paginas detectadas y si cuesta Gratis ($0) o $20 MXN.', y);
  y = drawBullet(page1, 'Proteccion de Claves:', 'El cliente NO ve la clave de descarga del PDF ni los botones de edicion.', y);
  y = drawBullet(page1, 'Al Descargar un PDF:', 'Al pulsar "Descargar PDF", se le abre un campo que le pide ingresar la Clave de Descarga.', y);
  y = drawBullet(page1, 'Seguridad:', 'En la ventana de administrador, el cliente solo ve asteriscos (Clave requerida: ****).', y);

  y -= 10;

  // SECTION 3: LO QUE VE EL ADMINISTRADOR (VISTA ADMIN)
  y = drawSectionHeader(page1, '3. LO QUE VE EL ADMINISTRADOR (MODO ADMIN ACTIVO)', y, rgb(0.99, 0.95, 0.86), rgb(0.55, 0.32, 0.04));
  y = drawBullet(page1, 'Barra Superior Dorada:', 'Indica que el Acceso Total Administrador esta activo (Clave ****).', y);
  y = drawBullet(page1, 'Clave de Descarga (Solo Admin):', 'En cada tarjeta de PDF y en la tabla ve la clave unica (ej. SN-2026) y boton "Copiar Clave".', y);
  y = drawBullet(page1, 'Subida de 1 a 10 PDFs:', 'Puede seleccionar 1 PDF (de 1 en 1) o hasta 10 PDFs a la vez desde su dispositivo.', y);
  y = drawBullet(page1, 'Modificar Titulos al Guardar:', 'Antes de guardar cada PDF puede cambiarle el titulo, elegir Gratis ($0) o $20 y personalizar su clave.', y);
  y = drawBullet(page1, 'Edicion en Vivo:', 'Puede editar el titulo o precio de cualquier PDF o producto ya guardado en la pagina.', y);
  y = drawBullet(page1, 'Cambiar Fotos (Camara):', 'En cada tarjeta de producto ve el icono de camara para cambiar la foto desde su galeria.', y);

  page1.drawText('Pagina 1 de 2 — Continua en la siguiente pagina con los Mensajes que llegan al Cliente y al Administrador', {
    x: 35,
    y: 30,
    size: 8.5,
    font: fontBold,
    color: rgb(0.4, 0.45, 0.5)
  });

  // ==================== PAGE 2: LO QUE LE LLEGA AL ADMIN Y AL CLIENTE ====================
  const page2 = pdfDoc.addPage([612, 792]);

  page2.drawRectangle({
    x: 0,
    y: height - 75,
    width: 612,
    height: 75,
    color: rgb(0.08, 0.14, 0.22)
  });

  page2.drawText('FLUJO DE MENSAJES: LO QUE LLEGA AL CLIENTE Y AL ADMINISTRADOR', {
    x: 35,
    y: height - 38,
    size: 15,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  page2.drawText('Ejemplos exactos de lo que recibe cada parte en WhatsApp (+52 662 139 5110) y en la App', {
    x: 35,
    y: height - 56,
    size: 10,
    font: fontRegular,
    color: rgb(0.98, 0.85, 0.35)
  });

  let y2 = height - 105;

  // SECTION 4A: PEDIDOS DE PRODUCTOS
  y2 = drawSectionHeader(page2, '4. CASO A: COMPRA DE PRODUCTOS DEL CATALOGO', y2);
  y2 = drawParagraph(page2, 'A.1) LO QUE LE LLEGA AL ADMINISTRADOR (Mensaje automatico en su WhatsApp +52 662 139 5110):', y2, 42, true, rgb(0.04, 0.38, 0.26));

  // Message Box 1
  page2.drawRectangle({
    x: 45,
    y: y2 - 78,
    width: 520,
    height: 76,
    color: rgb(0.95, 0.98, 0.96)
  });
  let my = y2 - 14;
  my = drawParagraph(page2, '"Hola, me gustaria comprar los siguientes articulos de Shelo NABEL:', my, 55, false);
  my = drawParagraph(page2, '- 2x Baba de Caracol Crema Facial (Clave S1701) - $298 MXN', my, 55, false);
  my = drawParagraph(page2, '- 2x Folders Escolares (Color: Azul) (Clave ESC-01) - $50 MXN', my, 55, false);
  my = drawParagraph(page2, '- 1x Tijeras Westcott (Clave ESC-02) - $35 MXN', my, 55, false);
  my = drawParagraph(page2, 'Total: $383 MXN"', my, 55, true);

  y2 -= 92;
  y2 = drawParagraph(page2, 'A.2) LO QUE LE LLEGA AL CLIENTE:', y2, 42, true, rgb(0.08, 0.32, 0.55));
  y2 = drawBullet(page2, 'Respuesta en WhatsApp:', 'El Administrador le confirma existencias, metodo de pago y entrega de sus productos.', y2);

  y2 -= 10;

  // SECTION 4B: DESCARGA DE PDF CON CLAVE
  y2 = drawSectionHeader(page2, '5. CASO B: COMPRA / DESCARGA DE UN ARCHIVO PDF CON CLAVE', y2, rgb(0.99, 0.95, 0.86), rgb(0.55, 0.32, 0.04));

  y2 = drawParagraph(page2, 'PASO 1 — Lo que el Cliente envia y LE LLEGA AL ADMINISTRADOR por WhatsApp:', y2, 42, true, rgb(0.04, 0.38, 0.26));
  page2.drawRectangle({
    x: 45,
    y: y2 - 46,
    width: 520,
    height: 44,
    color: rgb(0.96, 0.96, 0.98)
  });
  let my2 = y2 - 14;
  my2 = drawParagraph(page2, '• Si el PDF cuesta $20 MXN: "Hola, quiero comprar la descarga del PDF: \'Lista de Precios 2026\' por $20 pesos."', my2, 55, false);
  my2 = drawParagraph(page2, '• Si el PDF es Gratis ($0): "Hola, me gustaria solicitar la clave de descarga gratuita del PDF: \'Catalogo Oficial\'."', my2, 55, false);

  y2 -= 60;

  y2 = drawParagraph(page2, 'PASO 2 — Lo que hace el Administrador y LO QUE LE LLEGA AL CLIENTE:', y2, 42, true, rgb(0.55, 0.32, 0.04));
  y2 = drawBullet(page2, '1. Consultar Clave:', 'El Administrador mira el recuadro "Clave de Descarga (Solo Admin)" del PDF (ej. SN-1012).', y2);
  y2 = drawBullet(page2, '2. Copiar y Enviar:', 'El Administrador presiona "Copiar Clave" y se la envia al Cliente por WhatsApp:', y2);

  page2.drawRectangle({
    x: 45,
    y: y2 - 36,
    width: 520,
    height: 34,
    color: rgb(0.92, 0.97, 0.94)
  });
  drawParagraph(
    page2,
    'Mensaje que recibe el Cliente: "¡Hola! Tu Clave de Descarga para el PDF es: SN-1012. Ingresala en la pagina para descargarlo."',
    y2 - 20,
    55,
    true,
    rgb(0.04, 0.38, 0.26)
  );

  y2 -= 50;

  y2 = drawParagraph(page2, 'PASO 3 — Lo que el Cliente hace en la Pagina y el Archivo que recibe:', y2, 42, true, rgb(0.08, 0.32, 0.55));
  y2 = drawBullet(page2, '1. Ingresar Clave:', 'El Cliente hace clic en "Descargar PDF (Ingresar Clave de Descarga)" en la tarjeta del PDF.', y2);
  y2 = drawBullet(page2, '2. Validacion:', 'Escribe la clave entregada por el Administrador (ej. SN-1012) y pulsa "Descargar".', y2);
  y2 = drawBullet(page2, '3. Descarga Directa:', 'Al coincidir la clave, el archivo PDF se descarga automaticamente en el dispositivo del Cliente.', y2);

  page2.drawText('Pagina 2 de 2 — Instructivo Oficial de Administracion Shelo NABEL', {
    x: 35,
    y: 30,
    size: 8.5,
    font: fontBold,
    color: rgb(0.4, 0.45, 0.5)
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}
