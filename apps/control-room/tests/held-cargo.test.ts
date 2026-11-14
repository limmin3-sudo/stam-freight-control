import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDraft,samples} from '../src/mission-trial.ts';
import {blankRun,startRun,completeStep} from '../src/flight-session.ts';
import type {Session} from '../src/flight-session.ts';
import {calculateFlight} from '../src/flight-engine.mjs';
import {observeReceipts,pendingReceiptChanges,receiptBaseline,receiptChangeToken,replanReceiptUpdate} from '../src/flight-receipts.ts';
import {heldCargo,confirmHeldDischarge} from '../src/held-cargo.ts';
import {validateFlight,exportFlight,importFlight} from '../src/flight-backup.ts';
import {updateFlightHistory} from '../src/flight-history.mjs';
function fixture(both=false):Session{
 const jobs=samples.slice(0,both?2:1).map((j,i)=>({...structuredClone(j),id:'accepted-'+i,signature:'source-'+i,state:'ready' as const}));
 const draft={...emptyDraft(),partner:'navigator' as const,partnerSelected:true,jobs},plan=calculateFlight(draft);
 let s:Session={version:1,draft,plan,run:completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000),receiptReview:receiptBaseline(draft,jobs)};
 s.run!.since=null;s=observeReceipts(s,[{...jobs[0]!,signature:'ended',state:'ended'}]);
 return replanReceiptUpdate(s,{[jobs[0]!.id]:'exclude'},receiptChangeToken(pendingReceiptChanges(s)),4000);
}
test('partial physical discharge removes selected held boxes only, preserving other cells and completed evidence',()=>{
 const s=fixture(true),before=JSON.stringify(s),held=heldCargo(s);assert(held.length>1);
 const next=confirmHeldDischarge(s,[held[0]!.boxId],5000);
 assert.equal(JSON.stringify(s),before);assert.deepEqual(next.run!.aboard,s.run!.aboard.filter(b=>b.boxId!==held[0]!.boxId));assert.deepEqual(next.run!.picked,s.run!.picked);assert.deepEqual(next.run!.delivered,s.run!.delivered);assert.deepEqual(next.run!.log,s.run!.log);
 assert.equal(next.run!.startedAt,s.run!.startedAt);assert.equal(next.heldDischarges![0]!.locationId,s.run!.positionId);validateFlight(next);
 const restored=importFlight(exportFlight(next,6000));assert.deepEqual(restored.heldDischarges,next.heldDischarges);assert.deepEqual(restored.run!.aboard,next.run!.aboard);
});
test('last held crate release ends an empty route without inventing delivery or cancelled reward',()=>{
 const s=fixture(),next=confirmHeldDischarge(s,heldCargo(s).map(b=>b.boxId),5000);assert.equal(next.plan!.visits.length,0);assert.equal(next.run!.finished,true);assert.equal(next.run!.since,null);assert.deepEqual(next.run!.delivered,s.run!.delivered);assert.equal(next.run!.aboard.length,0);validateFlight(next);
 let writes=0;updateFlightHistory(next,s.run!,{length:0,clear(){},key:()=>null,removeItem(){},getItem:()=>null,setItem:()=>{writes++;}});assert.equal(writes,0);
});
test('reject unknown/duplicate/non-held boxes and prevent discharged contracts silently reactivating',()=>{
 const s=fixture(true),id=heldCargo(s)[0]!.boxId;
 for(const ids of [[],['missing'],[id,id]])assert.throws(()=>confirmHeldDischarge(s,ids));
 const next=confirmHeldDischarge(s,[id],5000),changed=observeReceipts(next,[{...s.draft.jobs[0]!,state:'ready',signature:'reactivated'}]);assert.equal(pendingReceiptChanges(changed)[0]!.canApply,false);
 assert.throws(()=>replanReceiptUpdate(changed,{'accepted-0':'apply'},receiptChangeToken(pendingReceiptChanges(changed))));
});
test('backup rejects duplicated discharge evidence and an already discharged box reappearing aboard',()=>{
 const s=fixture(true),id=heldCargo(s)[0]!.boxId,next=confirmHeldDischarge(s,[id],5000);
 assert.throws(()=>validateFlight({...next,heldDischarges:[...next.heldDischarges!,next.heldDischarges![0]!]}));
 assert.throws(()=>validateFlight({...next,run:{...next.run!,aboard:s.run!.aboard}}));
});
