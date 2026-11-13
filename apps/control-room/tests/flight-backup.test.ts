import test from 'node:test';
import assert from 'node:assert/strict';
import {exportFlight,importFlight,persistRestoredFlight,previousFlightKey} from '../src/flight-backup.ts';
import {blankRun,startRun,completeStep,undoStep,contextOf,adoptReplan,sessionKey} from '../src/flight-session.ts';
import type {Session} from '../src/flight-session.ts';
import {emptyDraft,samples} from '../src/mission-trial.ts';
import {calculateFlight,canonicalPlace} from '../src/flight-engine.mjs';
import {importSavedFlight} from '../src/saved-flight.mjs';

function flight(partner:'operator'|'navigator'='navigator'):Session {
 const draft={...emptyDraft(),partner,jobs:[structuredClone(samples[0]!)]};const plan=calculateFlight(draft);
 const run=completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000);
 return {version:1,draft,plan,run};
}
test('whole-flight backup preserves exact cargo, contracts, route, undo and metadata while pausing the timer',()=>{
 const s=flight();s.draft.jobs[0]!.referenceInfo={values:{test:'evidence'},provenance:{test:['actual-log']},sources:{}};
 const before=structuredClone(s);const restored=importFlight(exportFlight(s,7000));
 assert.deepEqual(s,before);assert.deepEqual(restored.plan,JSON.parse(JSON.stringify(s.plan)));assert.deepEqual(restored.draft,s.draft);assert.deepEqual(restored.run!.aboard,s.run!.aboard);
 assert.equal(restored.run!.elapsed,6);assert.equal(restored.run!.since,null);
 assert.equal(undoStep(restored.run!,8000).since,null);assert.equal(undoStep(restored.run!,8000).index,1);
 const complete=completeStep(restored.plan!,restored.run!,9000);assert.equal(complete.finished,true);assert.equal(complete.aboard.length,0);
});
test('operator, completed flight, preparation, old raw JSON and replanned flights remain importable',()=>{
 const operator=flight('operator');assert.equal(importFlight(exportFlight(operator)).run!.aboard.length,0);
 const s=flight();assert.equal(importFlight(JSON.stringify(s)).run!.elapsed,2,'old running exports retain at least the last recorded action time');
 const finished={...s,run:completeStep(s.plan!,s.run!,9000)};assert.equal(importFlight(exportFlight(finished)).run!.finished,true);
 const plan=calculateFlight(s.draft,contextOf(s.run!));const replan={...s,plan,run:adoptReplan(s.run!)};
 assert.deepEqual(importFlight(exportFlight(replan)).run!.aboard,s.run!.aboard);
 assert.deepEqual(importFlight(exportFlight({version:1,draft:emptyDraft(),plan:null,run:null})).draft,emptyDraft());
});
test('custom ship from legacy import preserves independent contract ownership and grid coordinates',()=>{
 const customShip={id:'custom-test',name:'My ship',grids:[{id:'main',name:'Main',w:4,h:2,l:5,x:0,y:0,z:0,rotation:[0,0,0]}]};
 const missions=['A','B'].map(id=>({id,title:id,reward:100,cargo:[{commodity:'Ore',scu:4,pickupId:canonicalPlace('hurston'),dropoffId:canonicalPlace('arccorp'),boxes:[{size:4,count:1}]}]}));
 const s=importSavedFlight({missions,start:'hurston',shipId:customShip.id,customShips:[customShip],settings:{},voice:'navigator',run:null});
 s.run=completeStep(s.plan,completeStep(s.plan,startRun(s.run,1000),2000),3000);
 const restored=importFlight(exportFlight(s,4000));assert.deepEqual(restored.plan!.ship,s.plan.ship);assert.deepEqual(restored.run!.aboard,s.run.aboard);
});
test('reject invalid format, progress, geometry, ownership and inconsistent aboard state',()=>{
 const changes:Array<(s:Session)=>void>=[s=>{s.version=2 as 1;},s=>{s.run!.jump=99;},s=>{s.run!.index=-1;},s=>{s.run!.positionId='elsewhere';},s=>{s.run!.aboard[0]!.missionId='foreign';},s=>{s.run!.aboard[0]!.cell=[99,0,0];},s=>{s.run!.aboard[0]!.dims=[1,1,1];},s=>{s.run!.aboard[1]!.cell=s.run!.aboard[0]!.cell;},s=>{s.run!.aboard=[];},s=>{s.plan!.visits[1]!.packing.boxes[0]!.missionId='foreign';},s=>{s.run!.history[0]!.index=999;},s=>{s.draft.jobs[0]!.title=null as never;}];
 for(const change of changes){const s=structuredClone(flight());change(s);assert.throws(()=>importFlight(JSON.stringify(s)));}
 for(const text of ['{','[]','{"format":"other","version":1}','{"__proto__":{}}', ' '.repeat(20*1024*1024+1)])assert.throws(()=>importFlight(text));
});
test('failed storage writes never replace the current flight; successful restore preserves a recovery copy',()=>{
 const old=exportFlight(flight(),8000),next=importFlight(exportFlight(flight('operator'),8000));
 for(const failKey of [previousFlightKey,sessionKey]){
  const data=new Map([[sessionKey,old]]);const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{if(k===failKey)throw Error('QuotaExceededError');data.set(k,v);}};
  assert.throws(()=>persistRestoredFlight(storage,next,old));assert.equal(data.get(sessionKey),old);
 }
 const data=new Map([[sessionKey,old]]);persistRestoredFlight({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}},next,old);
 assert.deepEqual(JSON.parse(data.get(sessionKey)!),next);assert.equal(data.get(previousFlightKey),old);
});

test('cross-system jump progress and every subsequent stop survive backup round trips',()=>{
 const job=structuredClone(samples[0]!);job.shipments[0]!.to='pyro:beaadc7f-9f3c-4a2d-8dd6-f56d57de1c60';
 for(const partner of ['navigator','operator'] as const){
  const draft={...emptyDraft(),partner,jobs:[job]},plan=calculateFlight(draft);let run=startRun(blankRun(plan),1000);let steps=0;
  assert.ok(plan.visits.some(v=>v.jumps.length));
  while(!run.finished){const restored=importFlight(exportFlight({version:1,draft,plan,run},2000+steps*1000));assert.deepEqual(restored.run!.aboard,run.aboard);run=completeStep(plan,restored.run!,3000+steps*1000);assert.ok(++steps<30);}
  assert.equal(importFlight(exportFlight({version:1,draft,plan,run})).run!.finished,true);
 }
});
test('pooled unknown pickup shares keep reservations and evidence; unknown SCU operator also restores',async()=>{
 const {reviewReceipt}=await import('../src/contract-intake.mjs');
 const to=canonicalPlace('arccorp');const shipments=['hurston','microtech'].map((from,i)=>({id:'row'+i,from:canonicalPlace(from),to,cargo:['Ore','Ore'] as [string,string],scu:0}));
 const source={id:'receipt',state:'incomplete' as const,title:['Ore','Ore'] as [string,string],pay:0,signature:'evidence-1',shipments,
  mission:{cargo:shipments.map(row=>({commodity:'Ore',scu:null,pickupId:row.from,dropoffId:to,boxes:[],_cargoShape:'standard'}))}};
 const reviewed=reviewReceipt(source,{...source,reservations:{[to]:20}});
 for(const partner of ['navigator','operator'] as const){
  const draft={...emptyDraft(),partner,jobs:[partner==='navigator'?reviewed:source]},plan=calculateFlight(draft);let run=startRun(blankRun(plan),1000),count=0;
  while(!run.finished){const next=importFlight(exportFlight({version:1,draft,plan,run},2000));assert.deepEqual(next.draft.jobs,draft.jobs);run=completeStep(plan,next.run!,3000);assert.ok(++count<20);}
 }
});
