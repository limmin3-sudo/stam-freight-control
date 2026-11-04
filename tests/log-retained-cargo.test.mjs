import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createRetainedCargo,fixedRetained} from '../integration/log/retained-cargo.mjs';import {calculatePreview} from '../integration/log/preview-packing.mjs';
import {definitionIndex} from '../integration/log/catalog.mjs';import {DEFAULT_SHIP,selectShipGrids} from '../ships.mjs';import {ACCOUNT_META,SYNC_KEYS} from '../sync.mjs';
import {data} from './helpers/log-preview.mjs';import {mediumFixture} from './helpers/log-reservations.mjs';
const catalog=definitionIndex(JSON.parse(readFileSync(new URL('../data/log-mission-index.json',import.meta.url)))),startId=data.locations.find(p=>p.name==='New Babbage').id;
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),values};};
const a=mediumFixture(),b=JSON.parse(JSON.stringify(a).replaceAll(a.missionId,'22222222-2222-4222-8222-222222222222'));
const plan=(contracts,retainedRecords=[],ship=DEFAULT_SHIP)=>calculatePreview({contracts,retainedRecords,catalogData:[...catalog],locationData:data,ship,startId});
test('excluding one contract keeps selected cargo in exactly its old cells and removes only its route',()=>{
 const p=plan([a,b]),box=p.packing.boxes.find(x=>x.missionId===a.missionId),storage=memory(),store=createRetainedCargo(storage);
 store.exclude(a.missionId,'Contract A',p.ship,[box]);const records=store.snapshot().records,q=plan([b],records),held=q.packing.boxes.find(x=>x.boxId===box.boxId);
 assert.equal(q.totalScu,50);assert.equal(q.retainedScu,box.size);assert.equal(q.packing.used,50+box.size);assert.deepEqual(held.cell,box.cell);assert.deepEqual(held.dims,box.dims);assert.equal(held.bin,box.bin);
 assert.ok(q.route.visits.flatMap(v=>v.events).every(e=>e.missionId!==a.missionId));assert.equal(q.routeReady,true);
 assert.throws(()=>plan([a,b],records),/화물이 남아/);assert.deepEqual(createRetainedCargo(storage).snapshot(),store.snapshot());
 assert.ok([...storage.values.keys()].every(k=>!SYNC_KEYS.includes(k)));
});
test('last contract can be excluded while its retained cargo remains visible; release explicitly frees space',()=>{
 const p=plan([a]),storage=memory(),store=createRetainedCargo(storage),boxes=p.packing.boxes;
 store.exclude(a.missionId,'Contract A',p.ship,boxes);const q=plan([],store.snapshot().records);assert.equal(q.totalScu,0);assert.equal(q.retainedScu,50);assert.equal(q.packing.used,50);assert.equal(q.routeReady,false);
 store.release(a.missionId);assert.equal(store.snapshot().records[0].boxes.length,0);assert.equal(plan([b],store.snapshot().records).retainedScu,0);
 store.restore(a.missionId);assert.equal(store.snapshot().records.length,0);
});
test('occupied grids and changed holds are rejected, while another ship does not inherit cargo',()=>{
 const p=plan([a]),box=p.packing.boxes[0],r=[{id:a.missionId,title:'A',ship:p.ship,boxes:[box]}];
 assert.throws(()=>fixedRetained(selectShipGrids(DEFAULT_SHIP,[DEFAULT_SHIP.grids[box.bin].id]),r),/남은 화물/);
 const changed=structuredClone(DEFAULT_SHIP);changed.grids[box.bin].x+=1;assert.throws(()=>fixedRetained(changed,r),/구성이 바뀌었습니다/);
 assert.equal(fixedRetained({...DEFAULT_SHIP,id:'another-ship'},r).length,0);
});
test('unknown positions, corrupt storage, failed writes and account switching cannot silently clear cargo',()=>{
 const storage=memory(),store=createRetainedCargo(storage);store.exclude('unknown','A',null,[],true);assert.throws(()=>plan([b],store.snapshot().records),/위치를 먼저/);store.release('unknown');
 const before=store.snapshot();storage.setItem=()=>{throw Error('quota');};assert.throws(()=>store.exclude('new','B',null,[]),/저장하지 못/);assert.deepEqual(store.snapshot(),before);
 const s=memory(),ownerStore=createRetainedCargo(s);s.setItem(ACCOUNT_META,JSON.stringify({uid:'different'}));assert.throws(()=>ownerStore.exclude('new','B',null,[]),/계정이 바뀌었습니다/);
 assert.equal(createRetainedCargo(s).snapshot().records.length,0);
 const broken=memory();broken.setItem('stam-retained-cargo-v1:guest','bad');assert.ok(createRetainedCargo(broken).snapshot().error);
});
test('overlapping or altered retained box geometry never enters packing',()=>{
 const p=plan([a]),box=p.packing.boxes[0],store=createRetainedCargo(memory());
 assert.throws(()=>store.exclude(a.missionId,'A',p.ship,[box,{...box,boxId:'another'}]),/겹치/);
 assert.throws(()=>store.exclude(a.missionId,'A',p.ship,[{...box,dims:[1,1,1]}]),/위치와 크기/);
 assert.equal(store.snapshot().records.length,0);
});

test('pending end-of-contract cargo review survives reload and blocks packing until answered',()=>{
 const p=plan([a]),storage=memory(),store=createRetainedCargo(storage);
 store.markReview(a.missionId,'A',p.ship,p.packing.boxes);
 const restored=createRetainedCargo(storage);assert.equal(restored.snapshot().records[0].review,true);
 assert.throws(()=>plan([b],restored.snapshot().records),/종료된 계약/);
 assert.throws(()=>restored.restore(a.missionId),/남은 화물/);
 restored.exclude(a.missionId,'A',p.ship,[p.packing.boxes[0]]);
 assert.equal(restored.snapshot().records[0].review,undefined);
 assert.equal(plan([b],restored.snapshot().records).retainedScu,p.packing.boxes[0].size);
});
