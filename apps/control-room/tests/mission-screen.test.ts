import test from 'node:test';
import assert from 'node:assert/strict';
import {quantityPlan} from '../src/mission-quantities.mjs';
import {missionFor,canonicalPlace,calculateFlight} from '../src/flight-engine.mjs';
import {reviewReceipt} from '../src/receipt-edit.mjs';
import {emptyDraft,type Job} from '../src/mission-trial.ts';

function pooled(id='pooled'):Job{
 const to=canonicalPlace('arccorp');
 return {id,title:['배송 합계','Delivery total'],pay:0,rewardUnknown:true,signature:'receipt-v1',state:'incomplete',
  shipments:['hurston','microtech'].map((from,i)=>({id:id+'-'+i,from:canonicalPlace(from),to,cargo:['광석','Ore'],scu:0})),
  mission:{id,title:'Delivery total',reward:0,cargo:['hurston','microtech'].map(from=>({commodity:'Ore',pickupId:canonicalPlace(from),dropoffId:to,scu:null,boxes:[],maxBoxSize:4,_quantityBounds:{unit:'SCU',min:1,max:16}}))}};
}
test('catalogue maxima are optional estimates, never actual pickup quantities',()=>{
 const job=pooled(),before=structuredClone(job),raw=missionFor(job);
 assert.equal(quantityPlan(raw,false).ready,false);
 const result=quantityPlan(raw);
 assert.equal(result.ready,true);assert.equal(result.scu,32);assert.equal(result.certainty,'upper-bound');
 assert.ok(result.mission.cargo.every(r=>r._scuEstimated===true));assert.deepEqual(job,before);
 const plan=calculateFlight({...emptyDraft(),partner:'navigator',jobs:[job]});
 assert.equal(plan.mode,'detail');assert.equal(plan.peak,32);
 assert.throws(()=>calculateFlight({...emptyDraft(),partner:'navigator',allowUpperBounds:false,jobs:[job]}),/최대 수량/);
});
test('entered total replaces the ceiling once, preserves pickups and independent missions',()=>{
 const job=pooled(),to=job.shipments[0]!.to;
 const fixed=reviewReceipt(job,{...job,reservations:{[to]:22}});
 assert.equal(quantityPlan(missionFor(fixed)).certainty,'quantity');
 assert.equal(quantityPlan(missionFor(fixed)).scu,22);
 assert.deepEqual(fixed.shipments.map(r=>r.scu),[0,0]);
 const second=reviewReceipt(pooled('other'),{...pooled('other'),reservations:{[to]:18}});
 const plan=calculateFlight({...emptyDraft(),ship:'C2 Hercules',partner:'navigator',jobs:[fixed,second]});
 const delivery=plan.visits.flatMap(v=>v.events).filter(e=>e.type==='delivery');
 assert.equal(delivery.reduce((sum,e)=>sum+e.scu,0),40);
 assert.ok(plan.visits.some(v=>v.locationId===canonicalPlace('hurston')));
 assert.ok(plan.visits.some(v=>v.locationId===canonicalPlace('microtech')));
 assert.deepEqual([...new Set(plan.visits.flatMap(v=>v.packing.boxes.map(b=>b.missionId)))].sort(),['other','pooled']);
});
test('unknown ceiling blocks navigator but operator stays route-only with unknown load',()=>{
 const job=pooled();job.mission!.cargo.forEach(r=>delete r._quantityBounds);
 assert.equal(quantityPlan(missionFor(job)).ready,false);
 assert.throws(()=>calculateFlight({...emptyDraft(),partner:'navigator',jobs:[job]}));
 const plan=calculateFlight({...emptyDraft(),partner:'operator',jobs:[job]});
 assert.equal(plan.mode,'simple');assert.equal(plan.capacity,null);
 assert.ok(plan.visits.every(v=>v.packing.boxes.length===0));
});
test('partial delivery corrections retain other unknown destinations and reject invalid or stale edits',()=>{
 const job=pooled();job.shipments[1]!.to=canonicalPlace('crusader');job.mission!.cargo[1]!.dropoffId=canonicalPlace('crusader');
 const fixed=reviewReceipt(job,{...job,reservations:{[job.shipments[0]!.to]:7}},true);
 assert.equal(fixed.state,'incomplete');assert.equal(fixed.shipments[0]!.scu,7);assert.equal(fixed.shipments[1]!.scu,0);
 assert.throws(()=>reviewReceipt(job,{...job,signature:'different'}));
 for(const value of [0,-1,1.5,NaN])assert.throws(()=>reviewReceipt(job,{...job,reservations:{[job.shipments[0]!.to]:value}},true));
 const ended={...job,state:'ended' as const};assert.throws(()=>calculateFlight({...emptyDraft(),jobs:[ended]}));
});
