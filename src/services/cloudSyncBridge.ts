import type { Product, PdfDocument } from '../types/index.ts';

/**
 * Universal Real-Time Cloud Sync Bridge across all devices and domains
 * (Computer, Android, iPhone, Tablet, ais-dev, ais-pre, vercel.app).
 *
 * Uses:
 * 1. Primary Payload Store: https://bytebin.lucko.me/post (CORS *, up to 10MB JSON with compressed product photos)
 * 2. Real-Time Event & Replay Bus: https://ntfy.sh/shelo_nabel_live_store_e0595e16_v4 (CORS *, SSE live stream + cached history)
 */

export const CLOUD_SYNC_TOPIC = 'shelo_nabel_live_store_e0595e16_v4';
const NTFY_BASE_URL = 'https://ntfy.sh';
const BYTEBIN_BASE_URL = 'https://bytebin.lucko.me';

export interface CloudStoreSnapshot {
  version: number;
  timestamp: number;
  clientId: string;
  products: Product[];
  pdfs: PdfDocument[];
  deletedProductIds: string[];
  deletedPdfIds: string[];
}

export interface CloudWireEnvelope {
  v: number;
  ts: number;
  cid: string;
  bytebinKey: string;
}

interface NtfyOuterEvent {
  id?: string;
  time?: number;
  event?: string;
  message?: string;
  attachment?: {
    url?: string;
  };
}

const processedKeys = new Set<string>();
const bytebinCache = new Map<string, CloudStoreSnapshot>();
let lastPushedHash = '';

export async function uploadSnapshotToBytebin(
  snapshot: CloudStoreSnapshot
): Promise<string | null> {
  try {
    const res = await fetch(`${BYTEBIN_BASE_URL}/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(snapshot)
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { key?: string };
    if (data && typeof data.key === 'string' && data.key.length > 0) {
      bytebinCache.set(data.key, snapshot);
      return data.key;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchSnapshotFromBytebin(
  key: string
): Promise<CloudStoreSnapshot | null> {
  if (!key) return null;
  const cached = bytebinCache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(`${BYTEBIN_BASE_URL}/${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CloudStoreSnapshot;
    if (data && Array.isArray(data.products)) {
      bytebinCache.set(key, data);
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Publishes the current modified store snapshot to the universal cloud bridge
 * so every phone, tablet, and computer on any URL receives it in < 250ms.
 */
export async function publishCloudStoreSnapshot(
  snapshot: CloudStoreSnapshot
): Promise<boolean> {
  try {
    const stateHash = JSON.stringify({
      p: snapshot.products.map((p) => [p.id, p.price, p.name, p.clave, p.updatedAt, p.image.length]),
      d: snapshot.deletedProductIds,
      dp: snapshot.deletedPdfIds,
      pdfs: snapshot.pdfs.map((c) => [c.id, c.title, c.updatedAt])
    });
    if (stateHash === lastPushedHash) {
      return true;
    }

    // 1. Upload full snapshot (including base64 product photos) to Bytebin
    const bytebinKey = await uploadSnapshotToBytebin(snapshot);
    if (!bytebinKey) {
      return false;
    }

    lastPushedHash = stateHash;
    processedKeys.add(bytebinKey);

    // 2. Keep the ntfy wire envelope < 200 bytes so ntfy always streams it inline via SSE in ~100ms
    const envelope: CloudWireEnvelope = {
      v: 4,
      ts: snapshot.timestamp,
      cid: snapshot.clientId,
      bytebinKey
    };

    const res = await fetch(`${NTFY_BASE_URL}/${CLOUD_SYNC_TOPIC}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8'
      },
      body: JSON.stringify(envelope)
    });

    return res.ok;
  } catch {
    return false;
  }
}

async function parseNtfyOuterEvent(outer: NtfyOuterEvent): Promise<CloudWireEnvelope | null> {
  if (!outer || outer.event !== 'message') return null;

  if (typeof outer.message === 'string' && outer.message.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(outer.message) as CloudWireEnvelope;
      if (parsed && parsed.v === 4 && typeof parsed.bytebinKey === 'string') {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  if (outer.attachment?.url) {
    try {
      const attRes = await fetch(outer.attachment.url);
      if (attRes.ok) {
        const parsed = (await attRes.json()) as CloudWireEnvelope;
        if (parsed && parsed.v === 4 && typeof parsed.bytebinKey === 'string') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Pulls cached snapshots from ntfy history (`?poll=1&since=all`) and resolves the newest state
 */
export async function pullLatestCloudSnapshots(): Promise<CloudStoreSnapshot[]> {
  try {
    const res = await fetch(`${NTFY_BASE_URL}/${CLOUD_SYNC_TOPIC}/json?poll=1&since=all`, {
      method: 'GET',
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text.trim()) return [];

    const lines = text.trim().split('\n');
    const envelopes: CloudWireEnvelope[] = [];

    for (const line of lines) {
      try {
        const outer = JSON.parse(line) as NtfyOuterEvent;
        const env = await parseNtfyOuterEvent(outer);
        if (env) {
          envelopes.push(env);
        }
      } catch {
        // ignore non-envelope messages
      }
    }

    if (envelopes.length === 0) return [];

    // Take the last 3 envelopes in chronological order so we get the latest full snapshot
    const recentEnvelopes = envelopes.slice(-3);
    const resolved: CloudStoreSnapshot[] = [];
    for (const env of recentEnvelopes) {
      const snap = await fetchSnapshotFromBytebin(env.bytebinKey);
      if (snap) {
        resolved.push(snap);
      }
    }
    return resolved;
  } catch {
    return [];
  }
}

/**
 * Subscribes to real-time SSE updates on the universal cloud topic in the browser
 */
export function subscribeToCloudRealtime(
  localClientId: string,
  onSnapshotReceived: (snapshot: CloudStoreSnapshot) => void
): () => void {
  if (typeof EventSource === 'undefined') {
    return () => {};
  }

  let es: EventSource | null = null;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closed) return;
    try {
      es = new EventSource(`${NTFY_BASE_URL}/${CLOUD_SYNC_TOPIC}/sse`);
      es.onmessage = (event: MessageEvent) => {
        void (async () => {
          try {
            const parsedData = JSON.parse(event.data) as NtfyOuterEvent & CloudWireEnvelope;
            let envelope: CloudWireEnvelope | null = null;

            if (parsedData && parsedData.v === 4 && typeof parsedData.bytebinKey === 'string') {
              envelope = parsedData;
            } else {
              envelope = await parseNtfyOuterEvent(parsedData);
            }

            if (!envelope || !envelope.bytebinKey) return;
            if (envelope.cid && envelope.cid === localClientId) return;
            if (processedKeys.has(envelope.bytebinKey)) return;
            processedKeys.add(envelope.bytebinKey);

            const resolved = await fetchSnapshotFromBytebin(envelope.bytebinKey);
            if (resolved) {
              onSnapshotReceived(resolved);
            }
          } catch {
            // ignore malformed message
          }
        })();
      };

      es.onerror = () => {
        try {
          es?.close();
        } catch {
          // ignore
        }
        es = null;
        if (!closed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    } catch {
      if (!closed) {
        reconnectTimer = setTimeout(connect, 4000);
      }
    }
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    try {
      es?.close();
    } catch {
      // ignore
    }
  };
}
