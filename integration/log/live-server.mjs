import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {LogEvidence} from './state.mjs';
import {ReadOnlyLog} from './reader-node.mjs';
import {locationIndex} from './locations.mjs';
import {webFiles,root,mime} from '../../scripts/web-files.mjs';
import path from 'node:path';
export const logServiceFiles=async()=> (await webFiles()).map(n=>new URL('../../'+n,import.meta.url));
export const PUBLIC_SITE_ORIGIN='https://limmin3-sudo.github.io';
const transient = new Set(['ENOENT', 'EACCES', 'EPERM', 'EBUSY', 'file-changed-during-read']);

// Local test service. It never accepts file paths over HTTP and never writes game files.
export async function startLogService({ file, port = 0, intervalMs = 250, webBundle = null, webUpdateStatus = null, apiOnly = false } = {}) {
  if (typeof file !== 'string' || !file || !/\.log$/i.test(file)) throw new Error('select-log-file');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('invalid-port');
  if (!Number.isInteger(intervalMs) || intervalMs < 20 || intervalMs > 10_000) throw new Error('invalid-interval');
  const token = randomBytes(32).toString('hex');
  const allowed=new Set(apiOnly?[]:await webFiles());
  // Load once locally; failure leaves allocation unresolved without stopping logs.
  let locations = null;
  try { locations = locationIndex(JSON.parse(await readFile(new URL('../../data/log-location-index.json', import.meta.url), 'utf8'))); } catch {}
  const evidence = new LogEvidence({locations});
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
    return { protocol: 1, webUpdate:webUpdateStatus?.() || null, phase: paused && !fatal ? 'paused' : phase, revision, lastReadAt, lastChangeAt,
      lastError, generation: reader.generation, bytesRead: reader.offset, linesRead: evidence.lines,
      gameIntegrationVerified: false, planningAllowed: false };
  }
  let origin;
  const server = http.createServer(async (req, res) => {
    const send = (code, body, type = 'application/json') => {
      // Release stamping changes the import map. Hash the served map, not an old bundled page.
      const map=type.startsWith('text/html')?String(body).match(/<script\s+type="importmap"[^>]*>([\s\S]*?)<\/script>/):null;
      const embeddedDocument=/^\/(?:guide|patch-notes|download)\.html(?:\?|$)/.test(req.url||'');
      const importPolicy=map?"'sha256-"+createHash('sha256').update(map[1]).digest('base64')+"'":'';
      res.writeHead(code, { ...(req.headers.origin===PUBLIC_SITE_ORIGIN&&/^\/api\/(?:status|snapshot)(?:\?|$)/.test(req.url||'')?{'Access-Control-Allow-Origin':PUBLIC_SITE_ORIGIN,'Vary':'Origin','Access-Control-Allow-Methods':'GET','Access-Control-Allow-Headers':'Authorization','Access-Control-Allow-Private-Network':'true','Access-Control-Max-Age':'600'}:{}), 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin', 'X-Frame-Options': embeddedDocument?'SAMEORIGIN':'DENY',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net "+importPolicy+" https://www.gstatic.com https://apis.google.com; worker-src 'self' blob: https://cdn.jsdelivr.net; media-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com https://stam-freight-control.firebaseapp.com https://raw.githubusercontent.com; frame-src 'self' https://stam-freight-control.firebaseapp.com https://accounts.google.com; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors "+(embeddedDocument?"'self'":"'none'") });
      res.end(body);
    };
    try {
      const url = new URL(req.url, origin), publicRead=req.headers.origin===PUBLIC_SITE_ORIGIN&&['/api/status','/api/snapshot'].includes(url.pathname)&&['GET','OPTIONS'].includes(req.method);
      if(req.headers.host!==new URL(origin).host||(!publicRead&&((req.headers.origin&&req.headers.origin!==origin)||(req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))))){send(403,'{"error":"origin-denied"}');return;}
      if(req.method==='OPTIONS'){
        const requestedHeaders=String(req.headers['access-control-request-headers']||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
        if(!publicRead||req.headers['access-control-request-method']!=='GET'||requestedHeaders.some(h=>h!=='authorization')){send(403,'{"error":"preflight-denied"}');return;}
        send(204,'');return;
      }
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
      if(apiOnly){send(404,'Not found','text/plain');return;}
      if (req.method !== 'GET') { send(405, 'Method not allowed', 'text/plain'); return; }
      if (webBundle) {
        const resource=await webBundle.read(url.pathname);
        if(!resource){send(404,'Not found','text/plain');return;}
        send(200,resource.body,resource.type);return;
      }
      if(url.pathname==='/version.json'){send(200,JSON.stringify({version:'0'.repeat(40),releases:JSON.parse(await readFile(path.join(root,'data/releases.json'),'utf8'))}));return;}
      const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
      if(!allowed.has(name)){send(404,'Not found','text/plain');return;}
      send(200,await readFile(path.join(root,name)),mime(name));
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
    origin, url: origin + '/index.html#token=' + token, token,
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
