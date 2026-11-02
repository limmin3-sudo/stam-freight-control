import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deliveryFirstRoute} from '../delivery-first.mjs';
import {planRoute} from '../engine.mjs';
import {planRoutesOnly} from '../route-only.mjs';
import {groupConfiguration,containerText} from '../cargo-summary.mjs';
import {suggestLocations} from '../aliases.mjs';
const shipment=(missionId,pickupId,dropoffId,scu=2)=>({id:missionId+pickupId+dropoffId,missionId,pickupId,dropoffId,scu});
function run(shipments,coords,capacity=20){
 const nav={path(a,b){return {seconds:Math.hypot(coords[a][0]-coords[b][0],coords[a][1]-coords[b][1])*60,meters:0,jumps:0};}};
 const initial={status:shipments.map(()=>0),at:'S',cost:0,load:0,actions:[]};
 const advance=(state,i)=>{const s=shipments[i],delivery=state.status[i]===1;if(state.status[i]===2||!delivery&&state.load+s.scu>capacity)return null;const at=delivery?s.dropoffId:s.pickupId,status=[...state.status];status[i]++;return {at,status,load:state.load+(delivery?-s.scu:s.scu),cost:state.cost+nav.path(state.at,at).seconds,actions:[...state.actions,{i,at,type:delivery?'delivery':'pickup'}]};};
 return deliveryFirstRoute(shipments,nav,initial,advance);
}
test('operator picks up nearby cargo on the way even with a different distant delivery',()=>{
 const r=run([shipment('first','S','D'),shipment('side','P','E')],{S:[0,0],D:[10,0],P:[4,.1],E:[100,0]});
 assert.deepEqual(r.actions.map(a=>[a.i,a.type]),[[0,'pickup'],[1,'pickup'],[0,'delivery'],[1,'delivery']]);assert.deepEqual(r.status,[2,2]);
});
test('operator delivers the current contract before a long pickup detour',()=>{
 const r=run([shipment('first','S','D'),shipment('far','P','E')],{S:[0,0],D:[10,0],P:[4,15],E:[100,0]});
 assert.deepEqual(r.actions.slice(0,2).map(a=>[a.i,a.type]),[[0,'pickup'],[0,'delivery']]);
});
test('operator completes the focus contract with multiple deliveries and keeps room for its remaining pickups',()=>{
 const r=run([shipment('first','S','D'),shipment('first','Q','F',4),shipment('side','P','E',4)],{S:[0,0],D:[10,0],P:[4,.1],Q:[11,0],F:[12,0],E:[100,0]},4);
 const lastFocus=r.actions.findIndex(a=>a.i===1&&a.type==='delivery'),side=r.actions.findIndex(a=>a.i===2&&a.type==='pickup');assert.ok(side>lastFocus);assert.deepEqual(r.status,[2,2,2]);
});
test('operator cumulatively limits detours rather than refreshing the budget at each pickup',()=>{
 const r=run([shipment('first','S','D'),...Array.from({length:5},(_,i)=>shipment('side'+i,'P'+i,'E'+i))],{S:[0,0],D:[10,0],P0:[2,1],P1:[3,-1],P2:[4,1],P3:[5,-1],P4:[6,1],E0:[100,0],E1:[101,0],E2:[102,0],E3:[103,0],E4:[104,0]});
 const firstDone=r.actions.findIndex(a=>a.i===0&&a.type==='delivery');assert.ok(firstDone>1);assert.ok(firstDone<6);
});
const data=JSON.parse(fs.readFileSync(new URL('../data/locations.json',import.meta.url))),id=name=>data.locations.find(l=>l.name===name).id;
const missions=[{id:'A',cargo:[{commodity:'A',scu:8,pickupId:id('Everus Harbor'),dropoffId:id('Seraphim Station'),boxes:[{size:8,count:1}]}]},{id:'B',cargo:[{commodity:'B',scu:8,pickupId:id('Baijini Point'),dropoffId:id('Seraphim Station'),boxes:[{size:8,count:1}]}]}];
test('navigator still uses the default batch route; operator has a different delivery order',()=>{
 const normal=planRoute(data,missions,id('Everus Harbor')),batch=planRoute(data,missions,id('Everus Harbor'),{routePolicy:'batch'}),op=planRoute(data,missions,id('Everus Harbor'),{routePolicy:'delivery-first'});
 assert.deepEqual(normal.visits,batch.visits);assert.notDeepEqual(op.visits.map(v=>v.locationId),batch.visits.map(v=>v.locationId));assert.equal(op.visits.at(-1).load,0);
 const simple=planRoutesOnly(data,missions,id('Everus Harbor'),{routePolicy:'delivery-first'});assert.ok(simple.algorithm.includes('오퍼레이터'));
 const first=op.visits[0],picked=first.events.filter(e=>e.type==='pickup').map(e=>e.shipmentId),resume=planRoute(data,missions,first.locationId,{routePolicy:'delivery-first',resume:{picked,delivered:[],aboard:first.packing.boxes}});
 assert.deepEqual(resume.initialPacking.boxes,first.packing.boxes);assert.ok(!resume.visits.flatMap(v=>v.events).some(e=>e.type==='pickup'&&picked.includes(e.shipmentId)));
});
test('container previews preserve real layouts, expose estimates and show sizes',()=>{
 const g={pickupId:'P',dropoffId:'D',scu:64,cargo:[{scu:64,maxBoxSize:8,_maxBoxSource:'wiki',boxes:[]}]};
 const estimated=groupConfiguration({},g);assert.deepEqual(estimated.boxes,[{size:8,count:8}]);assert.equal(estimated.estimated,true);assert.equal(containerText(estimated.boxes),'8 SCU × 8');
 const m={destinationBoxes:[{pickupId:'P',dropoffId:'D',boxes:[{size:16,count:4}],origin:'manual'}]};assert.equal(groupConfiguration(m,g).estimated,false);assert.equal(containerText(groupConfiguration(m,g).boxes),'16 SCU × 4');
 const special=groupConfiguration({},{...g,cargo:[{scu:64,_special:'cryopod',boxes:[]}]});assert.equal(special.special,true);assert.equal(special.estimated,true);assert.ok(special.valid);
 assert.equal(containerText([{size:16},{size:8},{size:16}]),'16 SCU × 2 + 8 SCU × 1');
});
test('Korean and English partial names yield selectable suggestions with stable IDs',()=>{
 assert.ok(suggestLocations('에버',data.locations).some(l=>l.name==='Everus Harbor'));
 for(const q of ['에버러스','ever','Everus'])assert.equal(suggestLocations(q,data.locations)[0].name,'Everus Harbor',q);
 assert.equal(suggestLocations('오리',data.locations)[0].name,'Orison');assert.equal(suggestLocations('new babage',data.locations)[0].name,'New Babbage');assert.deepEqual(suggestLocations('',data.locations),[]);
});
