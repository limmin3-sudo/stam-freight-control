import test from 'node:test';
import assert from 'node:assert/strict';
import {packBoxes,fullLoadLayout,gridRegions} from '../engine.mjs';
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

// User clarified: one side, then one fore/aft quarter, then its upper/lower pair.
test('a light Hull B load stays on one side and one fore-aft quarter',async()=>{
 const fs=await import('node:fs'),{planRoute,gridRegions}=await import('../engine.mjs');
 const game=JSON.parse(fs.readFileSync(new URL('../data/locations.json',import.meta.url)));
 const id=name=>game.locations.find(l=>l.name===name).id,c=(scu,p,d)=>({scu,pickupId:id(p),dropoffId:id(d),commodity:'x',boxes:[]});
 const ship=withStacking(DEFAULT_SHIP),regions=gridRegions(ship);
 const plan=planRoute(game,[{id:'a',cargo:[c(32,'Orison','Sunset Mesa'),c(24,'Orison','Ashland')]},{id:'b',cargo:[c(40,'Orison',"Seer's Canyon")]}],id('Orison'),{ship,unknownBox:4});
 const bins=new Set(plan.visits.reduce((a,v)=>v.load>a.load?v:a).packing.boxes.map(b=>b.bin));
 assert.equal(new Set([...bins].map(i=>regions[i].side)).size,1,'one side');
 assert.equal(new Set([...bins].map(i=>regions[i].section)).size,1,'one fore/aft quarter');
});

// A 84 SCU destination cannot fit one 64 SCU Hull B block. Its 16 and 2 SCU
// containers must stay in neighbouring blocks rather than straddling other cargo.
test('mixed 84/84/50 SCU Hull B load keeps each destination in adjacent physical blocks',async()=>{
 const fs=await import('node:fs'),{planRoute}=await import('../engine.mjs'),{cargoBlocks}=await import('../packing-blocks.mjs');
 const game=JSON.parse(fs.readFileSync(new URL('../data/locations.json',import.meta.url))),id=n=>game.locations.find(l=>l.name===n).id;
 const largeDests=['Canard View',"Shepherd's Rest"],smallDest="Jackson's Swap",pickup='ArcCorp Mining Area 056';
 const c=(commodity,p,d,boxes)=>({commodity,pickupId:id(p),dropoffId:id(d),scu:boxes.reduce((n,b)=>n+b.size*b.count,0),boxes});
 const missions=[{id:'MID',cargo:["Brio's Breaker Yard",'Rayari McGrath Research Outpost'].flatMap(p=>[c('Nitrogen',p,smallDest,[{size:8,count:1},{size:4,count:1}]),c('Organics',p,smallDest,[{size:4,count:1},{size:2,count:1}]),c('Ranta Dung',p,smallDest,[{size:2,count:3},{size:1,count:1}])])},{id:'BIG',cargo:largeDests.flatMap(d=>[c('Ship Ammunition',pickup,d,[{size:16,count:2}]),c('Hydrogen',pickup,d,[{size:16,count:2}]),c('Medical Supplies',pickup,d,[{size:2,count:10}])])}];
 const ship=withStacking(DEFAULT_SHIP),plan=planRoute(game,missions,id('New Babbage'),{ship}),peak=plan.visits.reduce((a,v)=>v.load>a.load?v:a),blocks=cargoBlocks(plan.ship);
 assert.equal(peak.load,218);assert.equal(peak.packing.boxes.length,44);
 for(const block of blocks)assert.ok(new Set(peak.packing.boxes.filter(b=>block.includes(b.bin)).map(b=>b.dropoffId)).size<=1,'physical blocks must not mix destinations when room exists');
 for(const dest of largeDests){const bins=[...new Set(peak.packing.boxes.filter(b=>b.dropoffId===id(dest)).map(b=>b.bin))];assert.equal(new Set(bins.map(i=>ship.grids[i].z)).size,1,'big and small crates stay at the same fore/aft section');assert.equal(new Set(bins.map(i=>Math.sign(ship.grids[i].x))).size,1,'one side per destination');}
 const small=peak.packing.boxes.filter(b=>b.dropoffId===id(smallDest));assert.ok(blocks.some(ids=>small.every(b=>ids.includes(b.bin))));
 assert.deepEqual(plan.visits.map(v=>game.locations.find(l=>l.id===v.locationId).name),['Rayari McGrath Research Outpost',"Brio's Breaker Yard",pickup,smallDest,"Shepherd's Rest",'Canard View']);
 const mid=plan.shipments.filter(s=>s.missionId==='MID'),old=packBoxes(mid.flatMap(s=>s.boxes.map(b=>({...b,rank:0}))),[],ship,{zones:new Map([[id(smallDest),new Set([2,3])]]),strictZones:true});
 assert.ok(old);const restored=planRoute(game,missions,id("Brio's Breaker Yard"),{ship,resume:{picked:mid.map(s=>s.id),delivered:[],aboard:old.boxes}});assert.deepEqual([...restored.initialPacking.boxes].sort((a,b)=>a.boxId.localeCompare(b.boxId)),[...old.boxes].sort((a,b)=>a.boxId.localeCompare(b.boxId)));
 for(const b of old.boxes)for(const visit of restored.visits){const fixed=visit.packing.boxes.find(x=>x.boxId===b.boxId);if(fixed){assert.equal(fixed.bin,b.bin);assert.deepEqual(fixed.cell,b.cell);}}
 const first=plan.visits[0],resume={picked:first.events.filter(e=>e.type==='pickup').map(e=>e.shipmentId),delivered:[],aboard:first.packing.boxes};
 const next=planRoute(game,missions,first.locationId,{ship,resume});assert.deepEqual(next.initialPacking.boxes,first.packing.boxes);
 for(const old of first.packing.boxes)for(const visit of next.visits){const box=visit.packing.boxes.find(b=>b.boxId===old.boxId);if(box){assert.equal(box.bin,old.bin);assert.deepEqual(box.cell,old.cell);assert.deepEqual(box.dims,old.dims);}}
});


test('Hull B uses the two upper or two lower grids of a rear quarter instead of a diagonal',()=>{const ship=withStacking(DEFAULT_SHIP),groups=[['a',1,[24,24,8]],['b',.5,[24,24,8]],['c',0,[32,2]]].map(([dropoffId,rank,sizes])=>({rank,items:sizes.map((size,i)=>({boxId:dropoffId+i,missionId:dropoffId,dropoffId,size,rank}))}));for(const packing of [packBoxes(groups.flatMap(g=>g.items),[],ship),fullLoadLayout(groups,[],ship)]){assert.ok(packing);assert.equal(packing.used,146);const bins=[...new Set(packing.boxes.filter(b=>b.dropoffId==='c').map(b=>b.bin))];assert.equal(bins.length,2);assert.ok([[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]].some(pair=>bins.every(i=>pair.includes(i))),JSON.stringify(bins));}});

test('Hull B spill from a full pair stays in its quarter before moving fore/aft',()=>{const ship=withStacking(DEFAULT_SHIP),items=Array.from({length:12},(_,i)=>({boxId:'b'+i,missionId:'m',dropoffId:'d',size:8,rank:0}));for(const p of [packBoxes(items,[],ship),fullLoadLayout([{items,rank:0}],[],ship)]){assert.ok(p);const bins=[...new Set(p.boxes.map(b=>b.bin))],r=gridRegions(ship);assert.equal(new Set(bins.map(i=>r[i].side)).size,1);assert.equal(new Set(bins.map(i=>r[i].section)).size,1);assert.equal(p.used,96);}});
