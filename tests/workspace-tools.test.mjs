import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {feedbackDiagnostics} from '../feedback-data.mjs';
import {readRebuildVersion,newerRebuild} from '../integration/log/workspace-updates.mjs';
import {personalNavigation,planningBase} from '../integration/log/personal-locations.mjs';
import {calculatePreview,createPreview} from '../integration/log/preview-packing.mjs';
import {definitionIndex} from '../integration/log/catalog.mjs';
import {DEFAULT_SHIP} from '../ships.mjs';
import {data,index,fixture} from './helpers/log-preview.mjs';
const catalog=definitionIndex(JSON.parse(await readFile(new URL('../data/log-mission-index.json',import.meta.url),'utf8')));
const custom={id:'custom:depot',name:'Personal Depot',system:'stanton',type:'Outpost',position:[100,200,300],aliases:['내 기지']};
test('personal navigation preserves public identity evidence and supports custom departure',()=>{
 const {contract}=fixture(),before=JSON.stringify(data);
 const publicManifest=createPreview(contract,catalog,index);
 const pickup=publicManifest.mission.cargo[0].pickupId,original=data.locations.find(p=>p.id===pickup);
 const edit={...original,name:'Private name',position:original.position.map(n=>n+500)};
 const result=calculatePreview({contracts:[contract],catalogData:[...catalog],locationData:data,locationEdits:[custom,edit],ship:DEFAULT_SHIP,startId:custom.id});
 assert.equal(result.route.visits[0].locationId,custom.id);assert.equal(result.totalScu,168);assert.equal(result.boxCount,28);
 assert.deepEqual(result.stops.find(p=>p.id===pickup).position,edit.position);
 assert.deepEqual(createPreview(contract,catalog,index),publicManifest);assert.equal(JSON.stringify(data),before);
 assert.match(result.warnings.join(' '),/개인 장소/);
});
test('draft or invalid personal coordinates cannot silently route using old coordinates',()=>{
 const {contract}=fixture(),pickup=createPreview(contract,catalog,index).mission.cargo[0].pickupId;
 const original=data.locations.find(p=>p.id===pickup),draft={...original,position:null};
 assert.ok(!personalNavigation(data,[draft]).locations.some(p=>p.id===pickup));
 assert.throws(()=>calculatePreview({contract,catalogData:[...catalog],locationData:data,locationEdits:[draft],ship:DEFAULT_SHIP,startId:pickup}));
 const gate=planningBase(data).locations.find(p=>p.isGateway);assert.throws(()=>personalNavigation(data,[{...gate,position:null}]),/점프/);
 assert.throws(()=>personalNavigation(data,[custom,custom]),/중복/);
 assert.throws(()=>personalNavigation(data,[{...original,system:'nyx'}]),/행성계/);
 assert.throws(()=>personalNavigation(data,[{...custom,position:[NaN,2,3]}]),/좌표/);
});
test('feedback automatic context admits counts, not log text, URLs, identifiers or arbitrary fields',()=>{
 assert.deepEqual(feedbackDiagnostics({contracts:2,readyContracts:1,pendingContracts:0,url:'http://127.0.0.1/#token=SECRET',errors:['SECRET'],rawLog:'SECRET',uid:'SECRET',ship:'SECRET'}),{contracts:2,readyContracts:1,pendingContracts:0});
 assert.deepEqual(feedbackDiagnostics({contracts:-1,readyContracts:'2',pendingContracts:NaN}),{});
});
test('development update check cannot mark an older build as a new update',async()=>{
 const local=readRebuildVersion(JSON.parse(await readFile(new URL('../data/rebuild-version.json',import.meta.url),'utf8')));
 assert.equal(newerRebuild(local,local),false);assert.equal(newerRebuild(local,'rebuild.20261103.99'),false);assert.equal(newerRebuild(local,'rebuild.20261105.1'),true);
 assert.equal(newerRebuild('rebuild.20261104.9','rebuild.20261104.10'),true);
 for(const version of ['<img>','https://bad.test','rebuild.20261104.0',null])assert.throws(()=>readRebuildVersion({version}));
});
