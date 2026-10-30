import test from 'node:test';
import assert from 'node:assert/strict';
import {planRoute,packBoxes} from '../engine.mjs';
import {planRoutesOnly} from '../route-only.mjs';
const data={locations:['a','b','c','via'].map((id,i)=>({id,name:id,system:'stanton',type:'Manmade',position:[i*1e9,0,0]})),jumps:[]};
const missions=[{id:'A',cargo:[{commodity:'goods',scu:4,pickupId:'a',dropoffId:'b',boxes:[{size:4,count:1}]}]},{id:'B',cargo:[{commodity:'goods',scu:4,pickupId:'a',dropoffId:'c',boxes:[{size:4,count:1}]}]}];
for(const planner of [planRoute,planRoutesOnly]){
 test(`${planner.name}: manual order swaps destinations, adds/removes waypoint and collects both contracts together`,()=>{
  const plan=planner(data,missions,'a',{manualStops:['a','via','c','b']});
  assert.deepEqual(plan.visits.map(v=>v.locationId),['a','via','c','b']);
  assert.equal(plan.visits[0].events.filter(e=>e.type==='pickup').length,2);
  assert.equal(plan.peak,8);assert.equal(plan.visits.at(-1).load,0);
  assert.equal(plan.visits[1].events[0].type,'waypoint');
  assert.equal(plan.visits[2].events[0].missionId,'B');assert.equal(plan.visits[3].events[0].missionId,'A');
  const removed=planner(data,missions,'a',{manualStops:['a','c','b']});
  assert.ok(removed.seconds<plan.seconds);
  assert.deepEqual(removed.shipments.map(s=>s.missionId),['A','B']);
 });
 test(`${planner.name}: missing pickup or delivery is rejected without mutating missions`,()=>{
  const before=structuredClone(missions);
  assert.throws(()=>planner(data,missions,'a',{manualStops:['c','a','b']}),/화물 작업/);
  assert.throws(()=>planner(data,missions,'a',{manualStops:['a','c']}),/화물 작업/);
  assert.deepEqual(missions,before);
 });
}
test('manual capacity limits require another visit; redundant pickup can be removed if all fits',()=>{
 const ship={id:'small',name:'small',grids:[{id:'g',name:'g',w:2,h:1,l:2,x:0,y:0,z:0,maxBoxSize:4}]};
 assert.throws(()=>planRoute(data,missions,'a',{ship,manualStops:['a','c','b']}),/화물 작업/);
 const p=planRoute(data,missions,'a',{ship,manualStops:['a','b','a','c']});
 assert.equal(p.peak,4);assert.equal(p.visits.at(-1).load,0);
 const roomy=planRoute(data,missions,'a',{manualStops:['a','b','a','c']});
 assert.equal(roomy.visits[0].events.length,2);
 assert.equal(roomy.visits[2].events[0].type,'waypoint');
 assert.doesNotThrow(()=>planRoute(data,missions,'a',{manualStops:['a','b','c']}));
});
test('manual editing after pickup preserves aboard cells, omits completed cargo and recalculates travel',()=>{
 const first=planRoute(data,missions,'a'),loaded=first.visits[0];
 const resume={picked:loaded.events.map(e=>e.shipmentId),delivered:[],aboard:loaded.packing.boxes};
 const p=planRoute(data,missions,'a',{resume,manualStops:['via','c','b']});
 assert.ok(p.visits.every(v=>v.events.every(e=>e.type!=='pickup')));
 const positions=new Map(resume.aboard.map(b=>[b.boxId,JSON.stringify([b.bin,b.cell,b.dims])]));
 for(const v of p.visits)for(const b of v.packing.boxes)assert.equal(JSON.stringify([b.bin,b.cell,b.dims]),positions.get(b.boxId));
 assert.equal(p.initialPacking.used,8);assert.equal(p.visits.at(-1).load,0);
});
test('shared grid packing keeps same-destination independent missions together without isolating other destinations',()=>{
 const ship={id:'g',name:'g',grids:Array.from({length:3},(_,i)=>({id:String(i),name:String(i),w:2,h:2,l:2,x:i*3,y:0,z:0,maxBoxSize:8}))};
 const items=[{boxId:'a',missionId:'A',dropoffId:'b',size:1},{boxId:'c',missionId:'C',dropoffId:'c',size:1},{boxId:'b',missionId:'B',dropoffId:'b',size:1}];
 const p=packBoxes(items,[],ship);assert.ok(p);
 assert.equal(new Set(p.boxes.map(b=>b.bin)).size,1);
 assert.equal(new Set(p.boxes.map(b=>b.missionId)).size,3);
 assert.equal(new Set(p.boxes.map(b=>b.cell.join())).size,3);
});
test('simple manual resume delivers already picked cargo without duplicate pickup',()=>{
 const first=planRoutesOnly(data,missions,'a'),picked=first.visits[0].events.map(e=>e.shipmentId);
 const p=planRoutesOnly(data,missions,'a',{resume:{picked,delivered:[]},manualStops:['c','b']});
 assert.equal(p.peak,8);assert.equal(p.visits.at(-1).load,0);
 assert.ok(p.visits.every(v=>v.events.every(e=>e.type==='delivery')));
});
