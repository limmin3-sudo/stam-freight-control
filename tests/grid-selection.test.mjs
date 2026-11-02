import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {DEFAULT_SHIP,selectShipGrids,withStacking,validateShip,capacity}from'../ships.mjs';
import {packBoxes,planRoute,fullLoadLayout,gridWalk}from'../engine.mjs';
import {cargoBlocks}from'../packing-blocks.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/locations.json',import.meta.url))),id=n=>data.locations.find(l=>l.name===n).id;
test('grid selection excludes capacity without deleting grid indices or attachment frames',()=>{
 const raw=withStacking(DEFAULT_SHIP),selected=validateShip(selectShipGrids(raw,[raw.grids[0].id,raw.grids[5].id]));
 assert.equal(capacity(selected),448);assert.equal(selected.grids.length,16);assert.equal(selected.grids[5].id,raw.grids[5].id);assert.deepEqual(selected.grids[5]._world,raw.grids[5]._world);
 assert.ok(selected.grids[0].disabled);assert.ok(selectShipGrids(selected,[]).grids.every(g=>!g.disabled));
 assert.ok(cargoBlocks(selected).every(block=>!block.includes(0)&&!block.includes(5)));
});
test('both partner policies use only enabled grids and can split trips to retain all cargo',()=>{
 const ship=withStacking(selectShipGrids(DEFAULT_SHIP,DEFAULT_SHIP.grids.slice(1).map(g=>g.id))),m=[{id:'M',cargo:[{commodity:'x',scu:64,pickupId:id('Orison'),dropoffId:id('Seraphim Station'),boxes:[{size:16,count:4}]}]}];
 for(const routePolicy of ['batch','delivery-first']){const p=planRoute(data,m,id('Orison'),{ship,routePolicy});assert.equal(p.capacity,32);assert.equal(p.shipments.reduce((n,s)=>n+s.scu,0),64);assert.ok(p.visits.every(v=>v.packing.boxes.every(b=>b.bin===0)));assert.equal(p.visits.at(-1).load,0);}
});
test('disabled grids cannot receive new or fixed cargo and all-off is recoverable',()=>{
 const ship=selectShipGrids(DEFAULT_SHIP,DEFAULT_SHIP.grids.map(g=>g.id));assert.equal(capacity(ship),0);
 assert.equal(packBoxes([{boxId:'a',size:1,missionId:'a'}],[],ship),null);
 assert.equal(packBoxes([],[{boxId:'a',size:1,missionId:'a',bin:0,cell:[0,0,0],dims:[1,1,1]}],ship),null);
 assert.throws(()=>planRoute(data,[{id:'a',cargo:[{scu:1,pickupId:id('Orison'),dropoffId:id('Seraphim Station'),boxes:[]}]}],id('Orison'),{ship}),/하나 이상 켜/);
 assert.ok(packBoxes([{boxId:'a',size:1,missionId:'a'}],[],selectShipGrids(ship,[])));
});
test('segmented Caterpillar and Hull C and two-hold C2 share the same grid exclusion',()=>{
 const presets=JSON.parse(fs.readFileSync(new URL('../data/ships.json',import.meta.url)));
 for(const name of ['drake-caterpillar','misc-hull-c','crusader-c2-hercules-starlifter']){
  const raw=presets.find(s=>s.id===name),ship=validateShip(withStacking(selectShipGrids(raw,[raw.grids[0].id]))),items=Array.from({length:6},(_,i)=>({boxId:'b'+i,size:8,missionId:'m',dropoffId:'d'}));
  const p=packBoxes(items,[],ship);assert.ok(p,name);assert.equal(p.used,48);assert.ok(p.boxes.every(b=>b.bin!==0),name);assert.equal(ship.grids.length,raw.grids.length);
 }
});
test('fresh Hull B plans fill physically adjacent blocks before going diagonally to the rear',()=>{
 const ship=withStacking(DEFAULT_SHIP),walk=gridWalk(ship),ordered=ship.grids.map((_,i)=>i).sort((a,b)=>walk[a]-walk[b]);
 assert.deepEqual(new Set(ordered.slice(0,4)),new Set([0,1,2,3]));
 const selected=withStacking(selectShipGrids(DEFAULT_SHIP,[DEFAULT_SHIP.grids[0].id]));const active=selected.grids.map((_,i)=>i).filter(i=>!selected.grids[i].disabled).sort((a,b)=>gridWalk(selected)[a]-gridWalk(selected)[b]);assert.ok(!active.includes(0));assert.equal(active[0],1);
});
