import http from 'node:http';
import {prepareScreenAssets,screenAssets} from './screen-assets-node.mjs';
import { readFile } from 'node:fs/promises';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { LogEvidence } from './state.mjs';
import { ReadOnlyLog } from './reader-node.mjs';
import { preparePreviewAssets } from './preview-assets-node.mjs';
import { locationIndex } from './locations.mjs';

const STATIC = new Map([
  ['/data/locations.json',['../../data/locations.json','application/json']],
  ...['account-core.mjs', 'account.mjs', 'aliases.mjs', 'app.mjs', 'assistant.mjs', 'cargo-summary.mjs', 'execution.mjs', 'feedback-core.mjs', 'feedback-data.mjs', 'feedback.mjs', 'firebase-config.mjs', 'fleet.mjs', 'guide.mjs', 'history-core.mjs', 'history.mjs', 'i18n.mjs', 'location-manager-core.mjs', 'location-manager.mjs', 'mission-match.mjs', 'ocr.mjs', 'planning-preferences.mjs', 'route-editor.mjs', 'scene.mjs', 'starmap.mjs', 'sync.mjs', 'updates.mjs', 'voice.mjs', 'workbench.mjs'].map(n=>['/'+n,['../../'+n,'text/javascript']]),
  ...['flight-deck.html','patch-notes.html'].map(n=>['/'+n,['../../'+n,'text/html; charset=utf-8']]),
  ...['patch-notes.css','patch-notes.mjs'].map(n=>['/onboarding/'+n,['../../onboarding/'+n,n.endsWith('.css')?'text/css':'text/javascript']]),
  ...['manual-adapter.mjs','manual-reception.mjs','flight-deck.css','deck-layout.css','partner-briefing.mjs','user-contracts.mjs','user-contracts-view.mjs','position-feed.mjs','position-view.mjs'].map(n=>['/integration/log/'+n,['./'+n,n.endsWith('.css')?'text/css':'text/javascript']]),
  ...['stam-logo.png','stam-logo-64.png'].map(n=>['/assets/'+n,['../../assets/'+n,'image/png']]),
  ['/assets/partners/broker.jpg',['../../assets/partners/broker.jpg','image/jpeg']],
  ['/style.css',['../../style.css','text/css']],
  ['/data/hauling-missions.json',['../../data/hauling-missions.json','application/json']],

  ['/i18n-en.mjs',['../../i18n-en.mjs','text/javascript']],
  ...['guide.html','download.html'].map(name=>['/'+name,['../../'+name,'text/html; charset=utf-8']]),
  ...['guide.mjs','guide-data.mjs','download.mjs','guide.css'].map(name=>['/onboarding/'+name,['../../onboarding/'+name,name.endsWith('.css')?'text/css':'text/javascript']]),
  ...['poster.jpg','briefing.mp4','briefing-ko.vtt','flight-deck.jpg','partner-ready.jpg','contract-reception.jpg','cargo-layout.jpg','route-map.jpg'].map(name=>['/assets/onboarding/'+name,['../../assets/onboarding/'+name,({'jpg':'image/jpeg','mp4':'video/mp4','vtt':'text/vtt; charset=utf-8'})[name.split('.').pop()]]]),
  ['/data/desktop-release.json',['../../data/desktop-release.json','application/json']],
  ['/integration/log/plan-choice-store.mjs',['./plan-choice-store.mjs','text/javascript']],
  ['/integration/log/reception.mjs',['./reception.mjs','text/javascript']],
  ['/data/log-vehicle-index.mjs',['../../data/log-vehicle-index.mjs','text/javascript']],
  ['/integration/log/timing.mjs',['./timing.mjs','text/javascript']],
  ['/integration/log/timing-view.mjs',['./timing-view.mjs','text/javascript']],
  ['/performance.mjs',['../../performance.mjs','text/javascript']],
  ['/performance-core.mjs',['../../performance-core.mjs','text/javascript']],
  ['/data/ship-performance.json',['../../data/ship-performance.json','application/json']],
  ['/data/quantum-drives.json',['../../data/quantum-drives.json','application/json']],
  ['/integration/log/cargo-continuity.mjs',['./cargo-continuity.mjs','text/javascript']],
  ['/integration/log/cargo-continuity-view.mjs',['./cargo-continuity-view.mjs','text/javascript']],
  ['/integration/log/box-memory.mjs',['./box-memory.mjs','text/javascript']],
  ['/integration/log/partner-voice.mjs',['./partner-voice.mjs','text/javascript']],
  ['/integration/log/retained-cargo.mjs',['./retained-cargo.mjs','text/javascript']],
  ['/integration/log/contract-removal.mjs',['./contract-removal.mjs','text/javascript']],
  ['/integration/log/reservation-route.mjs',['./reservation-route.mjs','text/javascript']],
  ...screenAssets.map(name=>['/vendor/screen/'+name,['../../vendor/screen/'+name,name.endsWith('.js')?'text/javascript':name.endsWith('.wasm')?'application/wasm':'application/octet-stream']]),
  ...['screen-watch.mjs','screen-evidence.mjs','screen-reader.mjs'].map(name=>['/integration/log/'+name,['./'+name,'text/javascript']]),
  ...['feedback-core.mjs','feedback-data.mjs','location-manager-core.mjs','locations.mjs'].map(name=>['/'+name,['../../'+name,'text/javascript']]),
  ...['box-editor.mjs','reservations.mjs','progress.mjs','progress-view.mjs','reward-store.mjs','reward-view.mjs','reward-history.mjs','guidance-store.mjs','planning-task.mjs','flight-backup.mjs','flight-backup-view.mjs','manual-drafts.mjs','ui-language.mjs','navigation.mjs','flight-ready.mjs','workspace-tools.mjs','workspace-updates.mjs','personal-locations.mjs'].map(name=>['/integration/log/'+name,['./'+name,'text/javascript']]),
  ['/integration/log/workspace-tools.css',['./workspace-tools.css','text/css']],
  ...['releases.json','rebuild-version.json','rebuild-releases.json'].map(name=>['/data/'+name,['../../data/'+name,'application/json']]),
  ...['account-core.mjs','history-core.mjs','sync.mjs','planning-preferences.mjs','firebase-config.mjs'].map(name=>['/'+name,['../../'+name,'text/javascript']]),
  ['/integration/log/account-view.mjs',['./account-view.mjs','text/javascript']],
  ['/integration/log/account.css',['./account.css','text/css']],
  ['/icon.svg', ['../../icon.svg', 'image/svg+xml']],
  ['/integration/log/preview-routes.mjs', ['./preview-routes.mjs', 'text/javascript']],
  ['/bloom.mjs', ['../../bloom.mjs', 'text/javascript']],
  ['/cargo-scene.mjs', ['../../cargo-scene.mjs', 'text/javascript']],
  ['/starmap-core.mjs', ['../../starmap-core.mjs', 'text/javascript']],
  ['/mapfx.mjs', ['../../mapfx.mjs', 'text/javascript']],
  ['/route-display.mjs', ['../../route-display.mjs', 'text/javascript']],
  ['/assets/partners/navigator.jpg', ['../../assets/partners/navigator.jpg', 'image/jpeg']],
  ['/assets/partners/aide.jpg', ['../../assets/partners/aide.jpg', 'image/jpeg']],
  ['/integration/log/estimated-flight.mjs', ['./estimated-flight.mjs', 'text/javascript']],
  ['/integration/log/preview-map.mjs', ['./preview-map.mjs', 'text/javascript']],
  ['/data/ships.json', ['../../data/ships.json', 'application/json']],
  ['/delivery-first.mjs', ['../../delivery-first.mjs', 'text/javascript']],
  ['/route-departure.mjs', ['../../route-departure.mjs', 'text/javascript']],
  ['/route-only.mjs', ['../../route-only.mjs', 'text/javascript']],
  ['/integration/log/preview-session.mjs', ['./preview-session.mjs', 'text/javascript']],
  ['/engine.mjs', ['../../engine.mjs', 'text/javascript']],
  ['/integration/log/preview-packing.mjs', ['../../integration/log/preview-packing.mjs', 'text/javascript']],
  ['/integration/log/preview-view.mjs', ['../../integration/log/preview-view.mjs', 'text/javascript']],
  ['/integration/log/preview-worker.mjs', ['../../integration/log/preview-worker.mjs', 'text/javascript']],
  ['/integration/log/preview.css', ['../../integration/log/preview.css', 'text/css']],
  ['/manual-route.mjs', ['../../manual-route.mjs', 'text/javascript']],
  ['/packing-blocks.mjs', ['../../packing-blocks.mjs', 'text/javascript']],
  ['/recipes.mjs', ['../../recipes.mjs', 'text/javascript']],
  ['/render-loop.mjs', ['../../render-loop.mjs', 'text/javascript']],
  ['/route-cost.mjs', ['../../route-cost.mjs', 'text/javascript']],
  ['/route-estimate.mjs', ['../../route-estimate.mjs', 'text/javascript']],
  ['/route-search.mjs', ['../../route-search.mjs', 'text/javascript']],
  ['/ships.mjs', ['../../ships.mjs', 'text/javascript']],
  ['/travel.mjs', ['../../travel.mjs', 'text/javascript']],
  ['/vendor/OrbitControls.js', ['../../vendor/OrbitControls.js', 'text/javascript']],
  ['/vendor/three.module.js', ['../../vendor/three.module.js', 'text/javascript']],
  ['/index.html', ['../../index.html', 'text/html; charset=utf-8']],
  ['/integration/log/entry-redirect.mjs', ['./entry-redirect.mjs', 'text/javascript']],
  ['/log-link.html', ['../../log-link.html', 'text/html; charset=utf-8']],
  ['/data/log-mission-index.json', ['../../data/log-mission-index.json', 'application/json']],
  ['/data/log-location-index.json', ['../../data/log-location-index.json', 'application/json']],
  ...['view.mjs', 'view.css', 'live-client.mjs', 'state.mjs', 'lines.mjs', 'parser.mjs', 'participation.mjs', 'catalog.mjs', 'catalog-view.mjs', 'locations.mjs', 'locations-view.mjs', 'builds.mjs', 'box-profiles.mjs', 'box-profiles-view.mjs', 'manifest.mjs', 'manifest-view.mjs']
    .map(name => ['/integration/log/' + name, [name, name.endsWith('.css') ? 'text/css' : 'text/javascript']]),
]);
export const logServiceFiles = () => [...STATIC.values()].map(([path])=>new URL(path,import.meta.url));
const transient = new Set(['ENOENT', 'EACCES', 'EPERM', 'EBUSY', 'file-changed-during-read']);

// Local test service. It never accepts file paths over HTTP and never writes game files.
export async function startLogService({ file, port = 0, intervalMs = 250, webBundle = null, webUpdateStatus = null } = {}) {
  if (typeof file !== 'string' || !file || !/\.log$/i.test(file)) throw new Error('select-log-file');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('invalid-port');
  if (!Number.isInteger(intervalMs) || intervalMs < 20 || intervalMs > 10_000) throw new Error('invalid-interval');
  const token = randomBytes(32).toString('hex');
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
      const importPolicy=map?"'sha256-"+createHash('sha256').update(map[1]).digest('base64')+"'":'';
      res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin', 'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' "+importPolicy+" https://www.gstatic.com https://apis.google.com; worker-src 'self'; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com https://stam-freight-control.firebaseapp.com https://raw.githubusercontent.com; frame-src https://stam-freight-control.firebaseapp.com https://accounts.google.com; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
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
        if (req.method === 'POST' && url.pathname === '/api/screen-assets') {
          if (req.headers.origin !== origin) { send(403, '{}'); return; }
          await prepareScreenAssets(); send(200, '{"ready":true}'); return;
        }
        if (req.method === 'POST' && url.pathname === '/api/preview-assets') {
          if (req.headers.origin !== origin) { send(403, '{}'); return; }
          await preparePreviewAssets(); send(200, '{"ready":true}'); return;
        }
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
      if (webBundle) {
        const resource=await webBundle.read(url.pathname);
        if(!resource){send(404,'Not found','text/plain');return;}
        send(200,resource.body,resource.type);return;
      }
      const resource = STATIC.get(url.pathname === '/' ? '/index.html' : url.pathname);
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
