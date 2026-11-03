import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, appendFile, rename, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runLogLink } from '../scripts/log-link.mjs';
import { LogLines } from '../integration/log/lines.mjs';
import { parseLogLine } from '../integration/log/parser.mjs';
import { LogEvidence, requireVerifiedManifest } from '../integration/log/state.mjs';
import { ReadOnlyLog } from '../integration/log/reader-node.mjs';
import { definitionIndex, definitionReference } from '../integration/log/catalog.mjs';

// Invented fixtures following the observed grammar; no personal logs or patch text.
const mid = '11111111-1111-4111-8111-111111111111', def = '22222222-2222-4222-8222-222222222222';
const second = '33333333-3333-4333-8333-333333333333';
const stamp = '<2026-01-01T00:00:00.000Z> [Notice] ';
const hud = (text, objective = '', id = mid) => `${stamp}<SHUDEvent_OnNotification> Added notification "${text}" [1] to queue. New queue size: 1, MissionId: [${id}], ObjectiveId: [${objective}]`;
const accepted = hud('Contract Accepted: Test cargo: ');
const marker = (role = 'pickup', id = mid, definition = def) => `${stamp}<CLocalMissionPhaseMarker::CreateMarker> Creating objective marker: missionId [${id}], generator name [Test], contract [Test_HaulCargo_Small], contractDefinitionId[${definition}], objectiveId [${role}_${def}_0], markerEntityId [1], zoneHostId [42], position [x: 1.25, y: -2.5, z: 3.0]`;
const quantity = (text = 'Deliver test cargo 0/4 SCU', objective = `dropoff_${def}_0`) => hud(text, objective);
const ended = `${stamp}<EndMission> Ending mission for player. MissionId[${mid}] Player[private-name] PlayerId[999999] CompletionType[Complete] Reason[private-reason]`;
const source = { input: 'synthetic', line: 1 };
const ingest = rows => { const s = new LogEvidence(); for (const line of rows) s.ingest(line, source); return s; };

test('only acceptance plus an observed HaulCargo template registers hauling', () => {
  assert.equal(ingest([accepted]).snapshot().contracts.length, 0);
  assert.equal(ingest([marker()]).snapshot().candidates.length, 1);
  assert.equal(ingest([accepted, marker().replace('HaulCargo', 'RecoverItem')]).snapshot().contracts.length, 0);
  const c = ingest([marker(), accepted]).snapshot().contracts[0];
  assert.equal(c.definitionId, def);
  assert.equal(c.status, 'acceptance-observed');
  assert.equal(c.title, 'Test cargo');
});

test('same definition in separately accepted missions never merges ownership', () => {
  const s = ingest([accepted, marker(), hud('Contract Accepted: Test cargo: ', '', second), marker('pickup', second)]).snapshot();
  assert.deepEqual(new Set(s.contracts.map(c => c.missionId)), new Set([mid, second]));
});

test('multiple commodities on one objective remain observations, never a summed manifest', () => {
  const c = ingest([accepted, marker(), quantity('Deliver apples 0/4 SCU'), quantity('Deliver pears 0/2 SCU')]).snapshot().contracts[0];
  assert.equal(c.quantityObservations.length, 2);
  assert.equal(c.manifest, null);
  assert.equal(c.planning.allowed, false);
  assert.equal(c.totalSCU, undefined);
  assert.throws(() => requireVerifiedManifest(c), /manifest-not-verified/);
  assert.throws(() => requireVerifiedManifest({ planning: { allowed: true }, manifest: [] }), /manifest-not-verified/);
});

test('definition conflict is retained without choosing an ID or changing actual quantities', () => {
  const c = ingest([accepted, marker(), marker('dropoff', mid, second)]).snapshot().contracts[0];
  assert.equal(c.definitionId, null);
  assert.equal(c.status, 'conflict');
  assert.deepEqual(c.definitionObservations, [def, second]);
});

test('duplicates and arbitrary replay order do not reactivate terminal contracts', () => {
  const rows = [accepted, marker(), quantity(), ended];
  const a = ingest(rows).snapshot(), state = ingest([...rows].reverse().concat(rows));
  const b = state.snapshot();
  assert.deepEqual(a.contracts, b.contracts);
  assert.equal(b.statistics.duplicateEvents, 4);
  assert.equal(b.contracts[0].status, 'end-observed');
  assert.ok(!JSON.stringify(b).includes('private-name'));
  assert.ok(!JSON.stringify(b).includes('private-reason'));
});

test('conflicting endings and acceptance after an ending stay blocked', () => {
  const c = ingest([accepted, marker(), ended, ended.replace('[Complete]', '[Abandon]'), accepted.replace('00:00:00.000', '00:00:01.000')]).snapshot().contracts[0];
  assert.ok(c.conflicts.includes('terminal-state-conflict'));
  assert.ok(c.conflicts.includes('acceptance-after-end'));
  assert.equal(c.planning.allowed, false);
});

test('snapshot mutation cannot alter stored evidence', () => {
  const state = ingest([accepted, marker(), quantity()]);
  state.snapshot().contracts[0].quantityObservations[0].total = 999;
  assert.equal(state.snapshot().contracts[0].quantityObservations[0].total, 4);
});

test('unsafe amounts, invalid identity, date and incomplete formats are not accepted', () => {
  for (const line of [quantity('Deliver 5/4 SCU'), quantity('Deliver 1,000/2,000 SCU'), quantity('Deliver -1/4 SCU'), quantity('Deliver 0/4 SCU and 0/8 SCU'), quantity('Deliver 0/9007199254740992 SCU'), quantity().replace(mid, 'bad-id'), marker().replace('1.25', 'NaN'), accepted.replace('01-01T', '02-31T')]) {
    assert.equal(parseLogLine(line, source).event, undefined, line);
  }
  assert.equal(parseLogLine('unrelated noise', source).event, undefined);
});

test('Korean and UTF-8 text survives every byte split without guessing a name', () => {
  const text = hud('계약 수락: 시험 화물: ') + '\r\n' + quantity('새로운 목표: 시험 지역에 시험 물품 0/2 SCU 전달') + '\n';
  const bytes = new TextEncoder().encode(text);
  const s = new LogEvidence();
  const lines = new LogLines({ onLine: line => s.ingest(line, source) });
  for (const byte of bytes) lines.write(Uint8Array.of(byte));
  assert.equal(lines.finish().unterminatedLine, false);
  s.ingest(marker(), source);
  const c = s.snapshot().contracts[0];
  assert.equal(c.title, '시험 화물');
  assert.equal(c.quantityObservations[0].total, 2);
  assert.equal(c.quantityObservations[0].commodityId, undefined);
});

test('corrupt UTF-8 line is quarantined, later valid lines remain intact', () => {
  const got = [], invalid = [];
  const lines = new LogLines({ onLine: line => got.push(line), onInvalid: code => invalid.push(code) });
  lines.write(Uint8Array.from([0xff, 10, ...new TextEncoder().encode('valid\n')]));
  assert.deepEqual(got, ['valid']);
  assert.deepEqual(invalid, ['invalid-utf8-line']);
});

test('unterminated rows are withheld and line/event limits fail explicitly', () => {
  const got = [];
  const lines = new LogLines({ onLine: line => got.push(line), maxBytes: 4 });
  lines.write(new TextEncoder().encode('abcd'));
  assert.equal(lines.finish().unterminatedLine, true);
  assert.deepEqual(got, []);
  assert.throws(() => new LogLines({ onLine() {}, maxBytes: 4 }).write(new TextEncoder().encode('abcde\n')), /line-limit/);
  const state = new LogEvidence({ maxEvents: 1 });
  state.ingest(accepted, source);
  assert.throws(() => state.ingest(marker(), source), /event-limit/);
  assert.throws(() => new LogEvidence({ maxEvidenceBytes: 8 }).ingest(accepted, source), /evidence-size-limit/);
});

async function temp(t) {
  const dir = await mkdtemp(join(tmpdir(), 'stam-log-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
async function drain(reader) { let p; do { p = await reader.poll(); } while (p.backlog); }

test('read-only collector follows split appends without rereading or altering file content', async t => {
  const path = join(await temp(t), 'Game.log');
  await writeFile(path, accepted + '\n' + marker().slice(0, 30));
  const got = [];
  const reader = new ReadOnlyLog(path, { onLine: line => got.push(line), chunkBytes: 7 });
  await drain(reader);
  assert.deepEqual(got, [accepted]);
  await appendFile(path, marker().slice(30) + '\n');
  const before = await readFile(path), modified = (await stat(path)).mtimeMs;
  await drain(reader);
  assert.deepEqual(got, [accepted, marker()]);
  assert.equal((await reader.poll()).bytes, 0);
  assert.deepEqual(await readFile(path), before);
  assert.equal((await stat(path)).mtimeMs, modified);
});

test('file replacement, truncation and same-size overwrite reset partial bytes safely', async t => {
  const dir = await temp(t), path = join(dir, 'Game.log');
  await writeFile(path, 'old\npartial');
  const got = []; let resets = 0;
  const reader = new ReadOnlyLog(path, { onLine: line => got.push(line), onReset: () => resets++ });
  await drain(reader);
  await rename(path, join(dir, 'backup.log'));
  await writeFile(path, 'new\n');
  await drain(reader);
  await writeFile(path, 'x\n');
  await drain(reader);
  await writeFile(path, 'y\n');
  await drain(reader);
  assert.deepEqual(got, ['old', 'new', 'x', 'y']);
  assert.equal(resets, 3);
});

test('collector refuses concurrent polling and non-file paths', async t => {
  const dir = await temp(t), path = join(dir, 'Game.log');
  await writeFile(path, 'a\n');
  const reader = new ReadOnlyLog(path, { onLine() {} });
  const pending = reader.poll();
  await assert.rejects(reader.poll(), /concurrent-read/);
  await pending;
  await assert.rejects(new ReadOnlyLog(dir).poll(), error => error.message === 'not-regular-file' || ['EISDIR', 'EPERM', 'EACCES'].includes(error.code));
});

test('public catalog matches ID only, never supplies actual cargo or overrides conflicts', async () => {
  const bundled = JSON.parse(await readFile(new URL('../data/log-mission-index.json', import.meta.url), 'utf8'));
  const index = definitionIndex(bundled);
  assert.equal(index.size, 1840);
  const c = ingest([accepted, marker()]).snapshot().contracts[0];
  assert.equal(definitionReference(c, index).status, 'unmatched');
  const synthetic = definitionIndex({ schemaVersion: 1, source: bundled.source, version: 'test', definitions: [{ id: def, title: 'Test', released: true, notForRelease: false, max_scu: 999 }] });
  const ref = definitionReference(c, synthetic);
  assert.equal(ref.status, 'matched');
  assert.equal(ref.max_scu, undefined);
  assert.equal(c.manifest, null);
  assert.throws(() => definitionIndex({ ...bundled, definitions: [bundled.definitions[0], bundled.definitions[0]] }), /invalid-catalog-entry/);
});

test('CLI replays selected logs, reports counts by default and withholds planning', async t => {
  const path = join(await temp(t), 'Game.log');
  await writeFile(path, [accepted, marker(), quantity()].join('\n') + '\n');
  let stdout;
  await runLogLink(['--file', path], text => { stdout = text; });
  const data = JSON.parse(stdout);
  assert.equal(data.acceptedHauling, 1);
  assert.equal(data.withQuantityObservation, 1);
  assert.equal(data.planningReady, 0);
  assert.ok(!stdout.includes(path));
  assert.ok(!stdout.includes(mid));
});

test('watch registers appended acceptance and markers without requiring a restart', async t => {
  const path = join(await temp(t), 'Game.log');
  await writeFile(path, 'startup\n');
  const controller = new AbortController(), reports = [];
  const timeout = setTimeout(() => controller.abort(), 3000);
  t.after(() => clearTimeout(timeout));
  let append;
  await runLogLink(['--file', path, '--watch'], text => {
    const data = JSON.parse(text);
    reports.push(data);
    if (reports.length === 1) append = appendFile(path, accepted + '\n' + marker() + '\n');
    if (data.acceptedHauling === 1) controller.abort();
  }, { signal: controller.signal });
  await append;
  assert.equal(reports[0].acceptedHauling, 0);
  assert.equal(reports.at(-1).acceptedHauling, 1);
  assert.equal(reports.at(-1).planningReady, 0);
});
