import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { LogEvidence } from './state.mjs';
import { ReadOnlyLog } from './reader-node.mjs';

const STATIC = new Map([
  ['/log-link.html', ['../../log-link.html', 'text/html; charset=utf-8']],
  ['/data/log-mission-index.json', ['../../data/log-mission-index.json', 'application/json']],
  ...['view.mjs', 'view.css', 'live-client.mjs', 'state.mjs', 'lines.mjs', 'parser.mjs', 'participation.mjs', 'catalog.mjs', 'catalog-view.mjs']
    .map(name => ['/integration/log/' + name, [name, name.endsWith('.css') ? 'text/css' : 'text/javascript']]),
]);
const transient = new Set(['ENOENT', 'EACCES', 'EPERM', 'EBUSY', 'file-changed-during-read']);

// Local test service. It never accepts file paths over HTTP and never writes game files.
export async function startLogService({ file, port = 0, intervalMs = 250 } = {}) {
  if (typeof file !== 'string' || !file || !/\.log$/i.test(file)) throw new Error('select-log-file');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('invalid-port');
  if (!Number.isInteger(intervalMs) || intervalMs < 20 || intervalMs > 10_000) throw new Error('invalid-interval');
  const token = randomBytes(32).toString('hex');
  const evidence = new LogEvidence();
  let timer, busy = false, stopped = false, paused = false, fatal = false;
  let phase = 'starting', revision = 0, dirty = false, lastReadAt = null, lastChangeAt = null, lastError = null;
  let published = JSON.stringify({ revision, snapshot: evidence.snapshot() });
  const reader = new ReadOnlyLog(file, {
    onLine: (line, n) => {
      const before = evidence.events.size;
      const parsed = evidence.ingest(line, { input: 'live-log', generation: reader.generation, line: n });
      dirty ||= parsed || evidence.events.size !== before;
    },
    onInvalid: code => { evidence.note(code); dirty = true; },
    onReset: () => { evidence.note('log-generation-changed'); dirty = true; },
  });
  // Include unsupported-format diagnostics even when a line emits no event.
  const originalNote = evidence.note.bind(evidence);
  evidence.note = code => { originalNote(code); dirty = true; };
  function schedule(ms) {
    clearTimeout(timer);
    if (!stopped && !paused && !fatal) timer = setTimeout(tick, ms);
  }
  async function tick() {
    if (busy || stopped || paused || fatal) return;
    busy = true;
    let next = intervalMs;
    try {
      const progress = await reader.poll();
      lastReadAt = new Date().toISOString();
      lastError = null;
      phase = paused ? 'paused' : progress.backlog ? 'catching-up' : 'watching';
      if (progress.backlog) next = 0; // Yield between bounded chunks, not one blocking full-file read.
      if (!progress.backlog && dirty) {
        const candidate = JSON.stringify({ revision: revision + 1, snapshot: evidence.snapshot() });
        if (Buffer.byteLength(candidate) > 8 * 1024 * 1024) throw new Error('snapshot-limit');
        published = candidate;
        revision++;
        dirty = false;
        lastChangeAt = new Date().toISOString();
      }
    } catch (error) {
      const code = error.code || error.message;
      lastError = /^[A-Za-z_-]+$/.test(code) ? code : 'read-error';
      if (transient.has(code)) { phase = 'waiting-file'; next = 1000; }
      else { fatal = true; phase = 'error'; }
      // Keep only the last successfully published snapshot; no partial/error state promotion.
    } finally {
      busy = false;
      schedule(next);
    }
  }
  function status() {
    return { protocol: 1, phase: paused && !fatal ? 'paused' : phase, revision, lastReadAt, lastChangeAt,
      lastError, generation: reader.generation, bytesRead: reader.offset, linesRead: evidence.lines,
      gameIntegrationVerified: false, planningAllowed: false };
  }
  let origin;
  const server = http.createServer(async (req, res) => {
    const send = (code, body, type = 'application/json') => {
      res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin', 'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
      res.end(body);
    };
    try {
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin) ||
          (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site']))) {
        send(403, '{"error":"origin-denied"}'); return;
      }
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith('/api/')) {
        const credential = req.headers.authorization;
        const expected = Buffer.from('Bearer ' + token);
        const received = Buffer.from(typeof credential === 'string' ? credential : '');
        if (received.length !== expected.length || !timingSafeEqual(received, expected)) { send(401, '{"error":"pairing-required"}'); return; }
        if (req.headers['transfer-encoding'] || Number(req.headers['content-length'] || 0) !== 0) { req.resume(); send(413, '{"error":"body-not-allowed"}'); return; }
        if (req.method === 'GET' && url.pathname === '/api/status') { send(200, JSON.stringify(status())); return; }
        if (req.method === 'GET' && url.pathname === '/api/snapshot') { send(200, published); return; }
        if (req.method === 'POST' && ['/api/pause', '/api/resume'].includes(url.pathname)) {
          if (req.headers.origin !== origin) { send(403, '{"error":"origin-required"}'); return; }
          if (fatal) { send(409, '{"error":"restart-required"}'); return; }
          paused = url.pathname === '/api/pause';
          if (paused) clearTimeout(timer); else { phase = 'starting'; schedule(0); }
          send(200, JSON.stringify(status())); return;
        }
        send(405, '{"error":"unsupported-operation"}'); return;
      }
      if (req.method !== 'GET') { send(405, 'Method not allowed', 'text/plain'); return; }
      const resource = STATIC.get(url.pathname === '/' ? '/log-link.html' : url.pathname);
      if (!resource) { send(404, 'Not found', 'text/plain'); return; }
      send(200, await readFile(new URL(resource[0], import.meta.url)), resource[1]);
    } catch { if (!res.headersSent) send(500, '{"error":"local-service-error"}'); else res.end(); }
  });
  server.maxConnections = 16;
  server.headersTimeout = 5000;
  server.requestTimeout = 5000;
  server.keepAliveTimeout = 1000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  schedule(0);
  return {
    origin, url: origin + '/log-link.html#token=' + token, token,
    async close() {
      stopped = true;
      clearTimeout(timer);
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      // The current read is read-only and bounded; let its descriptor close before returning.
      while (busy) await new Promise(resolve => setTimeout(resolve, 5));
    },
  };
}
