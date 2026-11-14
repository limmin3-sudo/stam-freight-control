import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDraft,samples} from '../src/mission-trial.ts';
import type {Job} from '../src/mission-trial.ts';
import type {Session} from '../src/flight-session.ts';
import {blankRun,startRun,completeStep} from '../src/flight-session.ts';
import {calculateFlight} from '../src/flight-engine.mjs';
import {observeReceipts,pendingReceiptChanges,prepareReceiptUpdate,receiptBaseline,receiptChangeToken,replanReceiptUpdate} from '../src/flight-receipts.ts';
import {exportFlight,importFlight,validateFlight} from '../src/flight-backup.ts';
const job=(i=0):Job=>({...structuredClone(samples[i]!),id:'accepted-'+i,signature:'source-'+i,state:'ready'});
function fixture(partner:'navigator'|'operator'='navigator',both=true):Session{
 const jobs=both?[job(0),job(1)]:[job(0)];const draft={...emptyDraft(),partner,jobs,partnerSelected:true},plan=calculateFlight(draft);
 const run=completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000);run.since=null;
 return {version:1,draft,plan,run,receiptReview:receiptBaseline(draft,jobs)};
}
function ended(s:Session){return observeReceipts(s,[{...s.draft.jobs[0]!,state:'ended',signature:'ended'}]);}
function confirm(s:Session,action:'exclude'|'keep'|'apply'='exclude'){
 const changes=pendingReceiptChanges(s);return replanReceiptUpdate(s,Object.fromEntries(changes.map(c=>[c.id,action])),receiptChangeToken(changes),5000);
}

test('notification alone preserves plan, cargo and progress; absence is not cancellation and acknowledgment is evidence-specific',()=>{
 const s=fixture(),before=JSON.stringify(s),changed=ended(s);
 assert.equal(JSON.stringify(s),before);assert.deepEqual(changed.run,s.run);assert.deepEqual(changed.plan,s.plan);
 assert.equal(pendingReceiptChanges(changed).length,1);assert.equal(pendingReceiptChanges(observeReceipts(s,[])).length,0);
 const next=confirm(changed);assert.equal(pendingReceiptChanges(next).length,0);
 assert.equal(pendingReceiptChanges(observeReceipts(next,[{...changed.receiptReview!.observed[0]!,signature:'another-ended'}])).length,1);
 assert.throws(()=>prepareReceiptUpdate(changed,{[job().id]:'exclude'},'old-token'));
});

test('confirmed cancellation removes only remaining work; held boxes occupy the same cells through other deliveries and backups',()=>{
 const s=fixture(),changed=ended(s),next=confirm(changed);
 assert(s.run!.aboard.length>0);assert.deepEqual(next.run!.aboard,s.run!.aboard);
 assert.deepEqual(next.run!.picked,s.run!.picked);assert.deepEqual(next.run!.delivered,s.run!.delivered);assert.deepEqual(next.run!.log,s.run!.log);
 assert.equal(next.run!.startedAt,s.run!.startedAt);assert.equal(next.run!.elapsed,s.run!.elapsed);
 assert(next.plan!.visits.every(v=>v.events.every(e=>e.missionId!==job().id)));
 for(const visit of next.plan!.visits)for(const b of s.run!.aboard){const actual=visit.packing.boxes.find(x=>x.boxId===b.boxId)!;assert(actual);assert.equal(actual.bin,b.bin);assert.deepEqual(actual.cell,b.cell);assert.deepEqual(actual.dims,b.dims);assert.equal(actual.missionId,b.missionId);}
 validateFlight(next);const restored=importFlight(exportFlight(next,6000));assert.deepEqual(restored.run!.aboard,next.run!.aboard);assert.deepEqual(restored.receiptReview,next.receiptReview);
 let run=next.run!;while(run.index<next.plan!.visits.length)run=completeStep(next.plan!,run,6000);
 assert.equal(run.finished,false);assert.deepEqual(run.aboard,s.run!.aboard);assert.equal(run.since,null);
 validateFlight({...next,run});
 // Held 16 SCU must prevent loading a single 32-SCU box into the remaining Cutlass space.
 const heavy={...next.draft.jobs[1]!,shipments:next.draft.jobs[1]!.shipments.map(r=>({...r,scu:32,boxes:[{size:32,count:1}]}))};
 assert.throws(()=>calculateFlight({...next.draft,jobs:[next.draft.jobs[0]!,heavy]},{startId:run.positionId,resume:{picked:s.run!.picked,delivered:s.run!.delivered,aboard:s.run!.aboard},excludedMissionIds:[job().id]}));
});

test('all remaining contracts cancelled leaves aboard cargo on hold with no fictitious visit or delivery',()=>{
 const s=fixture('navigator',false),next=confirm(ended(s));
 assert.equal(next.plan!.visits.length,0);assert.equal(next.run!.finished,false);assert.deepEqual(next.run!.aboard,s.run!.aboard);
 assert.deepEqual(next.run!.delivered,s.run!.delivered);validateFlight(next);assert.equal(importFlight(exportFlight(next)).plan!.visits.length,0);
 const noLoad={...s,run:startRun(blankRun(s.plan!),1000)};
 const empty=confirm(ended(noLoad));assert.equal(empty.run!.finished,true);assert.equal(empty.run!.delivered.length,0);validateFlight(empty);
});

test('operator can exclude a cancelled route without creating cargo or erasing completed steps',()=>{
 const s=fixture('operator'),next=confirm(ended(s));
 assert.equal(next.plan!.mode,'simple');assert.equal(next.plan!.capacity,null);assert.deepEqual(next.run!.aboard,[]);assert.deepEqual(next.run!.log,s.run!.log);
 assert(next.plan!.visits.every(v=>v.events.every(e=>e.missionId!==job().id)));validateFlight(next);
});

test('unstarted cargo changes apply after confirmation; changes to processed cargo require keeping its recorded facts',()=>{
 const s=fixture();const second=s.draft.jobs[1]!;
 const latest={...second,signature:'new',pay:999,shipments:second.shipments.map(r=>({...r,scu:10}))};
 const changed=observeReceipts(s,[latest]);assert.equal(pendingReceiptChanges(changed)[0]!.canApply,true);
 const next=confirm(changed,'apply');assert.equal(next.draft.jobs[1]!.pay,999);assert.deepEqual(next.run!.aboard,s.run!.aboard);validateFlight(next);
 const touched=observeReceipts(s,[{...s.draft.jobs[0]!,signature:'changed-loaded',shipments:s.draft.jobs[0]!.shipments.map(r=>({...r,scu:1}))}]);
 assert.equal(pendingReceiptChanges(touched)[0]!.canApply,false);assert.throws(()=>confirm(touched,'apply'));
 const kept=confirm(touched,'keep');assert.deepEqual(kept.draft,s.draft);assert.deepEqual(kept.run!.aboard,s.run!.aboard);assert.equal(pendingReceiptChanges(kept).length,0);
});
