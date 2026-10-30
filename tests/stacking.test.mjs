import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SHIP,withStacking} from '../ships.mjs';
import {packBoxes,boxDepth} from '../engine.mjs';

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
