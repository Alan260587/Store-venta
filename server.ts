import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_PRODUCTS } from './src/data/initialProducts';
import { INITIAL_PDFS } from './src/data/initialPdfs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const PDF_FILES_DIR = path.join(DATA_DIR, 'pdfs');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

// Unified Admin Key across all devices (Laptop, Android, iOS)
const UNIFIED_ADMIN_KEY = '1987';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PDF_FILES_DIR)) {
  fs.mkdirSync(PDF_FILES_DIR, { recursive: true });
}

function getTimestampFromId(id: string): number {
  const match = String(id || '').match(/(\d{13})/);
  return match ? Number(match[1]) : 0;
}

function mergeProductsList(
  existingList: any[],
  incomingList: any[],
  deletedIds: string[]
): { merged: any[]; changed: boolean } {
  const deletedSet = new Set(deletedIds);
  const map = new Map<string, any>();
  let changed = false;

  for (const item of existingList) {
    if (item && item.id && !deletedSet.has(item.id)) {
      map.set(item.id, item);
    } else if (item && item.id && deletedSet.has(item.id)) {
      changed = true;
    }
  }

  for (const inc of incomingList) {
    if (!inc || !inc.id || deletedSet.has(inc.id)) continue;
    const prev = map.get(inc.id);
    if (!prev) {
      map.set(inc.id, inc);
      changed = true;
    } else {
      const prevTime = Number(prev.updatedAt || 0);
      const incTime = Number(inc.updatedAt || 0);
      // Enforce Folders Escolares migration on school-01
      if (
        inc.id === 'school-01' &&
        inc.name === 'Folders Escolares' &&
        prev.name !== 'Folders Escolares'
      ) {
        map.set(inc.id, { ...prev, ...inc, updatedAt: Math.max(prevTime, incTime, 1) });
        changed = true;
      } else if (incTime > prevTime) {
        map.set(inc.id, inc);
        changed = true;
      } else if (incTime === prevTime && JSON.stringify(prev) !== JSON.stringify(inc)) {
        // If incoming has a newer edit without timestamp difference, prefer the one with updatedAt or non-default
        if (inc.updatedAt && !prev.updatedAt) {
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

  // Sort: custom products first (newest first by timestamp in ID or updatedAt), then initial products in canonical order
  allItems.sort((a, b) => {
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

  return { merged: allItems, changed };
}

function mergePdfsList(
  existingList: any[],
  incomingList: any[],
  deletedIds: string[]
): { merged: any[]; changed: boolean } {
  const deletedSet = new Set(deletedIds);
  const map = new Map<string, any>();
  let changed = false;

  for (const item of existingList) {
    if (item && item.id && !deletedSet.has(item.id)) {
      map.set(item.id, item);
    } else if (item && item.id && deletedSet.has(item.id)) {
      changed = true;
    }
  }

  for (const inc of incomingList) {
    if (!inc || !inc.id || deletedSet.has(inc.id)) continue;
    const { fileData, ...cleanInc } = inc;
    const prev = map.get(cleanInc.id);
    if (!prev) {
      map.set(cleanInc.id, cleanInc);
      changed = true;
    } else {
      const prevTime = Number(prev.updatedAt || 0);
      const incTime = Number(cleanInc.updatedAt || 0);
      if (incTime > prevTime) {
        map.set(cleanInc.id, cleanInc);
        changed = true;
      } else if (incTime === prevTime && JSON.stringify(prev) !== JSON.stringify(cleanInc)) {
        if (cleanInc.updatedAt && !prev.updatedAt) {
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

  const allPdfs = Array.from(map.values());
  const initialPdfOrder = new Map<string, number>(
    INITIAL_PDFS.map((p, idx) => [p.id, idx])
  );

  // Sort: custom uploaded PDFs first (newest first), then initial PDFs in canonical order
  allPdfs.sort((a, b) => {
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

  return { merged: allPdfs, changed };
}

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const deletedProductIds = Array.isArray(parsed.deletedProductIds) ? parsed.deletedProductIds : [];
      const deletedPdfIds = Array.isArray(parsed.deletedPdfIds) ? parsed.deletedPdfIds : [];
      const rawProducts = Array.isArray(parsed.products) ? parsed.products : [];
      const rawPdfs = Array.isArray(parsed.pdfs) ? parsed.pdfs : [];

      const { merged: products } = mergeProductsList(rawProducts, [], deletedProductIds);
      const { merged: pdfs } = mergePdfsList(rawPdfs, [], deletedPdfIds);

      return {
        products,
        pdfs,
        deletedProductIds,
        deletedPdfIds
      };
    }
  } catch (e) {
    console.warn('Could not read store.json, starting fresh:', e);
  }
  const initialStore = {
    products: [...INITIAL_PRODUCTS],
    pdfs: [...INITIAL_PDFS],
    deletedProductIds: [] as string[],
    deletedPdfIds: [] as string[]
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
  try {
    if (!fs.existsSync(PDF_FILES_DIR)) return [];
    return fs
      .readdirSync(PDF_FILES_DIR)
      .filter((name) => name.endsWith('.pdf'))
      .map((name) => name.replace(/\.pdf$/i, ''));
  } catch {
    return [];
  }
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
    presence: getPresenceStats(),
    storedPdfIds: getStoredPdfFileIds()
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Prevent any browser / iOS Safari / mobile proxy caching on /api/* routes
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  app.use(express.json({ limit: '80mb' }));
  app.use('/api/pdf-file', express.raw({ type: ['application/pdf', 'application/octet-stream', '*/*'], limit: '80mb' }));

  // Unified Admin Key verification across all devices (Laptop, Android, iOS)
  app.post('/api/verify-admin', (req, res) => {
    const rawKey = String(req.body?.key || '').trim();
    const valid = rawKey === UNIFIED_ADMIN_KEY;
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

  // 2. Get current shared state (Laptop, Android, iOS)
  app.get('/api/state', (_req, res) => {
    res.json({
      products: serverStore.products,
      pdfs: serverStore.pdfs,
      presence: getPresenceStats(),
      storedPdfIds: getStoredPdfFileIds()
    });
  });

  // 3. Non-destructive Sync: merges client's localStorage PDFs & products with server store by timestamp
  // Guarantees Laptop, Android, and iOS always converge to the exact same list!
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
    }

    res.json({
      products: serverStore.products,
      pdfs: serverStore.pdfs,
      presence: getPresenceStats(),
      storedPdfIds: getStoredPdfFileIds()
    });
  });

  // 4. Save/Update from Admin actions on ANY device (Laptop, Android, iOS)
  // Uses smart timestamp merge so saving on a cell phone NEVER overwrites items added on laptop and vice versa!
  app.post('/api/update-state', (req, res) => {
    const { products, pdfs, deletedProductId, deletedPdfId } = req.body || {};

    if (deletedProductId && !serverStore.deletedProductIds.includes(deletedProductId)) {
      serverStore.deletedProductIds.push(deletedProductId);
      serverStore.products = serverStore.products.filter((p: any) => p.id !== deletedProductId);
    }
    if (deletedPdfId && !serverStore.deletedPdfIds.includes(deletedPdfId)) {
      serverStore.deletedPdfIds.push(deletedPdfId);
      serverStore.pdfs = serverStore.pdfs.filter((p: any) => p.id !== deletedPdfId);
      const pdfPath = path.join(PDF_FILES_DIR, `${deletedPdfId}.pdf`);
      if (fs.existsSync(pdfPath)) {
        try { fs.unlinkSync(pdfPath); } catch {}
      }
    }

    if (Array.isArray(products)) {
      const prodResult = mergeProductsList(
        serverStore.products,
        products,
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
    }

    saveStore(serverStore);
    broadcastState();

    res.json({
      ok: true,
      products: serverStore.products,
      pdfs: serverStore.pdfs,
      presence: getPresenceStats(),
      storedPdfIds: getStoredPdfFileIds()
    });
  });

  // 5. Reset defaults when Admin explicitly clicks Reset
  app.post('/api/reset-defaults', (req, res) => {
    const { products, pdfs } = req.body || {};
    serverStore = {
      products: Array.isArray(products) && products.length > 0 ? products : [...INITIAL_PRODUCTS],
      pdfs: Array.isArray(pdfs) && pdfs.length > 0 ? pdfs : [...INITIAL_PDFS],
      deletedProductIds: [],
      deletedPdfIds: []
    };
    saveStore(serverStore);
    broadcastState();
    res.json({
      ok: true,
      products: serverStore.products,
      pdfs: serverStore.pdfs
    });
  });

  // 6. Upload/Serve actual PDF binary file so any device (Laptop, Android, iOS) can download it
  app.put('/api/pdf-file/:id', (req, res) => {
    const pdfId = String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!pdfId || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ ok: false });
      return;
    }
    try {
      const filePath = path.join(PDF_FILES_DIR, `${pdfId}.pdf`);
      fs.writeFileSync(filePath, req.body);
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
      res.json({ ok: true, pdfId });
    } catch (e) {
      console.warn('Error saving base64 PDF to disk:', e);
      res.status(500).json({ ok: false });
    }
  });

  app.get('/api/pdf-file/:id', (req, res) => {
    const pdfId = String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(PDF_FILES_DIR, `${pdfId}.pdf`);
    if (fs.existsSync(filePath)) {
      const rawTitle = String(req.query.title || pdfId)
        .replace(/[^a-zA-Z0-9_\-\s]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'Documento_Shelo_NABEL';
      res.setHeader('Content-Type', 'application/pdf');
      if (req.query.download === '1') {
        res.setHeader('Content-Disposition', `attachment; filename="${rawTitle}.pdf"`);
      }
      res.sendFile(filePath);
    } else {
      res.status(404).json({ ok: false });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
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
