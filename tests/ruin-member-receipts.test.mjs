import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LogEvidence} from '../integration/log/state.mjs';
import {inboxCards} from '../integration/inbox-core.mjs';
const load=name=>JSON.parse(readFileSync(new URL('../data/'+name+'.json',import.meta.url)));
const catalog=load('log-mission-index'),places=load('log-location-index').locations.filter(p=>p.id).map(p=>({...p,uuid:p.id,id:p.system+':'+p.id}));
const place=name=>places.find(p=>p.name===name).id;
const objective='12345678-1234-4321-9876-123456789012';
const base={missionId:'aaaaaaaa-1234-4321-9876-123456789012',acceptanceObservations:[{actor:'self'}],gameBuild:{status:'known',value:'13165946'},title:'회원급 화물 운송'};
function card(definitionId,extra={}){
 return inboxCards({contracts:[{...base,definitionId,...extra}]},places,null,catalog).cards[0];
}
test('Red Wind outbound member contract retains waste and the fixed Ruin pickup, with independent delivery counters',()=>{
 const definition='3410c10e-be9f-4022-8dca-2a8665562239';
 const id=i=>'dropoff_'+objective+'_'+i;
 const rows=card(definition,{quantityObservations:[
  {objectiveId:id(2),at:'2026-11-22',total:24,notification:'새로운 목표: 납품: 0/24 SCU · 화물: 폐기물 · 목적지: 가스라이트'},
  {objectiveId:id(0),at:'2026-11-22',total:36,notification:'Deliver 0/36 SCU of Waste to Checkmate'},
 ]}).rows;
 assert.deepEqual(rows.map(r=>[r.commodity,r.pickupId]),Array(3).fill(['Waste',place('Ruin Station')]));
 assert.deepEqual(rows.map(r=>[r.dropoffId,r.scu]),[[place('Checkmate'),36],['',''],[place('Gaslight'),24]]);
});
test('Red Wind inbound member contract binds a named pickup only to its own objective',()=>{
 const rows=card('11a441b6-d839-4750-a53d-df3e17419308',{objectiveNotices:[{
  objectiveId:'pickup_'+objective+'_1',notification:'새로운 목표: 칼륨을 체크메이트에서 수집하십시오.'
 }]}).rows;
 assert.deepEqual(rows.map(r=>r.pickupId),['',place('Checkmate')]);
 assert(rows.every(r=>r.commodity==='Potassium'&&r.dropoffId===place('Ruin Station')&&!r.scu));
});
test('a region-specific published template can restore cargo when the observed UUID is unknown',()=>{
 const rows=card('ffffffff-1234-4321-9876-123456789012',{markerObservations:[{template:'RedWind_Pyro_SupplyGrade_Solar_HH_RuinToStation_Waste_CargoHauling_SingleToMulti3',role:'dropoff',objectiveId:'dropoff_'+objective+'_0'}]}).rows;
 assert.equal(rows.length,3);
 assert(rows.every(r=>r.commodity==='Waste'&&!r.pickupId&&!r.dropoffId&&!r.scu));
});
test('all twelve published Red Wind member variants retain only the fixed side of their route',()=>{
 const variants=catalog.definitions.filter(d=>d.rank===3&&d.wikiTemplateName?.startsWith('RedWind_Pyro_')&&d.wikiTemplateName.includes('Ruin'));
 assert.equal(variants.length,12);
 for(const d of variants){
  const outbound=d.wikiTemplateName.includes('RuinToStation');
  const expectedGood=outbound?'Waste':d.wikiTemplateName.includes('Potassium')?'Potassium':'Carbon';
  const rows=card(d.id).rows;
  assert.equal(rows.length,d.wikiTemplateName.includes('Multi3')?3:2,d.wikiTemplateName);
  for(const row of rows){
   assert.equal(row.commodity,expectedGood);
   assert.equal(row[outbound?'pickupId':'dropoffId'],place('Ruin Station'));
   assert.equal(row[outbound?'dropoffId':'pickupId'],'');
  }
 }
});
test('version mismatch cannot use supplemental fixed stop evidence',()=>{
 const rows=card('3410c10e-be9f-4022-8dca-2a8665562239',{gameBuild:{status:'known',value:'99999999'}}).rows;
 assert(rows.length===3&&rows.every(row=>!row.pickupId));
});
test('Korean Game.log evidence reaches the correct receipt row even with an unresolved marker position',()=>{
 const evidence=new LogEvidence();
 const stamp='<2026-11-22T08:00:00.000Z> [Notice] ',id=base.missionId;
 const note=(message,goal)=>stamp+`<SHUDEvent_OnNotification> Added notification "${message}" [1] to queue. MissionId: [${id}], ObjectiveId: [${goal}]`;
 evidence.ingest(note('계약 수락: 회원급 화물 운송','pickup_'+objective+'_0'));
 evidence.ingest(stamp+`<CLocalMissionPhaseMarker::CreateMarker> missionId [${id}], contract [RedWind_Pyro_SupplyGrade_Solar_HH_RuinToStation_Waste_CargoHauling_SingleToMulti3], contractDefinitionId[3410c10e-be9f-4022-8dca-2a8665562239], objectiveId [dropoff_${objective}_0], zoneHostId [42], position [x: 1, y: 2, z: 3]`);
 evidence.ingest(note('새로운 목표: 납품: 0/24 SCU · 화물: 폐기물 · 목적지: 가스라이트 (파이로 V의 L2 라그랑주 지점)','dropoff_'+objective+'_2'));
 const {rows}=inboxCards(evidence.snapshot(),places,null,catalog).cards[0];
 assert.deepEqual(rows.map(row=>[row.pickupId,row.dropoffId,row.scu]),[
  [place('Ruin Station'),'',''],[place('Ruin Station'),'',''],[place('Ruin Station'),place('Gaslight'),24],
 ]);
});
test('six cargo orders follow the two recorded bundle markers, preserving gaps on partial receipt',()=>{
 const definition='461d27cf-9431-4391-89e9-288b3a424385';
 const template='HaulCargo_SingleToMulti_Interstellar_Bulk_ShipAmm_Hydro_Med';
 const active=(i,stop)=>({role:'dropoff',template,objectiveId:'dropoff_'+objective+'_'+i,position:[stop,0,0]});
 const index={match:([n])=>({status:'coordinate-match',candidates:[places.find(p=>p.name===(n===1?'Checkmate':'Gaslight'))]})};
 const cards=markerObservations=>inboxCards({contracts:[{...base,definitionId:definition,markerObservations}]},places,index,catalog).cards[0].rows;
 assert.deepEqual(cards([active(0,1),active(3,2)]).map(r=>r.dropoffId),[
  ...Array(3).fill(place('Checkmate')),...Array(3).fill(place('Gaslight')),
 ]);
 assert.deepEqual(cards([active(0,1)]).map(r=>r.dropoffId),[place('Checkmate'),'','','','','']);
});
test('all twelve member routes can be calculated when their station markers arrive, even without SCU notices',async()=>{
 const {calculateFlight}=await import('../apps/control-room/src/flight-engine.mjs');
 const {emptyDraft}=await import('../apps/control-room/src/mission-trial.ts');
 const stations=['Checkmate','Gaslight','Orbituary'].map(name=>places.find(p=>p.name===name));
 assert(stations.every(Boolean));
 const index={match:([n])=>({status:'coordinate-match',candidates:[stations[n]]})};
 for(const d of catalog.definitions.filter(d=>d.rank===3&&d.wikiTemplateName?.startsWith('RedWind_Pyro_')&&d.wikiTemplateName.includes('Ruin'))){
  const role=d.wikiTemplateName.includes('RuinToStation')?'dropoff':'pickup';
  const markerObservations=d.rules.orders.map((o,i)=>({template:d.wikiTemplateName,role,objectiveId:role+'_'+objective+'_'+i,position:[i,0,0]}));
  const [c]=inboxCards({contracts:[{...base,definitionId:d.id,markerObservations}]},places,index,catalog).cards;
  const job={id:c.id,title:[c.title,c.title],pay:0,mission:{id:c.id,cargo:c.rows},shipments:c.rows.map((r,i)=>({
   id:c.id+'-'+i,from:r.pickupId,to:r.dropoffId,cargo:[r.commodity,r.commodity],scu:0,
  }))};
  const plan=calculateFlight({...emptyDraft(),start:place('Ruin Station'),partner:'operator',jobs:[job]});
  assert.equal(plan.visits.flatMap(v=>v.events).filter(e=>e.type==='delivery').length,d.rules.orders.length,d.wikiTemplateName);
 }
});
