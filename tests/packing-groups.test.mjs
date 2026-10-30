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
test('route plan reserves neighbouring grids per destination from the fully loaded layout',async()=>{
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
 for(const [dest,set]of bins){const list=[...set].sort((x,y)=>x-y);assert.equal(list.at(-1)-list[0]+1,list.length,`${dest} grids not adjacent: ${list}`);}
});
