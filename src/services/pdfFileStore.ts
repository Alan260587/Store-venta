/**
 * Multi-user & cross-device (Laptop, Android, iOS) storage for actual PDF File/Blob binary data.
 * Saves locally to IndexedDB AND uploads to /api/pdf-file/:id (with base64 JSON fallback)
 * so any device (Laptop, Android, iOS) sees and downloads the exact same PDF files.
 */

const DB_NAME = 'shelo_nabel_pdf_blobs_db';
const STORE_NAME = 'pdf_files';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 1500);
    try {
      if (typeof indexedDB === 'undefined') {
        clearTimeout(timer);
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        } catch {
          // ignore upgrade errors
        }
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        resolve(request.result);
      };
      request.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      request.onblocked = () => {
        clearTimeout(timer);
        resolve(null);
      };
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

async function uploadBufferToServer(pdfId: string, buffer: ArrayBuffer): Promise<boolean> {
  try {
    const safeBlob = new Blob([buffer], { type: 'application/pdf' });
    const putRes = await fetch(`/api/pdf-file/${encodeURIComponent(pdfId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: safeBlob
    });
    if (putRes.ok) return true;
  } catch {
    // fallback to base64 JSON below
  }

  try {
    const base64 = arrayBufferToBase64(buffer);
    const postRes = await fetch(`/api/pdf-file-b64/${encodeURIComponent(pdfId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64 })
    });
    return postRes.ok;
  } catch {
    return false;
  }
}

async function getLocalBlobFromIdb(pdfId: string): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;

  return new Promise<Blob | null>((resolve) => {
    const timer = setTimeout(() => {
      try { db.close(); } catch {}
      resolve(null);
    }, 1500);

    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(pdfId);
      req.onsuccess = () => {
        clearTimeout(timer);
        try { db.close(); } catch {}
        if (req.result instanceof Blob && req.result.size > 0) {
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        clearTimeout(timer);
        try { db.close(); } catch {}
        resolve(null);
      };
    } catch {
      clearTimeout(timer);
      try { db.close(); } catch {}
      resolve(null);
    }
  });
}

async function putLocalBlobInIdb(pdfId: string, blob: Blob): Promise<void> {
  const db = await openDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      try { db.close(); } catch {}
      resolve();
    }, 1800);

    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(blob, pdfId);
      tx.oncomplete = () => {
        clearTimeout(timer);
        try { db.close(); } catch {}
        resolve();
      };
      tx.onerror = () => {
        clearTimeout(timer);
        try { db.close(); } catch {}
        resolve();
      };
      tx.onabort = () => {
        clearTimeout(timer);
        try { db.close(); } catch {}
        resolve();
      };
    } catch {
      clearTimeout(timer);
      try { db.close(); } catch {}
      resolve();
    }
  });
}

export const pdfFileStore = {
  async saveFile(pdfId: string, file: Blob): Promise<void> {
    try {
      // Read into an ArrayBuffer first so stale File references from <input> on iOS/Android never abort
      const bufferPromise = file.arrayBuffer();
      const timeoutBuffer = new Promise<null>((r) => setTimeout(() => r(null), 8000));
      const buffer = await Promise.race([bufferPromise, timeoutBuffer]);
      if (!buffer) return;

      const safeBlob = new Blob([buffer], { type: 'application/pdf' });

      // 1. Upload to multi-device server (PUT binary + POST base64 fallback for iOS/mobile proxies)
      void uploadBufferToServer(pdfId, buffer);

      // 2. Store in local IndexedDB for instant retrieval
      await putLocalBlobInIdb(pdfId, safeBlob);
    } catch (e) {
      console.warn('Non-fatal note saving PDF blob:', e);
    }
  },

  /**
   * Automatically uploads any PDFs stored in this device's local IndexedDB
   * that are not yet stored on the shared server, ensuring Laptop, Android, and iOS
   * all have access to previously uploaded PDF files.
   */
  async syncLocalBlobsToServer(localPdfIds: string[], serverStoredIds: string[] = []): Promise<void> {
    try {
      const serverSet = new Set(serverStoredIds);
      for (const pdfId of localPdfIds) {
        if (!pdfId || serverSet.has(pdfId)) continue;
        const localBlob = await getLocalBlobFromIdb(pdfId);
        if (localBlob && localBlob.size > 0) {
          const buffer = await localBlob.arrayBuffer();
          await uploadBufferToServer(pdfId, buffer);
        }
      }
    } catch {
      // ignore background sync errors
    }
  },

  async getFileUrl(pdfId: string): Promise<string | null> {
    try {
      // 1. Check local IndexedDB first
      const localBlob = await getLocalBlobFromIdb(pdfId);
      if (localBlob) {
        return URL.createObjectURL(localBlob);
      }

      // 2. Fetch from multi-device backend server (uploaded from Laptop, Android, or iOS)
      const response = await fetch(`/api/pdf-file/${encodeURIComponent(pdfId)}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const serverBlob = await response.blob();
        if (serverBlob && serverBlob.size > 0) {
          const pdfBlob = new Blob([serverBlob], { type: 'application/pdf' });
          // Cache locally in IndexedDB for next time
          void putLocalBlobInIdb(pdfId, pdfBlob);
          return URL.createObjectURL(pdfBlob);
        }
      }

      return null;
    } catch {
      return null;
    }
  },

  async deleteFile(pdfId: string): Promise<void> {
    try {
      const db = await openDb();
      if (!db) return;

      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          try { db.close(); } catch {}
          resolve();
        }, 1000);

        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.delete(pdfId);
          tx.oncomplete = () => {
            clearTimeout(timer);
            try { db.close(); } catch {}
            resolve();
          };
          tx.onerror = () => {
            clearTimeout(timer);
            try { db.close(); } catch {}
            resolve();
          };
          tx.onabort = () => {
            clearTimeout(timer);
            try { db.close(); } catch {}
            resolve();
          };
        } catch {
          clearTimeout(timer);
          try { db.close(); } catch {}
          resolve();
        }
      });
    } catch {
      // ignore
    }
  }
};
