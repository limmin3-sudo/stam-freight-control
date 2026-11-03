import test from 'node:test';
import assert from 'node:assert/strict';
import {LogEvidence, requireVerifiedManifest} from '../integration/log/state.mjs';
import {parseLogLine} from '../integration/log/parser.mjs';

// Invented runtime IDs and lines. Public definition IDs identify the user's
// confirmed type; none of these fixtures contains a personal game log.
const large = '461d27cf-9431-4391-89e9-288b3a424385';
const medium = '6f207f9c-0575-4a88-82f8-ccc348eab9da';
const id = '11111111-1111-4111-8111-111111111111';
const another = '22222222-2222-4222-8222-222222222222';
const at = '<2026-11-03T10:00:00.000Z>';
const build = n => `${at} [CIG] build_version[${n}]`;
const accept = (run = id) => `${at} [Notice] <SHUDEvent_OnNotification> Added notification "Contract Accepted: Test" [1] to queue. MissionId: [${run}]`;
const marker = (definition = large, run = id) => `${at} [Notice] <CLocalMissionPhaseMarker::CreateMarker> Creating objective marker: missionId [${run}], contract [Test_HaulCargo_Large], contractDefinitionId[${definition}], objectiveId [pickup_test_0], zoneHostId [42], position [x: 1, y: 2, z: 3]`;
const quantity = (total = 32, objective = 'dropoff_1358ecdf-36d4-41b2-820b-5d403a56b76e_0') => `${at} [Notice] <SHUDEvent_OnNotification> Added notification "New Objective: Deliver 0/${total} SCU of Test" [1] to queue. MissionId: [${id}], ObjectiveId: [${objective}]`;
const source = {input:'synthetic',generation:0,line:1};
function replay(lines) {
  const state = new LogEvidence();
  for (const line of lines) state.ingest(line,source);
  return state.snapshot();
}

test('confirmed fixed type resolves at acceptance without SCU alerts, retaining 20 small boxes', () => {
  const snapshot = replay([build('12913470'),accept(),marker()]);
  const c = snapshot.contracts[0], p = c.boxComposition;
  assert.deepEqual(c.gameBuild,{status:'known',value:'12913470'});
  assert.equal(p.status,'matched-fixed-profile');
  assert.deepEqual(p.commodities.map(r => [r.name,r.scu,r.count,r.totalScu]),[
    ['Ship Ammunition',16,4,64],['Hydrogen',16,4,64],['Medical Supplies',2,20,40],
  ]);
  assert.equal(p.boxCount,28); assert.equal(p.totalScu,168);
  assert.equal(p.evidence.allocationVerified,false);
  assert.equal(snapshot.statistics.withKnownBoxComposition,1);
  assert.equal(snapshot.statistics.planningReady,0);
  assert.equal(c.manifest,null); assert.equal(c.planning.allowed,false);
  assert.ok(!c.planning.reasons.includes('box-composition-unverified'));
  assert.throws(()=>requireVerifiedManifest(c),/manifest-not-verified/);
});

test('known totals do not override conflicting or unfamiliar objective observations', () => {
  for (const line of [quantity(31), quantity(64), quantity(32,'dropoff_unknown_0')]) {
    const c = replay([build('12913470'),accept(),marker(),line]).contracts[0];
    assert.equal(c.boxComposition.status,'quantity-conflict');
    assert.equal(c.boxComposition.commodities,undefined);
  }
  assert.equal(replay([build('12913470'),accept(),marker(),quantity()]).contracts[0].boxComposition.status,'matched-fixed-profile');
});

test('medium repeatability does not invent its still-unconfirmed counts; other types do not inherit', () => {
  const mid = replay([build('12913470'),accept(),marker(medium)]).contracts[0];
  assert.equal(mid.boxComposition.status,'fixed-type-counts-pending');
  assert.equal(mid.boxComposition.commodities,undefined);
  assert.equal(replay([build('12913470'),accept(),marker(another)]).contracts[0].boxComposition.status,'unsupported-type');
});

test('build comes from the CIG line, never filenames, a future header or a default', () => {
  for (const lines of [[accept(),marker()], [build('12913470').replace('10:00:00','10:00:01'),accept(),marker()]]) {
    assert.equal(replay(lines).contracts[0].boxComposition.status,'build-unresolved');
  }
  assert.equal(replay([build('13055118'),accept(),marker()]).contracts[0].boxComposition.status,'unsupported-build');
  const backup = `${at} BackupNameAttachment=" Build(12913470) 03 Nov 26"`;
  assert.deepEqual(parseLogLine(backup,source),{});
  assert.equal(parseLogLine(build('12913470').replace('2026-11-03','2026-02-30'),source).diagnostic,'unrecognized-build-format');
  assert.deepEqual(parseLogLine(build('12913470').replace('12913470','0'),source),{});
});

test('build evidence cannot leak between files or replaced log generations', () => {
  for (const nextSource of [{...source,input:'other'}, {...source,generation:1}]) {
    const s = new LogEvidence(); s.ingest(build('12913470'),source);
    s.ingest(accept(),nextSource); s.ingest(marker(),nextSource);
    assert.equal(s.snapshot().contracts[0].boxComposition.status,'build-unresolved');
    s.ingest(build('13055118'),nextSource);
    assert.equal(s.snapshot().contracts[0].boxComposition.status,'unsupported-build');
  }
  const c = replay([build('12913470'),build('13055118'),accept(),marker()]).contracts[0];
  assert.equal(c.gameBuild.status,'conflict');
  assert.equal(c.boxComposition.status,'build-unresolved');
});

test('same type accepted twice has independent composition ownership and replay is stable', () => {
  const lines=[build('12913470'),accept(),marker(),accept(another),marker(large,another)];
  const a=replay(lines), b=replay([...lines].reverse());
  assert.deepEqual(a.contracts,b.contracts);
  assert.equal(a.statistics.withKnownBoxComposition,2);
  assert.ok(a.contracts.every(c=>c.boxComposition.commodities.every(r=>r.missionId===c.missionId)));
  a.contracts[0].boxComposition.commodities[0].count=99;
  assert.equal(a.contracts[1].boxComposition.commodities[0].count,4);
  assert.equal(replay(lines).contracts[0].boxComposition.commodities[0].count,4);
});

test('conflicting definitions never select a convenient confirmed profile', () => {
  const c = replay([build('12913470'),accept(),marker(),marker(medium)]).contracts[0];
  assert.equal(c.boxComposition.status,'definition-unresolved');
  assert.equal(c.boxComposition.commodities,undefined);
});
