import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../data/log-mission-index.json' with {type:'json'};
import bindings from '../data/log-order-groups.json' with {type:'json'};
import {LogEvidence} from '../integration/log/state.mjs';
import {inboxCards} from '../integration/inbox-core.mjs';
import {definitionDraft} from '../mission-catalog.mjs';
import {objectivePlaceLookup} from '../objective-text.mjs';

const objective='aa000000-0000-4000-8000-000000000001';
const stamp='<2026-11-19T12:00:00.000Z> [Notice] ';
const notices=(e,id,goal,words)=>e.ingest(stamp+`<SHUDEvent_OnNotification> Added notification "${words}" [42] to queue. missionId: [${id}], ObjectiveId: [${goal}]`);
const places=['Port Alpha','Port Bravo','Port Charlie'].map((name,i)=>({id:String(i+1),name}));

test('all currently released definitions keep separate receipts and their freight orders even if a marker lacks coordinates',()=>{
 const evidence=new LogEvidence(),expected=new Map();
 for(const [i,d] of catalog.definitions.entries()){
  if(!d.released||d.notForRelease)continue;
  const id='aa000000-0000-4000-8000-'+String(i).padStart(12,'0');
  notices(evidence,id,'','계약 수락 ： 같은 제목');
  evidence.ingest(stamp+`<CLocalMissionPhaseMarker::CreateMarker> missionId [${id}], contract [New_Template], contractDefinitionId[${d.id}], objectiveId [pickup_test_0]`);
  expected.set(id,d);
 }
 const {cards}=inboxCards(evidence.snapshot(),[],null,catalog);
 assert.equal(cards.length,expected.size);
 for(const c of cards){
  const d=expected.get(c.id);
  assert.equal(c.observedDefinitionId,d.id);
  assert.deepEqual(c.rows.map(r=>r.commodity),d.rules.sourceConflict?[]:d.rules.orders.filter(o=>['Resource','Entity','MissionItem'].includes(o.kind)&&o.name).map(o=>o.name));
 }
});

test('every verified group binds the correct slots, including different groups of the same commodity',()=>{
 for(const [definitionId,p] of Object.entries(bindings.definitions)){
  for(const role of ['pickup','dropoff']){
   for(const group of new Set(p[role].filter(Boolean))){
    const slot=p[role].indexOf(group);
    const c={definitionId,gameBuild:{status:'known',value:bindings.build}};
    const d=definitionDraft(c,[],catalog,null,{markers:[{role,objectiveId:role+'_'+p.objective+'_'+slot,pointId:'observed'}]});
    for(const [i,g] of p[role].entries())if(g)assert.equal(d.rows[i][role+'Id'],g===group?'observed':'',definitionId+' '+role+' '+i);
   }
  }
 }
});

test('uncounted pickups and deliveries join by mission and order, independent of language, replay and arrival order',()=>{
 const e=new LogEvidence();
 const goal=(role,i)=>role+'_'+objective+'_'+i;
 for(const id of ['bb000000-0000-4000-8000-000000000001','cc000000-0000-4000-8000-000000000001']){
  notices(e,id,goal('dropoff',1),'목표 달성: Port Charlie에 물 전달:');
  notices(e,id,goal('pickup',1),'새로운 목표: Port Bravo에서 물 수령:');
  notices(e,id,goal('dropoff',0),'New Objective: Deliver Water to Port Bravo');
  notices(e,id,goal('pickup',0),'New Objective: Collect Water from Port Alpha');
  notices(e,id,goal('pickup',0),'New Objective: Collect Water from Port Alpha');
  notices(e,id,'','Contract Accepted: Support');
 }
 const {cards}=inboxCards(e.snapshot(),places);
 assert.equal(cards.length,2);
 for(const c of cards)assert.deepEqual(c.rows.map(r=>[r.pickupId,r.dropoffId,r.scu]).sort(),[['1','2',''],['2','3','']]);
});

test('different exact stations retain their own codes and conflicting names never choose a clinic',()=>{
 const lookup=objectivePlaceLookup([{name:'HUR-L3 Thundering Express Station',id:'station'},{name:'HUR-L3 Thundering Express Station Clinic',id:'clinic'}]);
 assert.equal(lookup('HUR-L3 썬더링 익스프레스 스테이션 [Thundering Express]'),'station');
 assert.equal(lookup('MIC-L3 썬더링 익스프레스 스테이션 [Thundering Express]'),'');
});

test('DataBank-only stops reach the same receipt as HUD acceptance without a cargo counter or a known template',()=>{
 const e=new LogEvidence(),id='bb000000-0000-4000-8000-000000000001';
 notices(e,id,'','Contract Accepted: Unknown freight contract');
 for(const [role,slot] of [['pickup',0],['pickup',1],['dropoff',2]]){
  const pos=slot+1;
  e.ingest(stamp+`<CObjectiveMarkerComponent::AddToPlayerDataBank> Marker[9] - Added to DataBank of Player: Pilot[123] - ZonePos: x: ${pos}, y: 1, z: 1, missionId[${id}], objectiveId[${role}_${objective}_${slot}]`);
 }
 const index={match:([pos])=>({status:'coordinate-match',candidates:[places[pos-1]]})};
 const [card]=inboxCards(e.snapshot(),places,index).cards;
 assert.deepEqual(card.observedStops,{pickup:['1','2'],dropoff:['3']});
 assert.deepEqual(card.rows,[]);
});

test('Lagrange frames resolve orbital stations by their measured three-dimensional offset',async()=>{
 const {locationIndex}=await import('../integration/log/locations.mjs');
 const {default:data}=await import('../data/log-location-index.json',{with:{type:'json'}});
 const index=locationIndex(data);
 for(const [station,frame] of [['Checkmate','PYR2 L4'],['Patch City','PYR3 L3'],['Gaslight','PYR5 L2'],['HUR-L3 Thundering Express Station','HUR L3']]){
  const p=data.locations.find(x=>x.name===station),f=data.locations.find(x=>x.name===frame);
  const pos=p.position.map((v,i)=>v-f.position[i]);
  const result=index.match(pos);assert.equal(result.status,'coordinate-match');
  assert.equal(result.candidates[0].id,p.id);
  assert.equal(index.match([pos[0]+3,...pos.slice(1)]).status,'unmatched');
 }
});

test('explicit direct acceptance itinerary works without markers, shipment rows or volume',()=>{
 const e=new LogEvidence(),id='bb000000-0000-4000-8000-000000000001';
 notices(e,id,'','Contract Accepted: Direct Cargo | Port Alpha > Port Charlie [50 Rep]');
 const [card]=inboxCards(e.snapshot(),places).cards;
 assert.deepEqual(card.observedStops,{pickup:['1'],dropoff:['3']});
 assert.equal(card.rows.length,0);
});

test('counted pickup text can provide the origin before a localised delivery counter arrives',()=>{
 const e=new LogEvidence(),id='bb000000-0000-4000-8000-000000000001';
 notices(e,id,'','Contract Accepted: Seasonal shipment');
 notices(e,id,'pickup_'+objective+'_0','New Objective: Collect 0/9 SCU of Hydrogen from Port Bravo');
 notices(e,id,'dropoff_'+objective+'_0','새로운 목표: Port Alpha에 수소 0/9 SCU 전달');
 const [card]=inboxCards(e.snapshot(),places).cards;
 assert.deepEqual(card.rows.map(r=>[r.pickupId,r.dropoffId,r.scu]),[['2','1',9]]);
});
