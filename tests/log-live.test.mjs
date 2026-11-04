import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, appendFile, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import http from 'node:http';
import { startLogService } from '../integration/log/live-server.mjs';

const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
const def = '33333333-3333-4333-8333-333333333333';
const pre = '<2026-01-01T00:00:00.000Z> [Notice] ';
const accept = id => pre + `<SHUDEvent_OnNotification> Added notification "Contract Accepted: Test: " [1] to queue. New queue size: 1, MissionId: [${id}], ObjectiveId: []\n`;
const marker = id => pre + `<CLocalMissionPhaseMarker::CreateMarker> missionId [${id}], contract [Test_HaulCargo_Small], contractDefinitionId[${def}], objectiveId [pickup_${def}_0], zoneHostId [1], position [x: 1, y: 2, z: 3]\n`;
const quantity = pre + `<SHUDEvent_OnNotification> Added notification "Deliver test 0/4 SCU" [2] to queue. New queue size: 1, MissionId: [${a}], ObjectiveId: [dropoff_${def}_0]\n`;

async function setup(t, initial = accept(a) + marker(a)) {
  const dir = await mkdtemp(join(tmpdir(), 'stam-live-test-')), file = join(dir, 'Game.log');
  if (initial !== null) await writeFile(file, initial);
  const service = await startLogService({ file, intervalMs: 20 });
  t.after(async () => { await service.close(); await rm(dir, { recursive: true, force: true }); });
  const api = (path, options = {}) => fetch(service.origin + path, { ...options,
    headers: { Authorization: 'Bearer ' + service.token, ...options.headers } });
  const status = async () => (await api('/api/status')).json();
  const snapshot = async () => (await api('/api/snapshot')).json();
  return { dir, file, service, api, status, snapshot };
}
async function until(fn) {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) { const value = await fn(); if (value) return value; await delay(20); }
  assert.fail('Timed out waiting for local collector');
}
const rawStatus = (url, headers) => new Promise((resolve, reject) => {
  http.get(url, { headers }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
});

test('loopback serves cached evidence, detects append, and never promotes a manifest', async t => {
  const s = await setup(t);
  await until(async () => (await s.status()).revision === 1);
  const initial = await s.snapshot();
  assert.equal(initial.snapshot.statistics.registeredHauling, 1);
  await appendFile(s.file, 'unrelated noise\n');
  const length = Buffer.byteLength(accept(a) + marker(a) + 'unrelated noise\n');
  await until(async () => (await s.status()).bytesRead === length);
  assert.deepEqual(await s.snapshot(), initial);
  await appendFile(s.file, quantity);
  await until(async () => (await s.status()).revision === 2);
  const next = await s.snapshot();
  assert.equal(next.snapshot.statistics.withQuantityObservation, 1);
  assert.equal(next.snapshot.contracts[0].manifest, null);
  assert.equal(next.snapshot.contracts[0].planning.allowed, false);
  assert.ok(!JSON.stringify(next).includes(s.file));
});

test('token, host, origin and request method protect local evidence', async t => {
  const s = await setup(t);
  assert.equal((await fetch(s.service.origin + '/api/status')).status, 401);
  assert.equal((await fetch(s.service.origin + '/api/status?token=' + s.service.token)).status, 401);
  assert.equal((await s.api('/api/status', { headers: { Origin: 'https://example.com' } })).status, 403);
  assert.equal(await rawStatus(s.service.origin + '/api/status', { Host: 'example.com', Authorization: 'Bearer ' + s.service.token }), 403);
  assert.equal(await rawStatus(s.service.origin + '/api/status', { 'Sec-Fetch-Site': 'cross-site', Authorization: 'Bearer ' + s.service.token }), 403);
  assert.equal((await s.api('/api/pause', { method: 'POST' })).status, 403);
  assert.equal((await s.api('/api/pause', { method: 'POST', body: 'file=other', headers: { Origin: s.service.origin } })).status, 413);
  assert.equal((await s.api('/api/read?file=other')).status, 405);
  assert.equal((await fetch(s.service.origin + '/Game.log')).status, 404);
  assert.equal((await fetch(s.service.origin + '/integration/log/live-server.mjs')).status, 404);
  const page = await fetch(s.service.origin + '/log-link.html');
  assert.equal(page.status, 200);
  assert.ok(page.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  assert.equal(page.headers.get('access-control-allow-origin'), null);
});

test('pause and resume retain evidence and catch up with the same selected log', async t => {
  const s = await setup(t);
  await until(async () => (await s.status()).phase === 'watching');
  await s.api('/api/pause', { method: 'POST', headers: { Origin: s.service.origin } });
  await delay(40); // Allow an already-started read-only chunk to close.
  const before = await s.snapshot();
  await appendFile(s.file, accept(b) + marker(b));
  await delay(60);
  assert.equal((await s.status()).phase, 'paused');
  assert.deepEqual(await s.snapshot(), before);
  await s.api('/api/resume', { method: 'POST', headers: { Origin: s.service.origin } });
  await until(async () => (await s.snapshot()).snapshot.statistics.registeredHauling === 2);
});

test('missing file is reported and retried without accepting a new path over HTTP', async t => {
  const s = await setup(t, null);
  await until(async () => (await s.status()).phase === 'waiting-file');
  assert.equal((await s.status()).lastError, 'ENOENT');
  await writeFile(s.file, accept(a) + marker(a));
  await until(async () => (await s.snapshot()).snapshot.statistics.registeredHauling === 1);
  assert.equal((await s.status()).phase, 'watching');
});

test('rotation is visible and previous observations stay separate from the new generation', async t => {
  const s = await setup(t);
  await until(async () => (await s.status()).revision === 1);
  await rename(s.file, join(s.dir, 'old.log'));
  await writeFile(s.file, accept(b) + marker(b));
  await until(async () => (await s.snapshot()).snapshot.statistics.registeredHauling === 2);
  assert.equal((await s.status()).generation, 1);
  const result = (await s.snapshot()).snapshot;
  assert.equal(result.diagnostics['log-generation-changed'], 1);
  assert.equal(new Set(result.contracts.flatMap(c => c.markerObservations.map(e => e.source.generation))).size, 2);
});

test('fatal parse limits retain last good snapshot instead of publishing partial changes', async t => {
  const s = await setup(t);
  await until(async () => (await s.status()).revision === 1);
  const before = await s.snapshot();
  await appendFile(s.file, accept(b) + marker(b) + 'x'.repeat(128 * 1024 + 1) + '\n');
  await until(async () => (await s.status()).phase === 'error');
  assert.equal((await s.status()).lastError, 'line-limit');
  assert.deepEqual(await s.snapshot(), before);
  assert.equal((await s.api('/api/resume', { method: 'POST', headers: { Origin: s.service.origin } })).status, 409);
});

test('a restarted service does not accept the previous pairing token', async t => {
  const s = await setup(t);
  const second = await startLogService({ file: s.file, intervalMs: 20 });
  t.after(() => second.close());
  assert.notEqual(s.service.token, second.token);
  assert.equal((await fetch(second.origin + '/api/status', { headers: { Authorization: 'Bearer ' + s.service.token } })).status, 401);
});

test('preview asset preparation requires pairing and same origin; static closure excludes private files',async t=>{
  const s=await setup(t);
  assert.equal((await fetch(s.service.origin+'/api/preview-assets',{method:'POST'})).status,401);
  assert.equal((await s.api('/api/preview-assets',{method:'POST'})).status,403);
  assert.equal((await fetch(s.service.origin+'/api/screen-assets',{method:'POST'})).status,401);
  assert.equal((await s.api('/api/screen-assets',{method:'POST'})).status,403);
  assert.equal((await s.api('/api/screen-assets',{method:'POST',headers:{Origin:s.service.origin},body:'image'})).status,413);
  for(const file of ['/integration/log/screen-watch.mjs','/integration/log/screen-reader.mjs','/integration/log/screen-evidence.mjs','/integration/log/reservations.mjs','/integration/log/box-editor.mjs'])
    assert.equal((await fetch(s.service.origin+file)).status,200,file);
  assert.equal((await fetch(s.service.origin+'/integration/log/screen-assets-node.mjs')).status,404);
  for(const file of ['/integration/log/flight-ready.mjs','/feedback-core.mjs','/feedback-data.mjs','/location-manager-core.mjs','/locations.mjs','/integration/log/personal-locations.mjs','/integration/log/workspace-tools.mjs','/integration/log/workspace-updates.mjs','/integration/log/workspace-tools.css','/data/rebuild-version.json','/data/rebuild-releases.json','/data/releases.json','/account-core.mjs','/history-core.mjs','/sync.mjs','/planning-preferences.mjs','/firebase-config.mjs','/integration/log/account-view.mjs','/integration/log/account.css','/cargo-scene.mjs','/starmap-core.mjs','/mapfx.mjs','/route-display.mjs',
    '/integration/log/preview-map.mjs','/assets/partners/navigator.jpg','/assets/partners/aide.jpg',
    '/integration/log/preview-worker.mjs','/integration/log/preview-packing.mjs','/integration/log/preview-routes.mjs','/data/ships.json'])
    assert.equal((await fetch(s.service.origin+file)).status,200,file);
  for(const file of ['/integration/log/preview-assets-node.mjs','/feedback.mjs','/location-manager.mjs','/account.mjs','/.env',
    '/aliases.mjs','/starmap.mjs','/data/ko-names.json','/data/ko-commodities.json','/data/ko-hauling.json'])
    assert.equal((await fetch(s.service.origin+file)).status,404,file);
});
