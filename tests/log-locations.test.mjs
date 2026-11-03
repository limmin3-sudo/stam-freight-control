import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {locationIndex, contractLocations} from '../integration/log/locations.mjs';
import {requireVerifiedManifest} from '../integration/log/state.mjs';

const bundled = JSON.parse(await readFile(new URL('../data/log-location-index.json', import.meta.url), 'utf8'));
const index = locationIndex(bundled);
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const parent = {id: id(1), parentId: null, name: 'Moon A', type: 'Moon', system: 'test', position: [1000,2000,3000]};
const spot = {id: id(2), parentId: id(1), name: 'Stop A', type: 'Outpost', system: 'test', position: [1010,2020,3030]};
const makeIndex = locations => locationIndex({...bundled, locations});
const marker = overrides => ({missionId: id(10), definitionId: id(11), objectiveId: 'pickup_test_0',
  role: 'pickup', position: [10,20,30], zoneHostId: 'synthetic-zone', at: '2026-11-03T10:00:00.000Z',
  source: {input: 'synthetic', line: 1}, ...overrides});
const contract = overrides => ({missionId: id(10), definitionId: id(11), definitionObservations: [id(11)],
  markerObservations: [marker()], quantityObservations: [], manifest: null, planning: {allowed: false}, ...overrides});

test('observed six surface markers match three axes, independent of Korean names and quantity alerts', () => {
  // Coordinates only; no user/runtime IDs or original log text in this fixture.
  for (const [position, expected] of [
    [[-21039.867483,-247547.925347,-132569.892484], 'ArcCorp Mining Area 061'],
    [[-245087.581229,-85870.076293,189412.479765], "Chawla's Beach"],
    [[383115.366423,-245829.717381,-272467.223889], "Jackson's Swap"],
    [[-176973.5365,-160953.157833,173849.366891], "Brio's Breaker Yard"],
    [[-217174.844288,215278.422408,142842.297229], 'Rayari Cantwell Research Outpost'],
    [[-245087.581229,-85870.076293,189412.479765], "Chawla's Beach"],
  ]) {
    const match = index.match(position);
    assert.equal(match.status, 'coordinate-match');
    assert.equal(match.candidates[0].name, expected);
    assert.ok(match.candidates[0].residualMeters < 0.00001);
  }
});

test('no nearest fallback, no Z-only matching, no world-frame or zone-ID substitution', () => {
  const small = makeIndex([parent, spot]);
  assert.equal(small.match([10,20,30]).status, 'coordinate-match');
  for (const p of [[10.02,20,30], [100,200,30], spot.position, [0,0,0]]) assert.equal(small.match(p).status, 'unmatched');
  assert.equal(small.match([NaN,20,30]).status, 'invalid');
  assert.equal(small.match([10,20]).status, 'invalid');
});

test('centimetre rounding window crosses spatial buckets but diagonal errors do not accumulate', () => {
  const small = makeIndex([parent, {...spot, position: [999.999,2020.009,3030]}]);
  assert.equal(small.match([.001,20.011,30]).status, 'coordinate-match');
  assert.equal(small.match([.007,20.017,30.008]).status, 'unmatched');
});

test('same coordinates on two worlds, duplicate instances and unidentified candidates remain ambiguous', () => {
  const otherParent = {...parent, id: id(3), system: 'other', name: 'Moon B'};
  const otherSpot = {...spot, id: id(4), parentId: id(3), system: 'other'};
  assert.equal(makeIndex([parent,spot,otherParent,otherSpot]).match([10,20,30]).status, 'ambiguous');
  assert.equal(makeIndex([parent,spot,{...spot,position:[1110,2220,3330]}]).match([10,20,30]).status, 'ambiguous');
  assert.equal(makeIndex([parent,{...spot,id:null}]).match([10,20,30]).status, 'ambiguous');
});

test('missing, duplicate, non-celestial and cross-system parents cannot establish a surface frame', () => {
  for (const rows of [[spot], [parent,parent,spot], [{...parent,type:'Manmade'},spot], [{...parent,system:'other'},spot]]) {
    assert.equal(makeIndex(rows).match([10,20,30]).status, 'unmatched');
  }
});

test('objective join preserves independent contracts, quantities and the blocked manifest gate', () => {
  const q = {missionId:id(10), objectiveId:'pickup_test_0', total:32};
  const c = contract({quantityObservations:[q, {...q,objectiveId:'pickup_test_1'}, {...q,missionId:id(20)}]});
  const before = JSON.stringify(c), small = makeIndex([parent,spot]);
  const result = contractLocations(c,small);
  assert.equal(result.objectives[0].quantities.length,1);
  assert.equal(result.objectives[0].quantityConflict,false);
  assert.equal(JSON.stringify(c),before);
  assert.throws(()=>requireVerifiedManifest(c), /manifest-not-verified/);
  assert.equal(contractLocations({...c,missionId:id(20)},small).objectives.length,0);
  assert.equal(contractLocations(c,null).status,'catalog-unavailable');
});

test('conflicting positions/definitions/roles and changed quantity totals cannot silently select a winner', () => {
  const small = makeIndex([parent,spot]);
  for (const c of [contract({markerObservations:[marker(),marker({position:[20,20,30]})]}),
    contract({markerObservations:[marker(),marker({role:'dropoff'})]}),
    contract({definitionObservations:[id(11),id(12)]}),
    contract({markerObservations:[marker({definitionId:id(12)})]})]) {
    assert.equal(contractLocations(c,small).objectives[0].status,'marker-conflict');
  }
  const q={missionId:id(10),objectiveId:'pickup_test_0',total:32};
  const c=contract({markerObservations:[marker(),marker({at:'2026-11-03T10:01:00.000Z'})],quantityObservations:[q,{...q,total:64}]});
  const result=contractLocations(c,small).objectives[0];
  assert.equal(result.status,'coordinate-match'); assert.equal(result.observations.length,2);
  assert.equal(result.quantityConflict,true);
});

test('catalog rejects invalid fields and does not fabricate a source build version', () => {
  assert.equal(index.metadata.version,null);
  for (const change of [{source:'https://invalid.example'}, {version:'4.10.2'}, {sourceSha256:'bad'}, {units:'km'}, {retrievedAt:'bad'}]) {
    assert.throws(()=>locationIndex({...bundled,...change}),/invalid-location-catalog/);
  }
  assert.throws(()=>makeIndex([{...spot,position:[Infinity,0,0]}]),/invalid-location-entry/);
});
