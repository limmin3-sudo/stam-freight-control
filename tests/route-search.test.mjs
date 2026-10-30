import test from 'node:test';
import assert from 'node:assert/strict';
import {planActionRoute} from '../route-search.mjs';

const navFor=locations=>({byId:new Map(locations.map(l=>[l.id,l])),path(a,b){const from=this.byId.get(a),to=this.byId.get(b);assert.ok(from&&to);return {seconds:Math.abs(from.x-to.x)};}});
const loc=(id,x,system='A')=>({id,x,system});
const cargo=(pickupId,dropoffId)=>({pickupId,dropoffId});
function verify(result,shipments,initial=[]){
 assert.ok(result);const state=shipments.map((_,i)=>initial[i]??0);
 for(const action of result.actions){const s=shipments[action.shipmentIndex];assert.ok(s);
  if(action.type==='pickup'){assert.equal(state[action.shipmentIndex],0);assert.equal(action.locationId,s.pickupId);state[action.shipmentIndex]=1;}
  else{assert.equal(state[action.shipmentIndex],1);assert.equal(action.locationId,s.dropoffId);state[action.shipmentIndex]=2;}}
 assert.ok(state.every(s=>s===2));
}

test('small search revisits a stop for reciprocal shipments instead of rejecting the cycle',()=>{
 const nav=navFor([loc('A',0),loc('B',10)]),shipments=[cargo('A','B'),cargo('B','A')],result=planActionRoute(shipments,'A',nav);
 verify(result,shipments);assert.equal(result.seconds,20);assert.equal(result.method,'action-state');
 assert.deepEqual(result.actions.map(a=>a.locationId),['A','B','B','A']);
});

test('same-stop shipments retain independent pickup/delivery events without extra travel',()=>{
 const nav=navFor([loc('A',0)]),shipments=[cargo('A','A'),cargo('A','A')],result=planActionRoute(shipments,'A',nav);
 verify(result,shipments);assert.equal(result.seconds,0);assert.equal(result.actions.length,4);
});

test('resume delivers aboard cargo without picking it up again and omits completed cargo',()=>{
 const nav=navFor([loc('A',0),loc('B',10),loc('C',20)]),shipments=[cargo('A','B'),cargo('B','C'),cargo('A','C')],initial=[1,0,2];
 const result=planActionRoute(shipments,'A',nav,{initialStatus:initial});verify(result,shipments,initial);
 assert.equal(result.seconds,20);assert.ok(!result.actions.some(a=>a.shipmentIndex===2));assert.equal(result.actions.filter(a=>a.shipmentIndex===0).length,1);
});

test('opposite cross-system demands can collect both groups then revisit deliveries without deadlock',()=>{
 const nav=navFor([loc('A1',0,'A'),loc('A2',1,'A'),loc('B1',10,'B'),loc('B2',11,'B')]);
 const shipments=[cargo('A1','B1'),cargo('A2','B2'),cargo('B1','A1'),cargo('B2','A2')],result=planActionRoute(shipments,'A1',nav);
 verify(result,shipments);assert.equal(result.method,'action-state');assert.equal(result.batching,true);
 const picked=new Set();for(const action of result.actions){if(action.type==='pickup')picked.add(action.shipmentIndex);else for(const i of action.shipmentIndex<2?[0,1]:[2,3])assert.ok(picked.has(i));}
});

test('larger shipment sets batch all source pickups before cross-system deliveries',()=>{
 const nav=navFor([loc('A1',0,'A'),loc('A2',5,'A'),loc('B1',20,'B'),loc('B2',22,'B')]);
 const shipments=Array.from({length:8},(_,i)=>cargo(i%2?'A2':'A1',i%2?'B2':'B1')),result=planActionRoute(shipments,'A1',nav);
 verify(result,shipments);assert.equal(result.method,'stop-subset');assert.equal(result.batching,true);assert.equal(result.seconds,22);
 const firstDelivery=result.actions.findIndex(a=>a.type==='delivery');assert.equal(firstDelivery,8);
});

test('large cyclic or over-limit problems return null for the caller feasible fallback',()=>{
 const nav=navFor(Array.from({length:18},(_,i)=>loc(String(i),i)));
 assert.equal(planActionRoute(Array.from({length:8},(_,i)=>cargo(i%2?'1':'0',i%2?'0':'1')),'0',nav),null);
 assert.equal(planActionRoute(Array.from({length:9},(_,i)=>cargo(String(2*i),String(2*i+1))),'0',nav),null);
});
