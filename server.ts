import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const PDF_FILES_DIR = path.join(DATA_DIR, 'pdfs');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PDF_FILES_DIR)) {
  fs.mkdirSync(PDF_FILES_DIR, { recursive: true });
}

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        products: Array.isArray(parsed.products) ? parsed.products : [],
        pdfs: Array.isArray(parsed.pdfs) ? parsed.pdfs : [],
        deletedProductIds: Array.isArray(parsed.deletedProductIds) ? parsed.deletedProductIds : [],
        deletedPdfIds: Array.isArray(parsed.deletedPdfIds) ? parsed.deletedPdfIds : []
      };
    }
  } catch (e) {
    console.warn('Could not read store.json, starting fresh:', e);
  }
  return {
    products: [],
    pdfs: [],
    deletedProductIds: [],
    deletedPdfIds: []
  };
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

// Connected multi-user clients map: clientId -> { res, role, connectedAt, lastSeen }
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
    presence: getPresenceStats()
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use('/api/pdf-file', express.raw({ type: ['application/pdf', 'application/octet-stream'], limit: '80mb' }));

  // 1. Real-time Multi-User SSE Stream
  app.get('/api/events', (req, res) => {
    const clientId = String(req.query.clientId || `user-${Date.now()}-${Math.random()}`);
    const role = req.query.role === 'admin' ? 'admin' : 'client';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    connectedClients.set(clientId, {
      res,
      role,
      connectedAt: Date.now()
    });

    // Send initial state and presence
    res.write(
      `event: init\ndata: ${JSON.stringify({
        products: serverStore.products,
        pdfs: serverStore.pdfs,
        presence: getPresenceStats()
      })}\n\n`
    );

    broadcastPresence();

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 20000);

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

  // 2. Get current shared state
  app.get('/api/state', (_req, res) => {
    res.json({
      products: serverStore.products,
      pdfs: serverStore.pdfs,
      presence: getPresenceStats()
    });
  });

  // 3. Non-destructive Sync: merges client's existing localStorage PDFs & products with server store
  // Guarantees nothing previously added on the page is ever lost!
  app.post('/api/sync', (req, res) => {
    const clientProducts = Array.isArray(req.body?.products) ? req.body.products : [];
    const clientPdfs = Array.isArray(req.body?.pdfs) ? req.body.pdfs : [];

    let changed = false;

    // Merge products (preserve all custom added products and latest edits)
    const prodMap = new Map();
    for (const p of serverStore.products) {
      if (p && p.id && !serverStore.deletedProductIds.includes(p.id)) {
        prodMap.set(p.id, p);
      }
    }
    for (const cp of clientProducts) {
      if (cp && cp.id && !serverStore.deletedProductIds.includes(cp.id)) {
        if (!prodMap.has(cp.id)) {
          prodMap.set(cp.id, cp);
          changed = true;
        } else {
          // Ensure Folders Escolares migration is respected
          const existing = prodMap.get(cp.id);
          if (cp.id === 'school-01' && cp.name === 'Folders Escolares' && existing.name !== 'Folders Escolares') {
            prodMap.set(cp.id, cp);
            changed = true;
          }
        }
      }
    }

    // Put custom added products first, followed by catalog products
    const mergedProducts = Array.from(prodMap.values());

    // Merge PDFs (preserve all uploaded PDFs and latest edits)
    const pdfMap = new Map();
    for (const pdf of serverStore.pdfs) {
      if (pdf && pdf.id && !serverStore.deletedPdfIds.includes(pdf.id)) {
        pdfMap.set(pdf.id, pdf);
      }
    }
    for (const cpdf of clientPdfs) {
      if (cpdf && cpdf.id && !serverStore.deletedPdfIds.includes(cpdf.id)) {
        if (!pdfMap.has(cpdf.id)) {
          pdfMap.set(cpdf.id, cpdf);
          changed = true;
        }
      }
    }

    // Sort PDFs so custom uploaded PDFs (pdf-<timestamp>) appear at the top
    const mergedPdfs = Array.from(pdfMap.values());

    if (changed || serverStore.products.length === 0 || serverStore.pdfs.length === 0) {
      serverStore.products = mergedProducts;
      serverStore.pdfs = mergedPdfs;
      saveStore(serverStore);
      broadcastState();
    }

    res.json({
      products: serverStore.products,
      pdfs: serverStore.pdfs,
      presence: getPresenceStats()
    });
  });

  // 4. Save/Update Full Lists from Admin actions
  app.post('/api/update-state', (req, res) => {
    const { products, pdfs, deletedProductId, deletedPdfId } = req.body || {};

    if (deletedProductId && !serverStore.deletedProductIds.includes(deletedProductId)) {
      serverStore.deletedProductIds.push(deletedProductId);
    }
    if (deletedPdfId && !serverStore.deletedPdfIds.includes(deletedPdfId)) {
      serverStore.deletedPdfIds.push(deletedPdfId);
      const pdfPath = path.join(PDF_FILES_DIR, `${deletedPdfId}.pdf`);
      if (fs.existsSync(pdfPath)) {
        try { fs.unlinkSync(pdfPath); } catch {}
      }
    }

    if (Array.isArray(products)) {
      serverStore.products = products;
    }
    if (Array.isArray(pdfs)) {
      serverStore.pdfs = pdfs;
    }

    saveStore(serverStore);
    broadcastState();

    res.json({
      ok: true,
      products: serverStore.products,
      pdfs: serverStore.pdfs
    });
  });

  // 5. Reset defaults when Admin explicitly clicks Reset
  app.post('/api/reset-defaults', (req, res) => {
    const { products, pdfs } = req.body || {};
    serverStore = {
      products: Array.isArray(products) ? products : [],
      pdfs: Array.isArray(pdfs) ? pdfs : [],
      deletedProductIds: [],
      deletedPdfIds: []
    };
    saveStore(serverStore);
    broadcastState();
    res.json({ ok: true });
  });

  // 6. Upload/Serve actual PDF binary file so any connected user can download it with their downloadKey
  app.put('/api/pdf-file/:id', (req, res) => {
    const pdfId = String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!pdfId || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ ok: false });
      return;
    }
    try {
      const filePath = path.join(PDF_FILES_DIR, `${pdfId}.pdf`);
      fs.writeFileSync(filePath, req.body);
      res.json({ ok: true });
    } catch (e) {
      console.warn('Error saving PDF binary to disk:', e);
      res.status(500).json({ ok: false });
    }
  });

  app.get('/api/pdf-file/:id', (req, res) => {
    const pdfId = String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(PDF_FILES_DIR, `${pdfId}.pdf`);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
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
