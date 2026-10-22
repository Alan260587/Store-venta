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

const DB_NAME = 'shelo_nabel_pdf_files_db';
const STORE_NAME = 'pdf_blobs';
const DB_VERSION = 1;
const CHUNK_CHAR_SIZE = 550000; // ~550KB per Firestore document (well below 1 MiB limit)
const MAX_FIRESTORE_CHUNKS = 25; // Up to ~10MB PDF binary in Firestore chunks

const syncedFirestorePdfIds = new Set<string>();

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

async function uploadBlobToFirestoreChunks(pdfId: string, blob: Blob): Promise<boolean> {
  try {
    const cleanPdfId = sanitizeDocId(pdfId);
    if (!cleanPdfId) return false;

    const base64 = await blobToBase64(blob);
    if (!base64 || base64.length === 0) return false;

    const totalChunks = Math.ceil(base64.length / CHUNK_CHAR_SIZE);
    if (totalChunks > MAX_FIRESTORE_CHUNKS) {
      // File exceeds chunk limit; still served via /api/pdf-file/:id
      return false;
    }

    const authorUid = getDeviceAuthorId();
    for (let i = 0; i < totalChunks; i++) {
      const slice = base64.slice(i * CHUNK_CHAR_SIZE, (i + 1) * CHUNK_CHAR_SIZE);
      const chunkId = sanitizeDocId(`${cleanPdfId}_chunk_${i}`);
      const payload = {
        id: chunkId,
        pdfId: cleanPdfId,
        chunkIndex: i,
        totalChunks,
        data: slice,
        visibility: 'public',
        authorUid,
        adminKey: '1987',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      try {
        await setDoc(doc(db, 'pdfChunks', chunkId), payload);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Quota limit exceeded') || msg.includes('Quota exceeded') || msg.includes('resource-exhausted')) {
          return false;
        }
        handleFirestoreError(err, OperationType.WRITE, `pdfChunks/${chunkId}`);
      }
    }

    syncedFirestorePdfIds.add(cleanPdfId);
    return true;
  } catch (e) {
    console.warn('Error uploading PDF chunks to Firebase:', e);
    return false;
  }
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
        return localBlob;
      }
    } catch {
      // Fall through to Cloud Server and Firebase
    }

    // 2. Try Cloud Server (/api/pdf-file/:id)
    try {
      const response = await fetch(`/api/pdf-file/${encodeURIComponent(pdfId)}`, {
        cache: 'no-store'
      });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/pdf')) {
        const serverBlob = await response.blob();
        if (serverBlob.size > 0) {
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
      // Fall through to static public/pdfs and Firebase Cloud Firestore chunks
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

    try {
      const cleanPdfId = sanitizeDocId(pdfId);
      if (cleanPdfId) {
        const q = query(
          collection(db, 'pdfChunks'),
          where('visibility', '==', 'public'),
          where('pdfId', '==', cleanPdfId)
        );
        const snap = await getDocs(q);
        for (const chunkDoc of snap.docs) {
          try {
            await deleteDoc(doc(db, 'pdfChunks', chunkDoc.id));
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }
  }
};
