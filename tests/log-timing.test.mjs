import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {timingSettings,createTimingStore,routeTimeSummary} from '../integration/log/timing.mjs';
import {DEFAULTS} from '../engine.mjs';
import {calculatePreview} from '../integration/log/preview-packing.mjs';
import {definitionIndex} from '../integration/log/catalog.mjs';import {DEFAULT_SHIP} from '../ships.mjs';
import {data,fixture} from './helpers/log-preview.mjs';import {mediumFixture} from './helpers/log-reservations.mjs';
const catalog=definitionIndex(JSON.parse(readFileSync(new URL('../data/log-mission-index.json',import.meta.url))));
const plan=(contract,timing)=>calculatePreview({contracts:[contract],catalogData:[...catalog],locationData:data,ship:DEFAULT_SHIP,startId:data.locations.find(p=>p.name==='New Babbage').id,timing});
test('timing input allows zero approach assumptions, rejects invalid numbers and never copies operational options',()=>{
 for(const [key,value] of Object.entries(timingSettings()))if(key in DEFAULTS)assert.equal(value,DEFAULTS[key]);
 const t=timingSettings({dockMinutes:0,surfaceMinutes:0,spaceDistanceKm:0,includeReturn:true,ship:'fake',performance:{drive:'fake'}});
 assert.equal(t.dockMinutes,0);assert.equal(t.surfaceMinutes,0);assert.equal(t.secondsPerBox,25);assert.equal(t.ship,undefined);assert.equal(t.includeReturn,undefined);assert.equal(t.performance,undefined);
 for(const bad of [{jumpMinutes:0},{dockMinutes:-1},{secondsPerBox:0},{surfaceDistanceKm:Infinity},{detourFactor:.5},{spool:'30'},null])assert.throws(()=>timingSettings(bad));
});
test('timing saves preserve grids and unrelated settings, storage errors and owner changes do not overwrite',()=>{
 const m=new Map([['vh-settings',JSON.stringify({disabledGrids:{'misc-hull-b':['L1']},unknownBox:8,dockMinutes:4})]]);let fail=false;
 const storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>{if(fail)throw Error();m.set(k,v);}},store=createTimingStore(storage);
 assert.equal(store.get().dockMinutes,4);store.save({secondsPerBox:60});assert.equal(createTimingStore(storage).get().secondsPerBox,60);
 const saved=JSON.parse(m.get('vh-settings'));assert.deepEqual(saved.disabledGrids,{'misc-hull-b':['L1']});assert.equal(saved.unknownBox,8);
 store.save(null);assert.equal(store.get().dockMinutes,3);assert.deepEqual(JSON.parse(m.get('vh-settings')).disabledGrids,saved.disabledGrids);
 const before=m.get('vh-settings');fail=true;assert.throws(()=>store.save({dockMinutes:10}),/저장/);assert.equal(m.get('vh-settings'),before);
 m.set('vh-account-meta',JSON.stringify({uid:'other'}));assert.throws(()=>store.get(),/계정/);assert.throws(()=>store.save(null),/계정/);
});
test('box work changes full manifest timing while preserving travel, ownership and packing',()=>{
 const contract=fixture().contract,a=plan(contract,{secondsPerBox:25}),b=plan(contract,{secondsPerBox:55});
 const x=routeTimeSummary(a.route),y=routeTimeSummary(b.route);assert.equal(x.transit,y.transit);assert.ok(y.handling>x.handling);
 assert.equal(x.total,x.transit+x.handling);assert.equal(y.total,y.transit+y.handling);assert.ok(x.handling>=a.boxCount*2*25);
 assert.deepEqual(a.packing.boxes,b.packing.boxes);assert.equal(a.totalScu,b.totalScu);
});
test('reserved routes use travel settings but never count unknown boxes as handling work',()=>{
 const contract=mediumFixture(),a=plan(contract,{dockMinutes:0,secondsPerBox:25}),b=plan(contract,{dockMinutes:10,secondsPerBox:600}),c=plan(contract,{dockMinutes:0,secondsPerBox:600});
 const x=routeTimeSummary(a.route),y=routeTimeSummary(b.route);assert.equal(x.handling,null);assert.equal(y.handlingIncluded,false);assert.equal(x.total,x.transit);assert.ok(y.total>x.total);assert.equal(c.route.seconds,a.route.seconds);assert.deepEqual(a.packing.boxes,b.packing.boxes);
 const visits=b.route.visits.filter(v=>v.leg.seconds>0).length;assert.ok(Math.abs((y.total-x.total)-visits*600)<.01);
 assert.equal(routeTimeSummary(null),null);assert.equal(routeTimeSummary({seconds:3,visits:[{leg:{seconds:4}}]}),null);
});
