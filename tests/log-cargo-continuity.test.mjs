import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createCargoContinuity} from '../integration/log/cargo-continuity.mjs';import {calculatePreview} from '../integration/log/preview-packing.mjs';import {boxBinding} from '../integration/log/reservations.mjs';
import {definitionIndex} from '../integration/log/catalog.mjs';import {DEFAULT_SHIP,selectShipGrids} from '../ships.mjs';import {ACCOUNT_META,SYNC_KEYS} from '../sync.mjs';
import {fixture,data} from './helpers/log-preview.mjs';import {mediumFixture} from './helpers/log-reservations.mjs';
const catalog=definitionIndex(JSON.parse(readFileSync(new URL('../data/log-mission-index.json',import.meta.url)))),startId=data.locations.find(p=>p.name==='New Babbage').id;
const a=fixture().contract,b=fixture('22222222-2222-4222-8222-222222222222').contract;
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),values};};
const plan=(contracts,records=[],extra={})=>calculatePreview({contracts,continuityRecords:records,catalogData:[...catalog],locationData:data,ship:DEFAULT_SHIP,startId,...extra});
test('confirmed onboard cargo stays fixed when new contracts arrive and after reload',()=>{
 const p=plan([a]),s=memory(),store=createCargoContinuity(s),boxes=p.packing.boxes.slice(0,4);store.lock(p,boxes.map(b=>b.boxId));
 const restored=createCargoContinuity(s),q=plan([a,b],restored.snapshot().records);
 for(const box of boxes){const held=q.packing.boxes.find(b=>b.boxId===box.boxId);assert.equal(held.bin,box.bin);assert.deepEqual(held.cell,box.cell);assert.deepEqual(held.dims,box.dims);assert.equal(held.aboard,true);}
 assert.equal(q.packing.used,336);assert.equal(q.packing.boxes.length,56);assert.ok([...s.values.keys()].every(k=>!SYNC_KEYS.includes(k)));
});
test('fully loaded real cargo skips pickups and destination delivery frees only its boxes',()=>{
 const p=plan([a]),store=createCargoContinuity(memory());store.lock(p,p.packing.boxes.map(b=>b.boxId));
 for(const partner of ['navigator','operator']){const q=plan([a],store.snapshot().records,{partner});assert.ok(q.route.visits.flatMap(v=>v.events).every(e=>e.type!=='pickup'));}
 const destination=p.packing.boxes[0].dropoffId,delivered=p.packing.boxes.filter(b=>b.dropoffId===destination);assert.throws(()=>store.deliver(delivered.map(b=>b.boxId),'wrong'),/실물/);store.deliver(delivered.map(b=>b.boxId),destination);
 const q=plan([a,b],store.snapshot().records);assert.equal(q.deliveredScu,84);assert.equal(q.packing.used,252);assert.ok(q.packing.boxes.every(b=>!delivered.some(d=>d.boxId===b.boxId)));
 assert.ok(q.route.visits.flatMap(v=>v.events.map(e=>({...e,place:v.locationId}))).every(e=>e.missionId!==a.missionId||e.place!==destination));
});
test('missing contract keeps cargo as an obstacle, while excluded cargo cannot be counted twice',()=>{
 const p=plan([a]),store=createCargoContinuity(memory()),box=p.packing.boxes[0];store.lock(p,[box.boxId]);
 const q=plan([b],store.snapshot().records);assert.equal(q.packing.used,168+box.size);assert.ok(q.packing.boxes.some(b=>b.boxId===box.boxId));
 const retained=[{id:a.missionId,title:'A',ship:p.ship,boxes:[box]}],r=plan([b],store.snapshot().records,{retainedRecords:retained});assert.equal(r.packing.used,168+box.size);assert.equal(r.packing.boxes.filter(b=>b.boxId===box.boxId).length,1);
});
test('virtual regions stay fixed but never imply pickup or delivery completion',()=>{
 const c=mediumFixture(),p=plan([c]),store=createCargoContinuity(memory());store.lock(p,p.packing.boxes.map(b=>b.boxId));
 const q=plan([c],store.snapshot().records);assert.equal(q.packing.used,50);assert.ok(q.route.visits.some(v=>v.events.some(e=>e.type==='pickup')));
 assert.throws(()=>store.deliver([p.packing.boxes[0].boxId],p.packing.boxes[0].dropoffId),/실물/);
});
test('changed evidence, changed manual boxes and occupied grid changes cannot move cargo',()=>{
 const c=mediumFixture(),p=plan([c]),store=createCargoContinuity(memory());store.lock(p,[p.packing.boxes[0].boxId]);const records=store.snapshot().records;
 assert.throws(()=>plan([c],records,{ship:selectShipGrids(DEFAULT_SHIP,[DEFAULT_SHIP.grids[p.packing.boxes[0].bin].id])}),/구역/);
 const row=p.cargoRows.find(r=>r.key===p.packing.boxes[0].rowKey);const changed=structuredClone(records);changed[0].rows[0].identity+='changed';assert.throws(()=>plan([c],changed),/화물 정보/);
 const r=p.rows.find(r=>r.key===row.key);assert.throws(()=>plan([c],records,{boxOverrides:{[r.key]:{binding:boxBinding(r),boxes:[{size:2,count:r.scu/2}]}}}),/화물 정보/);
});
test('failed storage, corruption and account switching never silently replace the saved layout',()=>{
 const p=plan([a]),s=memory(),store=createCargoContinuity(s);store.lock(p,[p.packing.boxes[0].boxId]);const before=store.snapshot();s.setItem=()=>{throw Error();};assert.throws(()=>store.lock(p,[p.packing.boxes[1].boxId]),/저장하지 못/);assert.deepEqual(store.snapshot(),before);
 s.values.set(ACCOUNT_META,JSON.stringify({uid:'another'}));assert.ok(store.snapshot().error);assert.equal(createCargoContinuity(s).snapshot().records.length,0);
 const corrupt=memory();corrupt.setItem('stam-cargo-continuity-v1:guest','bad');const damaged=createCargoContinuity(corrupt);assert.ok(damaged.snapshot().error);damaged.clearCorrupt();assert.equal(damaged.snapshot().error,null);assert.throws(()=>store.clearCorrupt(),/손상된 기록/);
});

test('all cargo delivered remains a separate user record and undo restores the exact old cells',()=>{
 const p=plan([a]),s=memory(),store=createCargoContinuity(s);store.lock(p,p.packing.boxes.map(b=>b.boxId));
 for(const id of new Set(p.packing.boxes.map(b=>b.dropoffId)))store.deliver(p.packing.boxes.filter(b=>b.dropoffId===id).map(b=>b.boxId),id);
 const q=plan([a],store.snapshot().records);assert.equal(q.packing.used,0);assert.equal(q.totalScu,0);assert.equal(q.routeReady,false);
 const restored=createCargoContinuity(s);assert.equal(restored.snapshot().error,null);assert.throws(()=>restored.undoDelivery([p.packing.boxes[0].boxId],selectShipGrids(DEFAULT_SHIP,[DEFAULT_SHIP.grids[p.packing.boxes[0].bin].id])),/구역/);restored.undoDelivery([p.packing.boxes[0].boxId],p.ship);const r=plan([a],restored.snapshot().records),held=r.packing.boxes[0];assert.deepEqual(held.cell,p.packing.boxes[0].cell);assert.equal(r.totalScu,held.size);assert.equal(r.routeReady,true);
});
test('no current contract still shows saved cargo and corrupt duplicate IDs cannot enter packing',()=>{
 const p=plan([a]),store=createCargoContinuity(memory());store.lock(p,[p.packing.boxes[0].boxId]);const q=plan([],store.snapshot().records);assert.equal(q.packing.used,p.packing.boxes[0].size);assert.equal(q.routeReady,false);
 const records=store.snapshot().records,other=structuredClone(records[0]);other.id='other';other.boxes[0].missionId='other';other.boxes[0].cell=[1000,0,0];assert.throws(()=>plan([b],[...records,other]),/화물/);other.boxes[0]={...p.packing.boxes[1],boxId:records[0].boxes[0].boxId,missionId:'other',rowKey:records[0].rows[0].key,state:'aboard'};assert.throws(()=>plan([b],[...records,other]),/화물/);
});
