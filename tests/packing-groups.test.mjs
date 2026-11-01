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

// Planned with the full load in mind: cargo picked up at different stops for the same destination
// still lands in one block of neighbouring grids instead of being scattered around the hull.
test('route plan keeps each destination in one connected block of grids from the fully loaded layout',async()=>{
 const fs=await import('node:fs'),{planRoute}=await import('../engine.mjs');
 const game=JSON.parse(fs.readFileSync(new URL('../data/locations.json',import.meta.url)));
 const id=name=>game.locations.find(l=>l.name===name).id,c=(scu,p,d)=>({scu,pickupId:id(p),dropoffId:id(d),commodity:'x',boxes:[]});
 const missions=[
  {id:'a',cargo:[c(2,'HDMS-Norgaard','Sunset Mesa'),c(4,'Shubin Mining Facility SMCa-8','Sunset Mesa')]},
  {id:'b',cargo:[c(64,'Orison','Gaslight'),c(64,'Orison','Orbituary')]},
  {id:'c',cargo:[c(32,'Orison','Sunset Mesa'),c(20,'Orison','Bueno Ravine')]},
  {id:'d',cargo:[c(12,"Brio's Breaker Yard",'Sunset Mesa'),c(8,'Grim HEX','Bueno Ravine')]}];
 const ship=withStacking(DEFAULT_SHIP),plan=planRoute(game,missions,id('Orison'),{ship,unknownBox:2});
 const peak=plan.visits.reduce((a,v)=>v.load>a.load?v:a),bins=new Map();
 for(const b of peak.packing.boxes)(bins.get(b.dropoffId)||bins.set(b.dropoffId,new Set()).get(b.dropoffId)).add(b.bin);
 const owners=new Map();for(const [dest,set]of bins)for(const bin of set){assert.ok(!owners.has(bin),`grid ${bin} holds two destinations`);owners.set(bin,dest);}
 // Grids of one destination must form one connected block: each grid within 2 cells of another one of them.
 const box=ship.grids.map(g=>{const w=g._world||g;return [[w.x,w.x+w.w],[w.y,w.y+w.h],[g.z,g.z+g.l]];}),gap=(a,b)=>Math.hypot(...box[a].map(([a0,a1],k)=>Math.max(0,box[b][k][0]-a1,a0-box[b][k][1])));
 const {gridRegions}=await import('../engine.mjs'),regions=gridRegions(ship);for(const [dest,set]of bins)assert.equal(new Set([...set].map(i=>regions[i].side)).size,1,`${dest} split across sides`);
 for(const [dest,set]of bins){const list=[...set],seen=new Set([list[0]]),todo=[list[0]];while(todo.length){const a=todo.pop();for(const b of list)if(!seen.has(b)&&gap(a,b)<=2){seen.add(b);todo.push(b);}}
  assert.equal(seen.size,list.length,`${dest} grids are split apart: ${list.map(i=>ship.grids[i].name).join(', ')}`);}
});

// Hull B priority: one side first, then one level (upper/lower) on that side, then the other.
test('a light Hull B load stays on one side and one level',async()=>{
 const fs=await import('node:fs'),{planRoute,gridRegions}=await import('../engine.mjs');
 const game=JSON.parse(fs.readFileSync(new URL('../data/locations.json',import.meta.url)));
 const id=name=>game.locations.find(l=>l.name===name).id,c=(scu,p,d)=>({scu,pickupId:id(p),dropoffId:id(d),commodity:'x',boxes:[]});
 const ship=withStacking(DEFAULT_SHIP),regions=gridRegions(ship);
 const plan=planRoute(game,[{id:'a',cargo:[c(32,'Orison','Sunset Mesa'),c(24,'Orison','Ashland')]},{id:'b',cargo:[c(40,'Orison',"Seer's Canyon")]}],id('Orison'),{ship,unknownBox:4});
 const bins=new Set(plan.visits.reduce((a,v)=>v.load>a.load?v:a).packing.boxes.map(b=>b.bin));
 assert.equal(new Set([...bins].map(i=>regions[i].side)).size,1,'one side');
 assert.equal(new Set([...bins].map(i=>regions[i].level)).size,1,'one level');
});
