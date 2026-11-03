import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,data,index,stops} from './helpers/log-preview.mjs';
import {calculatePreview,createPreview,previewOrders} from '../integration/log/preview-packing.mjs';
import {definitionIndex} from '../integration/log/catalog.mjs';
import {DEFAULT_SHIP,selectShipGrids} from '../ships.mjs';
const catalog=definitionIndex(JSON.parse(await readFile(new URL('../data/log-mission-index.json',import.meta.url))));
const input=(contract=fixture().contract)=>({contract,catalogData:[...catalog],locationData:data,ship:DEFAULT_SHIP,startId:stops[0].id});
test('original 3D/route input preserves 28 boxes, destination colors and evidence without mutating contract',()=>{
 const args=input(),before=structuredClone(args),r=calculatePreview(args);
 assert.deepEqual(args,before);assert.equal(r.boxCount,28);assert.equal(r.totalScu,168);assert.equal(r.estimated,false);
 assert.equal(new Set(r.packing.boxes.map(b=>b.color)).size,2);assert.equal(r.route.visits.length,4);
 assert.equal(r.route.visits.reduce((n,v)=>n+v.leg.jumps,0),1);
 assert.equal(r.route.visits.at(-1).packing.used,0);assert.equal(r.currentInventoryVerified,false);
 assert.equal(args.contract.manifest,null);
});
test('disabled grids and impossible ship are honored by preview',()=>{
 const args=input();args.ship=selectShipGrids(DEFAULT_SHIP,[DEFAULT_SHIP.grids[0].id]);
 assert.ok(calculatePreview(args).packing.boxes.every(b=>b.bin!==0));
 args.ship={id:'tiny',name:'Tiny',grids:[{id:'one',w:1,h:1,l:1,x:0,y:0,z:0}]};
 assert.throws(()=>calculatePreview(args),/어느 그리드/);
});
function unknown(){const c=fixture().contract;c.gameBuild.value='13000000';return c;}
function confirmation(c){const {orders}=previewOrders(c,catalog,index);return {confirmed:true,rows:orders.map(o=>({scu:o.maxScu||o.minScu,pickupId:stops[0].id,dropoffId:stops[1].id}))};}
test('unknown recipe requires per-order route/quantity confirmation, retains caps and estimated flag',()=>{
 const c=unknown(),before=structuredClone(c);assert.throws(()=>createPreview(c,catalog,index),/확인/);
 const confirmed=confirmation(c),p=createPreview(c,catalog,index,confirmed);
 assert.ok(p.mission.cargo.every(c=>c.boxes.length===0));assert.deepEqual(p.mission.cargo.map(c=>c.maxBoxSize),[16,16,2,16,16,2]);
 const r=calculatePreview({...input(c),confirmation:confirmed});assert.equal(r.estimated,true);assert.equal(r.totalScu,168);
 assert.deepEqual(c,before);assert.equal(c.manifest,null);
 confirmed.rows[0].pickupId='invented';assert.throws(()=>createPreview(c,catalog,index,confirmed),/確認|확인/);
});
test('same-type contracts never share box identities; variable quantities are not silently accepted',()=>{
 const c=unknown(),d=unknown();d.missionId='22222222-2222-4222-8222-222222222222';
 d.markerObservations.forEach(m=>m.missionId=d.missionId);
 const a=calculatePreview({...input(c),confirmation:confirmation(c)}),b=calculatePreview({...input(d),confirmation:confirmation(d)});
 assert.ok(b.packing.boxes.every(box=>!a.packing.boxes.some(x=>x.boxId===box.boxId)));
 const bad=confirmation(c);bad.rows[0].scu=0;assert.throws(()=>createPreview(c,catalog,index,bad),/확인/);
 c.conflicts.push('definition-conflict');assert.throws(()=>previewOrders(c,catalog,index),/충돌/);
});

test('New Babbage is departure 1 and its first travel leg is included, without changing the engine order',()=>{
 const start=data.locations.find(p=>p.name==='New Babbage');
 const r=calculatePreview({...input(),startId:start.id});
 assert.equal(r.route.visits[0].locationId,start.id);
 assert.equal(r.route.visits[0].events[0].type,'departure');
 assert.equal(r.route.visits[0].load,0);
 assert.equal(r.route.visits[1].leg.nodes[0],start.id);
 assert.equal(r.route.visits[1].locationId,stops[0].id);
 assert.ok(r.route.visits[1].leg.meters>0);
 assert.equal(r.route.seconds,r.route.visits.reduce((n,v)=>n+v.seconds,0));
 assert.throws(()=>calculatePreview({...input(),startId:'unknown'}),/출발지/);
});
test('two identical mission types share a plan but never cargo ownership, disabled grids stay excluded',()=>{
 const a=fixture().contract,b=fixture('22222222-2222-4222-8222-222222222222').contract;
 const ship=selectShipGrids(DEFAULT_SHIP,[DEFAULT_SHIP.grids[0].id]);
 const r=calculatePreview({...input(),contract:undefined,contracts:[a,b],ship});
 assert.equal(r.contractCount,2);assert.equal(r.totalScu,336);assert.equal(r.boxCount,56);
 assert.equal(new Set(r.packing.boxes.map(b=>b.boxId)).size,56);
 assert.deepEqual(new Set(r.route.shipments.map(s=>s.missionId)),new Set([a.missionId,b.missionId]));
 for(const v of r.route.visits)assert.ok(v.packing.boxes.every(b=>b.bin!==0));
 assert.equal(r.route.visits.at(-1).load,0);
 assert.throws(()=>calculatePreview({...input(),contracts:[a,a]}),/서로 다른/);
});
test('an unconfirmed contract blocks the whole selected set instead of silently disappearing',()=>{
 const a=fixture().contract,b=fixture('22222222-2222-4222-8222-222222222222').contract;b.gameBuild.value='13000000';
 assert.throws(()=>calculatePreview({...input(),contracts:[a,b]}),/확인/);
 const r=calculatePreview({...input(),contracts:[a,b],confirmations:{[b.missionId]:confirmation(b)}});
 assert.equal(r.contractCount,2);assert.equal(r.estimated,true);assert.equal(r.totalScu,336);
});
test('both partners use their existing distinct routing policies through the multi-contract adapter',()=>{
 const place=name=>data.locations.find(p=>p.name===name);
 const contract=(id,pickup)=>{
   const c=fixture(id).contract;c.gameBuild.value='13000000';
   c.markerObservations.forEach(m=>{
     const p=place(m.role==='pickup'?pickup:'Seraphim Station');
     const parent=data.locations.find(q=>q.id===p.parentId&&q.system===p.system);
     m.position=p.position.map((v,i)=>v-(parent?.position[i]||0));
   });
   return c;
 };
 const a=contract('11111111-1111-4111-8111-111111111111','Everus Harbor');
 const b=contract('22222222-2222-4222-8222-222222222222','Baijini Point');
 const confirmations=Object.fromEntries([a,b].map(c=>{
   const p=previewOrders(c,catalog,index);
   return [c.missionId,{confirmed:true,rows:p.orders.map(()=>({scu:1,pickupId:p.pickups[0].id,dropoffId:p.deliveries[0].id}))}];
 }));
 const args={...input(),contracts:[a,b],confirmations,startId:place('Everus Harbor').id};
 const batch=calculatePreview({...args,partner:'navigator'}),op=calculatePreview({...args,partner:'operator'});
 assert.notDeepEqual(op.route.visits.map(v=>v.locationId),batch.route.visits.map(v=>v.locationId));
 assert.equal(batch.route.settings.routePolicy,'batch');assert.equal(op.route.settings.routePolicy,'delivery-first');
 assert.equal(op.route.visits.at(-1).load,0);assert.equal(batch.route.visits.at(-1).load,0);
 assert.throws(()=>calculatePreview({...args,partner:'broker'}),/파트너/);
});
test('the all-cargo frame reuses the route layout when all selected boxes are aboard together',()=>{
 const r=calculatePreview(input());
 const full=r.route.visits.find(v=>v.packing.boxes.length===r.boxCount);
 assert.ok(full);assert.deepEqual(r.packing,full.packing);
});
