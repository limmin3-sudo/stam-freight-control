import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SHIP,withStacking,validateShip} from '../ships.mjs';
import {packBoxes,boxDepth,fullLoadLayout,isUpright} from '../engine.mjs';
import fs from 'node:fs';

test('Hull B grids attach to the spine and stack outward; flat holds are untouched', ()=>{
  const s=withStacking(DEFAULT_SHIP),left=s.grids.findIndex(g=>g.name.startsWith('L')),right=s.grids.findIndex(g=>g.name.startsWith('R'));
  assert.deepEqual(s.grids[left].rotation,[0,0,90]);assert.deepEqual(s.grids[right].rotation,[0,0,-90]);
  const flat={id:'flat',name:'Flat',grids:[{id:'a',name:'A',w:4,h:2,l:4,x:0,y:0,z:0}]};assert.equal(withStacking(flat).grids[0],flat.grids[0]);
  const p=packBoxes([{shipmentId:'S1',missionId:'M1',boxId:'b1',size:1,dropoffId:'x'}],[],s);
  const b=p.boxes[0];assert.equal(b.cell[1],0,'first box sits against the spine-side face');
  assert.equal(boxDepth(s,b),s.grids[b.bin].h-b.dims[1],'a box on the spine is the deepest from the outer face');
});

test('Hull C keeps its world size while stacking sideways, RAFT hangs cargo from the top', ()=>{
  const c=withStacking({id:'misc-hull-c',name:'MISC Hull C',grids:[{id:'a',name:'A',w:12,h:6,l:8,x:0,y:0,z:0},{id:'b',name:'B',w:12,h:6,l:8,x:14,y:0,z:0}]});
  assert.deepEqual([c.grids[0].w,c.grids[0].h,c.grids[0]._world.w,c.grids[0]._world.h],[6,12,12,6]);
  assert.equal(c.grids[0].x+c.grids[0].w/2,6);assert.deepEqual(c.grids.map(g=>g.rotation[2]),[90,-90]);
  const r=withStacking({id:'argo-raft',name:'Argo RAFT',grids:[{id:'r',name:'R',w:8,h:2,l:12,x:0,y:0,z:0}]});
  assert.deepEqual(r.grids[0].rotation,[0,0,180]);assert.equal(r.grids[0].w,8);
});


test('ship validation retains attachment frames used by route packing and depth checks',()=>{
 const original=withStacking(DEFAULT_SHIP),checked=validateShip(original);
 for(let i=0;i<checked.grids.length;i++){assert.equal(checked.grids[i]._stack,'out');assert.deepEqual(checked.grids[i]._world,original.grids[i]._world);}
 const inner={bin:0,cell:[0,0,0],dims:[1,1,2],size:2},outer={...inner,cell:[0,1,0]};
 assert.equal(boxDepth(checked,inner),boxDepth(original,inner));assert.ok(boxDepth(checked,inner)>boxDepth(checked,outer));
 const raw={id:'misc-hull-c',name:'Hull C',grids:[{id:'a',name:'A',w:12,h:6,l:8,x:0,y:0,z:0},{id:'b',name:'B',w:12,h:6,l:8,x:14,y:0,z:0}]};
 const hullC=withStacking(raw);assert.deepEqual(validateShip(hullC).grids.map(g=>g._world),hullC.grids.map(g=>g._world));
 assert.throws(()=>validateShip({...original,grids:[{...original.grids[0],_world:{x:0,y:0,w:Infinity,h:2}}]}),/부착 좌표/);
});

test('the actual RAFT IC 192 keeps all new 2 SCU crates horizontal in a 112 SCU two-destination load',()=>{
 const raw=JSON.parse(fs.readFileSync(new URL('../data/ships.json',import.meta.url))).find(s=>s.id==='argo-raft');assert.equal(raw.grids[0].name,'IC 192');
 const groups=['red','blue'].map((dropoffId,rank)=>({rank,items:[24,24,2,2,2,2].map((size,i)=>({boxId:dropoffId+i,missionId:dropoffId,dropoffId,size,rank}))}));
 for(const profile of [raw,withStacking(raw),{...withStacking(raw),id:'custom-raft',performanceId:'argo-raft'}])for(const packing of [packBoxes(groups.flatMap(g=>g.items),[],profile),fullLoadLayout(groups,[],profile)]){
  assert.ok(packing);assert.equal(packing.used,112);assert.equal(packing.boxes.filter(b=>b.size===2).length,8);assert.ok(packing.boxes.filter(b=>b.size===2).every(b=>!isUpright(b.dims)&&b.dims[1]===1));
 }
 const ship=withStacking(raw),aboard={boxId:'already-aboard',missionId:'saved',dropoffId:'red',size:2,bin:0,cell:[0,0,0],dims:[1,2,1]},continued=packBoxes([{boxId:'new',missionId:'new',dropoffId:'blue',size:2,rank:0}],[aboard],ship);assert.ok(continued);assert.deepEqual(continued.boxes.find(b=>b.boxId===aboard.boxId),aboard);assert.ok(!isUpright(continued.boxes.find(b=>b.boxId==='new').dims));
});
