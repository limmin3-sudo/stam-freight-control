import test from 'node:test';
import assert from 'node:assert/strict';
import {activateLocations,locationDataFor,readPersonalLocations,canonicalLocationId} from '../src/personal-locations.mjs';
import {findPorts} from '../src/port-search.mjs';
import {emptyDraft,placeName,routeReady} from '../src/mission-trial.ts';
import {calculateFlight} from '../src/flight-engine.mjs';
import {blankRun,startRun,completeStep,contextOf} from '../src/flight-session.ts';
import {exportFlight,importFlight} from '../src/flight-backup.ts';
import {importSavedFlight} from '../src/saved-flight.mjs';
import {importContracts} from '../src/contract-backup.mjs';
import {textContracts} from '../src/contract-intake.mjs';
const base=locationDataFor(),harbor=base.locations.find(p=>p.name==='Everus Harbor')!;
const depot={id:'custom:qa-depot',name:'QA Freight Depot',system:'stanton',type:'Manmade',position:harbor.position.map((n,i)=>n+(i===0?100000:0)),aliases:['개인화물기지'],parentId:harbor.parentId,qt:true,updatedAt:'2026-11-13'};
const edits=[depot],job={id:'qa-private',title:['개인 운송','Private freight'] as [string,string],pay:1234,shipments:[{id:'qa-row',cargo:['광석','Ore'] as [string,string],from:'hurston',to:depot.id,scu:4}]};
const draft=()=>({...emptyDraft(),partner:'navigator' as const,partnerSelected:true,locationEdits:structuredClone(edits),jobs:[structuredClone(job)]});

test('existing personal storage is read unchanged, shared search accepts aliases and shows localized names',()=>{
 const raw=JSON.stringify({format:'sfc-locations-v1',locations:edits}),storage={getItem:()=>raw};
 const read=readPersonalLocations(storage);assert.equal(storage.getItem(),raw);activateLocations(read);
 assert.equal(findPorts('개인화물기지')[0]!.id,depot.id);assert.equal(findPorts('QA Freight Depot')[0]!.id,depot.id);
 assert.equal(placeName(depot.id,0),'개인화물기지');assert.equal(placeName(depot.id,1),depot.name);assert.equal(routeReady(job),true);
 const imported=importContracts(JSON.stringify([{id:'custom-contract',cargo:[{commodity:'Ore',scu:4,pickupId:canonicalLocationId('hurston'),dropoffId:depot.id}]}]),[]);
 assert.equal(imported.jobs[0]!.shipments[0]!.to,depot.id);
 const parsed=textContracts('Deliver 4 SCU of Ore from Lorville to QA Freight Depot');
 assert(parsed.some(j=>j.shipments.some(s=>s.to===depot.id)));
 activateLocations([]);
});

test('personal coordinates feed both partners, full-flight backups and legacy saved missions',()=>{
 for(const partner of ['navigator','operator'] as const){
  const d={...draft(),partner},plan=calculateFlight(d);assert(plan.visits.some(v=>v.locationId===depot.id));
  assert.deepEqual(plan.points.find(p=>p.id===depot.id)!.position,depot.position);
  const restored=importFlight(exportFlight({version:1,draft:d,plan,run:blankRun(plan)}));
  assert.deepEqual(restored.draft.locationEdits,edits);assert.deepEqual(calculateFlight(restored.draft).points.find(p=>p.id===depot.id)!.position,depot.position);
 }
 const legacy=importSavedFlight({missions:[{id:'old-private',cargo:[{commodity:'Ore',scu:4,pickupId:canonicalLocationId('hurston'),dropoffId:depot.id}]}],start:canonicalLocationId('hurston'),customShips:[],shipId:'drake-cutlass-black',voice:'standard',settings:{},locationEdits:edits});
 assert(legacy.plan.visits.some(v=>v.locationId===depot.id));
});

test('in-flight personal snapshot wins over later browser edits and preserves aboard layout on replan',()=>{
 const d=draft(),plan=calculateFlight(d);let run=startRun(blankRun(plan),1000);
 while(!run.aboard.length)run=completeStep(plan,run,2000);
 const before=structuredClone(run.aboard);activateLocations([{...depot,position:depot.position.map(n=>n+999999)}]);
 const resumed=calculateFlight(d,contextOf(run));assert.deepEqual(resumed.initialPacking.boxes.map(b=>[b.boxId,b.bin,b.cell,b.missionId]),before.map(b=>[b.boxId,b.bin,b.cell,b.missionId]));
 assert.deepEqual(resumed.points.find(p=>p.id===depot.id)!.position,depot.position);activateLocations([]);
});

test('coordinate-less drafts never inherit old coordinates; duplicate, malformed and invalid parent records fail closed',()=>{
 const unknown={...depot,position:null};activateLocations([unknown]);assert(!findPorts('개인화물기지').some(p=>p.id===depot.id));assert.equal(routeReady(job),false);
 assert.throws(()=>calculateFlight({...draft(),locationEdits:[unknown]}));
 for(const bad of [[depot,depot],[{...depot,position:[NaN,0,0]}],[{...depot,parentId:'missing'}],[{...depot,parentId:depot.id}],[{...depot,parentId:base.locations.find(p=>p.system==='pyro'&&p.type==='Planet')!.id}]])assert.throws(()=>locationDataFor(bad));
 assert.throws(()=>readPersonalLocations({getItem:()=>'{'}));activateLocations([]);
});

test('personal rename retains old city shortcut identity and ambiguous aliases require explicit selection',()=>{
 const city=base.locations.find(p=>p.id===canonicalLocationId('hurston'))!;
 const renamed={...city,name:'Personal Lorville',aliases:['내 로빌'],updatedAt:'2026-11-13'};
 activateLocations([renamed,depot,{...depot,id:'custom:qa-other',name:'Other Depot'}]);
 assert.equal(placeName('hurston',0),'내 로빌');assert.equal(canonicalLocationId('hurston'),city.id);
 assert.equal(findPorts('개인화물기지').filter(p=>p.id.startsWith('custom:qa-')).length,2);
 const plan=calculateFlight({...draft(),locationEdits:[renamed,depot]});assert.equal(plan.startId,city.id);activateLocations([]);
});

test('reference-only log place names stay readable; inconsistent personal coordinates in flight backups are rejected',async()=>{
 const {default:log}=await import('../../../data/log-location-index.json',{with:{type:'json'}});
 const {hasPlace}=await import('../src/mission-trial.ts');
 const reference=log.locations.find(p=>p.id&&!base.locations.some(b=>b.id===p.system+':'+p.id))!,id=reference.system+':'+reference.id;
 assert.equal(placeName(id,1),reference.name);assert.equal(hasPlace(id),true);
 assert.equal(routeReady({...job,shipments:job.shipments.map(s=>({...s,to:id}))}),false);
 const d=draft(),plan=calculateFlight(d),session={version:1 as const,draft:d,plan,run:blankRun(plan)};
 const backup=JSON.parse(exportFlight(session));backup.session.plan.points.find((p:{id:string})=>p.id===depot.id).position[0]+=1000;
 assert.throws(()=>importFlight(JSON.stringify(backup)));
});
