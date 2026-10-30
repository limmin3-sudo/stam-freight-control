import test from 'node:test';
import assert from 'node:assert/strict';
import {packBoxes} from '../engine.mjs';
import {DEFAULT_SHIP,withStacking} from '../ships.mjs';

// Reported Hull B load: small boxes for two destinations were split into depth layers across every
// grid. Each destination should take whole grids when there is room, so unloading is one grid at a time.
test('Hull B keeps each destination on its own grids when space allows',()=>{
 const ship=withStacking(DEFAULT_SHIP),items=[];
 for(const [dropoffId,rank,count]of [['gaslight',1,32],['orbituary',0,32],['sunset',.5,20]])
  for(let i=0;i<count;i++)items.push({boxId:`${dropoffId}-${i}`,missionId:`m-${dropoffId}`,dropoffId,size:2,rank});
 const packed=packBoxes(items,[],ship);
 assert.ok(packed);
 assert.equal(packed.used,168);
 const mixed=packed.bins.filter(b=>new Set(b.boxes.map(x=>x.dropoffId)).size>1);
 assert.equal(mixed.length,0,`mixed grids: ${mixed.map(b=>b.grid.name).join(', ')}`);
});

test('a near-full Hull B still packs every box',()=>{
 const ship=withStacking(DEFAULT_SHIP),items=[];
 for(let i=0;i<250;i++)items.push({boxId:'b'+i,missionId:'m'+(i%3),dropoffId:'d'+(i%7),size:2,rank:(i%7)/6});
 const packed=packBoxes(items,[],ship);
 assert.ok(packed);
 assert.equal(packed.used,500);
});
