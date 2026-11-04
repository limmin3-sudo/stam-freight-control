import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {definitionIndex, definitionReference, definitionQuantity, projectDefinitionRules, summarizeDefinitionOrders} from '../integration/log/catalog.mjs';
import {requireVerifiedManifest} from '../integration/log/state.mjs';

const bundled = JSON.parse(await readFile(new URL('../data/log-mission-index.json', import.meta.url), 'utf8'));
const index = definitionIndex(bundled);
const medium = '6f207f9c-0575-4a88-82f8-ccc348eab9da', large = '461d27cf-9431-4391-89e9-288b3a424385';
const contract = id => ({definitionId: id, definitionObservations: [{id}], manifest: null, planning: {allowed: false}});
const row = overrides => ({kind: 'Resource', name: 'Test', id: null, minScu: null, maxScu: 12, minAmount: null, maxAmount: null, maxBoxScu: 8, ...overrides});

test('medium ID retains both order sets and matches observed totals without inventing a manifest', () => {
  const c = contract(medium), before = JSON.stringify(c), ref = definitionReference(c, index);
  assert.equal(ref.status, 'matched'); assert.equal(ref.rules.orders.length, 6);
  const summary = summarizeDefinitionOrders(ref.rules.orders);
  assert.deepEqual(summary.groups.map(g => [g.order.name, g.occurrences, g.quantity.value * g.occurrences, g.order.maxBoxScu]), [
    ['Nitrogen',2,24,8], ['Organics',2,12,4], ['Ranta Dung',2,14,2],
  ]);
  assert.ok(summary.groups.every(g => g.quantity.status === 'single-bound'));
  assert.equal(JSON.stringify(c), before);
  assert.throws(() => requireVerifiedManifest(c), /manifest-not-verified/);
});

test('large ID supplies per-commodity limits, preserving the missing destination slot', () => {
  const ref = definitionReference(contract(large), index), summary = summarizeDefinitionOrders(ref.rules.orders);
  assert.deepEqual(summary.groups.map(g => [g.order.name, g.quantity.value, g.occurrences, g.order.maxBoxScu]), [
    ['Ship Ammunition',32,2,16], ['Hydrogen',32,2,16], ['Medical Supplies',20,2,2],
  ]);
  assert.equal(ref.rules.locations.find(l => l.slot === 'Location|Address').candidates.length, 6);
  assert.deepEqual(ref.rules.locations.find(l => l.slot === 'Destination|Address').candidates, []);
  assert.equal(ref.rules.locations.find(l => l.slot === 'Destination1|Address').candidates.length, 7);
  assert.ok(ref.source.includes(large) && ref.source.includes(encodeURIComponent(bundled.version)));
});

test('same type in separate runtime contracts never borrows actual destinations or cargo', () => {
  const a = {...contract(medium), missionId:'run-a'}, b = {...contract(medium), missionId:'run-b'};
  const refA = definitionReference(a, index), refB = definitionReference(b, index);
  assert.deepEqual(refA.rules, refB.rules);
  assert.equal(a.manifest, null); assert.equal(b.manifest, null);
  assert.equal(refA.rules.locations.find(l => l.slot === 'Location1|Address').candidates.length, 7);
  assert.equal(definitionReference({...a, definitionObservations: [{},{}]}, index).status, 'conflict');
  assert.equal(definitionReference(contract('00000000-0000-0000-0000-000000000000'), index).status, 'unmatched');
});

test('range, unknown and entity quantities cannot be turned into fixed SCU', () => {
  assert.deepEqual(definitionQuantity(row({minScu: 8,maxScu:12})), {status:'range',min:8,max:12,unit:'SCU'});
  assert.equal(definitionQuantity(row({maxScu:null})).status, 'unknown');
  assert.equal(definitionQuantity(row({minScu:0,maxScu:0})).status, 'unknown');
  assert.equal(definitionQuantity(row({minScu:12,maxScu:12})).status, 'equal-bounds');
  assert.equal(definitionQuantity(row({kind:'TagMatch'})).status, 'review');
  assert.deepEqual(definitionQuantity(row({kind:'Entity',name:'CryoPod',minAmount:null,maxAmount:4})), {status:'single-bound',value:4,unit:'개체'});
});

test('Or alternatives remain separate and repeated unconditional orders remain repeated', () => {
  const r = projectDefinitionRules({hauling_orders:[{kind:'Or',or_options:[[{kind:'Resource',name:'A',max_scu:4}], [{kind:'Resource',name:'B',max_scu:8}]]}]});
  const summary = summarizeDefinitionOrders([...r.orders,row({}),row({})]);
  assert.equal(summary.groups.length,1); assert.equal(summary.groups[0].occurrences,2);
  assert.equal(summary.choices[0].length,2);
  assert.equal(summary.choices[0][0].groups[0].order.name,'A');
  assert.equal(summary.choices[0][1].groups[0].order.name,'B');
});

test('projection retains explicit unknowns and candidate text without guessing slot values', () => {
  const rules = projectDefinitionRules({hauling_orders:[{kind:'Resource',name:'Unknown'}],
    description:'Go to [Destination|Address]',mission_tokens:{'Location|Address':['one candidate'],Rank:['Rookie']}});
  assert.equal(rules.orders[0].maxScu,null); assert.equal(rules.orders[0].maxBoxScu,null);
  assert.deepEqual(rules.locations,[{slot:'Destination|Address',candidates:[]},{slot:'Location|Address',candidates:['one candidate']}]);
});

test('invalid nested definitions fail validation while identity-only catalogs still work', () => {
  const entry={id:medium,title:'Test',released:true,notForRelease:false};
  const catalog=rules=>({...bundled,definitions:[{...entry,rules}]});
  assert.throws(()=>definitionIndex(catalog({orders:[row({maxScu:NaN})],locations:[]})),/invalid-catalog-order/);
  assert.throws(()=>definitionIndex(catalog({orders:[{kind:'Or',options:[null]}],locations:[]})),/invalid-catalog-orders/);
  assert.throws(()=>definitionIndex(catalog({orders:[],locations:[{slot:'x',candidates:[5]}]})),/invalid-catalog-locations/);
  assert.equal(definitionReference(contract(medium),definitionIndex({...bundled,definitions:[entry]})).rules,null);
});
