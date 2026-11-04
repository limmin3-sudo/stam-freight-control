import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {calculatePreview} from '../integration/log/preview-packing.mjs';import {connectReservationRoute} from '../integration/log/reservation-route.mjs';
import {definitionIndex} from '../integration/log/catalog.mjs';import {DEFAULT_SHIP} from '../ships.mjs';
import {data,fixture} from './helpers/log-preview.mjs';import {mediumFixture} from './helpers/log-reservations.mjs';
const catalog=definitionIndex(JSON.parse(readFileSync(new URL('../data/log-mission-index.json',import.meta.url))));
const startId=data.locations.find(p=>p.name==='New Babbage').id;
const plan=(contracts,extra={})=>calculatePreview({contracts,catalogData:[...catalog],locationData:data,ship:DEFAULT_SHIP,startId,...extra});
function precedence(route,missionId,pickups){const seen=new Set();for(const visit of route.visits)for(const e of visit.events){if(e.missionId!==missionId)continue;if(e.type==='pickup')seen.add(visit.locationId);if(e.type==='delivery')assert.ok(pickups.every(id=>seen.has(id)));}}
test('medium connects all pickups before delivery for both partners without allocating their quantities',()=>{
 for(const partner of ['navigator','operator']){
  const c=mediumFixture(),before=JSON.stringify(c),p=plan([c],{partner});assert.equal(p.routeReady,true);assert.equal(p.totalScu,50);assert.equal(p.route.visits[0].locationId,startId);
  const pickups=p.route.visits.filter(v=>v.events.some(e=>e.type==='pickup')).map(v=>v.locationId);assert.equal(pickups.length,2);precedence(p.route,c.missionId,pickups);
  assert.ok(p.route.visits.every(v=>v.load===null));assert.ok(p.route.visits.flatMap(v=>v.events).every(e=>e.scu===undefined));assert.equal(p.route.shipments,undefined);assert.equal(p.route.handlingIncluded,false);assert.ok(p.route.visits.some(v=>v.leg.jumps===1));assert.equal(JSON.stringify(c),before);
 }
});
test('medium and large share a route but retain separate destination ownership and known full cargo',()=>{
 const m=mediumFixture(),l=fixture('22222222-2222-4222-8222-222222222222').contract,p=plan([m,l]);
 assert.equal(p.routeReady,true);assert.equal(p.totalScu,218);assert.equal(new Set(p.packing.boxes.map(b=>b.missionId)).size,2);assert.ok(p.packing.boxes.some(b=>!b.reservation));
 for(const c of [m,l]){const pickup=p.route.visits.filter(v=>v.events.some(e=>e.missionId===c.missionId&&e.type==='pickup')).map(v=>v.locationId);precedence(p.route,c.missionId,pickup);}
 assert.equal(p.route.visits.reduce((n,v)=>n+v.leg.jumps,0),1);
});
test('departure at a pickup performs its work without a zero-distance next flight leg',()=>{
 const c=mediumFixture(),p=plan([c],{startId:data.locations.find(p=>p.name==="Brio's Breaker Yard").id});
 assert.ok(p.route.visits[0].events.some(e=>e.type==='pickup'));assert.ok(p.route.visits.slice(1).every(v=>v.leg.nodes.length>=2&&v.leg.seconds>0));
});
test('incomplete evidence, missing stops, absent departure and insufficient hold keep reservation without a route',()=>{
 const c=mediumFixture(),p=plan([c]);
 const preview={scope:'destination-space-reservation',mission:{id:c.missionId,cargo:[]},visitRequirements:{complete:true,pickups:['missing'],deliveries:[startId]}};
 assert.equal(connectReservationRoute({...p,partial:true},[preview],{startId}).routeReady,false);
 assert.equal(connectReservationRoute(p,[preview],{startId}).routeReady,false);
 assert.equal(plan([c],{startId:null}).routeReady,false);
 const small={id:'small',name:'Small',grids:[{id:'hold',name:'hold',x:0,y:0,z:0,w:2,h:2,l:4}]};
 const blocked=plan([c],{ship:small});assert.equal(blocked.routeReady,false);assert.equal(blocked.totalScu,50);assert.equal(blocked.packing,null);
});
test('cyclic/shared pickup and delivery sites retain contract prerequisites without fabricating allocation',()=>{
 const locations=['A','B','C','D'].map((id,i)=>({id,name:id,system:'stanton',type:'Manmade',position:[i*1000000,0,0]}));
 const preview=(id,pickups,deliveries)=>({scope:'destination-space-reservation',mission:{id,cargo:[]},visitRequirements:{complete:true,pickups,deliveries}});
 for(const partner of ['navigator','operator']){
  const result=connectReservationRoute({partial:false,packing:{boxes:[]},stops:locations},[preview('one',['A','B'],['C']),preview('two',['C'],['A'])],{startId:'D',partner});
  assert.equal(result.routeReady,true);precedence(result.route,'one',['A','B']);precedence(result.route,'two',['C']);
 }
});
