import test from 'node:test';import assert from 'node:assert/strict';
import {guidanceFingerprint,resumableGuidance,createGuidanceStore} from '../integration/log/guidance-store.mjs';
import {calculatePreview} from '../integration/log/preview-packing.mjs';
import {createCargoContinuity} from '../integration/log/cargo-continuity.mjs';
import {fixture,data} from './helpers/log-preview.mjs';
import {readFileSync} from 'node:fs';import {DEFAULT_SHIP} from '../ships.mjs';
const catalogData=JSON.parse(readFileSync(new URL('../data/log-mission-index.json',import.meta.url)));
import {definitionIndex} from '../integration/log/catalog.mjs';
const a=fixture().contract,startId=data.locations.find(p=>p.name==='New Babbage').id;
const input={contracts:[a],catalogData:[...definitionIndex(catalogData)],locationData:data,ship:DEFAULT_SHIP,startId};
const memory=()=>{const values=new Map();return {values,getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
const record={hash:'a'.repeat(64),leg:2,at:'2026-11-04T09:00:00.000Z'};
test('guidance fingerprint matches recalculation but changes with contract, route, timing, ship or real cargo',async()=>{
 const plan=calculatePreview(input),hash=await guidanceFingerprint(plan);assert.equal(hash,await guidanceFingerprint(calculatePreview(input)));
 assert.notEqual(await guidanceFingerprint(plan,['build:1']),await guidanceFingerprint(plan,['build:2']));
 const reversed=Object.fromEntries(Object.entries(plan).reverse());assert.equal(hash,await guidanceFingerprint(reversed));
 const edits=[p=>p.contracts[0].id='22222222-2222-4222-8222-222222222222',p=>p.route.visits[1].locationId='other',p=>p.route.settings.secondsPerBox=99,p=>p.ship.grids[0].disabled=true,p=>p.packing.boxes[0].cell[0]+=1];
 for(const edit of edits){const changed=structuredClone(plan);edit(changed);assert.notEqual(hash,await guidanceFingerprint(changed));}
 const cargo=createCargoContinuity(memory());cargo.lock(plan,plan.packing.boxes.slice(0,2).map(b=>b.boxId));
 const resumed=calculatePreview({...input,continuityRecords:cargo.snapshot().records});assert.notEqual(hash,await guidanceFingerprint(resumed));assert.equal(await guidanceFingerprint(resumed),await guidanceFingerprint(calculatePreview({...input,continuityRecords:cargo.snapshot().records})));
 for(const box of plan.packing.boxes.slice(0,2)){const actual=resumed.packing.boxes.find(b=>b.boxId===box.boxId);assert.deepEqual(actual.cell,box.cell);assert.equal(actual.bin,box.bin);}
 assert.equal(hash,await guidanceFingerprint({...plan,rawLog:'not part of the plan',observedAt:'later'}));
});
test('saved guidance is only a bounded leg reference to the identical plan, never actual position or completion',()=>{
 const s=memory(),store=createGuidanceStore(s);store.save(record);const loaded=createGuidanceStore(s).snapshot();assert.deepEqual(loaded.record,record);
 assert.equal(resumableGuidance(loaded.record,record.hash,3),true);assert.equal(resumableGuidance(loaded.record,'b'.repeat(64),3),false);assert.equal(resumableGuidance(loaded.record,record.hash,2),false);
 store.clear();assert.equal(store.snapshot().record,null);assert.equal(s.getItem('sfc-history'),null);assert.ok([...s.values.keys()].every(k=>k.startsWith('stam-guidance-v1:')));
});
test('guidance preserves prior data on write failures, competing tabs and account changes',()=>{
 const s=memory(),store=createGuidanceStore(s),other=createGuidanceStore(s);store.save(record);assert.throws(()=>other.save(record),/다른 창/);
 const before=s.getItem('stam-guidance-v1:guest');s.setItem=()=>{throw Error('quota');};assert.throws(()=>store.save({...record,leg:1}),/저장하지/);assert.equal(s.getItem('stam-guidance-v1:guest'),before);assert.equal(store.snapshot().record.leg,2);
 s.values.set('vh-account-meta',JSON.stringify({uid:'other'}));assert.equal(store.snapshot().record,null);assert.match(store.snapshot().error,/계정/);assert.throws(()=>store.clear(),/계정/);
});
test('malformed checkpoints fail closed without erasing saved data or accepting new state',()=>{
 for(const r of [{...record,leg:0},{...record,leg:257},{...record,leg:1.1},{...record,hash:'bad'},{...record,rawLog:'private'}]){
  const s=memory(),raw=JSON.stringify({version:1,record:r});s.setItem('stam-guidance-v1:guest',raw);const store=createGuidanceStore(s);assert.ok(store.snapshot().error);assert.throws(()=>store.save(record));assert.equal(s.getItem('stam-guidance-v1:guest'),raw);
 }
});
