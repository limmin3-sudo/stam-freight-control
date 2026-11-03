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
 assert.equal(new Set(r.packing.boxes.map(b=>b.color)).size,2);assert.equal(r.route.visits.length,3);
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
