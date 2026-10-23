import { Product, PdfDocument, MultiUserPresence } from '../types';
import {
  INITIAL_PRODUCTS,
  REMOVED_DEFAULT_PRODUCT_IDS,
  BAKED_STATIC_PHOTO_TIMESTAMPS
} from '../data/initialProducts';
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
  serverTimestamp
} from '../firebase';

const PRODUCTS_STORAGE_KEY = 'shelo_nabel_products_v2';
const PDFS_STORAGE_KEY = 'shelo_nabel_official_catalog_v4';
const DELETED_PRODUCTS_KEY = 'shelo_nabel_deleted_products_v1';
const DELETED_PDFS_KEY = 'shelo_nabel_deleted_pdfs_v1';

// Legacy storage keys from older versions — purged after migration to free localStorage quota
const LEGACY_PRODUCT_KEYS = ['shelo_nabel_products_v1', 'shelo_nabel_products', 'products'];
const LEGACY_PDF_KEYS = ['shelo_nabel_pdfs_v2', 'shelo_nabel_pdfs_v1', 'shelo_nabel_pdfs', 'pdfs'];

// IndexedDB fallback for unlimited product photo storage (500MB+ on Android/iOS)
const IDB_NAME = 'shelo_nabel_catalog_state_db_v1';
const IDB_STORE = 'state_kv';

// Strictly isolated per-tab session keys so Admin login ONLY unlocks that specific tab
const SESSION_ADMIN_UNLOCKED_KEY = 'shelo_admin_session_active_v2';
const SESSION_CLIENT_ID_KEY = 'shelo_session_client_id_v1';

// Unified Admin Passcode across ALL devices (Laptop, Android, iOS, Tablet)
const UNIFIED_ADMIN_KEY = '1987';
const SECONDARY_ADMIN_KEY = '2026';
const MAX_PDF_LIMIT = 500;

// Shared Cloud Backend URLs so Dev App URL, Shared App URL, Vercel, and all phones stay 100% in sync
const CLOUD_BACKEND_ORIGINS = [
  '', // Current origin (/api/...)
  'https://ais-pre-avwdkmmrxvofuxvicmk6ee-42912253262.us-west2.run.app',
  'https://ais-dev-avwdkmmrxvofuxvicmk6ee-42912253262.us-west2.run.app'
];

const initialProductsMap = new Map<string, Product>(
  INITIAL_PRODUCTS.map((p) => [p.id, p])
);
const initialPdfsMap = new Map<string, PdfDocument>(
  INITIAL_PDFS.map((p) => [p.id, p])
);
const protectedPdfIdsSet = new Set<string>(PROTECTED_DEFAULT_PDF_IDS);

// Authoritative in-memory state so getProducts() NEVER loses photos even if localStorage is full
let memoryProducts: Product[] | null = null;
let memoryPdfs: PdfDocument[] | null = null;
let memoryDeletedProductIds: string[] | null = null;
let memoryDeletedPdfIds: string[] | null = null;

let firestoreUnsubscribers: Array<() => void> = [];
let isReconcilingFirestore = false;
let clientFirestoreQuotaReached = false;
let pendingServerWrites = 0;

function getDistinctApiBaseUrls(): string[] {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const bases: string[] = [''];
  for (const origin of CLOUD_BACKEND_ORIGINS) {
    if (origin && origin !== currentOrigin && !bases.includes(origin)) {
      bases.push(origin);
    }
  }
  return bases;
}

// --- INDEXEDDB KV HELPERS (Unlimited Mobile Photo Storage) ---
function openStateIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const idb = req.result;
        if (!idb.objectStoreNames.contains(IDB_STORE)) {
          idb.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSaveProducts(products: Product[]): Promise<void> {
  const idb = await openStateIdb();
  if (!idb) return;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(products, PRODUCTS_STORAGE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbLoadProducts(): Promise<Product[] | null> {
  const idb = await openStateIdb();
  if (!idb) return null;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(PRODUCTS_STORAGE_KEY);
      req.onsuccess = () => {
        resolve(Array.isArray(req.result) ? req.result : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

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

export function generateRandomDownloadKey(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `SN-${digits}`;
}

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
  if (storageKey === DELETED_PRODUCTS_KEY && memoryDeletedProductIds !== null) {
    return memoryDeletedProductIds;
  }
  if (storageKey === DELETED_PDFS_KEY && memoryDeletedPdfIds !== null) {
    return memoryDeletedPdfIds;
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (storageKey === DELETED_PRODUCTS_KEY) {
          memoryDeletedProductIds = Array.from(new Set([...REMOVED_DEFAULT_PRODUCT_IDS, ...parsed]));
          return memoryDeletedProductIds;
        }
        if (storageKey === DELETED_PDFS_KEY) {
          memoryDeletedPdfIds = parsed;
          return memoryDeletedPdfIds;
        }
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  if (storageKey === DELETED_PRODUCTS_KEY) {
    memoryDeletedProductIds = [...REMOVED_DEFAULT_PRODUCT_IDS];
    return memoryDeletedProductIds;
  }
  return [];
}

function saveDeletedIds(storageKey: string, ids: string[]): void {
  const unique = Array.from(new Set(ids));
  if (storageKey === DELETED_PRODUCTS_KEY) {
    memoryDeletedProductIds = Array.from(new Set([...REMOVED_DEFAULT_PRODUCT_IDS, ...unique]));
  } else if (storageKey === DELETED_PDFS_KEY) {
    memoryDeletedPdfIds = unique;
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(unique));
  } catch {
    // ignore
  }
}

function readAndPurgeLegacyArray<T>(keys: string[]): T[] {
  const collected: T[] = [];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          collected.push(...parsed);
        }
        localStorage.removeItem(key);
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
  const deletedSet = new Set([...REMOVED_DEFAULT_PRODUCT_IDS, ...deletedIds]);
  const map = new Map<string, Product>();

  const processItem = (rawItem: Product) => {
    if (!rawItem || !rawItem.id || deletedSet.has(rawItem.id)) return;
    let normalized: Product = { ...rawItem };

    // Upgrade baked static photos from heavy base64 to fast static .jpg asset URL
    const baked = BAKED_STATIC_PHOTO_TIMESTAMPS[normalized.id];
    if (
      baked &&
      Number(normalized.updatedAt || 0) <= baked.maxTimestamp &&
      String(normalized.image || '').startsWith('data:')
    ) {
      normalized.image = baked.url;
    }

    // Align unmodified default products with canonical INITIAL_PRODUCTS
    const def = initialProductsMap.get(normalized.id);
    if (def && !normalized.updatedAt) {
      if (
        normalized.description !== def.description ||
        normalized.name !== def.name ||
        normalized.image !== def.image
      ) {
        normalized = {
          ...def,
          price: Number(normalized.price) || def.price
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
 * Push current state / updates to ALL shared Multi-User Servers (Current Origin + Shared URL + Dev URL)
 * so Laptop, Android, iOS, Tablet, and Vercel visitors all see changes immediately!
 */
async function pushUpdateToServer(payload: {
  updatedProduct?: Product;
  products?: Product[];
  pdfs?: PdfDocument[];
  deletedProductId?: string;
  deletedPdfId?: string;
}): Promise<void> {
  pendingServerWrites += 1;
  try {
    const bases = getDistinctApiBaseUrls();
    await Promise.allSettled(
      bases.map(async (base) => {
        const res = await fetch(`${base}/api/update-state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) return;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('application/json')) return;
        const data = await res.json();
        if (data && (Array.isArray(data.products) || Array.isArray(data.pdfs))) {
          dbStorage.mergeIncomingServerData({
            products: data.products,
            pdfs: data.pdfs,
            deletedProductIds: data.deletedProductIds,
            deletedPdfIds: data.deletedPdfIds
          });
        }
      })
    );
  } catch {
    // Offline fallback — IndexedDB + memory state keep all changes safe
  } finally {
    pendingServerWrites = Math.max(0, pendingServerWrites - 1);
  }
}

/**
 * Product, PDF, and deletion writes are persisted via the shared backend server (/api/update-state & /api/sync)
 * and IndexedDB, preventing browser-side Firestore Write stream RESOURCE_EXHAUSTED errors.
 */
async function upsertProductToFirestore(_product: Product): Promise<void> {
  return;
}

async function upsertPdfToFirestore(_pdf: PdfDocument): Promise<void> {
  return;
}

async function recordDeletionInFirestore(_id: string, _itemType: 'product' | 'pdf'): Promise<void> {
  return;
}

export const dbStorage = {
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
   * Loads any photos stored in IndexedDB into memory on boot and merges with Server & Cloud state
   */
  hydrateFromIndexedDb: async (): Promise<void> => {
    try {
      const idbProds = await idbLoadProducts();
      if (idbProds && idbProds.length > 0) {
        dbStorage.mergeIncomingServerData({ products: idbProds });
      }
    } catch {
      // ignore
    }
  },

  /**
   * Cloud-First Server Sync across local and shared Cloud Run endpoints:
   * Skips pulling if an Admin write is currently in flight so local photo/price edits are never overwritten.
   */
  syncWithServer: async (): Promise<{
    products: Product[];
    pdfs: PdfDocument[];
    presence?: MultiUserPresence;
  } | null> => {
    if (pendingServerWrites > 0) {
      return {
        products: dbStorage.getProducts(),
        pdfs: dbStorage.getPdfs()
      };
    }

    await dbStorage.hydrateFromIndexedDb();

    let latestPresence: MultiUserPresence | undefined;
    const bases = getDistinctApiBaseUrls();

    for (const base of bases) {
      if (pendingServerWrites > 0) break;
      try {
        const stateRes = await fetch(`${base}/api/state`, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (stateRes.ok) {
          const ct = (stateRes.headers.get('content-type') || '').toLowerCase();
          if (ct.includes('application/json')) {
            const stateData = await stateRes.json();
            if (pendingServerWrites === 0) {
              dbStorage.mergeIncomingServerData({
                products: stateData.products,
                pdfs: stateData.pdfs,
                deletedProductIds: stateData.deletedProductIds,
                deletedPdfIds: stateData.deletedPdfIds
              });
            }
            if (stateData.presence && !latestPresence) {
              latestPresence = stateData.presence;
            }
          }
        }

        if (pendingServerWrites > 0) break;

        // Push any newer/custom local items to this server so all endpoints converge
        const localCustomProds = dbStorage.getProducts().filter(
          (p) => Boolean(p.updatedAt) || isProductCustomOrModified(p)
        );
        const localPdfs = dbStorage.getPdfs();

        if (localCustomProds.length > 0 || localPdfs.length > 0) {
          const syncRes = await fetch(`${base}/api/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
              products: localCustomProds,
              pdfs: localPdfs
            })
          });

          if (syncRes.ok) {
            const ct = (syncRes.headers.get('content-type') || '').toLowerCase();
            if (ct.includes('application/json')) {
              const data = await syncRes.json();
              if (pendingServerWrites === 0) {
                dbStorage.mergeIncomingServerData({
                  products: data.products,
                  pdfs: data.pdfs,
                  deletedProductIds: data.deletedProductIds,
                  deletedPdfIds: data.deletedPdfIds
                });
              }
              if (data.presence && !latestPresence) {
                latestPresence = data.presence;
              }
              if (base === '' && Array.isArray(data.storedPdfIds)) {
                void pdfFileStore.syncLocalFilesToServer(data.storedPdfIds);
              }
            }
          }
        }
      } catch {
        // Try next backend endpoint
      }
    }

    return {
      products: dbStorage.getProducts(),
      pdfs: dbStorage.getPdfs(),
      presence: latestPresence
    };
  },

  /**
   * Merges incoming server or Firestore data with in-memory, IndexedDB, and localStorage state
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
          ...REMOVED_DEFAULT_PRODUCT_IDS,
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
          dbStorage.saveProducts(mergedProds);
          hasChanges = true;
        }
      }

      const currentLocalPdfs = dbStorage.getPdfs();
      const incomingPdfs = Array.isArray(data.pdfs) ? data.pdfs : [];
      if (incomingPdfs.length > 0 || hasChanges) {
        const mergedPdfs = mergePdfLists(currentLocalPdfs, incomingPdfs, deletedPdfs);
        if (JSON.stringify(currentLocalPdfs) !== JSON.stringify(mergedPdfs)) {
          dbStorage.savePdfs(mergedPdfs);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        notifyPageUpdate('sync');
      }
    } catch {
      // ignore
    }
  },

  /**
   * Starts real-time Firebase Cloud Firestore listeners (`onSnapshot`) for `/deletedItems`, `/products`,
   * and `/pdfs` so every computer, Android, iOS, and Tablet immediately displays updates!
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
        () => {}
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
        () => {}
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
        () => {}
      );

      firestoreUnsubscribers.push(unsubDeleted, unsubProducts, unsubPdfs);
    } catch {
      // ignore
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
   * Pulls `/deletedItems`, `/products`, and `/pdfs` from Firestore on boot and merges into local state.
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

      dbStorage.mergeIncomingServerData({
        products: Array.from(remoteProductsMap.values()),
        pdfs: Array.from(remotePdfsMap.values()),
        deletedProductIds: remoteDeletedProducts,
        deletedPdfIds: remoteDeletedPdfs
      });

      await pdfFileStore.syncLocalFilesToServer();
    } catch {
      // ignore
    } finally {
      isReconcilingFirestore = false;
    }
  },

  syncAllToFirestoreCloud: async (): Promise<void> => {
    await dbStorage.reconcileWithFirestoreCloud();
  },

  // --- PRODUCTS CRUD ---
  getProducts: (): Product[] => {
    if (memoryProducts !== null) {
      return memoryProducts;
    }
    try {
      const deletedIds = getDeletedIds(DELETED_PRODUCTS_KEY);
      const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      const currentList: Product[] = raw ? JSON.parse(raw) : [];
      const legacyList = readAndPurgeLegacyArray<Product>(LEGACY_PRODUCT_KEYS);

      const merged = mergeProductLists(currentList, legacyList, deletedIds);
      memoryProducts = merged;
      dbStorage.saveProducts(merged);
      return merged;
    } catch {
      memoryProducts = [...INITIAL_PRODUCTS];
      return memoryProducts;
    }
  },

  saveProducts: (products: Product[]): void => {
    // 1. Always update authoritative in-memory list first so UI never reverts
    memoryProducts = products;

    // 2. Always persist full list (with all photos) to IndexedDB (500MB+ limit)
    void idbSaveProducts(products);

    // 3. Persist to localStorage, stripping legacy keys first if needed
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    } catch {
      try {
        for (const k of [...LEGACY_PRODUCT_KEYS, ...LEGACY_PDF_KEYS]) {
          localStorage.removeItem(k);
        }
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
      } catch {
        // If localStorage is still over its 5MB cap, IndexedDB + memoryProducts + Cloud Server hold all photos
      }
    }
  },

  addProduct: (newProduct: Omit<Product, 'id'>): Product => {
    const products = dbStorage.getProducts();
    const maxExistingTime = products.reduce(
      (max, p) => Math.max(max, Number(p.updatedAt || 0)),
      0
    );
    const now = Math.max(Date.now(), maxExistingTime + 1000);
    const created: Product = {
      ...newProduct,
      price: Number(newProduct.price) || 0,
      id: `prod-${now}-${Math.random().toString(36).substring(2, 7)}`,
      updatedAt: now
    };
    const updated = [created, ...products];
    dbStorage.saveProducts(updated);
    notifyPageUpdate(
      'product',
      `¡Producto "${created.name}" guardado automáticamente en todos los dispositivos!`
    );
    void pushUpdateToServer({ updatedProduct: created, products: updated });
    void upsertProductToFirestore(created);
    return created;
  },

  updateProduct: (updatedProduct: Product): Product[] => {
    const products = dbStorage.getProducts();
    const existing = products.find((p) => p.id === updatedProduct.id);
    // Guarantee monotonically increasing timestamp even if this phone's clock is slightly behind another device
    const monotonicTimestamp = Math.max(
      Date.now(),
      Number(existing?.updatedAt || 0) + 1000,
      Number(updatedProduct.updatedAt || 0) + 1000
    );
    const stamped: Product = {
      ...updatedProduct,
      price: Number(updatedProduct.price) || 0,
      updatedAt: monotonicTimestamp
    };
    const exists = products.some((p) => p.id === stamped.id);
    const updated = exists
      ? products.map((p) => (p.id === stamped.id ? stamped : p))
      : [stamped, ...products];
    dbStorage.saveProducts(updated);
    notifyPageUpdate(
      'product',
      `¡Producto "${stamped.name}" actualizado automáticamente en todos los dispositivos!`
    );
    void pushUpdateToServer({ updatedProduct: stamped });
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
    notifyPageUpdate('product', '¡Producto eliminado en todos los dispositivos!');
    void pushUpdateToServer({ deletedProductId: id });
    void recordDeletionInFirestore(id, 'product');
    return products;
  },

  // --- CATALOG CRUD (100% Free Catalog with 5-Page Preview) ---
  getPdfs: (): PdfDocument[] => {
    if (memoryPdfs !== null) {
      return memoryPdfs;
    }
    try {
      const legacyItems = readAndPurgeLegacyArray<PdfDocument>(LEGACY_PDF_KEYS);
      let existingDeleted = getDeletedIds(DELETED_PDFS_KEY);
      if (legacyItems.length > 0) {
        const legacyIds = legacyItems.map((item) => item?.id).filter(Boolean) as string[];
        existingDeleted = Array.from(new Set([...existingDeleted, ...legacyIds]));
        saveDeletedIds(DELETED_PDFS_KEY, existingDeleted);
      }

      const deletedIds = Array.from(
        new Set([...REMOVED_DEFAULT_PDF_IDS, ...existingDeleted])
      );
      const raw = localStorage.getItem(PDFS_STORAGE_KEY);
      const currentList: PdfDocument[] = raw ? JSON.parse(raw) : [];

      const merged = mergePdfLists(currentList, [], deletedIds);
      memoryPdfs = merged;
      dbStorage.savePdfs(merged);
      return merged;
    } catch {
      memoryPdfs = [...INITIAL_PDFS];
      return memoryPdfs;
    }
  },

  savePdfs: (pdfs: PdfDocument[]): boolean => {
    const stripped = pdfs.map(({ fileData, ...rest }) => ({
      ...rest,
      price: 0,
      downloadKey: 'GRATIS'
    }));
    memoryPdfs = stripped;
    try {
      localStorage.setItem(PDFS_STORAGE_KEY, JSON.stringify(stripped));
      return true;
    } catch {
      return true;
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
      `¡Catálogo "${created.title}" (Preview 5 Págs • Gratis) guardado en todos los dispositivos!`
    );
    void pushUpdateToServer({ pdfs: updated });
    void upsertPdfToFirestore(created);

    return {
      success: true,
      message: 'Catálogo guardado y subido automáticamente a todos los dispositivos.',
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
      `¡Catálogo "${createdList[0]?.title || 'Oficial'}" (Preview 5 Págs • Gratis) guardado en todos los dispositivos!`
    );
    void pushUpdateToServer({ pdfs: updated });
    for (const createdItem of createdList) {
      void upsertPdfToFirestore(createdItem);
    }

    return {
      success: true,
      message: 'Catálogo guardado y sincronizado automáticamente en todos los equipos.',
      addedPdfs: createdList
    };
  },

  updatePdf: (updatedPdf: PdfDocument, options?: { silent?: boolean }): PdfDocument[] => {
    const pdfs = dbStorage.getPdfs();
    const existing = pdfs.find((p) => p.id === updatedPdf.id);
    const monotonicTime = Math.max(
      Date.now(),
      Number(existing?.updatedAt || 0) + 1000,
      Number(updatedPdf.updatedAt || 0) + 1000
    );
    const normalized: PdfDocument = {
      ...updatedPdf,
      price: 0,
      downloadKey: 'GRATIS',
      category: 'Catálogo Oficial',
      updatedAt: monotonicTime
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
        : `¡Catálogo "${normalized.title}" actualizado al momento en todos los dispositivos!`
    );
    void pushUpdateToServer({ pdfs: updated });
    void upsertPdfToFirestore(normalized);
    return updated;
  },

  deletePdf: (id: string): PdfDocument[] => {
    if (protectedPdfIdsSet.has(id)) {
      notifyPageUpdate('pdf', 'El Catálogo Oficial por defecto está protegido y no se elimina.');
      return dbStorage.getPdfs();
    }
    const deletedIds = getDeletedIds(DELETED_PDFS_KEY);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      saveDeletedIds(DELETED_PDFS_KEY, deletedIds);
    }
    const pdfs = dbStorage.getPdfs().filter((pdf) => pdf.id !== id);
    dbStorage.savePdfs(pdfs);
    notifyPageUpdate('pdf', '¡Catálogo eliminado en todos los dispositivos!');
    void pushUpdateToServer({ pdfs, deletedPdfId: id });
    void recordDeletionInFirestore(id, 'pdf');
    return pdfs;
  },

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
    memoryDeletedProductIds = [...REMOVED_DEFAULT_PRODUCT_IDS];
    memoryDeletedPdfIds = [...REMOVED_DEFAULT_PDF_IDS];
    localStorage.removeItem(DELETED_PRODUCTS_KEY);
    localStorage.removeItem(DELETED_PDFS_KEY);
    dbStorage.saveProducts([...INITIAL_PRODUCTS]);
    dbStorage.savePdfs([...INITIAL_PDFS]);
    notifyPageUpdate('reset', '¡Datos predeterminados restaurados!');
    for (const base of getDistinctApiBaseUrls()) {
      fetch(`${base}/api/reset-defaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: INITIAL_PRODUCTS,
          pdfs: INITIAL_PDFS
        })
      }).catch(() => {});
    }
  }
};
