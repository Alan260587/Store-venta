import { Product, PdfDocument } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { INITIAL_PDFS } from '../data/initialPdfs';

const PRODUCTS_KEY = 'shelo_nabel_products_v4';
const PDFS_KEY = 'shelo_nabel_pdfs_v4';
const ADMIN_KEY = 'shelo_admin_unlocked_v1';
const MAX_PDF_LIMIT = 500;

export function generateRandomDownloadKey(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SN-${num}`;
}

export const dbStorage = {
  getProducts(): Product[] {
    try {
      const stored = localStorage.getItem(PRODUCTS_KEY);
      if (!stored) {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
        return INITIAL_PRODUCTS;
      }
      const parsed: Product[] = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
        return INITIAL_PRODUCTS;
      }
      // Ensure school-01 is always Folders Escolares with color choices, and school-02 & school-03 have the updated images
      const defaultFolders = INITIAL_PRODUCTS.find(p => p.id === 'school-01');
      const defaultScissors = INITIAL_PRODUCTS.find(p => p.id === 'school-02');
      const defaultCrayons = INITIAL_PRODUCTS.find(p => p.id === 'school-03');
      let updatedFlag = false;
      const normalized = parsed.map(p => {
        if (p.id === 'school-01' || p.clave === 'ESC-01') {
          if (p.name.toLowerCase().includes('cuaderno') || !p.availableColors || p.availableColors.length === 0) {
            updatedFlag = true;
            return {
              ...p,
              name: defaultFolders?.name || 'Folders Escolares',
              description: defaultFolders?.description || p.description,
              availableColors: defaultFolders?.availableColors
            };
          }
        }
        if ((p.id === 'school-02' || p.clave === 'ESC-02') && defaultScissors) {
          if (p.image.startsWith('data:image/svg+xml') && p.image !== defaultScissors.image) {
            updatedFlag = true;
            return {
              ...p,
              image: defaultScissors.image
            };
          }
        }
        if ((p.id === 'school-03' || p.clave === 'ESC-03') && defaultCrayons) {
          if (p.image.startsWith('data:image/svg+xml') && p.image !== defaultCrayons.image) {
            updatedFlag = true;
            return {
              ...p,
              image: defaultCrayons.image
            };
          }
        }
        return p;
      });
      if (updatedFlag) {
        this.saveProducts(normalized);
      }
      return normalized;
    } catch (e) {
      console.error('Error reading products from localStorage:', e);
      return INITIAL_PRODUCTS;
    }
  },

  saveProducts(products: Product[]): boolean {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      return true;
    } catch (e) {
      console.error('Error saving products to localStorage:', e);
      return false;
    }
  },

  addProduct(product: Omit<Product, 'id'>): Product {
    const products = this.getProducts();
    const newProduct: Product = {
      ...product,
      id: `p-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    };
    const updated = [newProduct, ...products];
    this.saveProducts(updated);
    return newProduct;
  },

  updateProduct(updatedProduct: Product): void {
    const products = this.getProducts();
    const updated = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    this.saveProducts(updated);
  },

  deleteProduct(id: string): void {
    const products = this.getProducts();
    const updated = products.filter(p => p.id !== id);
    this.saveProducts(updated);
  },

  getPdfs(): PdfDocument[] {
    try {
      const stored = localStorage.getItem(PDFS_KEY);
      if (!stored) {
        localStorage.setItem(PDFS_KEY, JSON.stringify(INITIAL_PDFS));
        return INITIAL_PDFS;
      }
      const parsed: PdfDocument[] = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        localStorage.setItem(PDFS_KEY, JSON.stringify(INITIAL_PDFS));
        return INITIAL_PDFS;
      }
      let needsSave = false;
      const normalized = parsed.map(p => {
        if (!p.downloadKey) {
          needsSave = true;
          return { ...p, downloadKey: generateRandomDownloadKey() };
        }
        return p;
      });
      if (needsSave) {
        this.savePdfs(normalized);
      }
      return normalized;
    } catch (e) {
      console.error('Error reading PDFs from localStorage:', e);
      return INITIAL_PDFS;
    }
  },

  savePdfs(pdfs: PdfDocument[]): boolean {
    try {
      const sanitizedPdfs = pdfs.map(pdf => {
        const { fileData, ...rest } = pdf;
        return {
          ...rest,
          title: (rest.title || 'Documento PDF').trim(),
          price: Number(rest.price) === 0 ? 0 : Number(rest.price || 20),
          downloadKey: (rest.downloadKey || generateRandomDownloadKey()).trim().toUpperCase()
        };
      });
      localStorage.setItem(PDFS_KEY, JSON.stringify(sanitizedPdfs));
      return true;
    } catch (e) {
      console.error('Error saving PDFs to localStorage:', e);
      return false;
    }
  },

  addPdf(pdf: Omit<PdfDocument, 'id' | 'uploadedAt'>): { success: boolean; message: string; pdf?: PdfDocument } {
    try {
      const pdfs = this.getPdfs();
      if (pdfs.length >= MAX_PDF_LIMIT) {
        return {
          success: false,
          message: `Límite alcanzado: La base de datos ya tiene el máximo de ${MAX_PDF_LIMIT} PDFs registrados.`
        };
      }

      const chosenPrice = Number(pdf.price) === 0 ? 0 : 20;
      const cleanTitle = (pdf.title || 'Documento PDF').trim();
      const cleanKey = (pdf.downloadKey || generateRandomDownloadKey()).trim().toUpperCase();
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const newPdf: PdfDocument = {
        ...pdf,
        title: cleanTitle,
        price: chosenPrice,
        downloadKey: cleanKey,
        id: `pdf-${uniqueSuffix}`,
        uploadedAt: new Date().toISOString().split('T')[0]
      };

      const updated = [newPdf, ...pdfs];
      const saved = this.savePdfs(updated);
      if (!saved) {
        return {
          success: false,
          message: 'Error al guardar el PDF en la memoria local.'
        };
      }
      return { success: true, message: 'PDF guardado con éxito en la página', pdf: newPdf };
    } catch (err: any) {
      console.error('Error adding PDF:', err);
      return {
        success: false,
        message: 'Ocurrió un error inesperado al guardar el PDF.'
      };
    }
  },

  addPdfsBatch(
    pdfList: Array<Omit<PdfDocument, 'id' | 'uploadedAt'>>
  ): { success: boolean; message: string; addedPdfs: PdfDocument[] } {
    try {
      const currentPdfs = this.getPdfs();
      if (currentPdfs.length + pdfList.length > MAX_PDF_LIMIT) {
        return {
          success: false,
          message: `Límite alcanzado: Solo puedes tener hasta ${MAX_PDF_LIMIT} PDFs en total.`,
          addedPdfs: []
        };
      }

      const today = new Date().toISOString().split('T')[0];
      const createdPdfs: PdfDocument[] = pdfList.map((pdf, idx) => {
        const chosenPrice = Number(pdf.price) === 0 ? 0 : 20;
        const cleanTitle = (pdf.title || `Documento PDF ${idx + 1}`).trim();
        const cleanKey = (pdf.downloadKey || generateRandomDownloadKey()).trim().toUpperCase();
        const uniqueSuffix = `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 9)}`;

        return {
          ...pdf,
          title: cleanTitle,
          price: chosenPrice,
          downloadKey: cleanKey,
          id: `pdf-${uniqueSuffix}`,
          uploadedAt: today
        };
      });

      const updated = [...createdPdfs, ...currentPdfs];
      const saved = this.savePdfs(updated);
      if (!saved) {
        return {
          success: false,
          message: 'Error al guardar los PDFs en la memoria local.',
          addedPdfs: []
        };
      }

      return {
        success: true,
        message:
          createdPdfs.length === 1
            ? '¡1 PDF guardado con éxito en la página!'
            : `¡${createdPdfs.length} PDFs guardados con éxito en la página!`,
        addedPdfs: createdPdfs
      };
    } catch (err) {
      console.error('Error in addPdfsBatch:', err);
      return {
        success: false,
        message: 'Ocurrió un error inesperado al guardar el lote de PDFs.',
        addedPdfs: []
      };
    }
  },

  updatePdf(updatedPdf: PdfDocument): void {
    const pdfs = this.getPdfs();
    const cleanPrice = Number(updatedPdf.price) === 0 ? 0 : 20;
    const cleanTitle = (updatedPdf.title || 'Documento PDF').trim();
    const cleanKey = (updatedPdf.downloadKey || generateRandomDownloadKey()).trim().toUpperCase();
    const updated = pdfs.map(p =>
      p.id === updatedPdf.id
        ? { ...updatedPdf, title: cleanTitle, price: cleanPrice, downloadKey: cleanKey }
        : p
    );
    this.savePdfs(updated);
  },

  deletePdf(id: string): void {
    const pdfs = this.getPdfs();
    const updated = pdfs.filter(p => p.id !== id);
    this.savePdfs(updated);
  },

  resetDefaults(): void {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem(PDFS_KEY, JSON.stringify(INITIAL_PDFS));
    } catch (e) {
      console.error('Error resetting default data:', e);
    }
  },

  isAdminUnlocked(): boolean {
    return localStorage.getItem(ADMIN_KEY) === 'true';
  },

  setAdminUnlocked(unlocked: boolean): void {
    if (unlocked) {
      localStorage.setItem(ADMIN_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_KEY);
    }
  }
};
