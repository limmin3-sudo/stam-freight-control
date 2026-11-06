import test from 'node:test';import assert from 'node:assert/strict';
import {planRoute,makeShipments} from '../engine.mjs';
import {missionSCU,quantitiesReady} from '../delivery-totals.mjs';
import {cardReady,cardCertainty,InboxSelection,withDeliveryTotal} from '../integration/inbox-core.mjs';
const locations=['p1','p2','q','d','e'].map((id,i)=>({id,name:id,system:'stanton',type:'Manmade',position:[i*10000,0,0]})),data={locations,jumps:[]},ship={id:'reservation-test',name:'32 SCU test hold',grids:[{w:8,h:2,l:2,x:0,y:0,z:0,maxBoxSize:32}]};
const pool=(id='pool',total=22)=>({id,title:'Delivery total',cargo:['p1','p2'].map(pickupId=>({commodity:'Aluminum',scu:16,_scuEstimated:true,_quantityBounds:{unit:'SCU',min:1,max:16},maxBoxSize:4,_maxBoxSource:'wiki',pickupId,dropoffId:'d',boxes:[]})),_deliveryTotals:[{dropoffId:'d',scu:total}]});
const exact={id:'exact',cargo:[{commodity:'Hydrogen',scu:8,pickupId:'q',dropoffId:'e',boxes:[{size:8,count:1}]}]};
test('a delivery total is actual quantity evidence without inventing the pickup split',()=>{
 const m=pool(),card={id:m.id,rows:m.cargo,deliveryTotals:m._deliveryTotals};assert.equal(missionSCU(m),22);assert.equal(quantitiesReady(m),true);assert.equal(cardReady(card,locations),true);assert.equal(cardCertainty(card),'quantity');assert.deepEqual(m.cargo.map(c=>c.scu),[16,16]);
 const selection=new InboxSelection(locations);selection.useUpperBounds=false;const raw={...card,signature:'receipt'};selection.sync([raw]);selection.saveDeliveryDrafts([{...m,_logInbox:{signature:'receipt'}}]);assert.equal(selection.ready(selection.effective(raw)),true);assert.equal(selection.toggle(m.id,true),true);
});
test('reserve the destination total exactly once, from whichever pickup is visited first',()=>{
 for(const order of [['q','p1','p2','d','e'],['q','p2','p1','d','e']]){const m=pool(),before=structuredClone(m),plan=planRoute(data,[m,exact],'q',{ship,unknownBox:4,manualStops:order});assert.equal(plan.peak,30);for(const pickup of ['p1','p2'])assert.equal(plan.visits.find(v=>v.locationId===pickup).load,30);assert.equal(plan.visits.find(v=>v.locationId==='d').load,8);assert.equal(plan.visits.at(-1).load,0);assert.equal(plan.visits.flatMap(v=>v.events).filter(e=>e.type==='delivery'&&e.missionId==='pool').reduce((n,e)=>n+e.scu,0),22);assert.deepEqual(m,before);}
});
test('every pickup is required before releasing the pooled delivery reservation',()=>{
 assert.throws(()=>planRoute(data,[pool()],'p1',{ship,manualStops:['p1','d','p2']}),/픽업|배송|거점/);
 const plan=planRoute(data,[pool()],'p1',{ship});const route=plan.visits.map(v=>v.locationId);assert.ok(route.indexOf('d')>route.indexOf('p1'));assert.ok(route.indexOf('d')>route.indexOf('p2'));assert.equal(plan.peak,22);
});
test('identical goods and destinations retain independent mission reservations',()=>{
 const {shipments}=makeShipments([pool('one',22),pool('two',18)],new Map(locations.map(l=>[l.id,l])),{}),a=shipments.find(s=>s.missionId==='one').reservation.boxes,b=shipments.find(s=>s.missionId==='two').reservation.boxes;assert.equal(a.reduce((n,b)=>n+b.size,0),22);assert.equal(b.reduce((n,b)=>n+b.size,0),18);assert.ok(a.every(x=>b.every(y=>x.boxId!==y.boxId)));assert.ok(a.every(x=>x.missionId==='one'));assert.ok(b.every(x=>x.missionId==='two'));
});
test('replanning a partly collected reservation preserves its occupied cells',()=>{
 const m=pool(),first=planRoute(data,[m,exact],'q',{ship,manualStops:['q','p2','p1','d','e']}),stop=first.visits.findIndex(v=>v.locationId==='p2'),done=first.visits.slice(0,stop+1).flatMap(v=>v.events),aboard=first.visits[stop].packing.boxes,resume={picked:done.filter(e=>e.type==='pickup').map(e=>e.shipmentId),delivered:done.filter(e=>e.type==='delivery').map(e=>e.shipmentId),aboard};const next=planRoute(data,[m,exact],'p2',{ship,resume,manualStops:['p1','d','e']});assert.deepEqual(next.initialPacking.boxes.map(b=>[b.boxId,b.bin,b.cell,b.dims]).sort((a,b)=>a[0].localeCompare(b[0])),aboard.map(b=>[b.boxId,b.bin,b.cell,b.dims]).sort((a,b)=>a[0].localeCompare(b[0])));assert.equal(next.peak,30);assert.equal(next.visits.at(-1).load,0);
});
test('partial known allocations, multiple destinations and manual delivery boxes preserve exact totals',()=>{
 const m=pool();delete m.cargo[0]._scuEstimated;m.cargo[0].scu=6;m.cargo.push({...exact.cargo[0]});m.destinationBoxes=[{pickupId:null,dropoffId:'d',boxes:[{size:4,count:5},{size:2,count:1}],origin:'manual'}];assert.equal(missionSCU(m),30);const {shipments}=makeShipments([m],new Map(locations.map(l=>[l.id,l])),{ship});const jobs=shipments.filter(s=>s.reservation);assert.equal(jobs.find(s=>s.pickupId==='p1').scu,6);assert.equal(jobs.find(s=>s.pickupId==='p2').scu,null);assert.equal(jobs[0].reservation.boxes.reduce((n,b)=>n+b.size,0),22);assert.equal(jobs[0].estimated,false);assert.equal(planRoute(data,[m],'q',{ship}).visits.at(-1).load,0);
});
test('contradictory delivery totals cannot confirm quantities and capacity overflow is explicit',()=>{
 const m=pool();delete m.cargo[0]._scuEstimated;m.cargo[0].scu=8;m._deliveryTotals[0].scu=7;assert.equal(quantitiesReady(m),false);m._deliveryTotals.push({dropoffId:'d',scu:22});assert.equal(quantitiesReady(m),false);assert.throws(()=>planRoute(data,[pool('too-large',33)],'p1',{ship}),/한 번에 예약/);
});
test('pooled cryopods retain one SCU per pod and half-height stacking',()=>{
 const m=pool('pods',3);for(const c of m.cargo){c._cargoShape='cryopod';c.commodity='Cryopod';}const p=planRoute(data,[m],'p1',{ship}),boxes=p.visits.find(v=>v.locationId==='p1').packing.boxes;assert.equal(p.peak,3);assert.equal(boxes.length,3);assert.ok(boxes.every(b=>b.size===1&&b._cargoShape==='cryopod'&&b.dims[1]===.5));assert.equal(p.visits.at(-1).load,0);
});
test('legacy aboard cargo is never silently converted or discarded by a new aggregate reservation',()=>{
 const m=pool();assert.throws(()=>planRoute(data,[m],'p1',{ship,resume:{picked:['pool:0:0'],delivered:[],aboard:[{missionId:'pool',boxId:'pool:0:0',size:4,bin:0,cell:[0,0,0],dims:[1,2,2]}]}}),/상자 위치가 달라/);
});
