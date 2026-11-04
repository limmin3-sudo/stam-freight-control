import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,data,index,stops} from './helpers/log-preview.mjs';
import {definitionIndex} from '../integration/log/catalog.mjs';
import {manualContract,receptionChanges} from '../integration/log/manual-adapter.mjs';
import {planRoute} from '../route-departure.mjs';
import {DEFAULT_SHIP} from '../ships.mjs';
import {enrichMission} from '../mission-match.mjs';
const mapData=JSON.parse(await readFile(new URL('../data/locations.json',import.meta.url)));
const catalog=definitionIndex(JSON.parse(await readFile(new URL('../data/log-mission-index.json',import.meta.url))));
test('log import produces the same original route and 28-box loading as manual large contract input',()=>{
 const {contract}=fixture(),before=structuredClone(contract),r=manualContract(contract,catalog,index,mapData);
 const manual={id:contract.missionId,title:contract.title,company:'',reward:0,cargo:stops.slice(1).flatMap(d=>[
  {commodity:'Ship Ammunition',scu:32,pickupId:'stanton:'+stops[0].id,dropoffId:'pyro:'+d.id,boxes:[{size:16,count:2}]},
  {commodity:'Hydrogen',scu:32,pickupId:'stanton:'+stops[0].id,dropoffId:'pyro:'+d.id,boxes:[{size:16,count:2}]},
  {commodity:'Medical Supplies',scu:20,pickupId:'stanton:'+stops[0].id,dropoffId:'pyro:'+d.id,boxes:[{size:2,count:10}]}
 ])};
 assert.equal(r.state,'ready');assert.deepEqual(r.mission.cargo,manual.cargo);assert.deepEqual(contract,before);
 const options={ship:DEFAULT_SHIP,routePolicy:'navigator'};
 const a=planRoute(mapData,[r.mission],'stanton:'+stops[0].id,options),b=planRoute(mapData,[manual],'stanton:'+stops[0].id,options);
 assert.deepEqual(a.visits,b.visits);assert.deepEqual(a.shipments,b.shipments);
 assert.equal(a.shipments.reduce((n,s)=>n+s.boxes.length,0),28);
 assert.deepEqual(enrichMission(r.mission,{missions:[{id:'wrong-match'}]}),r.mission);
});
test('repeated snapshots preserve manual edits and same-type runtime IDs stay distinct',()=>{
 const a=fixture(),b=fixture('22222222-2222-4222-8222-222222222222');const snap={contracts:[a.contract,b.contract]};
 const imported=receptionChanges(snap,[],catalog,index,{mapData});assert.equal(imported.add.length,2);
 const edited={...imported.add[0],title:'Captain edit'};
 const again=receptionChanges(snap,[edited],catalog,index,{mapData});assert.equal(again.add.length,1);assert.equal(again.add[0].id,b.contract.missionId);
 assert.equal(edited.title,'Captain edit');assert.equal(receptionChanges(snap,imported.add,catalog,index,{mapData}).add.length,0);
 assert.equal(receptionChanges(snap,[],catalog,index,{mapData,active:true}).add.length,0);
 assert.equal(receptionChanges(snap,[],catalog,index,{mapData,deferred:new Set(snap.contracts.map(c=>c.missionId))}).add.length,0);
});
test('ended/shared-only/conflicting/mixed-player evidence never enters the automatic plan',()=>{
 for(const patch of [{status:'end-observed'},{status:'acceptance-unconfirmed'},{conflicts:['definition-conflict']},{participation:{state:'left-observed'}}]){
  const c={...fixture().contract,...patch};assert.equal(receptionChanges({contracts:[c]},[],catalog,index,{mapData}).add.length,0);
 }
 const c=fixture().contract;assert.equal(receptionChanges({identity:{mixedPlayers:true},contracts:[c]},[],catalog,index,{mapData}).add.length,0);
});
test('unknown build or missing markers cannot become a fabricated complete cargo manifest',()=>{
 const c=fixture().contract;c.gameBuild.value='99999999';
 assert.notEqual(manualContract(c,catalog,index,mapData).state,'ready');
 const d=fixture().contract;d.markerObservations=[];assert.notEqual(manualContract(d,catalog,index,mapData).state,'ready');
 const json=JSON.stringify(manualContract(fixture().contract,catalog,index,mapData).mission);
 assert.ok(!json.includes('acceptanceObservations'));assert.ok(!json.includes('synthetic'));assert.ok(!json.includes('source'));
});
test('location bridge requires exact system + UUID; names and duplicate IDs cannot fill missing map entries',()=>{
 const c=fixture().contract,missing=structuredClone(mapData);missing.locations=missing.locations.filter(l=>l.id!=='stanton:'+stops[0].id);
 missing.locations.push({id:'custom:same-name',uuid:stops[0].id,system:'pyro',name:stops[0].name});
 assert.equal(manualContract(c,catalog,index,missing).state,'pending');
 const ambiguous=structuredClone(mapData);ambiguous.locations.push(ambiguous.locations.find(l=>l.id==='stanton:'+stops[0].id));
 assert.equal(manualContract(c,catalog,index,ambiguous).state,'pending');
});
