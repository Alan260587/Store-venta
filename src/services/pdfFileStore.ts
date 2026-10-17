/**
 * IndexedDB storage for actual PDF File/Blob binary data.
 * Designed with strict timeouts and abort handlers so it NEVER blocks or hangs PDF uploads.
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
      const timeoutBuffer = new Promise<null>((r) => setTimeout(() => r(null), 1500));
      const buffer = await Promise.race([bufferPromise, timeoutBuffer]);
      if (!buffer) return;

      const safeBlob = new Blob([buffer], { type: 'application/pdf' });
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
      console.warn('Non-fatal note saving PDF blob to IndexedDB:', e);
    }
  },

  async getFileUrl(pdfId: string): Promise<string | null> {
    try {
      const db = await openDb();
      if (!db) return null;

      return await new Promise<string | null>((resolve) => {
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
