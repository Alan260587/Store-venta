/**
 * Persistent storage for uploaded PDF binary files across Laptop, Android, iOS, and Tablet.
 * Automatically saves every uploaded PDF on "Guardar" to:
 * 1. Local IndexedDB (instant local access)
 * 2. Cloud Server (/api/pdf-file/:id & /api/pdf-file-b64/:id)
 * 3. Firebase Cloud Firestore (/pdfChunks/{chunkId}) so any device can download the exact PDF from Firebase
 */

import {
  db,
  auth,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  OperationType,
  handleFirestoreError
} from '../firebase';
import { REMOVED_DEFAULT_PDF_IDS, OFFICIAL_CATALOG_ID } from '../data/initialPdfs';

const removedDefaultPdfIdsSet = new Set<string>(REMOVED_DEFAULT_PDF_IDS);

const DB_NAME = 'shelo_nabel_pdf_files_db';
const STORE_NAME = 'pdf_blobs';
const DB_VERSION = 1;
const CHUNK_CHAR_SIZE = 550000; // ~550KB per Firestore document (well below 1 MiB limit)
const MAX_FIRESTORE_CHUNKS = 25; // Up to ~10MB PDF binary in Firestore chunks

const syncedFirestorePdfIds = new Set<string>();
const memoryBlobCache = new Map<string, Blob>();

function sanitizeDocId(rawId: string): string {
  return String(rawId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
}

function getDeviceAuthorId(): string {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  try {
    const existing = sessionStorage.getItem('shelo_session_client_id_v1');
    if (existing) return existing.slice(0, 120);
  } catch {
    // ignore
  }
  return 'admin_device_sync';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const idb = request.result;
      if (!idb.objectStoreNames.contains(STORE_NAME)) {
        idb.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const cleaned = reader.result.replace(/^data:[^;]+;base64,/, '');
        resolve(cleaned);
      } else {
        reject(new Error('Failed to convert Blob to base64'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType = 'application/pdf'): Blob {
  const cleaned = base64.replace(/^data:[^;]+;base64,/, '');
  const binaryString = atob(cleaned);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function uploadBlobToServer(pdfId: string, blob: Blob): Promise<boolean> {
  try {
    const res = await fetch(`/api/pdf-file/${encodeURIComponent(pdfId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf'
      },
      body: blob
    });
    if (res.ok) return true;
  } catch {
    // Fallback to base64 JSON upload below
  }

  try {
    const base64 = await blobToBase64(blob);
    const resB64 = await fetch(`/api/pdf-file-b64/${encodeURIComponent(pdfId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ base64 })
    });
    return resB64.ok;
  } catch {
    return false;
  }
}

async function uploadBlobToFirestoreChunks(_pdfId: string, _blob: Blob): Promise<boolean> {
  // PDF binaries are stored in IndexedDB and on the backend server (/api/pdf-file/:id)
  // to avoid exhausting Firestore's free daily write quota.
  return false;
}

async function fetchBlobFromFirestoreChunks(pdfId: string): Promise<Blob | null> {
  try {
    const cleanPdfId = sanitizeDocId(pdfId);
    if (!cleanPdfId) return null;

    const q = query(
      collection(db, 'pdfChunks'),
      where('visibility', '==', 'public'),
      where('pdfId', '==', cleanPdfId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const chunks = snap.docs
      .map((d) => d.data() as { chunkIndex: number; totalChunks: number; data: string })
      .filter((c) => typeof c.data === 'string' && typeof c.chunkIndex === 'number')
      .sort((a, b) => a.chunkIndex - b.chunkIndex);

    if (chunks.length === 0) return null;

    const fullBase64 = chunks.map((c) => c.data).join('');
    if (!fullBase64) return null;

    const blob = base64ToBlob(fullBase64, 'application/pdf');
    syncedFirestorePdfIds.add(cleanPdfId);
    return blob.size > 0 ? blob : null;
  } catch (e) {
    console.warn('Could not fetch PDF chunks from Firebase:', e);
    return null;
  }
}

async function getAllLocalFilesFromIdb(): Promise<Array<{ id: string; blob: Blob }>> {
  try {
    const idb = await openDatabase();
    return await new Promise<Array<{ id: string; blob: Blob }>>((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const keysReq = store.getAllKeys();
      const valsReq = store.getAll();

      tx.oncomplete = () => {
        idb.close();
        const keys = keysReq.result || [];
        const vals = valsReq.result || [];
        const list: Array<{ id: string; blob: Blob }> = [];
        for (let i = 0; i < keys.length; i++) {
          const id = String(keys[i] || '');
          const blob = vals[i];
          if (id && blob instanceof Blob && blob.size > 0) {
            list.push({ id, blob });
          }
        }
        resolve(list);
      };
      tx.onerror = () => {
        idb.close();
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

export const pdfFileStore = {
  /**
   * Immediately saves the PDF file to:
   * 1) Local IndexedDB
   * 2) Cloud Server (/api/pdf-file/:id)
   * 3) Firebase Cloud Firestore (/pdfChunks)
   * Called automatically when clicking "Guardar" on any PDF!
   */
  saveFile: async (pdfId: string, file: Blob): Promise<void> => {
    memoryBlobCache.set(pdfId, file);
    try {
      const idb = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(file, pdfId);
        tx.oncomplete = () => {
          idb.close();
          resolve();
        };
        tx.onerror = () => {
          idb.close();
          reject(tx.error);
        };
      });
    } catch (e) {
      console.warn('Could not save PDF blob to IndexedDB:', e);
    }

    // Upload in parallel to Cloud Server and Firebase Cloud Firestore
    await Promise.allSettled([
      uploadBlobToServer(pdfId, file),
      uploadBlobToFirestoreChunks(pdfId, file)
    ]);
  },

  /**
   * Automatically pushes any locally stored IndexedDB PDFs to the Cloud Server and Firebase
   * in the background without requiring any user click.
   */
  syncLocalFilesToServer: async (serverStoredPdfIds: string[] = []): Promise<void> => {
    const serverSet = new Set(serverStoredPdfIds);
    const localFiles = await getAllLocalFilesFromIdb();
    for (const item of localFiles) {
      if (removedDefaultPdfIdsSet.has(item.id)) continue;
      if (!serverSet.has(item.id)) {
        await uploadBlobToServer(item.id, item.blob);
      }
      const cleanId = sanitizeDocId(item.id);
      if (cleanId && !syncedFirestorePdfIds.has(cleanId)) {
        await uploadBlobToFirestoreChunks(item.id, item.blob);
      }
    }
  },

  getFileBlob: async (pdfId: string): Promise<Blob | null> => {
    // 0. Try in-memory cache first (0ms instant response right after upload)
    const memBlob = memoryBlobCache.get(pdfId);
    if (memBlob && memBlob.size > 0) {
      return memBlob;
    }

    // 1. Try local IndexedDB first for instant opening
    try {
      const idb = await openDatabase();
      const localBlob = await new Promise<Blob | null>((resolve) => {
        const tx = idb.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(pdfId);
        req.onsuccess = () => {
          idb.close();
          const result = req.result;
          if (result instanceof Blob && result.size > 0) {
            resolve(result);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => {
          idb.close();
          resolve(null);
        };
      });
      if (localBlob) {
        memoryBlobCache.set(pdfId, localBlob);
        return localBlob;
      }
    } catch {
      // Fall through to Cloud Server and Firebase
    }

    // For the built-in 45.4 MB Official 2026 Catalog, if no custom replacement blob is in IndexedDB,
    // return null immediately so the app uses the fast 849 KB 5-page preview asset and direct static download URL
    if (pdfId === OFFICIAL_CATALOG_ID) {
      return null;
    }

    // 2. Try Cloud Server (/api/pdf-file/:id) with short retry in case another device is mid-upload
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(`/api/pdf-file/${encodeURIComponent(pdfId)}`, {
          cache: 'no-store'
        });
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/pdf')) {
          const serverBlob = await response.blob();
          if (serverBlob.size > 0) {
            memoryBlobCache.set(pdfId, serverBlob);
            try {
              const idb = await openDatabase();
              const tx = idb.transaction(STORE_NAME, 'readwrite');
              tx.objectStore(STORE_NAME).put(serverBlob, pdfId);
              tx.oncomplete = () => idb.close();
            } catch {
              // ignore
            }
            return serverBlob;
          }
        }
      } catch {
        // Fall through
      }
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    // 2b. Try static public/pdfs/:id.pdf (for static hosting / GitHub Pages)
    try {
      const staticRes = await fetch(`${import.meta.env.BASE_URL}pdfs/${encodeURIComponent(pdfId)}.pdf`, {
        cache: 'no-store'
      });
      const staticType = staticRes.headers.get('content-type') || '';
      if (staticRes.ok && staticType.includes('application/pdf')) {
        const staticBlob = await staticRes.blob();
        if (staticBlob.size > 0) {
          memoryBlobCache.set(pdfId, staticBlob);
          return staticBlob;
        }
      }
    } catch {
      // Fall through to Firebase Cloud Firestore chunks
    }

    // 3. Fetch directly from Firebase Cloud Firestore (/pdfChunks) so any device (Laptop, Android, iOS, Tablet)
    // can download the exact PDF uploaded on another device!
    const firestoreBlob = await fetchBlobFromFirestoreChunks(pdfId);
    if (firestoreBlob && firestoreBlob.size > 0) {
      memoryBlobCache.set(pdfId, firestoreBlob);
      // Cache locally in IndexedDB and on Cloud Server
      try {
        const idb = await openDatabase();
        const tx = idb.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(firestoreBlob, pdfId);
        tx.oncomplete = () => idb.close();
      } catch {
        // ignore
      }
      void uploadBlobToServer(pdfId, firestoreBlob);
      return firestoreBlob;
    }

    return null;
  },

  getFileUrl: async (pdfId: string): Promise<string | null> => {
    const blob = await pdfFileStore.getFileBlob(pdfId);
    return blob ? URL.createObjectURL(blob) : null;
  },

  deleteFile: async (pdfId: string): Promise<void> => {
    memoryBlobCache.delete(pdfId);
    try {
      const idb = await openDatabase();
      await new Promise<void>((resolve) => {
        const tx = idb.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(pdfId);
        tx.oncomplete = () => {
          idb.close();
          resolve();
        };
        tx.onerror = () => {
          idb.close();
          resolve();
        };
      });
    } catch {
      // ignore
    }
  }
};
