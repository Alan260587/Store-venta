import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  setLogLevel,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  INITIAL_PRODUCTS,
  REMOVED_DEFAULT_PRODUCT_IDS,
  BAKED_STATIC_PHOTO_TIMESTAMPS
} from './src/data/initialProducts.ts';
import {
  INITIAL_PDFS,
  PROTECTED_DEFAULT_PDF_IDS,
  REMOVED_DEFAULT_PDF_IDS,
  OFFICIAL_CATALOG_ID
} from './src/data/initialPdfs.ts';
import {
  publishCloudStoreSnapshot,
  pullLatestCloudSnapshots,
  type CloudStoreSnapshot
} from './src/services/cloudSyncBridge.ts';

setLogLevel('silent');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const PDF_FILES_DIR = path.join(DATA_DIR, 'pdfs');
const PUBLIC_PDF_DIR = path.join(__dirname, 'public', 'pdfs');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const FIREBASE_CONFIG_PATH = path.join(__dirname, 'firebase-applet-config.json');

// Unified Admin Keys across all devices (Laptop, Android, iOS, Tablet)
const VALID_ADMIN_KEYS = new Set(['1987', '2026']);
const UNIFIED_ADMIN_KEY = '1987';
const CHUNK_CHAR_SIZE = 550000;
const MAX_FIRESTORE_CHUNKS = 25;

const initialProductsById = new Map<string, any>(
  INITIAL_PRODUCTS.map((p) => [p.id, p])
);
const initialPdfsById = new Map<string, any>(
  INITIAL_PDFS.map((p) => [p.id, p])
);
const protectedPdfIdsSet = new Set<string>(PROTECTED_DEFAULT_PDF_IDS);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PDF_FILES_DIR)) {
  fs.mkdirSync(PDF_FILES_DIR, { recursive: true });
}

// Initialize Firebase Cloud Firestore on the Backend so Backend + Frontend + All Devices share 100% identical state
let backendDb: ReturnType<typeof getFirestore> | null = null;
try {
  if (fs.existsSync(FIREBASE_CONFIG_PATH)) {
    const rawConfig = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_PATH, 'utf-8'));
    const fbApp = initializeApp(rawConfig, 'shelo-backend-sync');
    backendDb = getFirestore(fbApp, rawConfig.firestoreDatabaseId);
  }
} catch (err) {
  console.warn('Could not initialize backend Firestore client:', err);
}

function sanitizeDocId(rawId: string): string {
  return String(rawId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
}

function getTimestampFromId(id: string): number {
  const match = String(id || '').match(/(\d{13})/);
  return match ? Number(match[1]) : 0;
}

function isProductModifiedFromDefault(item: any): boolean {
  const def = initialProductsById.get(item?.id);
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

function isPdfModifiedFromDefault(item: any): boolean {
  const def = initialPdfsById.get(item?.id);
  if (!def) return true;
  return (
    item.title !== def.title ||
    Number(item.price) !== Number(def.price) ||
    item.downloadKey !== def.downloadKey ||
    item.description !== def.description ||
    item.category !== def.category
  );
}

function mergeProductsList(
  existingList: any[],
  incomingList: any[],
  deletedIds: string[]
): { merged: any[]; changed: boolean } {
  const deletedSet = new Set([...REMOVED_DEFAULT_PRODUCT_IDS, ...deletedIds]);
  const map = new Map<string, any>();
  let changed = false;

  const normalizeProd = (item: any) => {
    if (!item || !item.id) return item;
    let normalized = { ...item };

    // Upgrade baked static photos from heavy base64 to fast static .jpg asset URL
    const baked = BAKED_STATIC_PHOTO_TIMESTAMPS[normalized.id];
    if (
      baked &&
      Number(normalized.updatedAt || 0) <= baked.maxTimestamp &&
      String(normalized.image || '').startsWith('data:')
    ) {
      normalized.image = baked.url;
      changed = true;
    }

    // If this is a default product that has never been explicitly edited (no updatedAt),
    // keep it aligned with the canonical INITIAL_PRODUCTS definition
    const def = initialProductsById.get(normalized.id);
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
        changed = true;
      }
    }

    return normalized;
  };

  for (const rawItem of existingList) {
    const item = normalizeProd(rawItem);
    if (item && item.id && !deletedSet.has(item.id)) {
      map.set(item.id, item);
    } else if (item && item.id && deletedSet.has(item.id)) {
      changed = true;
    }
  }

  for (const rawInc of incomingList) {
    const inc = normalizeProd(rawInc);
    if (!inc || !inc.id || deletedSet.has(inc.id)) continue;
    const prev = map.get(inc.id);
    if (!prev) {
      map.set(inc.id, inc);
      changed = true;
    } else {
      const prevTime = Number(prev.updatedAt || getTimestampFromId(prev.id) || 0);
      const incTime = Number(inc.updatedAt || getTimestampFromId(inc.id) || 0);
      if (incTime > prevTime) {
        map.set(inc.id, inc);
        changed = true;
      } else if (incTime === prevTime && JSON.stringify(prev) !== JSON.stringify(inc)) {
        if (isProductModifiedFromDefault(inc) && !isProductModifiedFromDefault(prev)) {
          map.set(inc.id, inc);
          changed = true;
        }
      }
    }
  }

  // Ensure all non-deleted INITIAL_PRODUCTS exist
  for (const initProd of INITIAL_PRODUCTS) {
    if (!deletedSet.has(initProd.id) && !map.has(initProd.id)) {
      map.set(initProd.id, initProd);
      changed = true;
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

  return { merged: allItems, changed };
}

function mergePdfsList(
  existingList: any[],
  incomingList: any[],
  deletedIds: string[]
): { merged: any[]; changed: boolean } {
  const deletedSet = new Set(
    [...REMOVED_DEFAULT_PDF_IDS, ...deletedIds].filter((id) => !protectedPdfIdsSet.has(id))
  );
  const map = new Map<string, any>();
  let changed = false;

  for (const item of existingList) {
    if (item && item.id && !deletedSet.has(item.id) && !String(item.id).startsWith('pdf-')) {
      const { fileData, ...cleanExisting } = item;
      map.set(cleanExisting.id, {
        ...cleanExisting,
        price: 0,
        downloadKey: 'GRATIS',
        category: 'Catálogo Oficial'
      });
    } else if (item && item.id && (deletedSet.has(item.id) || String(item.id).startsWith('pdf-'))) {
      changed = true;
    }
  }

  for (const inc of incomingList) {
    if (!inc || !inc.id || deletedSet.has(inc.id) || String(inc.id).startsWith('pdf-')) continue;
    const { fileData, ...rawCleanInc } = inc;
    const cleanInc = {
      ...rawCleanInc,
      price: 0,
      downloadKey: 'GRATIS',
      category: 'Catálogo Oficial'
    };
    const prev = map.get(cleanInc.id);
    if (!prev) {
      map.set(cleanInc.id, cleanInc);
      changed = true;
    } else {
      const prevTime = Number(prev.updatedAt || getTimestampFromId(prev.id) || 0);
      const incTime = Number(cleanInc.updatedAt || getTimestampFromId(cleanInc.id) || 0);
      if (incTime > prevTime) {
        map.set(cleanInc.id, cleanInc);
        changed = true;
      } else if (incTime === prevTime && JSON.stringify(prev) !== JSON.stringify(cleanInc)) {
        if (isPdfModifiedFromDefault(cleanInc) && !isPdfModifiedFromDefault(prev)) {
          map.set(cleanInc.id, cleanInc);
          changed = true;
        }
      }
    }
  }

  // Ensure all non-deleted INITIAL_PDFS exist
  for (const initPdf of INITIAL_PDFS) {
    if (!deletedSet.has(initPdf.id) && !map.has(initPdf.id)) {
      map.set(initPdf.id, initPdf);
      changed = true;
    }
  }

  // Recover any orphaned catalog files present in .data/pdfs/ that are not deleted
  try {
    if (fs.existsSync(PDF_FILES_DIR)) {
      for (const name of fs.readdirSync(PDF_FILES_DIR)) {
        if (!name.endsWith('.pdf')) continue;
        const pdfId = name.replace(/\.pdf$/i, '');
        if (pdfId && !pdfId.startsWith('pdf-') && !deletedSet.has(pdfId) && !map.has(pdfId)) {
          const stat = fs.statSync(path.join(PDF_FILES_DIR, name));
          const mb = Math.max(0.1, stat.size / (1024 * 1024)).toFixed(1);
          map.set(pdfId, {
            id: pdfId,
            title: 'Catálogo Oficial Sheló NABEL',
            description: 'Catálogo Oficial Sheló NABEL (Vista previa de 5 páginas y descarga gratis).',
            pagesCount: 1,
            price: 0,
            downloadKey: 'GRATIS',
            uploadedAt: new Date(stat.mtimeMs).toISOString().split('T')[0],
            fileSize: `${mb} MB`,
            category: 'Catálogo Oficial',
            updatedAt: Math.round(stat.mtimeMs)
          });
          changed = true;
        }
      }
    }
  } catch {
    // ignore
  }

  const allPdfs = Array.from(map.values());
  const protectedOrder = new Map<string, number>(
    PROTECTED_DEFAULT_PDF_IDS.map((id, idx) => [id, idx])
  );

  // Sort: custom uploaded PDFs first (newest first), then the 17 protected default PDFs in canonical order
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

  return { merged: allPdfs, changed };
}

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const deletedProductIds: string[] = Array.from(
        new Set<string>(Array.isArray(parsed.deletedProductIds) ? parsed.deletedProductIds : [])
      );
      const deletedPdfIds: string[] = Array.from(
        new Set<string>(
          [
            ...REMOVED_DEFAULT_PDF_IDS,
            ...(Array.isArray(parsed.deletedPdfIds) ? parsed.deletedPdfIds : [])
          ].filter((id: string) => !protectedPdfIdsSet.has(id))
        )
      );
      const rawProducts = Array.isArray(parsed.products) ? parsed.products : [];
      const rawPdfs = Array.isArray(parsed.pdfs) ? parsed.pdfs : [];

      const { merged: products, changed: prodChanged } = mergeProductsList(rawProducts, [], deletedProductIds);
      const { merged: pdfs, changed: pdfChanged } = mergePdfsList(rawPdfs, [], deletedPdfIds);

      const loaded = {
        products,
        pdfs,
        deletedProductIds,
        deletedPdfIds
      };
      if (prodChanged || pdfChanged || (parsed.deletedPdfIds?.length ?? 0) !== deletedPdfIds.length) {
        saveStore(loaded);
      }
      return loaded;
    }
  } catch (e) {
    console.warn('Could not read store.json, starting fresh:', e);
  }
  const initialStore = {
    products: [...INITIAL_PRODUCTS],
    pdfs: [...INITIAL_PDFS],
    deletedProductIds: [] as string[],
    deletedPdfIds: [...REMOVED_DEFAULT_PDF_IDS]
  };
  saveStore(initialStore);
  return initialStore;
}

function saveStore(store: {
  products: any[];
  pdfs: any[];
  deletedProductIds: string[];
  deletedPdfIds: string[];
}) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write store.json:', e);
  }
}

let serverStore = loadStore();

// Prevent Firestore gRPC Write stream RESOURCE_EXHAUSTED errors while free-tier daily write quota is exhausted;
// all state is persisted authoritatively in .data/store.json and served via /api/state, /api/update-state, and /api/sync.
let backendFirestoreWriteQuotaReached = true;

function withTimeout<T>(promise: Promise<T>, ms = 3500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      backendFirestoreWriteQuotaReached = true;
      reject(new Error('Firestore write timeout / quota reached'));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// --- BACKEND FIREBASE FIRESTORE HELPERS ---
async function backendUpsertProductToFirestore(product: any): Promise<void> {
  if (!backendDb || backendFirestoreWriteQuotaReached || !product || !product.id) return;
  const docId = sanitizeDocId(product.id);
  if (!docId) return;
  try {
    const updatedAtMs = Number(product.updatedAt || getTimestampFromId(product.id) || Date.now());
    await withTimeout(
      setDoc(doc(backendDb, 'products', docId), {
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
        authorUid: 'shelo_backend_server',
        adminKey: UNIFIED_ADMIN_KEY,
        updatedAtMs,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
  } catch {
    backendFirestoreWriteQuotaReached = true;
  }
}

async function backendUpsertPdfToFirestore(pdf: any): Promise<void> {
  if (!backendDb || backendFirestoreWriteQuotaReached || !pdf || !pdf.id || String(pdf.id).startsWith('pdf-')) return;
  const docId = sanitizeDocId(pdf.id);
  if (!docId) return;
  try {
    const updatedAtMs = Number(pdf.updatedAt || getTimestampFromId(pdf.id) || Date.now());
    await withTimeout(
      setDoc(doc(backendDb, 'pdfs', docId), {
        id: docId,
        title: String(pdf.title || 'Catálogo Oficial Sheló NABEL').slice(0, 250),
        description: String(pdf.description || 'Catálogo Oficial Sheló NABEL (Vista previa de 5 páginas y descarga gratis).').slice(0, 1500),
        pagesCount: Math.max(1, Math.min(5000, Number(pdf.pagesCount) || 1)),
        price: 0,
        downloadKey: 'GRATIS',
        uploadedAt: String(pdf.uploadedAt || new Date().toISOString().split('T')[0]).slice(0, 40),
        fileSize: String(pdf.fileSize || '1.0 MB').slice(0, 40),
        category: 'Catálogo Oficial',
        visibility: 'public',
        authorUid: 'shelo_backend_server',
        adminKey: UNIFIED_ADMIN_KEY,
        updatedAtMs,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
  } catch {
    backendFirestoreWriteQuotaReached = true;
  }
}

async function backendRecordDeletionInFirestore(id: string, itemType: 'product' | 'pdf'): Promise<void> {
  if (!backendDb || backendFirestoreWriteQuotaReached || !id) return;
  if (itemType === 'pdf' && protectedPdfIdsSet.has(id)) return;
  const docId = sanitizeDocId(id);
  if (!docId) return;
  try {
    await withTimeout(
      setDoc(doc(backendDb, 'deletedItems', docId), {
        id: docId,
        itemType,
        visibility: 'public',
        authorUid: 'shelo_backend_server',
        adminKey: UNIFIED_ADMIN_KEY,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
    const colName = itemType === 'product' ? 'products' : 'pdfs';
    await withTimeout(deleteDoc(doc(backendDb, colName, docId)));
  } catch {
    backendFirestoreWriteQuotaReached = true;
  }
}

async function backendUploadPdfBufferToFirestoreChunks(pdfId: string, buffer: Buffer): Promise<void> {
  if (!backendDb || !pdfId || !buffer || buffer.length === 0) return;
  const cleanPdfId = sanitizeDocId(pdfId);
  if (!cleanPdfId) return;
  try {
    const base64 = buffer.toString('base64');
    const totalChunks = Math.ceil(base64.length / CHUNK_CHAR_SIZE);
    if (totalChunks > MAX_FIRESTORE_CHUNKS) return;

    for (let i = 0; i < totalChunks; i++) {
      const slice = base64.slice(i * CHUNK_CHAR_SIZE, (i + 1) * CHUNK_CHAR_SIZE);
      const chunkId = sanitizeDocId(`${cleanPdfId}_chunk_${i}`);
      await setDoc(doc(backendDb, 'pdfChunks', chunkId), {
        id: chunkId,
        pdfId: cleanPdfId,
        chunkIndex: i,
        totalChunks,
        data: slice,
        visibility: 'public',
        authorUid: 'shelo_backend_server',
        adminKey: UNIFIED_ADMIN_KEY,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn(`Backend Firestore PDF chunk upload warning (${cleanPdfId}):`, err);
  }
}

async function backendFetchPdfBufferFromFirestoreChunks(pdfId: string): Promise<Buffer | null> {
  if (!backendDb || !pdfId) return null;
  const cleanPdfId = sanitizeDocId(pdfId);
  if (!cleanPdfId) return null;
  try {
    const q = query(
      collection(backendDb, 'pdfChunks'),
      where('visibility', '==', 'public'),
      where('pdfId', '==', cleanPdfId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const chunks = snap.docs
      .map((d) => d.data() as { chunkIndex: number; data: string })
      .filter((c) => typeof c.data === 'string' && typeof c.chunkIndex === 'number')
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
    if (chunks.length === 0) return null;
    const fullBase64 = chunks.map((c) => c.data).join('');
    if (!fullBase64) return null;
    const buf = Buffer.from(fullBase64, 'base64');
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

/**
 * Synchronizes the Backend serverStore with Firebase Cloud Firestore on boot AND in real time
 * so that Dev URL, Shared App URL, and all computers/phones always have the exact same data!
 */
async function startBackendFirestoreSync() {
  if (!backendDb) return;
  try {
    // 1. Pull existing deletions, products, and PDFs from Firestore
    const [delSnap, prodSnap, pdfSnap] = await Promise.all([
      getDocs(query(collection(backendDb, 'deletedItems'), where('visibility', '==', 'public'))),
      getDocs(query(collection(backendDb, 'products'), where('visibility', '==', 'public'))),
      getDocs(query(collection(backendDb, 'pdfs'), where('visibility', '==', 'public')))
    ]);

    const remoteDeletedProducts: string[] = [];
    const remoteDeletedPdfs: string[] = [];
    delSnap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && typeof d.id === 'string') {
        if (d.itemType === 'product') remoteDeletedProducts.push(d.id);
        if (d.itemType === 'pdf' && !protectedPdfIdsSet.has(d.id)) remoteDeletedPdfs.push(d.id);
      }
    });

    const remoteProductsMap = new Map<string, any>();
    prodSnap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && typeof d.id === 'string' && typeof d.name === 'string') {
        remoteProductsMap.set(d.id, {
          id: d.id,
          clave: String(d.clave || 'S000'),
          name: d.name,
          price: Number(d.price) || 0,
          size: String(d.size || '1 pza'),
          category: d.category || 'Cuidado Corporal',
          description: String(d.description || ''),
          image: String(d.image || ''),
          isStarProduct: Boolean(d.isStarProduct),
          isNew: Boolean(d.isNew),
          updatedAt: Number(d.updatedAtMs || getTimestampFromId(d.id) || 1)
        });
      }
    });

    const remotePdfsMap = new Map<string, any>();
    pdfSnap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && typeof d.id === 'string' && typeof d.title === 'string') {
        if (String(d.id).startsWith('pdf-')) {
          remoteDeletedPdfs.push(d.id);
          void backendRecordDeletionInFirestore(d.id, 'pdf');
        } else {
          remotePdfsMap.set(d.id, {
            id: d.id,
            title: d.title,
            description: String(d.description || ''),
            pagesCount: Number(d.pagesCount) || 1,
            price: 0,
            downloadKey: 'GRATIS',
            uploadedAt: String(d.uploadedAt || ''),
            fileSize: String(d.fileSize || '1.0 MB'),
            category: 'Catálogo Oficial',
            updatedAt: Number(d.updatedAtMs || getTimestampFromId(d.id) || 1)
          });
        }
      }
    });

    // Merge deletions
    serverStore.deletedProductIds = Array.from(
      new Set([...serverStore.deletedProductIds, ...remoteDeletedProducts])
    );
    serverStore.deletedPdfIds = Array.from(
      new Set(
        [...serverStore.deletedPdfIds, ...remoteDeletedPdfs].filter(
          (id) => !protectedPdfIdsSet.has(id)
        )
      )
    );

    const prodMerged = mergeProductsList(
      serverStore.products,
      Array.from(remoteProductsMap.values()),
      serverStore.deletedProductIds
    );
    const pdfMerged = mergePdfsList(
      serverStore.pdfs,
      Array.from(remotePdfsMap.values()),
      serverStore.deletedPdfIds
    );

    serverStore.products = prodMerged.merged;
    serverStore.pdfs = pdfMerged.merged;
    saveStore(serverStore);
    broadcastState();

    // 2. Attach real-time Firestore listeners on the backend so any cloud update immediately updates serverStore
    onSnapshot(
      query(collection(backendDb, 'deletedItems'), where('visibility', '==', 'public')),
      (snap) => {
        let changed = false;
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && typeof d.id === 'string') {
            if (d.itemType === 'product' && !serverStore.deletedProductIds.includes(d.id)) {
              serverStore.deletedProductIds.push(d.id);
              serverStore.products = serverStore.products.filter((p: any) => p.id !== d.id);
              changed = true;
            } else if (
              d.itemType === 'pdf' &&
              !protectedPdfIdsSet.has(d.id) &&
              !serverStore.deletedPdfIds.includes(d.id)
            ) {
              serverStore.deletedPdfIds.push(d.id);
              serverStore.pdfs = serverStore.pdfs.filter((p: any) => p.id !== d.id);
              changed = true;
            }
          }
        });
        if (changed) {
          saveStore(serverStore);
          broadcastState();
        }
      },
      () => {}
    );

    onSnapshot(
      query(collection(backendDb, 'products'), where('visibility', '==', 'public')),
      (snap) => {
        const incoming: any[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && typeof d.id === 'string' && typeof d.name === 'string') {
            incoming.push({
              id: d.id,
              clave: String(d.clave || 'S000'),
              name: d.name,
              price: Number(d.price) || 0,
              size: String(d.size || '1 pza'),
              category: d.category || 'Cuidado Corporal',
              description: String(d.description || ''),
              image: String(d.image || ''),
              isStarProduct: Boolean(d.isStarProduct),
              isNew: Boolean(d.isNew),
              updatedAt: Number(d.updatedAtMs || getTimestampFromId(d.id) || 1)
            });
          }
        });
        if (incoming.length > 0) {
          const res = mergeProductsList(serverStore.products, incoming, serverStore.deletedProductIds);
          if (res.changed) {
            serverStore.products = res.merged;
            saveStore(serverStore);
            broadcastState();
          }
        }
      },
      () => {}
    );

    onSnapshot(
      query(collection(backendDb, 'pdfs'), where('visibility', '==', 'public')),
      (snap) => {
        const incoming: any[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && typeof d.id === 'string' && typeof d.title === 'string') {
            incoming.push({
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
        if (incoming.length > 0) {
          const res = mergePdfsList(serverStore.pdfs, incoming, serverStore.deletedPdfIds);
          if (res.changed) {
            serverStore.pdfs = res.merged;
            saveStore(serverStore);
            broadcastState();
          }
        }
      },
      () => {}
    );
  } catch (err) {
    console.warn('Backend Firestore initial sync notice:', err);
  }
}

// Connected multi-user clients map: clientId -> { res, role, connectedAt }
const connectedClients = new Map<string, { res: express.Response; role: 'admin' | 'client'; connectedAt: number }>();

function getPresenceStats() {
  let adminsOnline = 0;
  let clientsOnline = 0;
  for (const client of connectedClients.values()) {
    if (client.role === 'admin') {
      adminsOnline++;
    } else {
      clientsOnline++;
    }
  }
  return {
    totalOnline: Math.max(1, adminsOnline + clientsOnline),
    adminsOnline,
    clientsOnline
  };
}

function getStoredPdfFileIds(): string[] {
  const ids = new Set<string>();
  try {
    if (fs.existsSync(PDF_FILES_DIR)) {
      for (const name of fs.readdirSync(PDF_FILES_DIR)) {
        if (name.endsWith('.pdf')) {
          ids.add(name.replace(/\.pdf$/i, ''));
        }
      }
    }
    if (fs.existsSync(PUBLIC_PDF_DIR)) {
      for (const name of fs.readdirSync(PUBLIC_PDF_DIR)) {
        if (name.endsWith('.pdf')) {
          ids.add(name.replace(/\.pdf$/i, ''));
        }
      }
    }
  } catch {
    // ignore
  }
  return Array.from(ids);
}

function broadcastEvent(eventName: string, payload: unknown) {
  const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const [clientId, client] of connectedClients.entries()) {
    try {
      client.res.write(message);
    } catch {
      connectedClients.delete(clientId);
    }
  }
}

function broadcastPresence() {
  broadcastEvent('presence:update', getPresenceStats());
}

function broadcastState() {
  broadcastEvent('state:update', {
    products: serverStore.products,
    pdfs: serverStore.pdfs,
    deletedProductIds: serverStore.deletedProductIds,
    deletedPdfIds: serverStore.deletedPdfIds,
    presence: getPresenceStats(),
    storedPdfIds: getStoredPdfFileIds()
  });
}

function getNextServerTimestamp(): number {
  let maxTime = Date.now();
  for (const p of serverStore.products) {
    const t = Math.max(Number(p?.updatedAt || 0), getTimestampFromId(p?.id));
    if (t > maxTime) maxTime = t;
  }
  for (const c of serverStore.pdfs) {
    const t = Math.max(Number(c?.updatedAt || 0), getTimestampFromId(c?.id));
    if (t > maxTime) maxTime = t;
  }
  return maxTime + 1000;
}

function buildServerCloudSnapshot(): CloudStoreSnapshot {
  const customOrModifiedProducts = serverStore.products.filter(
    (p: any) => Boolean(p?.updatedAt) || isProductModifiedFromDefault(p)
  );
  return {
    version: 3,
    timestamp: getNextServerTimestamp(),
    clientId: 'shelo_express_backend',
    products: customOrModifiedProducts,
    pdfs: serverStore.pdfs,
    deletedProductIds: serverStore.deletedProductIds,
    deletedPdfIds: serverStore.deletedPdfIds
  };
}

let isPullingCloudBridge = false;
async function reconcileServerWithCloudBridge(seedIfEmpty = false): Promise<void> {
  if (isPullingCloudBridge) return;
  isPullingCloudBridge = true;
  try {
    const snapshots = await pullLatestCloudSnapshots();
    if (snapshots.length === 0) {
      if (seedIfEmpty) {
        await publishCloudStoreSnapshot(buildServerCloudSnapshot());
      }
      return;
    }

    let anyChanged = false;
    for (const snap of snapshots) {
      if (Array.isArray(snap.deletedProductIds)) {
        for (const delId of snap.deletedProductIds) {
          if (delId && !serverStore.deletedProductIds.includes(delId)) {
            serverStore.deletedProductIds.push(delId);
            anyChanged = true;
          }
        }
      }
      if (Array.isArray(snap.deletedPdfIds)) {
        for (const delId of snap.deletedPdfIds) {
          if (delId && !protectedPdfIdsSet.has(delId) && !serverStore.deletedPdfIds.includes(delId)) {
            serverStore.deletedPdfIds.push(delId);
            anyChanged = true;
          }
        }
      }

      const prodRes = mergeProductsList(
        serverStore.products,
        Array.isArray(snap.products) ? snap.products : [],
        serverStore.deletedProductIds
      );
      const pdfRes = mergePdfsList(
        serverStore.pdfs,
        Array.isArray(snap.pdfs) ? snap.pdfs : [],
        serverStore.deletedPdfIds
      );
      if (prodRes.changed || pdfRes.changed) {
        serverStore.products = prodRes.merged;
        serverStore.pdfs = pdfRes.merged;
        anyChanged = true;
      }
    }

    if (anyChanged) {
      saveStore(serverStore);
      broadcastState();
    }
  } catch {
    // ignore transient network errors
  } finally {
    isPullingCloudBridge = false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Start Backend <-> Firebase Cloud Firestore + Universal Cloud Bridge real-time synchronization
  void startBackendFirestoreSync();
  void reconcileServerWithCloudBridge(true);
  setInterval(() => {
    void reconcileServerWithCloudBridge(false);
  }, 3500);

  // Prevent any browser / iOS Safari / mobile proxy caching on /api/* routes & allow cross-origin requests from Vercel / Shared URLs
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Pragma');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '80mb' }));
  app.use('/api/pdf-file', express.raw({ type: ['application/pdf', 'application/octet-stream', '*/*'], limit: '80mb' }));

  // Unified Admin Key verification across all devices (Laptop, Android, iOS)
  app.post('/api/verify-admin', (req, res) => {
    const rawKey = String(req.body?.key || '')
      .replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
      .replace(/\s+/g, '')
      .trim();
    const valid = VALID_ADMIN_KEYS.has(rawKey);
    res.json({ ok: valid });
  });

  // 1. Real-time Multi-User SSE Stream
  app.get('/api/events', (req, res) => {
    const clientId = String(req.query.clientId || `user-${Date.now()}-${Math.random()}`);
    const role = req.query.role === 'admin' ? 'admin' : 'client';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    connectedClients.set(clientId, {
      res,
      role,
      connectedAt: Date.now()
    });

    // Send initial canonical state and presence immediately
    res.write(
      `event: init\ndata: ${JSON.stringify({
        products: serverStore.products,
        pdfs: serverStore.pdfs,
        deletedProductIds: serverStore.deletedProductIds,
        deletedPdfIds: serverStore.deletedPdfIds,
        presence: getPresenceStats(),
        storedPdfIds: getStoredPdfFileIds()
      })}\n\n`
    );

    broadcastPresence();

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      connectedClients.delete(clientId);
      broadcastPresence();
    });
  });

  // Update role (when admin logs in or logs out on their specific session)
  app.post('/api/presence/role', (req, res) => {
    const { clientId, role } = req.body || {};
    if (clientId && connectedClients.has(clientId)) {
      const existing = connectedClients.get(clientId);
      if (existing) {
        existing.role = role === 'admin' ? 'admin' : 'client';
        connectedClients.set(clientId, existing);
        broadcastPresence();
      }
    }
    res.json({ ok: true, presence: getPresenceStats() });
  });

  // Auto-logout beacon when closing the page
  app.post('/api/admin-logout', (req, res) => {
    const clientId = req.query.clientId || req.body?.clientId;
    if (clientId && connectedClients.has(String(clientId))) {
      const existing = connectedClients.get(String(clientId));
      if (existing) {
        existing.role = 'client';
        connectedClients.set(String(clientId), existing);
        broadcastPresence();
      }
    }
    res.json({ ok: true });
  });

  // 2. Get current shared state (Laptop, Android, iOS, Tablet)
  app.get('/api/state', (_req, res) => {
    res.json({
      products: serverStore.products,
      pdfs: serverStore.pdfs,
      deletedProductIds: serverStore.deletedProductIds,
      deletedPdfIds: serverStore.deletedPdfIds,
      presence: getPresenceStats(),
      storedPdfIds: getStoredPdfFileIds()
    });
  });

  // 3. Non-destructive Sync: merges client's custom/newer PDFs & products with server store
  app.post('/api/sync', (req, res) => {
    const clientProducts = Array.isArray(req.body?.products) ? req.body.products : [];
    const clientPdfs = Array.isArray(req.body?.pdfs) ? req.body.pdfs : [];

    const prodResult = mergeProductsList(
      serverStore.products,
      clientProducts,
      serverStore.deletedProductIds
    );
    const pdfResult = mergePdfsList(
      serverStore.pdfs,
      clientPdfs,
      serverStore.deletedPdfIds
    );

    if (prodResult.changed || pdfResult.changed) {
      serverStore.products = prodResult.merged;
      serverStore.pdfs = pdfResult.merged;
      saveStore(serverStore);
      broadcastState();
      void publishCloudStoreSnapshot(buildServerCloudSnapshot());
    }

    res.json({
      products: serverStore.products,
      pdfs: serverStore.pdfs,
      deletedProductIds: serverStore.deletedProductIds,
      deletedPdfIds: serverStore.deletedPdfIds,
      presence: getPresenceStats(),
      storedPdfIds: getStoredPdfFileIds()
    });
  });

  // 4. Save/Update from Admin actions on ANY device (Laptop, Android, iOS, Tablet)
  app.post('/api/update-state', (req, res) => {
    const { updatedProduct, products, pdfs, deletedProductId, deletedPdfId } = req.body || {};

    if (deletedProductId && !serverStore.deletedProductIds.includes(deletedProductId)) {
      serverStore.deletedProductIds.push(deletedProductId);
      serverStore.products = serverStore.products.filter((p: any) => p.id !== deletedProductId);
      void backendRecordDeletionInFirestore(deletedProductId, 'product');
    }
    if (
      deletedPdfId &&
      !protectedPdfIdsSet.has(deletedPdfId) &&
      !serverStore.deletedPdfIds.includes(deletedPdfId)
    ) {
      serverStore.deletedPdfIds.push(deletedPdfId);
      serverStore.pdfs = serverStore.pdfs.filter((p: any) => p.id !== deletedPdfId);
      const pdfPath = path.join(PDF_FILES_DIR, `${deletedPdfId}.pdf`);
      if (fs.existsSync(pdfPath)) {
        try {
          fs.unlinkSync(pdfPath);
        } catch {}
      }
      void backendRecordDeletionInFirestore(deletedPdfId, 'pdf');
    }

    // Fast single-product update or creation (guarantees monotonically increasing updatedAt regardless of phone clock skew)
    if (updatedProduct && updatedProduct.id && !serverStore.deletedProductIds.includes(updatedProduct.id)) {
      const existing = serverStore.products.find((p: any) => p.id === updatedProduct.id);
      const monotonicTime = Math.max(
        getNextServerTimestamp(),
        Number(updatedProduct.updatedAt || 0)
      );
      const stampedProd = {
        ...(existing || {}),
        ...updatedProduct,
        price: Number(updatedProduct.price) || 0,
        updatedAt: monotonicTime
      };
      const prodResult = mergeProductsList(
        serverStore.products,
        [stampedProd],
        serverStore.deletedProductIds
      );
      serverStore.products = prodResult.merged;
      void backendUpsertProductToFirestore(stampedProd);
    }

    if (Array.isArray(products)) {
      const existingById = new Map<string, any>(serverStore.products.map((p: any) => [p.id, p]));
      const baseNextTime = getNextServerTimestamp();
      const stampedIncoming = products.map((incProd: any, idx: number) => {
        if (!incProd || !incProd.id) return incProd;
        const old = existingById.get(incProd.id);
        if (!old) {
          return {
            ...incProd,
            updatedAt: Math.max(baseNextTime + idx, Number(incProd.updatedAt || 0))
          };
        }
        const changedFields =
          old.price !== incProd.price ||
          old.image !== incProd.image ||
          old.name !== incProd.name ||
          old.clave !== incProd.clave ||
          old.description !== incProd.description ||
          old.category !== incProd.category ||
          old.size !== incProd.size ||
          Boolean(old.isStarProduct) !== Boolean(incProd.isStarProduct) ||
          Boolean(old.isNew) !== Boolean(incProd.isNew);
        if (changedFields) {
          return {
            ...incProd,
            updatedAt: Math.max(baseNextTime + idx, Number(incProd.updatedAt || 0))
          };
        }
        return incProd;
      });

      const prodResult = mergeProductsList(
        serverStore.products,
        stampedIncoming,
        serverStore.deletedProductIds
      );
      serverStore.products = prodResult.merged;
    }

    if (Array.isArray(pdfs)) {
      const pdfResult = mergePdfsList(
        serverStore.pdfs,
        pdfs,
        serverStore.deletedPdfIds
      );
      serverStore.pdfs = pdfResult.merged;
      for (const incPdf of pdfs) {
        if (incPdf && incPdf.id && !serverStore.deletedPdfIds.includes(incPdf.id)) {
          void backendUpsertPdfToFirestore(incPdf);
        }
      }
    }

    saveStore(serverStore);
    broadcastState();
    void publishCloudStoreSnapshot(buildServerCloudSnapshot());

    res.json({
      ok: true,
      products: serverStore.products,
      pdfs: serverStore.pdfs,
      deletedProductIds: serverStore.deletedProductIds,
      deletedPdfIds: serverStore.deletedPdfIds,
      presence: getPresenceStats(),
      storedPdfIds: getStoredPdfFileIds()
    });
  });

  // 5. Reset defaults when Admin explicitly clicks Reset
  app.post('/api/reset-defaults', (req, res) => {
    const { products, pdfs } = req.body || {};
    serverStore = {
      products: Array.isArray(products) && products.length > 0 ? products : [...INITIAL_PRODUCTS],
      pdfs: Array.isArray(pdfs) ? pdfs : [...INITIAL_PDFS],
      deletedProductIds: [],
      deletedPdfIds: [...REMOVED_DEFAULT_PDF_IDS]
    };
    saveStore(serverStore);
    broadcastState();
    res.json({
      ok: true,
      products: serverStore.products,
      pdfs: serverStore.pdfs,
      deletedProductIds: [],
      deletedPdfIds: serverStore.deletedPdfIds
    });
  });

  // 6. Upload/Serve actual PDF binary file so any device (Laptop, Android, iOS, Tablet) can open & download it
  app.put('/api/pdf-file/:id', (req, res) => {
    const pdfId = String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!pdfId || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ ok: false });
      return;
    }
    try {
      const filePath = path.join(PDF_FILES_DIR, `${pdfId}.pdf`);
      fs.writeFileSync(filePath, req.body);
      void backendUploadPdfBufferToFirestoreChunks(pdfId, req.body);
      res.json({ ok: true, pdfId });
    } catch (e) {
      console.warn('Error saving PDF binary to disk:', e);
      res.status(500).json({ ok: false });
    }
  });

  // Base64 JSON upload endpoint for mobile/iOS/proxy compatibility
  app.post('/api/pdf-file-b64/:id', (req, res) => {
    const pdfId = String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '');
    const base64Data = req.body?.base64;
    if (!pdfId || typeof base64Data !== 'string' || base64Data.length === 0) {
      res.status(400).json({ ok: false });
      return;
    }
    try {
      const cleaned = base64Data.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(cleaned, 'base64');
      if (buffer.length === 0) {
        res.status(400).json({ ok: false });
        return;
      }
      const filePath = path.join(PDF_FILES_DIR, `${pdfId}.pdf`);
      fs.writeFileSync(filePath, buffer);
      void backendUploadPdfBufferToFirestoreChunks(pdfId, buffer);
      res.json({ ok: true, pdfId });
    } catch (e) {
      console.warn('Error saving base64 PDF to disk:', e);
      res.status(500).json({ ok: false });
    }
  });

  app.get('/api/pdf-file/:id', async (req, res) => {
    const pdfId = String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '');
    const dataFilePath = path.join(PDF_FILES_DIR, `${pdfId}.pdf`);
    const publicFilePath = path.join(PUBLIC_PDF_DIR, `${pdfId}.pdf`);
    let resolvedPath = fs.existsSync(dataFilePath)
      ? dataFilePath
      : fs.existsSync(publicFilePath)
      ? publicFilePath
      : null;

    // If requesting the Official 2026 Catalog and no custom override exists, stream from the 6 binary parts in memory
    if (!resolvedPath && pdfId === OFFICIAL_CATALOG_ID) {
      try {
        const assetsDir = path.join(__dirname, 'public', 'assets', 'aistudio');
        const partBuffers: Buffer[] = [];
        for (let i = 0; i < 6; i++) {
          const pPath = path.join(assetsDir, `Catalogo_Shelo_NABEL2026_part${i}.bin`);
          if (fs.existsSync(pPath)) {
            partBuffers.push(fs.readFileSync(pPath));
          }
        }
        if (partBuffers.length === 6) {
          const fullBuf = Buffer.concat(partBuffers);
          const rawTitle =
            String(req.query.title || 'Catalogo_Oficial_Shelo_NABEL_2026')
              .replace(/[^a-zA-Z0-9_\-\s]/g, '')
              .trim()
              .replace(/\s+/g, '_') || 'Catalogo_Oficial_Shelo_NABEL_2026';
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Length', String(fullBuf.length));
          if (req.query.download === '1') {
            res.setHeader('Content-Disposition', `attachment; filename="${rawTitle}.pdf"`);
          }
          res.send(fullBuf);
          return;
        }
      } catch (err) {
        console.warn('Error streaming official catalog from parts:', err);
      }
    }

    // If not found on local container disk, fetch from Firebase Firestore chunks and cache locally
    if (!resolvedPath) {
      const firestoreBuf = await backendFetchPdfBufferFromFirestoreChunks(pdfId);
      if (firestoreBuf && firestoreBuf.length > 0) {
        try {
          fs.writeFileSync(dataFilePath, firestoreBuf);
          resolvedPath = dataFilePath;
        } catch {
          const rawTitle =
            String(req.query.title || pdfId)
              .replace(/[^a-zA-Z0-9_\-\s]/g, '')
              .trim()
              .replace(/\s+/g, '_') || 'Documento_Shelo_NABEL';
          res.setHeader('Content-Type', 'application/pdf');
          if (req.query.download === '1') {
            res.setHeader('Content-Disposition', `attachment; filename="${rawTitle}.pdf"`);
          }
          res.send(firestoreBuf);
          return;
        }
      }
    }

    if (resolvedPath) {
      const rawTitle =
        String(req.query.title || pdfId)
          .replace(/[^a-zA-Z0-9_\-\s]/g, '')
          .trim()
          .replace(/\s+/g, '_') || 'Documento_Shelo_NABEL';
      res.setHeader('Content-Type', 'application/pdf');
      if (req.query.download === '1') {
        res.setHeader('Content-Disposition', `attachment; filename="${rawTitle}.pdf"`);
      }
      res.sendFile(resolvedPath);
    } else {
      res.status(404).json({ ok: false });
    }
  });

  // 7. Serve 8 MB binary parts of a PDF via authenticated fetch() so mobile browsers (Android/iOS)
  // assemble a verified in-memory Blob URL and never trigger cookie-less OS DownloadManager errors
  app.get('/api/pdf-part/:id/:partIndex', (req, res) => {
    const pdfId = String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '');
    const partIndex = Math.max(0, parseInt(String(req.params.partIndex || '0'), 10) || 0);
    const dataFilePath = path.join(PDF_FILES_DIR, `${pdfId}.pdf`);
    const publicFilePath = path.join(PUBLIC_PDF_DIR, `${pdfId}.pdf`);

    const resolvedPath = fs.existsSync(dataFilePath)
      ? dataFilePath
      : fs.existsSync(publicFilePath)
      ? publicFilePath
      : null;

    if (!resolvedPath && pdfId === OFFICIAL_CATALOG_ID) {
      const partFilePath = path.join(
        __dirname,
        'public',
        'assets',
        'aistudio',
        `Catalogo_Shelo_NABEL2026_part${partIndex}.bin`
      );
      if (fs.existsSync(partFilePath)) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.sendFile(partFilePath);
        return;
      }
    }

    if (!resolvedPath) {
      res.status(404).json({ ok: false });
      return;
    }

    try {
      const stat = fs.statSync(resolvedPath);
      const partSize = 8 * 1024 * 1024; // 8 MB
      const start = partIndex * partSize;
      if (start >= stat.size) {
        res.status(416).json({ ok: false });
        return;
      }
      const end = Math.min(start + partSize, stat.size);
      const length = end - start;
      const fd = fs.openSync(resolvedPath, 'r');
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, start);
      fs.closeSync(fd);

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', String(length));
      res.setHeader('X-Total-Size', String(stat.size));
      res.setHeader('X-Total-Parts', String(Math.ceil(stat.size / partSize)));
      res.send(buffer);
    } catch (e) {
      console.warn('Error serving PDF part:', e);
      res.status(500).json({ ok: false });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sheló NABEL Multi-User Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
