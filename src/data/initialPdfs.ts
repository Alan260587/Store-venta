import { PdfDocument } from '../types';

export const OFFICIAL_CATALOG_ID = 'cat-shelo-nabel-2026';
const BASE_URL = import.meta.env?.BASE_URL || '/';
export const OFFICIAL_CATALOG_FULL_URL = `${BASE_URL}assets/aistudio/Catalogo_Shelo_NABEL2026_fd41deed.pdf`;
export const OFFICIAL_CATALOG_PREVIEW5_URL = `${BASE_URL}assets/aistudio/Catalogo_Shelo_NABEL2026_preview5.pdf`;
export const OFFICIAL_CATALOG_TOTAL_PARTS = 6;
export const OFFICIAL_CATALOG_PART_URLS: string[] = Array.from(
  { length: OFFICIAL_CATALOG_TOTAL_PARTS },
  (_, idx) => `${BASE_URL}assets/aistudio/Catalogo_Shelo_NABEL2026_part${idx}.bin`
);

/**
 * IDs of legacy PDFs and books that were permanently removed by user request.
 */
export const REMOVED_DEFAULT_PDF_IDS: string[] = [
  'pdf-1792671814576-16nso',
  'pdf-1792722675929-0-64vng',
  'pdf-1792674344869-0-eqy1e',
  'pdf-1792671810009-fq526',
  'pdf-1792671805020-x38uz',
  'pdf-1792671804050-ysn27',
  'pdf-1792671802945-2upds',
  'pdf-1792671801677-mivvc',
  'pdf-1792671798057-thqdz',
  'pdf-1792671794124-ysmm9',
  'pdf-1792671791043-c7nfg',
  'pdf-1792235643482-0-83tsx9c',
  'pdf-1792235591696-0-b1hbrmb',
  'pdf-1792235479796-0-664szsk',
  'pdf-1792235398679-0-sphyfvy',
  'pdf-1792235241425-0-xbhyzbw',
  'pdf-1792235035400-0-0zwhdam',
  'pdf-1792234881416-giigj9c',
  'pdf-1792234690501-0-88iju7x',
  'pdf-1792234520165-0-n5ohrs5',
  'pdf-1792234174838-0-mhpub0g',
  'pdf-1792234110462-0-dayjnbi',
  'pdf-1792232922999-705',
  'pdf-001',
  'pdf-002',
  'pdf-003',
  'pdf-004',
  'pdf-005'
];

export const PROTECTED_DEFAULT_PDF_IDS: string[] = [OFFICIAL_CATALOG_ID];

export const INITIAL_PDFS: PdfDocument[] = [
  {
    id: OFFICIAL_CATALOG_ID,
    title: 'Catálogo Oficial Sheló NABEL 2026',
    description:
      'Catálogo Oficial Sheló NABEL 2026 completo (148 páginas • Vista previa de las primeras 5 páginas y descarga directa 100% gratis).',
    pagesCount: 148,
    price: 0,
    downloadKey: 'GRATIS',
    uploadedAt: '2026-10-22',
    fileSize: '45.4 MB',
    category: 'Catálogo Oficial',
    updatedAt: 1792727141000
  }
];
