import { Product, PdfDocument, MultiUserPresence } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { INITIAL_PDFS } from '../data/initialPdfs';

const PRODUCTS_KEY = 'shelo_nabel_products_v4';
const PDFS_KEY = 'shelo_nabel_pdfs_v4';
const LEGACY_ADMIN_LOCAL_KEY = 'shelo_admin_unlocked_v1';
const ADMIN_SESSION_KEY = 'shelo_admin_session_active_v2';
const CLIENT_SESSION_ID_KEY = 'shelo_multiuser_client_id_v1';
const MAX_PDF_LIMIT = 500;

export function generateRandomDownloadKey(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SN-${num}`;
}

function normalizeProductsList(parsed: Product[]): { normalized: Product[]; updatedFlag: boolean } {
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

  return { normalized, updatedFlag };
}

function pushStateToServer(payload: {
  products?: Product[];
  pdfs?: PdfDocument[];
  deletedProductId?: string;
  deletedPdfId?: string;
}) {
  try {
    void fetch('/api/update-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch {
    // ignore offline/network errors
  }
}

export const dbStorage = {
  /**
   * Returns a unique per-tab session ID so each connected user or browser tab
   * is tracked independently in multi-user mode.
   */
  getSessionClientId(): string {
    try {
      let clientId = sessionStorage.getItem(CLIENT_SESSION_ID_KEY);
      if (!clientId) {
        clientId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem(CLIENT_SESSION_ID_KEY, clientId);
      }
      return clientId;
    } catch {
      return `usr-${Date.now()}`;
    }
  },

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
      const { normalized, updatedFlag } = normalizeProductsList(parsed);
      if (updatedFlag) {
        this.saveProductsLocalOnly(normalized);
      }
      return normalized;
    } catch (e) {
      console.error('Error reading products from localStorage:', e);
      return INITIAL_PRODUCTS;
    }
  },

  saveProductsLocalOnly(products: Product[]): boolean {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      return true;
    } catch (e) {
      console.error('Error saving products to localStorage:', e);
      return false;
    }
  },

  saveProducts(products: Product[], deletedProductId?: string): boolean {
    const ok = this.saveProductsLocalOnly(products);
    pushStateToServer({ products, deletedProductId });
    return ok;
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
    const updated = products.map(p => (p.id === updatedProduct.id ? updatedProduct : p));
    this.saveProducts(updated);
  },

  deleteProduct(id: string): void {
    const products = this.getProducts();
    const updated = products.filter(p => p.id !== id);
    this.saveProducts(updated, id);
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
        this.savePdfsLocalOnly(normalized);
      }
      return normalized;
    } catch (e) {
      console.error('Error reading PDFs from localStorage:', e);
      return INITIAL_PDFS;
    }
  },

  savePdfsLocalOnly(pdfs: PdfDocument[]): boolean {
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

  savePdfs(pdfs: PdfDocument[], deletedPdfId?: string): boolean {
    const ok = this.savePdfsLocalOnly(pdfs);
    const sanitized = this.getPdfs();
    pushStateToServer({ pdfs: sanitized, deletedPdfId });
    return ok;
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
    this.savePdfs(updated, id);
  },

  resetDefaults(): void {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem(PDFS_KEY, JSON.stringify(INITIAL_PDFS));
      void fetch('/api/reset-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: INITIAL_PRODUCTS, pdfs: INITIAL_PDFS })
      }).catch(() => {});
    } catch (e) {
      console.error('Error resetting default data:', e);
    }
  },

  /**
   * Non-destructive multi-user sync: sends local products & PDFs to the server
   * and receives the merged list so NO previously uploaded PDFs or added products are ever lost.
   */
  async syncWithServer(): Promise<{
    products: Product[];
    pdfs: PdfDocument[];
    presence?: MultiUserPresence;
  } | null> {
    try {
      const localProducts = this.getProducts();
      const localPdfs = this.getPdfs();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: localProducts,
          pdfs: localPdfs
        })
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        const { normalized } = normalizeProductsList(data.products);
        this.saveProductsLocalOnly(normalized);
        data.products = normalized;
      }
      if (Array.isArray(data.pdfs) && data.pdfs.length > 0) {
        this.savePdfsLocalOnly(data.pdfs);
      }
      return {
        products: this.getProducts(),
        pdfs: this.getPdfs(),
        presence: data.presence
      };
    } catch {
      return null;
    }
  },

  /**
   * Admin session is strictly per-tab/per-session (sessionStorage) and NEVER shared in localStorage.
   * Closing the page/tab automatically logs out the admin, and other connected users remain normal clients.
   */
  isAdminUnlocked(): boolean {
    try {
      // Clean up legacy localStorage key so admin session never persists after closing the browser/tab
      localStorage.removeItem(LEGACY_ADMIN_LOCAL_KEY);
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  },

  setAdminUnlocked(unlocked: boolean): void {
    try {
      localStorage.removeItem(LEGACY_ADMIN_LOCAL_KEY);
      if (unlocked) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      } else {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
      }
      const clientId = this.getSessionClientId();
      void fetch('/api/presence/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          role: unlocked ? 'admin' : 'client'
        })
      }).catch(() => {});
    } catch {
      // ignore storage errors
    }
  }
};
