/**
 * Multi-user & local IndexedDB storage for actual PDF File/Blob binary data.
 * Saves locally to IndexedDB AND uploads to /api/pdf-file/:id in the background
 * so any connected user can download the exact uploaded PDF using their downloadKey.
 */

const DB_NAME = 'shelo_nabel_pdf_blobs_db';
const STORE_NAME = 'pdf_files';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 800);
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

export const pdfFileStore = {
  async saveFile(pdfId: string, file: Blob): Promise<void> {
    try {
      // Read into an ArrayBuffer first so stale File references from <input> never abort IndexedDB
      const bufferPromise = file.arrayBuffer();
      const timeoutBuffer = new Promise<null>((r) => setTimeout(() => r(null), 2000));
      const buffer = await Promise.race([bufferPromise, timeoutBuffer]);
      if (!buffer) return;

      const safeBlob = new Blob([buffer], { type: 'application/pdf' });

      // 1. Upload to multi-user backend server in background so other users can download it too
      void fetch(`/api/pdf-file/${encodeURIComponent(pdfId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: safeBlob
      }).catch(() => {});

      // 2. Also store in local IndexedDB for instant offline/local retrieval
      const db = await openDb();
      if (!db) return;

      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          try { db.close(); } catch {}
          resolve();
        }, 1200);

        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(safeBlob, pdfId);
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
    } catch (e) {
      console.warn('Non-fatal note saving PDF blob:', e);
    }
  },

  async getFileUrl(pdfId: string): Promise<string | null> {
    try {
      // 1. Check local IndexedDB first
      const db = await openDb();
      if (db) {
        const localUrl = await new Promise<string | null>((resolve) => {
          const timer = setTimeout(() => {
            try { db.close(); } catch {}
            resolve(null);
          }, 1000);

          try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(pdfId);
            req.onsuccess = () => {
              clearTimeout(timer);
              try { db.close(); } catch {}
              if (req.result instanceof Blob) {
                const url = URL.createObjectURL(req.result);
                resolve(url);
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

        if (localUrl) {
          return localUrl;
        }
      }

      // 2. Fallback: Check multi-user backend server for PDF uploaded by the Administrator
      const response = await fetch(`/api/pdf-file/${encodeURIComponent(pdfId)}`);
      if (response.ok) {
        const serverBlob = await response.blob();
        if (serverBlob && serverBlob.size > 0) {
          return URL.createObjectURL(serverBlob);
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
        }, 800);

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
