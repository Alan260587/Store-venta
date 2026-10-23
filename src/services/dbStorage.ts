import { Product, PdfDocument, MultiUserPresence } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { INITIAL_PDFS, PROTECTED_DEFAULT_PDF_IDS, REMOVED_DEFAULT_PDF_IDS } from '../data/initialPdfs';
import { pdfFileStore } from './pdfFileStore';
import {
  db,
  auth,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  OperationType,
  handleFirestoreError
} from '../firebase';

const PRODUCTS_STORAGE_KEY = 'shelo_nabel_products_v2';
const PDFS_STORAGE_KEY = 'shelo_nabel_official_catalog_v4';
const DELETED_PRODUCTS_KEY = 'shelo_nabel_deleted_products_v1';
const DELETED_PDFS_KEY = 'shelo_nabel_deleted_pdfs_v1';

// Legacy storage keys from older versions
const LEGACY_PRODUCT_KEYS = ['shelo_nabel_products_v1', 'shelo_nabel_products', 'products'];
const LEGACY_PDF_KEYS = ['shelo_nabel_pdfs_v2', 'shelo_nabel_pdfs_v1', 'shelo_nabel_pdfs', 'pdfs'];

// Strictly isolated per-tab session keys so Admin login ONLY unlocks that specific tab
// and automatically logs out when closing the page
const SESSION_ADMIN_UNLOCKED_KEY = 'shelo_admin_session_active_v2';
const SESSION_CLIENT_ID_KEY = 'shelo_session_client_id_v1';

// Unified Admin Passcode across ALL devices (Laptop, Android, iOS, Tablet)
const UNIFIED_ADMIN_KEY = '1987';
const SECONDARY_ADMIN_KEY = '2026';
const MAX_PDF_LIMIT = 500;

const initialProductsMap = new Map<string, Product>(
  INITIAL_PRODUCTS.map((p) => [p.id, p])
);
const initialPdfsMap = new Map<string, PdfDocument>(
  INITIAL_PDFS.map((p) => [p.id, p])
);
const protectedPdfIdsSet = new Set<string>(PROTECTED_DEFAULT_PDF_IDS);

let firestoreUnsubscribers: Array<() => void> = [];
let isReconcilingFirestore = false;

function sanitizeDocId(rawId: string): string {
  return String(rawId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
}

function getDeviceAuthorUid(): string {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  try {
    const cid = sessionStorage.getItem(SESSION_CLIENT_ID_KEY);
    if (cid) return cid.slice(0, 120);
  } catch {
    // ignore
  }
  return 'admin_device_sync';
}

function getTimestampFromId(id: string): number {
  const match = String(id || '').match(/(\d{13})/);
  return match ? Number(match[1]) : 0;
}

function isProductCustomOrModified(item: Product): boolean {
  const def = initialProductsMap.get(item.id);
  if (!def) return true;
  return (
    item.name !== def.name ||
    Number(item.price) !== Number(def.price) ||
    item.description !== def.description ||
    item.image !== def.image ||
    item.size !== def.size ||
    item.category !== def.category
  );
}

function isPdfCustomOrModified(item: PdfDocument): boolean {
  const def = initialPdfsMap.get(item.id);
  if (!def) return true;
  return (
    item.title !== def.title ||
    Number(item.price) !== Number(def.price) ||
    item.downloadKey !== def.downloadKey ||
    item.description !== def.description ||
    item.category !== def.category
  );
}

/**
 * Generates an automatic Download Key for $20 pesos PDFs (e.g. SN-4829)
 */
export function generateRandomDownloadKey(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `SN-${digits}`;
}

/**
 * Normalizes any passcode entered on Laptop, Android, iOS, or Tablet keyboards
 */
export function normalizeAdminKeyInput(input: string): string {
  return String(input || '')
    .replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '')
    .trim();
}

export function verifyAdminKeyInput(input: string): boolean {
  const normalized = normalizeAdminKeyInput(input);
  return normalized === UNIFIED_ADMIN_KEY || normalized === SECONDARY_ADMIN_KEY;
}

/**
 * Dispatches an in-page event so React components immediately re-render
 * whenever a Product or PDF is saved, updated, or deleted.
 */
function notifyPageUpdate(type: 'product' | 'pdf' | 'sync' | 'reset', message?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('shelo-db-updated', {
        detail: { type, message, timestamp: Date.now() }
      })
    );
  }
}

function getDeletedIds(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveDeletedIds(storageKey: string, ids: string[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    // ignore
  }
}

function readLegacyArray<T>(keys: string[]): T[] {
  const collected: T[] = [];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          collected.push(...parsed);
        }
      }
    } catch {
      // ignore
    }
  }
  return collected;
}

/**
 * Non-destructively merges two Product lists, respecting deleted IDs and keeping newest edits
 */
function mergeProductLists(
  listA: Product[],
  listB: Product[],
  deletedIds: string[]
): Product[] {
  const deletedSet = new Set(deletedIds);
  const map = new Map<string, Product>();

  const processItem = (item: Product) => {
    if (!item || !item.id || deletedSet.has(item.id)) return;
    let normalized = item;
    if (item.id === 'school-01') {
      const defaultFolder = initialProductsMap.get('school-01');
      if (defaultFolder) {
        normalized = {
          ...defaultFolder,
          ...item,
          name: item.name === 'Cuadernos Escolares' ? defaultFolder.name : (item.name || defaultFolder.name),
          availableColors: item.availableColors || defaultFolder.availableColors
        };
      }
    }

    const existing = map.get(normalized.id);
    if (!existing) {
      map.set(normalized.id, normalized);
    } else {
      const existingTime = Number(existing.updatedAt || getTimestampFromId(existing.id) || 0);
      const newTime = Number(normalized.updatedAt || getTimestampFromId(normalized.id) || 0);
      if (newTime > existingTime) {
        map.set(normalized.id, normalized);
      } else if (newTime === existingTime && JSON.stringify(existing) !== JSON.stringify(normalized)) {
        if (isProductCustomOrModified(normalized) && !isProductCustomOrModified(existing)) {
          map.set(normalized.id, normalized);
        }
      }
    }
  };

  for (const p of listA) processItem(p);
  for (const p of listB) processItem(p);
  for (const initP of INITIAL_PRODUCTS) {
    if (!deletedSet.has(initP.id) && !map.has(initP.id)) {
      map.set(initP.id, initP);
    }
  }

  const allItems = Array.from(map.values());
  const initialIdsOrder = new Map<string, number>(
    INITIAL_PRODUCTS.map((p, idx) => [p.id, idx])
  );

  allItems.sort((a, b) => {
    const aIsInit = initialIdsOrder.has(a.id);
    const bIsInit = initialIdsOrder.has(b.id);
    if (!aIsInit && bIsInit) return -1;
    if (aIsInit && !bIsInit) return 1;
    if (!aIsInit && !bIsInit) {
      const timeB = Number(b.updatedAt || 0) || getTimestampFromId(b.id);
      const timeA = Number(a.updatedAt || 0) || getTimestampFromId(a.id);
      return timeB - timeA;
    }
    return (initialIdsOrder.get(a.id) ?? 0) - (initialIdsOrder.get(b.id) ?? 0);
  });

  return allItems;
}

/**
 * Non-destructively merges two PdfDocument lists, respecting deleted IDs and keeping newest edits
 */
function mergePdfLists(
  listA: PdfDocument[],
  listB: PdfDocument[],
  deletedIds: string[]
): PdfDocument[] {
  const deletedSet = new Set(
    [...REMOVED_DEFAULT_PDF_IDS, ...deletedIds].filter((id) => !protectedPdfIdsSet.has(id))
  );
  const map = new Map<string, PdfDocument>();

  const normalizePdf = (raw: PdfDocument): PdfDocument => {
    const { fileData, ...rest } = raw;
    return {
      ...rest,
      price: 0,
      downloadKey: 'GRATIS',
      category: 'Catálogo Oficial'
    };
  };

  const processPdf = (raw: PdfDocument) => {
    if (!raw || !raw.id || deletedSet.has(raw.id) || String(raw.id).startsWith('pdf-')) return;
    const item = normalizePdf(raw);
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const existingTime = Number(existing.updatedAt || getTimestampFromId(existing.id) || 0);
      const newTime = Number(item.updatedAt || getTimestampFromId(item.id) || 0);
      if (newTime > existingTime) {
        map.set(item.id, item);
      } else if (newTime === existingTime && JSON.stringify(existing) !== JSON.stringify(item)) {
        if (isPdfCustomOrModified(item) && !isPdfCustomOrModified(existing)) {
          map.set(item.id, item);
        }
      }
    }
  };

  for (const p of listA) processPdf(p);
  for (const p of listB) processPdf(p);
  for (const initPdf of INITIAL_PDFS) {
    if (!deletedSet.has(initPdf.id) && !map.has(initPdf.id)) {
      map.set(initPdf.id, normalizePdf(initPdf));
    }
  }

  const allPdfs = Array.from(map.values());
  const protectedOrder = new Map<string, number>(
    PROTECTED_DEFAULT_PDF_IDS.map((id, idx) => [id, idx])
  );

  allPdfs.sort((a, b) => {
    const aIsProt = protectedOrder.has(a.id);
    const bIsProt = protectedOrder.has(b.id);
    if (!aIsProt && bIsProt) return -1;
    if (aIsProt && !bIsProt) return 1;
    if (!aIsProt && !bIsProt) {
      const timeB = Number(b.updatedAt || 0) || getTimestampFromId(b.id);
      const timeA = Number(a.updatedAt || 0) || getTimestampFromId(a.id);
      return timeB - timeA;
    }
    return (protectedOrder.get(a.id) ?? 0) - (protectedOrder.get(b.id) ?? 0);
  });

  return allPdfs.slice(0, MAX_PDF_LIMIT);
}

/**
 * Push current state / updates to the shared Multi-User Server (Laptop, Android, iOS, Tablet)
 */
async function pushUpdateToServer(payload: {
  products?: Product[];
  pdfs?: PdfDocument[];
  deletedProductId?: string;
  deletedPdfId?: string;
}): Promise<void> {
  try {
    const res = await fetch('/api/update-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (Array.isArray(data.products) || Array.isArray(data.pdfs))) {
        dbStorage.mergeIncomingServerData({
          products: data.products,
          pdfs: data.pdfs,
          deletedProductIds: data.deletedProductIds,
          deletedPdfIds: data.deletedPdfIds
        });
      }
    }
  } catch {
    // Offline or static host fallback — Firestore handles persistence directly
  }
}

/**
 * Automatically saves or updates a Product in Firebase Cloud Firestore immediately on "Guardar"
 * without requiring manual Google sign-in or manual sync.
 */
async function upsertProductToFirestore(product: Product): Promise<void> {
  const docId = sanitizeDocId(product.id);
  if (!docId) return;

  const updatedAtMs = Number(product.updatedAt || getTimestampFromId(product.id) || 1);
  const payload: Record<string, unknown> = {
    id: docId,
    clave: String(product.clave || 'S000').slice(0, 40),
    name: String(product.name || 'Producto Sheló NABEL').slice(0, 200),
    price: Math.max(0, Math.min(1000000, Number(product.price) || 0)),
    size: String(product.size || '1 pza').slice(0, 80),
    category: String(product.category || 'Cuidado Corporal').slice(0, 80),
    description: String(product.description || 'Producto oficial Sheló NABEL.').slice(0, 1500),
    image: String(product.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80').slice(0, 900000),
    isStarProduct: Boolean(product.isStarProduct),
    isNew: Boolean(product.isNew),
    visibility: 'public',
    authorUid: getDeviceAuthorUid(),
    adminKey: UNIFIED_ADMIN_KEY,
    updatedAtMs,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'products', docId), payload);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Quota limit exceeded') || msg.includes('Quota exceeded') || msg.includes('resource-exhausted')) {
      console.warn('Firestore daily free quota reached; backend server.ts continues syncing across all devices.');
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `products/${docId}`);
  }
}

/**
 * Automatically saves or updates a PdfDocument in Firebase Cloud Firestore immediately on "Guardar"
 * without requiring manual Google sign-in or manual sync.
 */
async function upsertPdfToFirestore(pdf: PdfDocument): Promise<void> {
  const docId = sanitizeDocId(pdf.id);
  if (!docId) return;

  const cleanPrice = Number(pdf.price) === 0 ? 0 : 20;
  const updatedAtMs = Number(pdf.updatedAt || getTimestampFromId(pdf.id) || 1);
  const payload: Record<string, unknown> = {
    id: docId,
    title: String(pdf.title || 'Catálogo PDF').slice(0, 250),
    description: String(pdf.description || 'Documento PDF oficial.').slice(0, 1500),
    pagesCount: Math.max(1, Math.min(5000, Number(pdf.pagesCount) || 1)),
    price: cleanPrice,
    downloadKey: String(pdf.downloadKey || 'SN-2026').slice(0, 60),
    uploadedAt: String(pdf.uploadedAt || new Date().toISOString().split('T')[0]).slice(0, 40),
    fileSize: String(pdf.fileSize || '1.0 MB').slice(0, 40),
    category: String(pdf.category || 'Catálogo Oficial').slice(0, 100),
    visibility: 'public',
    authorUid: getDeviceAuthorUid(),
    adminKey: UNIFIED_ADMIN_KEY,
    updatedAtMs,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'pdfs', docId), payload);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Quota limit exceeded') || msg.includes('Quota exceeded') || msg.includes('resource-exhausted')) {
      console.warn('Firestore daily free quota reached; backend server.ts continues syncing across all devices.');
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `pdfs/${docId}`);
  }
}

/**
 * Records a deletion tombstone in Firebase Cloud Firestore so deleted items stay deleted across all devices
 */
async function recordDeletionInFirestore(id: string, itemType: 'product' | 'pdf'): Promise<void> {
  if (itemType === 'pdf' && protectedPdfIdsSet.has(id)) return;
  const docId = sanitizeDocId(id);
  if (!docId) return;

  const tombstonePayload = {
    id: docId,
    itemType,
    visibility: 'public',
    authorUid: getDeviceAuthorUid(),
    adminKey: UNIFIED_ADMIN_KEY,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'deletedItems', docId), tombstonePayload);
    const colName = itemType === 'product' ? 'products' : 'pdfs';
    await deleteDoc(doc(db, colName, docId));
  } catch {
    // Tombstone creation is primary
  }
}

export const dbStorage = {
  /**
   * Returns a unique client ID for THIS specific browser tab session
   */
  getSessionClientId: (): string => {
    try {
      let cid = sessionStorage.getItem(SESSION_CLIENT_ID_KEY);
      if (!cid) {
        cid = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem(SESSION_CLIENT_ID_KEY, cid);
      }
      return cid;
    } catch {
      return `client-fallback-${Math.random().toString(36).substring(2, 9)}`;
    }
  },

  /**
   * Cloud-First Server Sync:
   * 1) Pulls canonical state & deleted IDs from `/api/state` FIRST so stale local items never resurrect deleted items.
   * 2) Merges server state into local storage.
   * 3) Pushes any newer/custom local items to `/api/sync`.
   */
  syncWithServer: async (): Promise<{
    products: Product[];
    pdfs: PdfDocument[];
    presence?: MultiUserPresence;
  } | null> => {
    try {
      // Step 1: Pull latest state from backend first
      const stateRes = await fetch('/api/state', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (stateRes.ok) {
        const stateData = await stateRes.json();
        dbStorage.mergeIncomingServerData({
          products: stateData.products,
          pdfs: stateData.pdfs,
          deletedProductIds: stateData.deletedProductIds,
          deletedPdfIds: stateData.deletedPdfIds
        });
      }

      // Step 2: Now send merged local state to /api/sync so any newer local edits are shared
      const localProducts = dbStorage.getProducts();
      const localPdfs = dbStorage.getPdfs();

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          products: localProducts,
          pdfs: localPdfs
        })
      });

      if (!res.ok) {
        return {
          products: dbStorage.getProducts(),
          pdfs: dbStorage.getPdfs()
        };
      }
      const data = await res.json();

      dbStorage.mergeIncomingServerData({
        products: data.products,
        pdfs: data.pdfs,
        deletedProductIds: data.deletedProductIds,
        deletedPdfIds: data.deletedPdfIds
      });

      const storedPdfIds = Array.isArray(data.storedPdfIds) ? data.storedPdfIds : [];
      void pdfFileStore.syncLocalFilesToServer(storedPdfIds);

      return {
        products: dbStorage.getProducts(),
        pdfs: dbStorage.getPdfs(),
        presence: data.presence
      };
    } catch {
      return {
        products: dbStorage.getProducts(),
        pdfs: dbStorage.getPdfs()
      };
    }
  },

  /**
   * Merges incoming server or Firestore data with local storage, strictly enforcing deleted IDs first
   */
  mergeIncomingServerData: (data: {
    products?: Product[];
    pdfs?: PdfDocument[];
    deletedProductIds?: string[];
    deletedPdfIds?: string[];
  }): void => {
    try {
      const prevDeletedProds = getDeletedIds(DELETED_PRODUCTS_KEY);
      const prevDeletedPdfs = getDeletedIds(DELETED_PDFS_KEY);

      const deletedProds = Array.from(
        new Set([
          ...prevDeletedProds,
          ...(Array.isArray(data.deletedProductIds) ? data.deletedProductIds : [])
        ])
      );
      const deletedPdfs = Array.from(
        new Set(
          [
            ...REMOVED_DEFAULT_PDF_IDS,
            ...prevDeletedPdfs,
            ...(Array.isArray(data.deletedPdfIds) ? data.deletedPdfIds : [])
          ].filter((id) => !protectedPdfIdsSet.has(id))
        )
      );

      saveDeletedIds(DELETED_PRODUCTS_KEY, deletedProds);
      saveDeletedIds(DELETED_PDFS_KEY, deletedPdfs);

      let hasChanges =
        deletedProds.length !== prevDeletedProds.length ||
        deletedPdfs.length !== prevDeletedPdfs.length;

      const currentLocalProds = dbStorage.getProducts();
      const incomingProds = Array.isArray(data.products) ? data.products : [];
      if (incomingProds.length > 0 || hasChanges) {
        const mergedProds = mergeProductLists(currentLocalProds, incomingProds, deletedProds);
        if (JSON.stringify(currentLocalProds) !== JSON.stringify(mergedProds)) {
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(mergedProds));
          hasChanges = true;
        }
      }

      const currentLocalPdfs = dbStorage.getPdfs();
      const incomingPdfs = Array.isArray(data.pdfs) ? data.pdfs : [];
      if (incomingPdfs.length > 0 || hasChanges) {
        const mergedPdfs = mergePdfLists(currentLocalPdfs, incomingPdfs, deletedPdfs);
        if (JSON.stringify(currentLocalPdfs) !== JSON.stringify(mergedPdfs)) {
          localStorage.setItem(PDFS_STORAGE_KEY, JSON.stringify(mergedPdfs));
          hasChanges = true;
        }
      }

      if (hasChanges) {
        notifyPageUpdate('sync');
      }
    } catch {
      // ignore storage quota errors
    }
  },

  /**
   * Starts real-time Firebase Cloud Firestore listeners (`onSnapshot`) for `/deletedItems`, `/products`,
   * and `/pdfs`, and performs an ordered Cloud-First Pull & Delta Push on boot so every computer,
   * Android, iOS, and Tablet immediately displays the exact same products and PDFs!
   */
  startFirestoreRealtimeSync: (): (() => void) => {
    for (const unsub of firestoreUnsubscribers) {
      try {
        unsub();
      } catch {
        // ignore
      }
    }
    firestoreUnsubscribers = [];

    // Ordered Cloud-First Pull & Delta Push
    void dbStorage.reconcileWithFirestoreCloud();

    try {
      const deletedQuery = query(
        collection(db, 'deletedItems'),
        where('visibility', '==', 'public')
      );
      const unsubDeleted = onSnapshot(
        deletedQuery,
        (snapshot) => {
          const remoteDeletedProducts: string[] = [];
          const remoteDeletedPdfs: string[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            if (d && typeof d.id === 'string') {
              if (d.itemType === 'product') remoteDeletedProducts.push(d.id);
              if (d.itemType === 'pdf' && !protectedPdfIdsSet.has(d.id)) {
                remoteDeletedPdfs.push(d.id);
              }
            }
          });
          if (remoteDeletedProducts.length > 0 || remoteDeletedPdfs.length > 0) {
            dbStorage.mergeIncomingServerData({
              deletedProductIds: remoteDeletedProducts,
              deletedPdfIds: remoteDeletedPdfs
            });
          }
        },
        (error) => {
          console.warn('Firestore deletedItems listener notice:', error);
        }
      );

      const productsQuery = query(
        collection(db, 'products'),
        where('visibility', '==', 'public')
      );
      const unsubProducts = onSnapshot(
        productsQuery,
        (snapshot) => {
          const remoteProducts: Product[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            if (d && typeof d.id === 'string' && typeof d.name === 'string') {
              remoteProducts.push({
                id: d.id,
                clave: String(d.clave || 'S000'),
                name: d.name,
                price: Number(d.price) || 0,
                size: String(d.size || '1 pza'),
                category: (d.category as Product['category']) || 'Cuidado Corporal',
                description: String(d.description || ''),
                image: String(d.image || ''),
                isStarProduct: Boolean(d.isStarProduct),
                isNew: Boolean(d.isNew),
                updatedAt: Number(d.updatedAtMs || getTimestampFromId(d.id) || 1)
              });
            }
          });
          if (remoteProducts.length > 0) {
            dbStorage.mergeIncomingServerData({ products: remoteProducts });
          }
        },
        (error) => {
          console.warn('Firestore products listener notice:', error);
        }
      );

      const pdfsQuery = query(
        collection(db, 'pdfs'),
        where('visibility', '==', 'public')
      );
      const unsubPdfs = onSnapshot(
        pdfsQuery,
        (snapshot) => {
          const remotePdfs: PdfDocument[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            if (d && typeof d.id === 'string' && typeof d.title === 'string') {
              remotePdfs.push({
                id: d.id,
                title: d.title,
                description: String(d.description || ''),
                pagesCount: Number(d.pagesCount) || 1,
                price: Number(d.price) === 0 ? 0 : 20,
                downloadKey: String(d.downloadKey || 'SN-2026'),
                uploadedAt: String(d.uploadedAt || ''),
                fileSize: String(d.fileSize || '1.0 MB'),
                category: String(d.category || 'Catálogo Oficial'),
                updatedAt: Number(d.updatedAtMs || getTimestampFromId(d.id) || 1)
              });
            }
          });
          if (remotePdfs.length > 0) {
            dbStorage.mergeIncomingServerData({ pdfs: remotePdfs });
          }
        },
        (error) => {
          console.warn('Firestore pdfs listener notice:', error);
        }
      );

      firestoreUnsubscribers.push(unsubDeleted, unsubProducts, unsubPdfs);
    } catch (e) {
      console.warn('Could not initialize Firestore listeners:', e);
    }

    return () => {
      for (const unsub of firestoreUnsubscribers) {
        try {
          unsub();
        } catch {
          // ignore
        }
      }
      firestoreUnsubscribers = [];
    };
  },

  /**
   * Ordered Cloud-First Reconciliation with Firebase Cloud Firestore:
   * 1) Fetches `/deletedItems`, `/products`, and `/pdfs` from Firestore first.
   * 2) Applies deletions and merges newer cloud items into localStorage.
   * 3) Pushes ONLY non-deleted local items that are missing in Firestore or strictly newer than Firestore.
   */
  reconcileWithFirestoreCloud: async (): Promise<void> => {
    if (isReconcilingFirestore) return;
    isReconcilingFirestore = true;
    try {
      const [delSnap, prodSnap, pdfSnap] = await Promise.all([
        getDocs(query(collection(db, 'deletedItems'), where('visibility', '==', 'public'))),
        getDocs(query(collection(db, 'products'), where('visibility', '==', 'public'))),
        getDocs(query(collection(db, 'pdfs'), where('visibility', '==', 'public')))
      ]);

      const remoteDeletedProducts: string[] = [];
      const remoteDeletedPdfs: string[] = [];
      delSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && typeof d.id === 'string') {
          if (d.itemType === 'product') remoteDeletedProducts.push(d.id);
          if (d.itemType === 'pdf' && !protectedPdfIdsSet.has(d.id)) {
            remoteDeletedPdfs.push(d.id);
          }
        }
      });

      const remoteProductsMap = new Map<string, Product>();
      prodSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && typeof d.id === 'string' && typeof d.name === 'string') {
          remoteProductsMap.set(d.id, {
            id: d.id,
            clave: String(d.clave || 'S000'),
            name: d.name,
            price: Number(d.price) || 0,
            size: String(d.size || '1 pza'),
            category: (d.category as Product['category']) || 'Cuidado Corporal',
            description: String(d.description || ''),
            image: String(d.image || ''),
            isStarProduct: Boolean(d.isStarProduct),
            isNew: Boolean(d.isNew),
            updatedAt: Number(d.updatedAtMs || getTimestampFromId(d.id) || 1)
          });
        }
      });

      const remotePdfsMap = new Map<string, PdfDocument>();
      pdfSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && typeof d.id === 'string' && typeof d.title === 'string') {
          remotePdfsMap.set(d.id, {
            id: d.id,
            title: d.title,
            description: String(d.description || ''),
            pagesCount: Number(d.pagesCount) || 1,
            price: Number(d.price) === 0 ? 0 : 20,
            downloadKey: String(d.downloadKey || 'SN-2026'),
            uploadedAt: String(d.uploadedAt || ''),
            fileSize: String(d.fileSize || '1.0 MB'),
            category: String(d.category || 'Catálogo Oficial'),
            updatedAt: Number(d.updatedAtMs || getTimestampFromId(d.id) || 1)
          });
        }
      });

      // Step 1: Merge remote deletions and remote items into localStorage first
      dbStorage.mergeIncomingServerData({
        products: Array.from(remoteProductsMap.values()),
        pdfs: Array.from(remotePdfsMap.values()),
        deletedProductIds: remoteDeletedProducts,
        deletedPdfIds: remoteDeletedPdfs
      });

      // Step 2: Push any local deletions not yet in Firestore
      const localDeletedProds = getDeletedIds(DELETED_PRODUCTS_KEY);
      const localDeletedPdfs = getDeletedIds(DELETED_PDFS_KEY);
      const remoteDelSet = new Set([...remoteDeletedProducts, ...remoteDeletedPdfs]);

      for (const delId of localDeletedProds) {
        if (!remoteDelSet.has(delId)) {
          await recordDeletionInFirestore(delId, 'product');
        }
      }
      for (const delId of localDeletedPdfs) {
        if (!remoteDelSet.has(delId) && !protectedPdfIdsSet.has(delId)) {
          await recordDeletionInFirestore(delId, 'pdf');
        }
      }

      // Step 3: Push ONLY custom/modified non-deleted local items that are missing in Firestore or strictly newer than Firestore
      const mergedProducts = dbStorage.getProducts().filter(isProductCustomOrModified);
      const mergedPdfs = dbStorage.getPdfs();

      for (const prod of mergedProducts) {
        const rem = remoteProductsMap.get(prod.id);
        const localTime = Number(prod.updatedAt || getTimestampFromId(prod.id) || 0);
        const remTime = rem ? Number(rem.updatedAt || 0) : -1;
        if (!rem || localTime > remTime) {
          await upsertProductToFirestore(prod);
        }
      }

      for (const pdf of mergedPdfs) {
        const rem = remotePdfsMap.get(pdf.id);
        const localTime = Number(pdf.updatedAt || getTimestampFromId(pdf.id) || 0);
        const remTime = rem ? Number(rem.updatedAt || 0) : -1;
        if (!rem || localTime > remTime) {
          await upsertPdfToFirestore(pdf);
        }
      }

      await pdfFileStore.syncLocalFilesToServer();
    } catch (e) {
      console.warn('Firestore reconciliation notice:', e);
    } finally {
      isReconcilingFirestore = false;
    }
  },

  /**
   * Synchronizes all current Products and PDFs to Firebase Cloud Firestore
   */
  syncAllToFirestoreCloud: async (): Promise<void> => {
    await dbStorage.reconcileWithFirestoreCloud();
  },

  // --- PRODUCTS CRUD ---
  getProducts: (): Product[] => {
    try {
      const deletedIds = getDeletedIds(DELETED_PRODUCTS_KEY);
      const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      const currentList: Product[] = raw ? JSON.parse(raw) : [];
      const legacyList = readLegacyArray<Product>(LEGACY_PRODUCT_KEYS);

      const merged = mergeProductLists(currentList, legacyList, deletedIds);
      if (!raw || legacyList.length > 0) {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    } catch (e) {
      console.error('Error loading products from storage:', e);
    }
    return INITIAL_PRODUCTS;
  },

  saveProducts: (products: Product[]): void => {
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.error('Error saving products to storage:', e);
    }
  },

  addProduct: (newProduct: Omit<Product, 'id'>): Product => {
    const products = dbStorage.getProducts();
    const now = Date.now();
    const created: Product = {
      ...newProduct,
      id: `prod-${now}-${Math.random().toString(36).substring(2, 7)}`,
      updatedAt: now
    };
    const updated = [created, ...products];
    dbStorage.saveProducts(updated);
    notifyPageUpdate(
      'product',
      `¡Producto "${created.name}" guardado automáticamente en todos tus dispositivos (Backend + Firebase)!`
    );
    void pushUpdateToServer({ products: updated });
    void upsertProductToFirestore(created);
    return created;
  },

  updateProduct: (updatedProduct: Product): Product[] => {
    const products = dbStorage.getProducts();
    const stamped: Product = {
      ...updatedProduct,
      updatedAt: Date.now()
    };
    const updated = products.map((p) => (p.id === stamped.id ? stamped : p));
    dbStorage.saveProducts(updated);
    notifyPageUpdate(
      'product',
      `¡Producto "${stamped.name}" actualizado automáticamente en todos tus dispositivos (Backend + Firebase)!`
    );
    void pushUpdateToServer({ products: updated });
    void upsertProductToFirestore(stamped);
    return updated;
  },

  deleteProduct: (id: string): Product[] => {
    const deletedIds = getDeletedIds(DELETED_PRODUCTS_KEY);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      saveDeletedIds(DELETED_PRODUCTS_KEY, deletedIds);
    }
    const products = dbStorage.getProducts().filter((p) => p.id !== id);
    dbStorage.saveProducts(products);
    notifyPageUpdate('product', '¡Producto eliminado en todos tus dispositivos (Backend + Firebase)!');
    void pushUpdateToServer({ products, deletedProductId: id });
    void recordDeletionInFirestore(id, 'product');
    return products;
  },

  // --- CATALOG CRUD (100% Free Catalog with 5-Page Preview) ---
  getPdfs: (): PdfDocument[] => {
    try {
      // Purge any legacy book/PDF entries from older storage keys and record their IDs as deleted
      const legacyItems = readLegacyArray<PdfDocument>(LEGACY_PDF_KEYS);
      let existingDeleted = getDeletedIds(DELETED_PDFS_KEY);
      if (legacyItems.length > 0) {
        const legacyIds = legacyItems.map((item) => item?.id).filter(Boolean) as string[];
        existingDeleted = Array.from(new Set([...existingDeleted, ...legacyIds]));
        saveDeletedIds(DELETED_PDFS_KEY, existingDeleted);
        for (const k of LEGACY_PDF_KEYS) {
          try {
            localStorage.removeItem(k);
          } catch {
            // ignore
          }
        }
        for (const oldId of legacyIds) {
          void recordDeletionInFirestore(oldId, 'pdf');
          void pushUpdateToServer({ deletedPdfId: oldId });
        }
      }

      const deletedIds = Array.from(
        new Set([...REMOVED_DEFAULT_PDF_IDS, ...existingDeleted])
      );
      const raw = localStorage.getItem(PDFS_STORAGE_KEY);
      const currentList: PdfDocument[] = raw ? JSON.parse(raw) : [];

      const merged = mergePdfLists(currentList, [], deletedIds);
      if (!raw || currentList.length !== merged.length) {
        dbStorage.savePdfs(merged);
      }
      return merged;
    } catch (e) {
      console.error('Error loading Catalog from storage:', e);
    }
    return INITIAL_PDFS;
  },

  savePdfs: (pdfs: PdfDocument[]): boolean => {
    const stripped = pdfs.map(({ fileData, ...rest }) => ({
      ...rest,
      price: 0,
      downloadKey: 'GRATIS'
    }));
    try {
      localStorage.setItem(PDFS_STORAGE_KEY, JSON.stringify(stripped));
      return true;
    } catch (e) {
      console.error('Error saving Catalog to localStorage:', e);
      return false;
    }
  },

  addPdf: (
    newPdf: Omit<PdfDocument, 'id' | 'uploadedAt'>
  ): { success: boolean; message: string; pdf?: PdfDocument } => {
    const pdfs = dbStorage.getPdfs();
    const now = Date.now();
    const created: PdfDocument = {
      ...newPdf,
      price: 0,
      downloadKey: 'GRATIS',
      category: 'Catálogo Oficial',
      id: `cat-${now}-${Math.random().toString(36).substring(2, 7)}`,
      uploadedAt: new Date().toISOString().split('T')[0],
      updatedAt: now
    };

    const updated = [created, ...pdfs];
    dbStorage.savePdfs(updated);
    notifyPageUpdate(
      'pdf',
      `¡Catálogo "${created.title}" (Preview 5 Págs • Gratis) guardado en todos tus dispositivos!`
    );
    void pushUpdateToServer({ pdfs: updated });
    void upsertPdfToFirestore(created);

    return {
      success: true,
      message: 'Catálogo guardado y subido automáticamente a todos tus dispositivos.',
      pdf: created
    };
  },

  addPdfsBatch: (
    newPdfsList: Array<Omit<PdfDocument, 'id' | 'uploadedAt'>>
  ): { success: boolean; message: string; addedPdfs: PdfDocument[] } => {
    const currentPdfs = dbStorage.getPdfs();
    const nowStr = new Date().toISOString().split('T')[0];
    const baseTime = Date.now();
    const createdList: PdfDocument[] = newPdfsList.map((item, idx) => ({
      ...item,
      price: 0,
      downloadKey: 'GRATIS',
      category: 'Catálogo Oficial',
      id: `cat-${baseTime + idx}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      uploadedAt: nowStr,
      updatedAt: baseTime + idx
    }));

    const updated = [...createdList, ...currentPdfs];
    dbStorage.savePdfs(updated);
    notifyPageUpdate(
      'pdf',
      `¡Catálogo "${createdList[0]?.title || 'Oficial'}" (Preview 5 Págs • Gratis) guardado en todos tus dispositivos!`
    );
    void pushUpdateToServer({ pdfs: updated });
    for (const createdItem of createdList) {
      void upsertPdfToFirestore(createdItem);
    }

    return {
      success: true,
      message: 'Catálogo guardado y sincronizado automáticamente en todos tus equipos.',
      addedPdfs: createdList
    };
  },

  updatePdf: (updatedPdf: PdfDocument, options?: { silent?: boolean }): PdfDocument[] => {
    const pdfs = dbStorage.getPdfs();
    const normalized: PdfDocument = {
      ...updatedPdf,
      price: 0,
      downloadKey: 'GRATIS',
      category: 'Catálogo Oficial',
      updatedAt: Date.now()
    };

    const exists = pdfs.some((pdf) => pdf.id === normalized.id);
    const updated = exists
      ? pdfs.map((pdf) => (pdf.id === normalized.id ? normalized : pdf))
      : [normalized, ...pdfs];

    dbStorage.savePdfs(updated);
    notifyPageUpdate(
      'pdf',
      options?.silent
        ? undefined
        : `¡Catálogo "${normalized.title}" actualizado al momento en todos tus dispositivos!`
    );
    void pushUpdateToServer({ pdfs: updated });
    void upsertPdfToFirestore(normalized);
    return updated;
  },

  deletePdf: (id: string): PdfDocument[] => {
    // Protect the 17 core default PDFs so no default PDF is ever removed
    if (protectedPdfIdsSet.has(id)) {
      notifyPageUpdate('pdf', 'Los PDFs por defecto del catálogo están protegidos y no se eliminan.');
      return dbStorage.getPdfs();
    }
    const deletedIds = getDeletedIds(DELETED_PDFS_KEY);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      saveDeletedIds(DELETED_PDFS_KEY, deletedIds);
    }
    const pdfs = dbStorage.getPdfs().filter((pdf) => pdf.id !== id);
    dbStorage.savePdfs(pdfs);
    notifyPageUpdate('pdf', '¡PDF eliminado en todos tus dispositivos (Backend + Firebase)!');
    void pushUpdateToServer({ pdfs, deletedPdfId: id });
    void recordDeletionInFirestore(id, 'pdf');
    return pdfs;
  },

  // --- ADMIN AUTHENTICATION (Isolated per tab session & unified across Laptop/Android/iOS/Tablet) ---
  verifyAdminPasscode: (input: string): boolean => {
    const normalized = normalizeAdminKeyInput(input);
    return normalized === UNIFIED_ADMIN_KEY || normalized === SECONDARY_ADMIN_KEY;
  },

  isAdminUnlocked: (): boolean => {
    try {
      return sessionStorage.getItem(SESSION_ADMIN_UNLOCKED_KEY) === 'true';
    } catch {
      return false;
    }
  },

  setAdminUnlocked: (unlocked: boolean): void => {
    const clientId = dbStorage.getSessionClientId();
    try {
      if (unlocked) {
        sessionStorage.setItem(SESSION_ADMIN_UNLOCKED_KEY, 'true');
      } else {
        sessionStorage.removeItem(SESSION_ADMIN_UNLOCKED_KEY);
      }
      localStorage.removeItem('shelo_admin_unlocked_v1');
    } catch {
      // ignore
    }

    fetch('/api/presence/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        role: unlocked ? 'admin' : 'client'
      })
    }).catch(() => {});
  },

  resetDefaults: (): void => {
    localStorage.removeItem(DELETED_PRODUCTS_KEY);
    localStorage.removeItem(DELETED_PDFS_KEY);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(PDFS_STORAGE_KEY, JSON.stringify(INITIAL_PDFS));
    notifyPageUpdate('reset', '¡Datos predeterminados restaurados!');
    fetch('/api/reset-defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: INITIAL_PRODUCTS,
        pdfs: INITIAL_PDFS
      })
    }).catch(() => {});
  }
};
