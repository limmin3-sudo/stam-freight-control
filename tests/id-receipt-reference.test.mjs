import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../data/log-mission-index.json' with {type:'json'};
import locations from '../data/log-location-index.json' with {type:'json'};
import {definitionDraft} from '../mission-catalog.mjs';
import {inboxCards} from '../integration/inbox-core.mjs';
import {LogEvidence} from '../integration/log/state.mjs';
import {createWikiLookup,lookupKey} from '../wiki-receipt-lookup.mjs';
import {referenceStops} from '../receipt-reference.mjs';

const places=locations.locations.filter(p=>p.id).map(p=>({...p,uuid:p.id,id:p.system+':'+p.id}));
const point=name=>places.find(p=>p.name===name).id;
const redWind='6528ac09-f0b3-4f83-a198-72f098754d95';
const missionId='10000000-1234-1234-1234-123456789abc';
const unknown='20000000-1234-1234-1234-123456789abc';
const stamp='<2026-11-22T12:00:00.000Z> ';
function snapshot(definitionId,build){
 const log=new LogEvidence();
 log.ingest(stamp+'[CIG] build_version['+build+']');
 log.ingest(stamp+'[Notice] <SHUDEvent_OnNotification> Added notification "계약 수락: 운송 계약" [42] to queue. missionId: ['+missionId+'], ObjectiveId: []');
 log.ingest(stamp+'[Notice] <CLocalMissionPhaseMarker::CreateMarker> missionId ['+missionId+'], contract [Unknown_Template], contractDefinitionId['+definitionId+'], objectiveId [pickup_test_0]');
 return log.snapshot();
}
test('ID-only Red Wind receipts recover all five exact loads and terminals across four released builds',()=>{
 for(const build of ['12881860','12913470','13165946','13220821']){
  const [card]=inboxCards(snapshot(redWind,build),places,null,catalog).cards;
  assert.equal(card.observedDefinitionId,redWind);
  assert.equal(card.lookupMetadata.sources.scmdb.version.split('.').at(-1),build);
  assert.ok(card.lookupMetadata.sources.wiki.version);
  assert.deepEqual(card.rows.map(r=>[r.commodity,r.scu]),[['Ammonia',168],['Hydrogen Fuel',168],['Argon',48],['Pressurized Ice',48],['Construction Materials',20]]);
  assert.ok(card.rows.every(r=>r.pickupId===point('Ruin Station')&&r.dropoffId===point('Baijini Point')));
 }
});
test('actual pickup overrides a catalogue singleton and cannot add a second phantom visit',()=>{
 const draft=definitionDraft({definitionId:redWind,gameBuild:{status:'known',value:'13220821'}},places,catalog,null,{pickups:[point('Lorville')]});
 assert.ok(draft.rows.every(r=>r.pickupId===point('Lorville')));
 assert.ok(!draft.catalogStops.pickup.includes(point('Ruin Station')));
});
test('paired alternatives use the observed opposite terminal; broad or unrecognised names never collapse to one stop',()=>{
 const reference={pairs:[[['Ruin Station'],['Baijini Point']],[['Lorville'],['Orison']]]};
 assert.equal(referenceStops(reference,places).fixed.pickup,'');
 assert.equal(referenceStops(reference,places,{dropoffs:[point('Orison')]}).fixed.pickup,point('Lorville'));
 for(const name of ['Pyro System','unknown terminal','Pyro']){
  const {fixed}=referenceStops({pairs:[[['Ruin Station',name],['Orison']]]},places);
  assert.equal(fixed.pickup,'');assert.equal(fixed.dropoff,point('Orison'));
 }
});
const row={uuid:unknown,game_version:'4.10.3-LIVE.13220821',released:true,title:'Example',hauling_orders:[{kind:'Resource',name:'Hydrogen',min_scu:6,max_scu:0}],mission_tokens:{'Pickup|Address':['Ruin Station'],'DropOff|Address':['Baijini Point']}};
test('online misses fetch only the public definition UUID, share a request, and project verified Wiki-only freight',async()=>{
 const urls=[],wiki=createWikiLookup(async(url,options)=>{urls.push(url);assert.equal(options.credentials,'omit');return {ok:true,json:async()=>({data:row})};});
 const s=snapshot(unknown,'13220821'),c=[...s.contracts,...s.pendingContracts][0],key=lookupKey(c);
 await Promise.all([wiki.fill([key,key]),wiki.fill([key])]);await wiki.fill([key]);
 assert.equal(urls.length,1);assert.ok(urls[0].includes(unknown)&&!urls[0].includes(missionId));
 const [card]=inboxCards(s,places,null,catalog,null,c=>wiki.get(lookupKey(c))).cards;
 assert.equal(card.definition.source,'wiki');
 assert.deepEqual(card.rows.map(r=>[r.scu,r.pickupId,r.dropoffId]),[[6,point('Ruin Station'),point('Baijini Point')]]);
 assert.equal(lookupKey({missionId,gameBuild:c.gameBuild}),'');
});
test('Wiki mismatches, service failures and unreleased records leave local evidence intact',async()=>{
 for(const reply of [{...row,uuid:missionId},{...row,version:'',game_version:'4.10.3-LIVE.13165946'},{...row,not_for_release:true},null]){
  let requests=0;
  const wiki=createWikiLookup(async()=>{requests++;if(!reply)throw Error('offline');return {ok:true,json:async()=>({data:reply})};});
  const s=snapshot(unknown,'13220821'),project=()=>inboxCards(s,places,null,catalog,null,c=>wiki.get(lookupKey(c))).cards;
  const key='13220821:'+unknown,before=project();await wiki.fill([key]);await wiki.fill([key]);
  assert.equal(requests,1);assert.ok(!wiki.get(key));assert.deepEqual(project(),before);
 }
});
test('a real five-order contract with regional pickup choices keeps only the fixed spaceport',()=>{
 const [card]=inboxCards(snapshot('d646b062-5633-41e6-b0dc-c89b00ca7d42','13220821'),places,null,catalog).cards;
 assert.equal(card.rows.length,5);assert.ok(card.rows.every(r=>!r.pickupId&&r.dropoffId===point('Lorville')));
});
test('an observed destination outside the SCMDB region needs matching Wiki evidence to use its fixed pickup',()=>{
 const reference={pairs:[[['Stanton System'],['Levski']]],slots:{pickup:[['Orison']],dropoff:[['Orbituary','Patch City']]}};
 assert.equal(referenceStops(reference,places,{dropoffs:[point('Orbituary')]}).fixed.pickup,point('Orison'));
 assert.equal(referenceStops(reference,places,{dropoffs:[point('Ruin Station')]}).fixed.pickup,'');
});
