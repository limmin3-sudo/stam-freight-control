import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolvePerformance,driveChoices,checkedDrive,createPerformanceStore,PERFORMANCE_KEY} from '../performance-core.mjs';
import {calculatePreview} from '../integration/log/preview-packing.mjs';
import {DEFAULT_SHIP} from '../ships.mjs';
import {definitionIndex} from '../integration/log/catalog.mjs';
import {data,fixture} from './helpers/log-preview.mjs';
import {mediumFixture} from './helpers/log-reservations.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../data/'+name+'.json',import.meta.url)));
const profiles=read('ship-performance'),catalog=read('quantum-drives'),missions=definitionIndex(read('log-mission-index'));
const crossfield=catalog.drives.find(d=>d.name==='Crossfield'),atlas=catalog.drives.find(d=>d.name==='Atlas');
test('public drive catalog retains non-A grades, complete performance and slot compatibility',()=>{
 assert.equal(catalog.version,profiles.version);assert.equal(catalog.drives.length,catalog.total);assert.ok(catalog.total>=57);assert.equal(new Set(catalog.drives.map(d=>d.id)).size,catalog.total);
 for(const d of catalog.drives){checkedDrive(d);assert.equal(d.version,catalog.version);assert.match(d.sourceUrl,/^https:\/\/api.star-citizen.wiki\/api\/items\//);}
 assert.deepEqual(new Set(catalog.drives.map(d=>d.grade)),new Set(['A','B','C','D']));
 const choices=driveChoices(profiles,catalog,DEFAULT_SHIP);assert.equal(choices.length,20);assert.ok(choices.every(d=>d.size===2));
 assert.equal(resolvePerformance(profiles,catalog,DEFAULT_SHIP).drive.name,'Hemera');
 assert.equal(resolvePerformance(profiles,catalog,DEFAULT_SHIP,{driveMode:'factory'}).drive.name,'SparkFire');
 assert.equal(resolvePerformance(profiles,catalog,DEFAULT_SHIP,{driveMode:'catalog',driveId:crossfield.id}).drive.name,'Crossfield');
 const custom={id:'my-grid',performanceId:DEFAULT_SHIP.id};assert.equal(resolvePerformance(profiles,catalog,custom,{driveMode:'catalog',driveId:crossfield.id}).drive.size,2);
 assert.throws(()=>resolvePerformance(profiles,catalog,DEFAULT_SHIP,{driveMode:'catalog',driveId:atlas.id}),/슬롯/);
 assert.throws(()=>resolvePerformance(profiles,{...catalog,version:'old'},DEFAULT_SHIP,{driveMode:'catalog',driveId:crossfield.id}),/슬롯/);
 assert.equal(driveChoices(profiles,catalog,{id:'unknown'}).length,0);
});
test('custom velocity is bounded and does not mutate public source values',()=>{
 const before=JSON.stringify(profiles);const p=resolvePerformance(profiles,catalog,DEFAULT_SHIP,{driveMode:'custom',quantumSpeed:250000,scm:200});
 assert.equal(p.drive,null);assert.equal(p.approachSpeed,130);assert.equal(p.quantumSpeed,250000);assert.equal(JSON.stringify(profiles),before);
 for(const override of [{driveMode:'fake'},{quantumSpeed:0},{maxSpeed:-1},{approachSpeed:Infinity},{driveMode:'custom',quantumSpeed:null}])assert.throws(()=>resolvePerformance(profiles,catalog,DEFAULT_SHIP,override));
});
test('drive choice changes full and reserved route time without changing cargo ownership or quota',()=>{
 for(const contract of [fixture().contract,mediumFixture()])for(const partner of ['navigator','operator']){
  const base={contracts:[contract],catalogData:[...missions],locationData:data,ship:DEFAULT_SHIP,startId:data.locations.find(l=>l.name==='New Babbage').id,partner};
  const factory=calculatePreview({...base,performance:resolvePerformance(profiles,catalog,DEFAULT_SHIP,{driveMode:'factory'})});
  const selected=calculatePreview({...base,performance:resolvePerformance(profiles,catalog,DEFAULT_SHIP,{driveMode:'catalog',driveId:crossfield.id})});
  assert.notEqual(factory.route.seconds,selected.route.seconds);assert.equal(factory.totalScu,selected.totalScu);assert.equal(factory.boxCount,selected.boxCount);
  assert.deepEqual(new Set(factory.packing.boxes.map(b=>b.missionId)),new Set(selected.packing.boxes.map(b=>b.missionId)));
  assert.equal(selected.route.settings.performance.drive.name,'Crossfield');
 }
});
test('existing per-ship settings preserve unrelated profiles and failed writes/account changes',()=>{
 const values=new Map([[PERFORMANCE_KEY,JSON.stringify({'other-ship':{driveMode:'custom',quantumSpeed:230000}})]]);let fail=false;
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>{if(fail)throw Error();values.set(k,v);}};
 const store=createPerformanceStore(storage);store.save(DEFAULT_SHIP,{driveMode:'catalog',driveId:crossfield.id});
 assert.equal(createPerformanceStore(storage).get(DEFAULT_SHIP).driveId,crossfield.id);assert.equal(JSON.parse(values.get(PERFORMANCE_KEY))['other-ship'].quantumSpeed,230000);
 const before=values.get(PERFORMANCE_KEY);fail=true;assert.throws(()=>store.save(DEFAULT_SHIP,null),/저장/);assert.equal(values.get(PERFORMANCE_KEY),before);
 fail=false;values.set('vh-account-meta',JSON.stringify({uid:'different'}));assert.throws(()=>store.get(DEFAULT_SHIP),/계정/);assert.throws(()=>store.save(DEFAULT_SHIP,null),/계정/);
 values.set(PERFORMANCE_KEY,'broken');assert.throws(()=>createPerformanceStore(storage).get(DEFAULT_SHIP),/읽지/);
});
