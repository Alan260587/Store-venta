import { PdfDocument } from '../types';

export const INITIAL_PDFS: PdfDocument[] = [
  {
    id: 'pdf-001',
    title: 'Catálogo Oficial Sheló NABEL 2026 (Completo)',
    description: 'Catálogo completo oficial 2026 con todas las líneas de productos: cuidado facial, corporal, capilar, nutrición y cosméticos. ¡Sin costo!',
    pagesCount: 148,
    price: 0, // GRATIS - No se cobra por el catálogo Sheló NABEL
    downloadKey: 'SN-2026',
    fileSize: '42.8 MB',
    uploadedAt: '2026-10-15',
    category: 'Catálogo Oficial'
  },
  {
    id: 'pdf-002',
    title: 'Lista de Precios Mayoreo y Ganancias 2026',
    description: 'Lista técnica con la clave de cada producto, precio al público, precio afiliado mayoreo y cálculo de márgenes de ganancia.',
    pagesCount: 12,
    price: 20, // $20 MXN
    downloadKey: 'SN-1012',
    fileSize: '3.4 MB',
    uploadedAt: '2026-10-14',
    category: 'Precios y Negocio'
  },
  {
    id: 'pdf-003',
    title: 'Guía de Carrera, Comisiones y Afiliación',
    description: 'Manual para distribuidores e independientes sobre la estructura de red, bonos de inicio y crecimiento con Sheló NABEL.',
    pagesCount: 24,
    price: 20, // $20 MXN
    downloadKey: 'SN-3024',
    fileSize: '6.5 MB',
    uploadedAt: '2026-10-12',
    category: 'Afiliación'
  },
  {
    id: 'pdf-004',
    title: 'Manual de Salud, Nutrición y Bienestar Natural',
    description: 'Guía técnica de suplementos alimenticios, adaptógenos, colágenos e ingredientes naturales para el cuidado integral.',
    pagesCount: 85,
    price: 20, // $20 MXN
    downloadKey: 'SN-4085',
    fileSize: '21.2 MB',
    uploadedAt: '2026-10-10',
    category: 'Guía de Salud'
  },
  {
    id: 'pdf-005',
    title: 'Catálogo Especial de Útiles Escolares y Novedades',
    description: 'Folleto de temporada con artículos escolares: cuadernos, tijeras Westcott, crayones Crayola 24 y paquetes de regreso a clases.',
    pagesCount: 8,
    price: 0, // GRATIS
    downloadKey: 'SN-5008',
    fileSize: '2.8 MB',
    uploadedAt: '2026-10-08',
    category: 'Temporada'
  }
];
