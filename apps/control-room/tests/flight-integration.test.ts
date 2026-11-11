import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDraft,samples} from '../src/mission-trial.ts';
import {blankRun,completeStep,contextOf,adoptReplan,startRun,undoStep,pauseRun} from '../src/flight-session.ts';
import {calculateFlight,canonicalPlace} from '../src/flight-engine.mjs';
import {importSavedFlight} from '../src/saved-flight.mjs';

test('new console keeps contract-owned boxes at their actual cells across pickup, replan, delivery and undo',()=>{
  const draft={...emptyDraft(),partner:'navigator' as const,jobs:[samples[0]!],reviewed:true};
  const plan=calculateFlight(draft);
  const departure=startRun(blankRun(plan),1000);
  const pickup=completeStep(plan,completeStep(plan,departure,2000),3000);
  assert.equal(pickup.aboard.reduce((n,b)=>n+b.size,0),16);
  assert.ok(pickup.aboard.every(b=>b.missionId===draft.jobs[0]!.id));
  const replanned=calculateFlight(draft,contextOf(pickup));
  assert.deepEqual(replanned.initialPacking.boxes.map(b=>[b.boxId,b.cell]),pickup.aboard.map(b=>[b.boxId,b.cell]));
  const paused=pauseRun(pickup,4000);
  assert.equal(undoStep(paused,4500).since,null);
  const delivered=completeStep(plan,paused,5000);
  assert.equal(delivered.finished,true);
  assert.equal(delivered.aboard.length,0);
  assert.deepEqual(undoStep(delivered,6000).aboard,paused.aboard);
  assert.equal(undoStep(delivered,6000).since,null);
});

test('previous control mode save imports its timer, current stop, independent contracts and exact box placement',()=>{
  const from=canonicalPlace('hurston'),to=canonicalPlace('arccorp');
  const missions=['A','B'].map(id=>({id,title:id,reward:100,cargo:[{commodity:'Ore',scu:4,pickupId:from,dropoffId:to,boxes:[{size:4,count:1}]}]}));
  const snapshot={missions,start:from,shipId:'drake-cutlass-black',customShips:[],settings:{},voice:'navigator',run:null};
  const first=importSavedFlight(snapshot);
  const pickup=completeStep(first.plan,completeStep(first.plan,startRun(first.run,1000),2000),3000);
  const old={...pickup,planKey:JSON.stringify(first.plan.visits.map(v=>[v.locationId,v.events.map(e=>[e.shipmentId,e.type])]))};
  const copy=structuredClone(old);
  const restored=importSavedFlight({...snapshot,run:old});
  assert.deepEqual(old,copy);
  assert.equal(restored.run.index,2);
  assert.equal(restored.run.since,pickup.since);
  assert.deepEqual(restored.run.aboard,pickup.aboard);
  assert.deepEqual(restored.run.aboard.map(b=>b.missionId).sort(),['A','B']);
});

test('partner selects the original route-only or cargo planner and preserves independent progress',()=>{
  const draft={...emptyDraft(),jobs:[samples[3]!]};
  const simple=calculateFlight(draft);
  const detailed=calculateFlight({...draft,partner:'navigator'});
  assert.equal(simple.mode,'simple');
  assert.equal(simple.capacity,null);
  assert.notDeepEqual(simple.visits.map(v=>v.locationId),detailed.visits.map(v=>v.locationId));
  const picked=completeStep(simple,completeStep(simple,startRun(blankRun(simple))));
  assert.equal(picked.loadScu,12);
  assert.equal(picked.aboard.length,0);
  assert.ok(detailed.visits.some(v=>v.packing.boxes.length));
  const remaining=calculateFlight(draft,contextOf(picked));
  assert.ok(remaining.visits.flatMap(v=>v.events).every(e=>e.type!=='pickup'||!picked.picked.includes(e.shipmentId)));
});

test('same-destination receipt total preserves unknown pickup shares and rejects stale evidence',async()=>{
  const {reviewReceipt}=await import('../src/contract-intake.mjs');
  const from=canonicalPlace('hurston'),to=canonicalPlace('arccorp');
  const shipments=['hurston','microtech'].map((from,i)=>({id:'row'+i,from,to,cargo:['Ore','Ore'] as [string,string],scu:0}));
  const source={id:'receipt',state:'incomplete' as const,title:['Ore','Ore'] as [string,string],pay:0,signature:'first',shipments,
    mission:{cargo:shipments.map(()=>({commodity:'Ore',scu:null,pickupId:from,dropoffId:to,boxes:[],_cargoShape:'standard'}))}};
  const edited={...source,reservations:{[to]:20}};
  const corrected=reviewReceipt(source,edited);
  assert.equal(corrected.state,'ready');
  assert.equal(corrected.reservations?.[to],20);
  assert.deepEqual(corrected.shipments.map(r=>r.scu),[0,0]);
  assert.throws(()=>reviewReceipt({...source,signature:'second'},edited));
  const plan=calculateFlight({...emptyDraft(),jobs:[corrected],partner:'navigator'});
  assert.equal(plan.peak,20);
});

test('contract backups accept the original mission array and skip duplicates without changing existing contracts',async()=>{
  const {exportContracts,importContracts}=await import('../src/contract-backup.mjs');
  const json=exportContracts([samples[0]!,samples[3]!]);
  const restored=importContracts(json,[samples[0]!]);
  assert.equal(restored.skipped,1);
  assert.equal(restored.jobs[0]?.shipments.length,3);
  const roundtrip=JSON.parse(exportContracts(restored.jobs));
  assert.deepEqual(roundtrip[0],JSON.parse(json)[1]);
  assert.throws(()=>importContracts('[{"id":"broken","cargo":[null]}]',[]));
});

test('step timings exclude pauses, survive replanning and undo only the reverted step',()=>{
  const plan=calculateFlight({...emptyDraft(),jobs:[samples[0]!]});
  const departure=completeStep(plan,startRun(blankRun(plan),1000),6000);
  const paused=pauseRun(departure,9000);
  const resumed=pauseRun(paused,30000);
  const pickup=completeStep(plan,resumed,32000);
  assert.deepEqual(pickup.log?.map(row=>row.seconds),[5,5]);
  const updated=calculateFlight({...emptyDraft(),jobs:[samples[0]!]},contextOf(pickup));
  const current=adoptReplan(pickup);
  const delivered=completeStep(updated,current,36000);
  assert.deepEqual(delivered.log?.map(row=>row.seconds),[5,5,4]);
  assert.deepEqual(undoStep(delivered,40000).log,pickup.log);
});


test('editing a ready receipt replaces only the affected packing group in the planner and backup',async()=>{
  const {reviewReceipt}=await import('../src/receipt-edit.mjs');
  const {importContracts,exportContracts}=await import('../src/contract-backup.mjs');
  const from=canonicalPlace('hurston'),to=canonicalPlace('arccorp'),other=canonicalPlace('microtech');
  const group=(dropoffId:string)=>({pickupId:from,dropoffId,boxes:[{size:8,count:1}]});
  const cargo=(dropoffId:string)=>({commodity:'Ore',scu:8,pickupId:from,dropoffId,boxes:[],maxBoxSize:8});
  const first={...importContracts(JSON.stringify([{id:'logged',company:'Linehaul',cargo:[cargo(to),cargo(other)],destinationBoxes:[group(to),group(other)]}]),[]).jobs[0]!,signature:'original'};
  const form=structuredClone(first);
  form.shipments[0]!.scu=12; form.shipments[0]!.boxes=[{size:4,count:3}];
  const revised=reviewReceipt(first,form);
  const [stored]=JSON.parse(exportContracts([revised]));
  assert.equal(stored.company,'Linehaul');
  assert.deepEqual(stored.destinationBoxes,[group(other)]);
  assert.equal(stored.cargo[0].scu,12);
  assert.deepEqual(stored.cargo[0].boxes,[{size:4,count:3}]);
  assert.equal(first.shipments[0]!.scu,8);
  const plan=calculateFlight({...emptyDraft(),partner:'navigator',jobs:[revised]});
  assert.ok(plan.visits.some(v=>v.events.some(e=>e.scu===12)));
  assert.throws(()=>reviewReceipt({...first,state:'ended'},form));
  form.shipments[0]!.boxes=[{size:8,count:2}];
  assert.throws(()=>reviewReceipt(first,form),/상자 합계/);
});

test('pre-departure edits to shared delivery containers keep pickup shares unknown',async()=>{
  const {reviewReceipt}=await import('../src/receipt-edit.mjs');
  const {importContracts}=await import('../src/contract-backup.mjs');
  const to=canonicalPlace('arccorp');
  const cargo=['hurston','microtech'].map(from=>({commodity:'Ore',scu:null,pickupId:canonicalPlace(from),dropoffId:to,boxes:[]}));
  const job=importContracts(JSON.stringify([{id:'shared',cargo,_deliveryTotals:[{dropoffId:to,scu:16}]}]),[]).jobs[0]!;
  const revised=reviewReceipt(job,{...job,reservations:{[to]:20}},false,{[to]:[{size:4,count:5}]});
  assert.deepEqual(revised.shipments.map(r=>r.scu),[0,0]);
  assert.equal(revised.reservations?.[to],20);
  const {exportContracts}=await import('../src/contract-backup.mjs');
  assert.deepEqual(JSON.parse(exportContracts([revised]))[0].destinationBoxes,[{pickupId:null,dropoffId:to,origin:'manual',boxes:[{size:4,count:5}]}]);
  const plan=calculateFlight({...emptyDraft(),partner:'navigator',jobs:[revised]});
  assert.equal(plan.peak,20);
  let run=startRun(blankRun(plan),1000);
  for(let i=0;i<plan.visits.length && !run.aboard.length;i++)run=completeStep(plan,run,2000+i);
  assert.deepEqual(run.aboard.map(b=>b.size),[4,4,4,4,4]);
});
