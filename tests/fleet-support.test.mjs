import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {packBoxes} from '../engine.mjs';import {capacity,validateShip,selectShipGrids} from '../ships.mjs';
import {applyReviewedProfiles} from '../scripts/reviewed-fleet-profiles.mjs';
const ships=JSON.parse(fs.readFileSync(new URL('../data/ships.json',import.meta.url))),ship=id=>validateShip(ships.find(s=>s.id===id));
const boxes=rows=>rows.flatMap(([size,count])=>Array.from({length:count},(_,i)=>({boxId:size+'-'+i,size,missionId:'same-contract',shipmentId:'same-shipment',dropoffId:'same-destination'})));
test('reviewed new holds pack documented full loads without merging module capacities',()=>{
 for(const [id,scu,load]of [['anvil-liberator',400,[[32,10],[16,4],[2,8]]],['rsi-galaxy',64,[[16,4]]],['rsi-galaxy-cargo',720,[[32,19],[24,2],[16,4]]],['rsi-galaxy-medical',68,[[16,4],[4,1]]],['aegis-hammerhead',64,[[32,2]]]]){
  const s=ship(id);assert.equal(capacity(s),scu);const p=packBoxes(boxes(load),[],s);assert.ok(p,id);assert.equal(p.used,scu,id);
 }
 assert.equal(packBoxes(boxes([[32,1]]),[],ship('rsi-galaxy')),null,'hangar accepts at most 16 SCU per container');
});
test('Ironclad includes five real secure grids, excludes transit lifts and enforces one-SCU boxes there',()=>{
 const s=ship('drake-ironclad');assert.equal(capacity(s),2200);assert.equal(s.grids.length,9);assert.ok(!s.grids.some(g=>g.id.startsWith('lift')));
 const secure=selectShipGrids(s,s.grids.filter(g=>!g.id.startsWith('secure-')).map(g=>g.id));assert.equal(capacity(secure),40);
 assert.equal(packBoxes(boxes([[1,40]]),[],secure).used,40);assert.equal(packBoxes(boxes([[2,1]]),[],secure),null);
});
test('reviewed profiles reject changed upstream geometry before applying it',()=>{
 assert.throws(()=>applyReviewedProfiles(ships,[{uuid:'609ce4ca-0f46-44a5-b6d3-2c2f87417126',cargo_capacity:400,cargo_grids:[]}]),/measurements changed/);
});

test('logs identify Galaxy configurations by class instead of collapsing identical displayed names',async()=>{
 const {SHIP_REFERENCES}=await import('../data/log-vehicle-index.mjs');
 assert.equal(SHIP_REFERENCES.RSI_Galaxy.id,'rsi-galaxy');assert.equal(SHIP_REFERENCES.RSI_Galaxy_TEMP_Cargo.id,'rsi-galaxy-cargo');assert.equal(SHIP_REFERENCES.RSI_Galaxy_TEMP_Medical.id,'rsi-galaxy-medical');assert.equal(SHIP_REFERENCES.ANVL_Liberator.id,'anvil-liberator');
 assert.equal(SHIP_REFERENCES.GAMA_Hyun.id,null,'unconfirmed release must not become a selectable ship');
});

test('Caterpillar front grids reject the 24 SCU box that only fit the old shape',()=>{
 const s=ship('drake-caterpillar'),front=selectShipGrids(s,s.grids.filter(g=>g.id!=='bay-1-1'&&g.id!=='drak-caterpillar-cargo-inventory-module-ladder-1').map(g=>g.id));
 for(let i=0;i<s.grids.length;i++)for(let j=i+1;j<s.grids.length;j++){const a=s.grids[i],b=s.grids[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y||a.z+a.l<=b.z||b.z+b.l<=a.z,'schematic grids must not overlap');}
 assert.equal(capacity(s),576);assert.equal(capacity(front),80);assert.equal(packBoxes(boxes([[24,1]]),[],front),null);
 assert.equal(packBoxes(boxes([[16,3]]),[],front).used,48);
 const walkway=selectShipGrids(s,s.grids.filter(g=>!g.id.includes('walkway')).map(g=>g.id));assert.equal(packBoxes(boxes([[4,1]]),[],walkway),null);assert.equal(packBoxes(boxes([[2,1]]),[],walkway).used,2);
});
test('Idris one-SCU stores and split secondary bays cannot accept boxes over their verified limit',()=>{
 const s=ship('aegis-idris-p');assert.equal(capacity(s),1374);assert.equal(s.grids.length,25);
 const store=selectShipGrids(s,s.grids.filter(g=>g.id!=='cargo-room-small-1').map(g=>g.id));assert.equal(capacity(store),4);
 assert.equal(packBoxes(boxes([[1,4]]),[],store).used,4);assert.equal(packBoxes(boxes([[2,1]]),[],store),null);
 assert.equal(s.grids.filter(g=>g.id.startsWith('bay-3')).length,4);
});
test('Syulen has six independent one-SCU slots and cannot pretend a long cryopod fits across two slots',()=>{
 const s=ship('gatac-syulen');assert.equal(capacity(s),6);assert.equal(s.grids.length,6);
 assert.equal(packBoxes(boxes([[1,6]]),[],s).used,6);assert.equal(packBoxes(boxes([[2,1]]),[],s),null);
 assert.equal(packBoxes([{...boxes([[1,1]])[0],_cargoShape:'cryopod'}],[],s),null);
});
