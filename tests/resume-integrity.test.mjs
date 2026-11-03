import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planRoute} from '../engine.mjs';
import {DEFAULT_SHIP,selectShipGrids} from '../ships.mjs';
const data=JSON.parse(readFileSync(new URL('../data/locations.json',import.meta.url)));
const id=name=>data.locations.find(p=>p.name===name).id;
const start=id('Everus Harbor');
const missions=[{id:'keep-position',cargo:[{commodity:'Hydrogen',scu:32,pickupId:start,dropoffId:id('Seraphim Station'),boxes:[{size:16,count:2}]}]}];
const original=planRoute(data,missions,start),first=original.visits[0];
const resume={picked:first.events.map(e=>e.shipmentId),delivered:[],aboard:first.packing.boxes};
test('replanning must not move aboard boxes to another grid when their grid is disabled',()=>{
 const occupied=resume.aboard[0].bin;
 const ship=selectShipGrids(DEFAULT_SHIP,[DEFAULT_SHIP.grids[occupied].id]);
 assert.throws(()=>planRoute(data,missions,start,{ship,resume}),/실린 화물|위치/);
});
test('replanning must not invent positions when an aboard box is missing from the saved state',()=>{
 assert.throws(()=>planRoute(data,missions,start,{resume:{...resume,aboard:resume.aboard.slice(1)}}),/실린 화물|위치/);
});
test('an intact aboard state retains every bin and cell for both partners',()=>{
 for(const routePolicy of ['batch','delivery-first']){
  const plan=planRoute(data,missions,start,{routePolicy,resume});
  assert.deepEqual(plan.initialPacking.boxes,resume.aboard);
  assert.equal(plan.visits.at(-1).load,0);
 }
});
test('duplicate or corrupt saved boxes are rejected rather than silently repaired',()=>{
 const duplicate=[...resume.aboard,resume.aboard[0]];
 assert.throws(()=>planRoute(data,missions,start,{resume:{...resume,aboard:duplicate}}),/位置|위치/);
 const bad=structuredClone(resume);bad.aboard[0].dims=[1,1,1];
 assert.throws(()=>planRoute(data,missions,start,{resume:bad}),/위치/);
});
test('removing a picked contract cannot silently erase its aboard cargo during replan',()=>{
 const other={...missions[0],id:'second'};
 const plan=planRoute(data,[...missions,other],start),v=plan.visits[0];
 const context={picked:v.events.map(e=>e.shipmentId),delivered:[],aboard:v.packing.boxes};
 assert.throws(()=>planRoute(data,[other],start,{resume:context}),/실린 화물/);
});
