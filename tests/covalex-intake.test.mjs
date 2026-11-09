import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {LogEvidence} from '../integration/log/state.mjs';import {locationIndex} from '../integration/log/locations.mjs';
import {inboxCards,InboxSelection,cardReady,cardDraft} from '../integration/inbox-core.mjs';
import {definitionDraft} from '../mission-catalog.mjs';import {applyContractInfo} from '../contract-info.mjs';
import {deliveryNotice,objectivePlaceLookup} from '../objective-text.mjs';
import {scmdbCatalog} from '../scripts/build-scmdb-missions.mjs';import {MISSION_LOCATION_ALIASES} from '../mission-location-aliases.mjs';
const load=n=>JSON.parse(fs.readFileSync(new URL('../data/'+n+'.json',import.meta.url))),catalog=load('log-mission-index'),details=load('mission-details'),places=load('locations').locations,index=locationIndex(load('log-location-index'));
const id=i=>'aaaaaaaa-aaaa-4aaa-8aaa-'+String(i).padStart(12,'0'),objective='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',stamp='<2026-11-01T10:00:00.000Z> [Notice] ';
const position=name=>{const p=index.get(places.find(p=>p.name===name).uuid),parent=index.get(p.parentId);return p.position.map((v,i)=>v-parent.position[i]);};
function accepted({n=1,resource='Aluminium',kind='RefinedOre',region=4,destinations=['Greycat Stanton IV Production Complex-A','Sakura Sun Goldenrod Workcenter'],quantities=[]}={}){
 const e=new LogEvidence(),mission=id(n),definition=id(100+n);
 e.ingest('<2026-11-01T09:59:00.000Z> [CIG] build_version[12913470]');
 e.ingest(stamp+`<SHUDEvent_OnNotification> Added notification "계약 수락: 신입급 - 극소량 화물 수송 [BP?]: " [1] to queue. MissionId: [${mission}], ObjectiveId: []`);
 const mark=(role,i,p)=>e.ingest(stamp+`<CLocalMissionPhaseMarker::CreateMarker> missionId [${mission}], contract [HaulCargo_SingleToMulti2_${kind}_${resource}_Stanton${region}_SmallGrade], contractDefinitionId[${definition}], objectiveId [${role}_${objective}_${i}], zoneHostId [42], position [x: ${p[0]}, y: ${p[1]}, z: ${p[2]}]`);
 mark('pickup',0,position('Port Tressler'));destinations.forEach((name,i)=>mark('dropoff',i,name==='NB INT.'?MISSION_LOCATION_ALIASES[0].position:position(name)));
 quantities.forEach((notification,i)=>e.ingest(stamp+`<SHUDEvent_OnNotification> Added notification "새로운 목표: ${notification}: " [${i+2}] to queue. MissionId: [${mission}], ObjectiveId: [dropoff_${objective}_${i}]`));
 return e.snapshot();
}
const project=s=>inboxCards(s,places,index,catalog).cards[0];
test('SCMDB exact regional template aliases recover five independent receipts and keep upper bounds separate from actual Korean counters',()=>{
 const fixtures=[{n:1,kind:'NonMetal',resource:'Carbon',destinations:['Sakura Sun Goldenrod Workcenter','NB INT.']},{n:2,resource:'Corundum',destinations:['NB INT.','Sakura Sun Goldenrod Workcenter']},{n:3,kind:'NonMetal',resource:'Silicon',destinations:['Sakura Sun Goldenrod Workcenter','Greycat Stanton IV Production Complex-A']},{n:4,resource:'Titanium'},{n:5,quantities:['그레이캣 스탠턴 IV 생산 단지-A에 알루미늄 0/5 SCU 전달','사쿠라 선 골든로드 워크센터에 알루미늄 0/4 SCU 전달']}];
 const cards=fixtures.map(f=>project(accepted(f))),selection=new InboxSelection(places,()=>[],()=>details);selection.sync(cards);
 assert.equal(new Set(cards.map(c=>c.id)).size,5);
 for(const [i,card] of cards.entries()){
  assert.equal(card.definition.basis,'exact-template-name');assert.equal(card.rows.length,2);assert.equal(card.observedDefinitionId,id(101+i));
  assert.ok(card.rows.every(r=>r.maxBoxSize===1&&r._maxBoxSource==='scmdb'&&r.pickupId===places.find(p=>p.name==='Port Tressler').id));
  assert.equal(selection.ready(selection.effective(card)),true);assert.equal(selection.effective(card).rewardReference,undefined,'regional aliases must not borrow another definition payout');
  if(i<4){assert.deepEqual(card.rows.map(r=>r.scu),['','']);assert.deepEqual(selection.draft(card).cargo.map(r=>r.scu),[6,6]);assert.ok(selection.draft(card).cargo.every(r=>r._scuEstimated));}
 }
 assert.deepEqual(cards[4].rows.map(r=>r.scu),[5,4]);assert.ok(cards[4].rows.every(r=>r.commodity==='Aluminum'));assert.equal(cardReady(cards[4],places),true);
 selection.useUpperBounds=false;assert.ok(cards.slice(0,4).every(c=>!selection.ready(selection.effective(c))));
 const manual=cardDraft(cards[0]);manual.cargo.forEach(r=>r.scu=5);selection.saveReviewed([manual]);
 assert.deepEqual(selection.draft(cards[0]).cargo.map(r=>r.scu),[5,5]);assert.deepEqual(selection.draft(cards[1],false).cargo.map(r=>r.scu),['','']);
});
test('NB terminal coordinates require the observed build and preserve the separate public city coordinates',()=>{
 const a=MISSION_LOCATION_ALIASES[0],city=index.get(a.targetId),before=structuredClone(city);
 assert.equal(index.match(a.position).status,'unmatched');assert.equal(index.match(a.position,{gameBuild:{status:'known',value:'other-build'}}).status,'unmatched');
 const match=index.match(a.position,{gameBuild:{status:'known',value:a.build}});assert.equal(match.status,'coordinate-match');assert.equal(match.candidates[0].name,'New Babbage');assert.equal(match.candidates[0].basis,'confirmed-mission-terminal');assert.deepEqual(index.get(a.targetId),before);
});
test('disagreeing named and coordinate destinations cannot silently select a receipt',()=>{
 const snapshot=accepted({quantities:['사쿠라 선 골든로드 워크센터에 알루미늄 0/5 SCU 전달']}),card=project(snapshot);
 assert.equal(card.conflict,true);assert.equal(cardReady(card,places),false);assert.throws(()=>cardDraft(card));
});
test('different Korean patches resolve official and earlier goods and complete place aliases, without guessing similar names',()=>{
 const lookup=objectivePlaceLookup(places),nb=places.find(p=>p.name==='New Babbage').id,sakura=places.find(p=>p.name==='Sakura Sun Goldenrod Workcenter').id;
 assert.equal(lookup('마이크로텍의 NB INT. 스페이스포트'),nb);assert.equal(lookup('마이크로텍의 사쿠라 선 골든로드 워크센터'),sakura);assert.equal(lookup('사쿠라 선 골든로드 작업장'),sakura);
 assert.equal(lookup('그레이캣 스탠턴 IV 생산 단지-Z'),'');
 for(const good of ['규소','실리콘'])assert.deepEqual(deliveryNotice(`${good}을(를) 0/3 SCU 마이크로텍의 NB INT. 스페이스포트에 배송하십시오.`),{commodity:'Silicon',scu:3,dropoffText:'마이크로텍의 NB INT. 스페이스포트'});
 for(const good of ['강옥','커런덤'])assert.equal(deliveryNotice(`새로운 목표: 사쿠라 선 골든로드 워크센터에 ${good} 0/4 SCU 전달:`).commodity,'Corundum');
 assert.equal(objectivePlaceLookup([{id:'a',name:'New Babbage'},{id:'b',name:'New Babbage'}])('NB INT. 스페이스포트'),'');
});
test('other regions and interplanetary stops use the same parser without copying microTech routes or contract quantities',()=>{
 const snapshot=accepted({region:1,quantities:[]}),contract=snapshot.contracts[0]||snapshot.pendingContracts[0];
 contract.markerObservations=[];const reference=definitionDraft(contract,places,catalog);assert.equal(reference,null,'an unknown UUID without exact template evidence must stay unknown');
 const p=objectivePlaceLookup(places);assert.equal(p('라이커 메모리얼 스페이스포트'),places.find(p=>p.name==='Area18').id);assert.equal(p('Everus Harbor'),places.find(p=>p.name==='Everus Harbor').id);
 const c={missionId:id(20),definitionId:id(120),acceptanceObservations:[{actor:'self'}],markerObservations:[{role:'pickup',objectiveId:'pickup_x_0',position:[0,0,0]}],quantityObservations:[{objectiveId:'dropoff_x_0',total:7,at:'2026-11-01T10:00:00.000Z',notification:'새로운 목표: 라이커 메모리얼 스페이스포트에 규소 0/7 SCU 전달'}]};
 const ix={match:()=>({status:'coordinate-match',candidates:[{...places.find(p=>p.name==='Everus Harbor'),id:places.find(p=>p.name==='Everus Harbor').uuid}]})};
 const card=inboxCards({contracts:[c]},places,ix,catalog).cards[0];assert.equal(cardReady(card,places),true);assert.equal(card.rows[0].scu,7);assert.equal(card.rows[0].commodity,'Silicon');assert.equal(card.rows[0].dropoffId,p('Riker Memorial Spaceport'));assert.equal(card.rows[0].pickupId,p('Everus Harbor'));
});
test('template aliases are exact, reject ambiguity, and cannot copy a regional candidate location or reward',()=>{
 const snapshot=accepted(),c=snapshot.contracts[0]||snapshot.pendingContracts[0],card=project(snapshot),d=catalog.definitions.find(d=>d.id===card.definition.id);
 assert.equal(definitionDraft({...c,markerObservations:c.markerObservations.map(m=>({...m,template:m.template+'Typo'}))},places,catalog),null);
 assert.equal(definitionDraft(c,places,{...catalog,definitions:[d,{...d,id:id(900)}]}),null);
 const noLocations=definitionDraft(c,places,catalog);assert.ok(noLocations.rows.every(r=>r.pickupId===''&&r.dropoffId===''));
 const money={sources:{scmdb:{}},definitions:{[d.id]:0},entries:[{values:{reward:{min:999,max:999}},provenance:{reward:['scmdb']}}]};assert.equal(applyContractInfo(cardDraft(card),money)._rewardReference,undefined);
});
test('SCMDB generation keeps published exact template names and expands a deduplicated resource rule per delivery',()=>{
 const c={id:id(500),title:'Regional haul',debugName:'HaulCargo_SingleToMulti2_Test_Stanton1',debugNames:['HaulCargo_SingleToMulti2_Test_Stanton1','HaulCargo_SingleToMulti2_Test_Stanton4'],haulingOrders:[{resource:'al',minSCU:3,maxSCU:6,maxContainerSize:1}],locations:[],destinations:[]};
 const result=scmdbCatalog({version:'4.10.2-live.12913470',contracts:[c],legacyContracts:[],resourcePools:{al:{name:'Aluminum'}},locationPools:{}}),d=result.catalog.definitions[0];
 assert.deepEqual(d.templateNames,c.debugNames);assert.deepEqual(d.rules.orders.map(o=>[o.orderIndex,o.dropoffPool,o.minScu,o.maxScu]),[[0,'dropoff0',3,6],[1,'dropoff1',3,6]]);assert.equal(d.rules.orderExpansion,'single-resource-per-destination');assert.equal(d.rules.objectiveOrderIndicesVerified,true);
});
