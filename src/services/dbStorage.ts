import { Product, PdfDocument, MultiUserPresence } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { INITIAL_PDFS } from '../data/initialPdfs';
import { pdfFileStore } from './pdfFileStore';
import {
  db,
  auth,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onAuthStateChanged,
  handleFirestoreError,
  OperationType
} from '../firebase';

const PRODUCTS_KEY = 'shelo_nabel_products_v4';
const PDFS_KEY = 'shelo_nabel_pdfs_v4';
const LEGACY_PRODUCT_KEYS = [
  'shelo_nabel_products',
  'shelo_nabel_products_v1',
  'shelo_nabel_products_v2',
  'shelo_nabel_products_v3',
  'shelo_products',
  'products'
];
const LEGACY_PDF_KEYS = [
  'shelo_nabel_pdfs',
  'shelo_nabel_pdfs_v1',
  'shelo_nabel_pdfs_v2',
  'shelo_nabel_pdfs_v3',
  'shelo_pdfs',
  'pdfs'
];
const DELETED_PRODUCTS_KEY = 'shelo_nabel_deleted_products_v4';
const DELETED_PDFS_KEY = 'shelo_nabel_deleted_pdfs_v4';
const LEGACY_ADMIN_LOCAL_KEY = 'shelo_admin_unlocked_v1';
const ADMIN_SESSION_KEY = 'shelo_admin_session_active_v2';
const CLIENT_SESSION_ID_KEY = 'shelo_multiuser_client_id_v1';
const MAX_PDF_LIMIT = 500;

// Blueprint volumetric constraints (synced verbatim with firebase-blueprint.json & firestore.rules)
const ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_ID_LEN = 128;
const MAX_CLAVE_LEN = 40;
const MAX_NAME_LEN = 200;
const MAX_TITLE_LEN = 250;
const MAX_SIZE_LEN = 80;
const MAX_CATEGORY_LEN = 80;
const MAX_PDF_CATEGORY_LEN = 100;
const MAX_DESC_LEN = 1500;
const MAX_IMAGE_LEN = 900000;
const MAX_KEY_LEN = 60;
const MAX_DATE_LEN = 40;

// Unified Administrator Key valid on ANY device (Laptop, Android, iOS)
export const UNIFIED_ADMIN_KEY = '1987';
const VALID_ADMIN_KEYS = new Set(['1987', '2026']);

export function verifyAdminKeyInput(rawInput: string): boolean {
  const normalized = String(rawInput || '')
    .replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '')
    .trim();
  return VALID_ADMIN_KEYS.has(normalized);
}

export function generateRandomDownloadKey(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SN-${num}`;
}

function sanitizeDocId(rawId: string): string {
  const clean = String(rawId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, MAX_ID_LEN);
  return clean && ID_REGEX.test(clean) ? clean : `id-${Date.now()}`;
}

function getTimestampFromId(id: string): number {
  const match = String(id || '').match(/(\d{13})/);
  return match ? Number(match[1]) : 0;
}

function getLocalDeletedProductIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_PRODUCTS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function addLocalDeletedProductIds(ids: string[]) {
  try {
    if (!ids || ids.length === 0) return;
    const set = getLocalDeletedProductIds();
    for (const id of ids) {
      if (id) set.add(id);
    }
    localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function getLocalDeletedPdfIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_PDFS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function addLocalDeletedPdfIds(ids: string[]) {
  try {
    if (!ids || ids.length === 0) return;
    const set = getLocalDeletedPdfIds();
    for (const id of ids) {
      if (id) set.add(id);
    }
    localStorage.setItem(DELETED_PDFS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function normalizeProductsList(parsed: Product[]): { normalized: Product[]; updatedFlag: boolean } {
  const defaultFolders = INITIAL_PRODUCTS.find((p) => p.id === 'school-01');
  const defaultScissors = INITIAL_PRODUCTS.find((p) => p.id === 'school-02');
  const defaultCrayons = INITIAL_PRODUCTS.find((p) => p.id === 'school-03');
  let updatedFlag = false;

  const normalized = parsed.map((p) => {
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

function sortProductsCanonical(list: Product[]): Product[] {
  const initialIdsOrder = new Map<string, number>(
    INITIAL_PRODUCTS.map((p, idx) => [p.id, idx])
  );
  const copy = [...list];
  copy.sort((a, b) => {
    const aIsInit = initialIdsOrder.has(a.id);
    const bIsInit = initialIdsOrder.has(b.id);
    if (!aIsInit && bIsInit) return -1;
    if (aIsInit && !bIsInit) return 1;
    if (!aIsInit && !bIsInit) {
      const timeB = getTimestampFromId(b.id) || Number(b.updatedAt || 0);
      const timeA = getTimestampFromId(a.id) || Number(a.updatedAt || 0);
      return timeB - timeA;
    }
    return (initialIdsOrder.get(a.id) ?? 0) - (initialIdsOrder.get(b.id) ?? 0);
  });
  return copy;
}

function sortPdfsCanonical(list: PdfDocument[]): PdfDocument[] {
  const initialPdfOrder = new Map<string, number>(
    INITIAL_PDFS.map((p, idx) => [p.id, idx])
  );
  const copy = [...list];
  copy.sort((a, b) => {
    const aIsInit = initialPdfOrder.has(a.id);
    const bIsInit = initialPdfOrder.has(b.id);
    if (!aIsInit && bIsInit) return -1;
    if (aIsInit && !bIsInit) return 1;
    if (!aIsInit && !bIsInit) {
      const timeB = getTimestampFromId(b.id) || Number(b.updatedAt || 0);
      const timeA = getTimestampFromId(a.id) || Number(a.updatedAt || 0);
      return timeB - timeA;
    }
    return (initialPdfOrder.get(a.id) ?? 0) - (initialPdfOrder.get(b.id) ?? 0);
  });
  return copy;
}

/**
 * Harvests products from ALL localStorage keys on this device (Laptop, Android, or iOS)
 * using both explicit key names and duck-typed inspection, and merges with INITIAL_PRODUCTS.
 */
function harvestAllLocalProducts(): { products: Product[]; changed: boolean } {
  const deletedSet = getLocalDeletedProductIds();
  const map = new Map<string, Product>();
  let changed = false;

  const candidateKeys = new Set<string>([PRODUCTS_KEY, ...LEGACY_PRODUCT_KEYS]);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k !== DELETED_PRODUCTS_KEY && k !== DELETED_PDFS_KEY) {
        candidateKeys.add(k);
      }
    }
  } catch {
    // ignore
  }

  let v4Count = 0;
  try {
    const v4Raw = localStorage.getItem(PRODUCTS_KEY);
    if (v4Raw) {
      const parsed = JSON.parse(v4Raw);
      if (Array.isArray(parsed)) {
        v4Count = parsed.length;
        for (const item of parsed) {
          if (item && typeof item === 'object' && item.id && item.name && item.clave && !deletedSet.has(item.id)) {
            map.set(item.id, item);
          }
        }
      }
    }
  } catch {
    // ignore
  }

  for (const key of candidateKeys) {
    if (key === PRODUCTS_KEY) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw || !raw.startsWith('[')) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (
          !item ||
          typeof item !== 'object' ||
          !item.id ||
          !item.name ||
          !item.clave ||
          item.pagesCount !== undefined ||
          deletedSet.has(item.id)
        ) {
          continue;
        }
        const existing = map.get(item.id);
        if (!existing) {
          map.set(item.id, item);
          changed = true;
        } else {
          const prevTime = Number(existing.updatedAt || 0);
          const incTime = Number(item.updatedAt || 0);
          if (incTime > prevTime) {
            map.set(item.id, item);
            changed = true;
          }
        }
      }
    } catch {
      // ignore malformed key
    }
  }

  for (const initProd of INITIAL_PRODUCTS) {
    if (!deletedSet.has(initProd.id) && !map.has(initProd.id)) {
      map.set(initProd.id, initProd);
      changed = true;
    }
  }

  const allItems = Array.from(map.values());
  const { normalized, updatedFlag } = normalizeProductsList(allItems);
  if (updatedFlag || allItems.length !== v4Count) {
    changed = true;
  }

  return { products: sortProductsCanonical(normalized), changed };
}

/**
 * Harvests PDFs from ALL localStorage keys on this device (Laptop, Android, or iOS),
 * extracts any legacy base64 fileData into IndexedDB + Server, and merges with INITIAL_PDFS.
 */
function harvestAllLocalPdfs(): { pdfs: PdfDocument[]; changed: boolean } {
  const deletedSet = getLocalDeletedPdfIds();
  const map = new Map<string, PdfDocument>();
  let changed = false;

  const candidateKeys = new Set<string>([PDFS_KEY, ...LEGACY_PDF_KEYS]);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k !== DELETED_PDFS_KEY && k !== DELETED_PRODUCTS_KEY) {
        candidateKeys.add(k);
      }
    }
  } catch {
    // ignore
  }

  let v4Count = 0;
  try {
    const v4Raw = localStorage.getItem(PDFS_KEY);
    if (v4Raw) {
      const parsed = JSON.parse(v4Raw);
      if (Array.isArray(parsed)) {
        v4Count = parsed.length;
        for (const item of parsed) {
          if (item && typeof item === 'object' && item.id && item.title && !deletedSet.has(item.id)) {
            if (typeof item.fileData === 'string' && item.fileData.length > 0) {
              void pdfFileStore.saveBase64DataUrl(item.id, item.fileData);
              changed = true;
            }
            const { fileData, ...clean } = item;
            map.set(clean.id, {
              ...clean,
              downloadKey: (clean.downloadKey || generateRandomDownloadKey()).trim().toUpperCase(),
              price: Number(clean.price) === 0 ? 0 : 20
            });
          }
        }
      }
    }
  } catch {
    // ignore
  }

  for (const key of candidateKeys) {
    if (key === PDFS_KEY) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw || !raw.startsWith('[')) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (
          !item ||
          typeof item !== 'object' ||
          !item.id ||
          !item.title ||
          item.pagesCount === undefined ||
          deletedSet.has(item.id)
        ) {
          continue;
        }
        if (typeof item.fileData === 'string' && item.fileData.length > 0) {
          void pdfFileStore.saveBase64DataUrl(item.id, item.fileData);
        }
        const { fileData, ...clean } = item;
        const normalizedItem: PdfDocument = {
          ...clean,
          downloadKey: (clean.downloadKey || generateRandomDownloadKey()).trim().toUpperCase(),
          price: Number(clean.price) === 0 ? 0 : 20
        };
        const existing = map.get(normalizedItem.id);
        if (!existing) {
          map.set(normalizedItem.id, normalizedItem);
          changed = true;
        } else {
          const prevTime = Number(existing.updatedAt || 0);
          const incTime = Number(normalizedItem.updatedAt || 0);
          if (incTime > prevTime) {
            map.set(normalizedItem.id, normalizedItem);
            changed = true;
          }
        }
      }
    } catch {
      // ignore malformed key
    }
  }

  for (const initPdf of INITIAL_PDFS) {
    if (!deletedSet.has(initPdf.id) && !map.has(initPdf.id)) {
      map.set(initPdf.id, initPdf);
      changed = true;
    }
  }

  const allPdfs = Array.from(map.values());
  if (allPdfs.length !== v4Count) {
    changed = true;
  }

  return { pdfs: sortPdfsCanonical(allPdfs), changed };
}

function notifyPageUpdate(type: 'products' | 'pdfs' | 'all', message?: string) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('shelo-db-updated', {
          detail: { type, message, timestamp: Date.now() }
        })
      );
    }
  } catch {
    // ignore
  }
}

// ============================================================================
// Firebase Cloud Firestore Synchronization Helpers (Laptop • Android • iOS)
// ============================================================================

async function upsertProductToFirestore(product: Product): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const docId = sanitizeDocId(product.id);
  const path = `products/${docId}`;
  const payload: Record<string, unknown> = {
    id: docId,
    clave: String(product.clave || 'S-00').trim().slice(0, MAX_CLAVE_LEN) || 'S-00',
    name: String(product.name || 'Producto').trim().slice(0, MAX_NAME_LEN) || 'Producto',
    price: Math.max(0, Math.min(1000000, Number(product.price) || 0)),
    size: String(product.size || '1 pza').trim().slice(0, MAX_SIZE_LEN) || '1 pza',
    category: String(product.category || 'Cuidado Facial').trim().slice(0, MAX_CATEGORY_LEN) || 'Cuidado Facial',
    description:
      String(product.description || 'Producto Sheló NABEL').trim().slice(0, MAX_DESC_LEN) ||
      'Producto Sheló NABEL',
    image:
      String(product.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03')
        .trim()
        .slice(0, MAX_IMAGE_LEN) || 'https://images.unsplash.com/photo-1556228720-195a672e8a03',
    isStarProduct: Boolean(product.isStarProduct),
    isNew: Boolean(product.isNew),
    visibility: 'public',
    authorUid: currentUser.uid.slice(0, MAX_ID_LEN),
    updatedAtMs: Math.max(0, Number(product.updatedAt || Date.now())),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'products', docId), payload);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

async function upsertPdfToFirestore(pdf: PdfDocument): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const docId = sanitizeDocId(pdf.id);
  const path = `pdfs/${docId}`;
  const payload: Record<string, unknown> = {
    id: docId,
    title: String(pdf.title || 'Documento PDF').trim().slice(0, MAX_TITLE_LEN) || 'Documento PDF',
    description:
      String(pdf.description || 'Documento PDF oficial.').trim().slice(0, MAX_DESC_LEN) ||
      'Documento PDF oficial.',
    pagesCount: Math.max(1, Math.min(5000, Number(pdf.pagesCount) || 1)),
    price: Number(pdf.price) === 0 ? 0 : 20,
    downloadKey:
      String(pdf.downloadKey || 'SN-2026').trim().toUpperCase().slice(0, MAX_KEY_LEN) || 'SN-2026',
    uploadedAt:
      String(pdf.uploadedAt || new Date().toISOString().split('T')[0]).trim().slice(0, MAX_DATE_LEN) ||
      '2026-01-01',
    fileSize: String(pdf.fileSize || '1.0 MB').trim().slice(0, MAX_DATE_LEN) || '1.0 MB',
    category:
      String(pdf.category || 'Catálogo Oficial').trim().slice(0, MAX_PDF_CATEGORY_LEN) ||
      'Catálogo Oficial',
    visibility: 'public',
    authorUid: currentUser.uid.slice(0, MAX_ID_LEN),
    updatedAtMs: Math.max(0, Number(pdf.updatedAt || Date.now())),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'pdfs', docId), payload);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

async function recordDeletionInFirestore(id: string, itemType: 'product' | 'pdf'): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const docId = sanitizeDocId(id);
  const collectionName = itemType === 'product' ? 'products' : 'pdfs';
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${docId}`);
    }
  }

  const tombstonePath = `deletedItems/${docId}`;
  try {
    await setDoc(doc(db, 'deletedItems', docId), {
      id: docId,
      itemType,
      visibility: 'public',
      authorUid: currentUser.uid.slice(0, MAX_ID_LEN),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, tombstonePath);
    }
  }
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
      cache: 'no-store',
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        dbStorage.mergeIncomingServerData({
          products: data.products,
          pdfs: data.pdfs,
          deletedProductIds: data.deletedProductIds,
          deletedPdfIds: data.deletedPdfIds
        });
      })
      .catch(() => {});
  } catch {
    // ignore offline/network errors
  }
}

let firestoreListenersStarted = false;

export const dbStorage = {
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

  /**
   * Starts real-time Firebase Cloud Firestore listeners on /products, /pdfs, and /deletedItems
   * so Laptop, Android, and iOS stay synchronized across all sessions and deployments.
   */
  startFirestoreRealtimeSync(): void {
    if (firestoreListenersStarted || typeof window === 'undefined') return;
    firestoreListenersStarted = true;

    try {
      const deletedQuery = query(collection(db, 'deletedItems'), where('visibility', '==', 'public'));
      onSnapshot(
        deletedQuery,
        (snapshot) => {
          const delProd: string[] = [];
          const delPdf: string[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            if (d && d.id) {
              if (d.itemType === 'product') delProd.push(String(d.id));
              if (d.itemType === 'pdf') delPdf.push(String(d.id));
            }
          });
          if (delProd.length > 0 || delPdf.length > 0) {
            this.mergeIncomingServerData({
              deletedProductIds: delProd,
              deletedPdfIds: delPdf
            });
          }
        },
        (error) => {
          if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
            handleFirestoreError(error, OperationType.LIST, 'deletedItems');
          }
        }
      );

      const productsQuery = query(collection(db, 'products'), where('visibility', '==', 'public'));
      onSnapshot(
        productsQuery,
        (snapshot) => {
          if (snapshot.empty) return;
          const remoteProducts: Product[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            if (d && d.id && d.name) {
              remoteProducts.push({
                id: String(d.id),
                clave: String(d.clave || 'S-00'),
                name: String(d.name),
                price: Number(d.price || 0),
                size: String(d.size || '1 pza'),
                category: (d.category as Product['category']) || 'Cuidado Facial',
                description: String(d.description || ''),
                image: String(d.image || ''),
                isStarProduct: Boolean(d.isStarProduct),
                isNew: Boolean(d.isNew),
                updatedAt: Number(d.updatedAtMs || 0)
              });
            }
          });
          if (remoteProducts.length > 0) {
            this.mergeIncomingServerData({ products: remoteProducts });
          }
        },
        (error) => {
          if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
            handleFirestoreError(error, OperationType.LIST, 'products');
          }
        }
      );

      const pdfsQuery = query(collection(db, 'pdfs'), where('visibility', '==', 'public'));
      onSnapshot(
        pdfsQuery,
        (snapshot) => {
          if (snapshot.empty) return;
          const remotePdfs: PdfDocument[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            if (d && d.id && d.title) {
              remotePdfs.push({
                id: String(d.id),
                title: String(d.title),
                description: String(d.description || ''),
                pagesCount: Number(d.pagesCount || 1),
                price: Number(d.price) === 0 ? 0 : 20,
                downloadKey: String(d.downloadKey || 'SN-2026').toUpperCase(),
                uploadedAt: String(d.uploadedAt || '2026-01-01'),
                fileSize: String(d.fileSize || '1.0 MB'),
                category: String(d.category || 'Catálogo Oficial'),
                updatedAt: Number(d.updatedAtMs || 0)
              });
            }
          });
          if (remotePdfs.length > 0) {
            this.mergeIncomingServerData({ pdfs: remotePdfs });
          }
        },
        (error) => {
          if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
            handleFirestoreError(error, OperationType.LIST, 'pdfs');
          }
        }
      );

      // Whenever an authenticated user signs in, push all local custom/modified items to Firestore
      onAuthStateChanged(auth, (user) => {
        if (user && user.emailVerified) {
          void this.syncAllToFirestoreCloud();
        }
      });
    } catch {
      // ignore if offline
    }
  },

  async syncAllToFirestoreCloud(): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.emailVerified) return;

    const products = this.getProducts();
    const pdfs = this.getPdfs();
    const initProdIds = new Set(INITIAL_PRODUCTS.map((p) => p.id));
    const initPdfIds = new Set(INITIAL_PDFS.map((p) => p.id));

    for (const p of products) {
      if (!initProdIds.has(p.id) || p.updatedAt) {
        await upsertProductToFirestore(p);
      }
    }
    for (const pdf of pdfs) {
      if (!initPdfIds.has(pdf.id) || pdf.updatedAt) {
        await upsertPdfToFirestore(pdf);
      }
    }
  },

  /**
   * Non-destructive Union Merge of incoming Server or Firestore items with local storage.
   * NEVER overwrites local non-deleted items!
   */
  mergeIncomingServerData(incoming: {
    products?: Product[];
    pdfs?: PdfDocument[];
    deletedProductIds?: string[];
    deletedPdfIds?: string[];
  }): boolean {
    let anyChanged = false;

    if (Array.isArray(incoming.deletedProductIds) && incoming.deletedProductIds.length > 0) {
      addLocalDeletedProductIds(incoming.deletedProductIds);
    }
    if (Array.isArray(incoming.deletedPdfIds) && incoming.deletedPdfIds.length > 0) {
      addLocalDeletedPdfIds(incoming.deletedPdfIds);
    }

    if (Array.isArray(incoming.products) && incoming.products.length > 0) {
      const deletedSet = getLocalDeletedProductIds();
      const localList = harvestAllLocalProducts().products;
      const map = new Map<string, Product>();

      for (const p of localList) {
        if (p && p.id && !deletedSet.has(p.id)) {
          map.set(p.id, p);
        }
      }

      let prodChanged = false;
      for (const inc of incoming.products) {
        if (!inc || !inc.id || deletedSet.has(inc.id)) continue;
        const prev = map.get(inc.id);
        if (!prev) {
          map.set(inc.id, inc);
          prodChanged = true;
        } else {
          const prevTime = Number(prev.updatedAt || 0);
          const incTime = Number(inc.updatedAt || 0);
          if (incTime > prevTime) {
            map.set(inc.id, inc);
            prodChanged = true;
          }
        }
      }

      const merged = sortProductsCanonical(normalizeProductsList(Array.from(map.values())).normalized);
      if (prodChanged || merged.length !== localList.length) {
        this.saveProductsLocalOnly(merged);
        anyChanged = true;
      }
    }

    if (Array.isArray(incoming.pdfs) && incoming.pdfs.length > 0) {
      const deletedSet = getLocalDeletedPdfIds();
      const localList = harvestAllLocalPdfs().pdfs;
      const map = new Map<string, PdfDocument>();

      for (const pdf of localList) {
        if (pdf && pdf.id && !deletedSet.has(pdf.id)) {
          map.set(pdf.id, pdf);
        }
      }

      let pdfChanged = false;
      for (const inc of incoming.pdfs) {
        if (!inc || !inc.id || deletedSet.has(inc.id)) continue;
        const { fileData, ...cleanInc } = inc;
        const prev = map.get(cleanInc.id);
        if (!prev) {
          map.set(cleanInc.id, cleanInc);
          pdfChanged = true;
        } else {
          const prevTime = Number(prev.updatedAt || 0);
          const incTime = Number(cleanInc.updatedAt || 0);
          if (incTime > prevTime) {
            map.set(cleanInc.id, cleanInc);
            pdfChanged = true;
          }
        }
      }

      const merged = sortPdfsCanonical(Array.from(map.values()));
      if (pdfChanged || merged.length !== localList.length) {
        this.savePdfsLocalOnly(merged);
        anyChanged = true;
      }
    }

    if (anyChanged) {
      notifyPageUpdate('all');
    }
    return anyChanged;
  },

  getProducts(): Product[] {
    try {
      const { products, changed } = harvestAllLocalProducts();
      if (changed) {
        this.saveProductsLocalOnly(products);
      }
      return [...products];
    } catch (e) {
      console.error('Error reading products from localStorage:', e);
      return [...INITIAL_PRODUCTS];
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

  saveProducts(products: Product[], deletedProductId?: string, noticeMsg?: string): boolean {
    if (deletedProductId) {
      addLocalDeletedProductIds([deletedProductId]);
      void recordDeletionInFirestore(deletedProductId, 'product');
    }
    const ok = this.saveProductsLocalOnly(products);
    pushStateToServer({ products, deletedProductId });
    notifyPageUpdate('products', noticeMsg || '¡Página actualizada con los cambios del producto!');
    return ok;
  },

  addProduct(product: Omit<Product, 'id'>): Product {
    const products = this.getProducts();
    const now = Date.now();
    const newProduct: Product = {
      ...product,
      id: `p-custom-${now}-${Math.random().toString(36).substring(2, 7)}`,
      updatedAt: now
    };
    const updated = [newProduct, ...products];
    this.saveProducts(
      updated,
      undefined,
      `¡Página actualizada! Producto "${newProduct.name}" guardado y sincronizado en todos los dispositivos.`
    );
    void upsertProductToFirestore(newProduct);
    return newProduct;
  },

  updateProduct(updatedProduct: Product): void {
    const products = this.getProducts();
    const stampedProduct: Product = {
      ...updatedProduct,
      updatedAt: Date.now()
    };
    const updated = products.map((p) => (p.id === stampedProduct.id ? stampedProduct : p));
    this.saveProducts(
      updated,
      undefined,
      `¡Página actualizada! Producto "${stampedProduct.name}" actualizado en todos los dispositivos.`
    );
    void upsertProductToFirestore(stampedProduct);
  },

  deleteProduct(id: string): void {
    const products = this.getProducts();
    const updated = products.filter((p) => p.id !== id);
    this.saveProducts(updated, id, '¡Página actualizada! Producto eliminado del catálogo.');
  },

  getPdfs(): PdfDocument[] {
    try {
      const { pdfs, changed } = harvestAllLocalPdfs();
      if (changed) {
        this.savePdfsLocalOnly(pdfs);
      }
      return [...pdfs];
    } catch (e) {
      console.error('Error reading PDFs from localStorage:', e);
      return [...INITIAL_PDFS];
    }
  },

  savePdfsLocalOnly(pdfs: PdfDocument[]): boolean {
    try {
      const sanitizedPdfs = pdfs.map((pdf) => {
        const { fileData, ...rest } = pdf;
        return {
          ...rest,
          title: (rest.title || 'Documento PDF').trim(),
          price: Number(rest.price) === 0 ? 0 : 20,
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

  savePdfs(pdfs: PdfDocument[], deletedPdfId?: string, noticeMsg?: string): boolean {
    if (deletedPdfId) {
      addLocalDeletedPdfIds([deletedPdfId]);
      void recordDeletionInFirestore(deletedPdfId, 'pdf');
    }
    const ok = this.savePdfsLocalOnly(pdfs);
    const sanitized = this.getPdfs();
    pushStateToServer({ pdfs: sanitized, deletedPdfId });
    notifyPageUpdate('pdfs', noticeMsg || '¡Página actualizada con los cambios del PDF!');
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

      const now = Date.now();
      const chosenPrice = Number(pdf.price) === 0 ? 0 : 20;
      const cleanTitle = (pdf.title || 'Documento PDF').trim();
      const cleanKey = (pdf.downloadKey || generateRandomDownloadKey()).trim().toUpperCase();
      const uniqueSuffix = `${now}-${Math.random().toString(36).substring(2, 9)}`;

      const newPdf: PdfDocument = {
        ...pdf,
        title: cleanTitle,
        price: chosenPrice,
        downloadKey: cleanKey,
        id: `pdf-${uniqueSuffix}`,
        uploadedAt: new Date().toISOString().split('T')[0],
        updatedAt: now
      };

      const updated = [newPdf, ...pdfs];
      const saved = this.savePdfs(
        updated,
        undefined,
        `¡Página actualizada! PDF "${newPdf.title}" guardado y sincronizado en Laptop, Celular e iOS.`
      );
      if (!saved) {
        return {
          success: false,
          message: 'Error al guardar el PDF en la memoria local.'
        };
      }
      void upsertPdfToFirestore(newPdf);
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
      const baseNow = Date.now();
      const createdPdfs: PdfDocument[] = pdfList.map((pdf, idx) => {
        const chosenPrice = Number(pdf.price) === 0 ? 0 : 20;
        const cleanTitle = (pdf.title || `Documento PDF ${idx + 1}`).trim();
        const cleanKey = (pdf.downloadKey || generateRandomDownloadKey()).trim().toUpperCase();
        const itemTime = baseNow + idx;
        const uniqueSuffix = `${itemTime}-${idx}-${Math.random().toString(36).substring(2, 9)}`;

        return {
          ...pdf,
          title: cleanTitle,
          price: chosenPrice,
          downloadKey: cleanKey,
          id: `pdf-${uniqueSuffix}`,
          uploadedAt: today,
          updatedAt: itemTime
        };
      });

      const updated = [...createdPdfs, ...currentPdfs];
      const saved = this.savePdfs(
        updated,
        undefined,
        createdPdfs.length === 1
          ? `¡Página actualizada! PDF "${createdPdfs[0].title}" guardado y sincronizado.`
          : `¡Página actualizada! Se guardaron y sincronizaron ${createdPdfs.length} archivos PDF.`
      );
      if (!saved) {
        return {
          success: false,
          message: 'Error al guardar los PDFs en la memoria local.',
          addedPdfs: []
        };
      }

      for (const created of createdPdfs) {
        void upsertPdfToFirestore(created);
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
    const now = Date.now();
    const stampedPdf: PdfDocument = {
      ...updatedPdf,
      title: cleanTitle,
      price: cleanPrice,
      downloadKey: cleanKey,
      updatedAt: now
    };
    const updated = pdfs.map((p) => (p.id === stampedPdf.id ? stampedPdf : p));
    this.savePdfs(
      updated,
      undefined,
      `¡Página actualizada! PDF "${cleanTitle}" actualizado en todos los dispositivos.`
    );
    void upsertPdfToFirestore(stampedPdf);
  },

  deletePdf(id: string): void {
    const pdfs = this.getPdfs();
    const updated = pdfs.filter((p) => p.id !== id);
    this.savePdfs(updated, id, '¡Página actualizada! PDF eliminado.');
  },

  resetDefaults(): void {
    try {
      localStorage.removeItem(DELETED_PRODUCTS_KEY);
      localStorage.removeItem(DELETED_PDFS_KEY);
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem(PDFS_KEY, JSON.stringify(INITIAL_PDFS));
      notifyPageUpdate('all', '¡Página actualizada con los datos originales!');
      void fetch('/api/reset-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ products: INITIAL_PRODUCTS, pdfs: INITIAL_PDFS })
      }).catch(() => {});
    } catch (e) {
      console.error('Error resetting default data:', e);
    }
  },

  /**
   * Non-destructive cross-device sync (Laptop, Android, iOS):
   * 1. Recovers any orphaned PDF binaries in local IndexedDB on this device.
   * 2. Harvests all products & PDFs from all local storage keys on this device.
   * 3. Sends them to /api/sync to union-merge with the central store.
   * 4. Merges the unified result locally and syncs with Firebase Cloud Firestore.
   */
  async syncWithServer(): Promise<{
    products: Product[];
    pdfs: PdfDocument[];
    presence?: MultiUserPresence;
  } | null> {
    try {
      this.startFirestoreRealtimeSync();

      let localProducts = this.getProducts();
      let localPdfs = this.getPdfs();

      // Recover any PDF blobs stored in IndexedDB on this device whose metadata was previously lost
      const knownPdfIds = new Set(localPdfs.map((p) => p.id));
      const deletedPdfIds = getLocalDeletedPdfIds();
      const recoveredBlobs = await pdfFileStore.recoverOrphanedIdbPdfs(knownPdfIds, deletedPdfIds);
      if (recoveredBlobs.length > 0) {
        const recoveredDocs: PdfDocument[] = recoveredBlobs.map((b, idx) => ({
          id: b.id,
          title: `Catálogo PDF Recuperado #${idx + 1}`,
          description: `Documento PDF (${b.pagesCount} páginas detectadas automáticamente).`,
          pagesCount: b.pagesCount,
          price: 20,
          downloadKey: generateRandomDownloadKey(),
          uploadedAt: new Date().toISOString().split('T')[0],
          fileSize: b.fileSizeFormatted,
          category: 'Catálogo Oficial',
          updatedAt: getTimestampFromId(b.id) || Date.now()
        }));
        localPdfs = sortPdfsCanonical([...recoveredDocs, ...localPdfs]);
        this.savePdfsLocalOnly(localPdfs);
      }

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          products: localProducts,
          pdfs: localPdfs
        })
      });
      if (!res.ok) return null;
      const data = await res.json();

      this.mergeIncomingServerData({
        products: data.products,
        pdfs: data.pdfs,
        deletedProductIds: data.deletedProductIds,
        deletedPdfIds: data.deletedPdfIds
      });

      const mergedPdfs = this.getPdfs();
      const storedPdfIds = Array.isArray(data.storedPdfIds) ? data.storedPdfIds : [];
      void pdfFileStore.syncLocalBlobsToServer(
        mergedPdfs.map((p) => p.id),
        storedPdfIds
      );

      if (auth.currentUser?.emailVerified) {
        void this.syncAllToFirestoreCloud();
      }

      return {
        products: this.getProducts(),
        pdfs: mergedPdfs,
        presence: data.presence
      };
    } catch {
      return null;
    }
  },

  isAdminUnlocked(): boolean {
    try {
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
        cache: 'no-store',
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
