import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SHIP_REFERENCES,VEHICLE_INDEX_META} from '../data/log-vehicle-index.mjs';
import {vehicleReferences,refreshLogVehicles} from '../scripts/refresh-log-vehicles.mjs';
import {LogEvidence} from '../integration/log/state.mjs';
const ships=JSON.parse(await readFile(new URL('../data/ships.json',import.meta.url),'utf8'));
const performance=JSON.parse(await readFile(new URL('../data/ship-performance.json',import.meta.url),'utf8'));
test('public vehicle class index covers exact existing profile UUIDs without guessing unsupported variants',()=>{
 assert.equal(Object.keys(SHIP_REFERENCES).length,VEHICLE_INDEX_META.total);
 const mapped=Object.values(SHIP_REFERENCES).filter(r=>r.id);assert.equal(mapped.length,ships.length);assert.equal(new Set(mapped.map(r=>r.id)).size,ships.length);
 for(const ref of mapped){assert.equal(ref.source,performance.profiles[ref.id].sourceUrl);assert.equal(ref.name,ships.find(s=>s.id===ref.id).name);assert.equal(ref.version,performance.version);}
 assert.equal(SHIP_REFERENCES.RSI_Constellation_Mk5_Centaurus.id,null);
 const source={input:'live-log',generation:0,line:1};
 for(const [vehicleClass,ref] of Object.entries(SHIP_REFERENCES)){
  const state=new LogEvidence();state.add({type:'navigation-target',at:'2026-11-04T10:00:00.000Z',source,vehicleClass,entityId:'PRIVATE_ENTITY',destination:null});
  const snapshot=state.snapshot();assert.equal(snapshot.navigation.scopes[0].ship.id,ref.id);assert.equal(snapshot.navigation.scopes[0].ship.source,ref.source);assert.equal(snapshot.contracts.length,0);assert.equal(snapshot.navigation.currentPositionVerified,false);assert.ok(!JSON.stringify(snapshot).includes('PRIVATE_ENTITY'));
 }
});
test('index builder rejects duplicate IDs/classes, mixed versions and missing existing profiles',()=>{
 const uuid='00000000-0000-0000-0000-000000000001',version='test-build',source='https://api.star-citizen.wiki/api/vehicles/'+uuid;
 const p={version,profiles:{ship:{sourceUrl:source,version}}},s=[{id:'ship',name:'Profile name'}],item={uuid,version,name:'Public name',class_name:'TEST_Ship'};
 assert.equal(vehicleReferences([item],p,s).TEST_Ship.id,'ship');
 for(const items of [[],[item,item],[{...item,version:'other'}],[{...item,class_name:'bad class'}],[item,{...item,uuid:'00000000-0000-0000-0000-000000000002'}]])assert.throws(()=>vehicleReferences(items,p,s));
 assert.throws(()=>vehicleReferences([item],{...p,profiles:{ship:p.profiles.ship,duplicate:p.profiles.ship}},[...s,{id:'duplicate'}]));
});
test('public refresh rejects incomplete or redirected pagination before writing an index',async()=>{
 await assert.rejects(refreshLogVehicles({fetcher:async()=>({ok:true,json:async()=>({data:[],meta:{total:1},links:{next:null}})})}),/incomplete/);
 let calls=0;await assert.rejects(refreshLogVehicles({fetcher:async()=>{calls++;return {ok:true,json:async()=>({data:[],meta:{total:1},links:{next:'https://example.invalid/vehicles'}})};}}),/pagination/);assert.equal(calls,1);
});
