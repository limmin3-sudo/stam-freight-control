import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LogEvidence, requireVerifiedManifest} from '../integration/log/state.mjs';
import {locationIndex} from '../integration/log/locations.mjs';
import {resolveOriginalManifest, originalPackingPreview} from '../integration/log/manifest.mjs';
import {makeShipments, packBoxes} from '../engine.mjs';
import {DEFAULT_SHIP, selectShipGrids} from '../ships.mjs';

const data = JSON.parse(await readFile(new URL('../data/log-location-index.json',import.meta.url),'utf8'));
const index = locationIndex(data);
const large = '461d27cf-9431-4391-89e9-288b3a424385';
const obj = '1358ecdf-36d4-41b2-820b-5d403a56b76e';
const runtime = '11111111-1111-4111-8111-111111111111';
const stops = ['ArcCorp Mining Area 061','Sunset Mesa','Canard View'].map(name => {
  const p = data.locations.find(p => p.name === name);
  const parent = data.locations.find(q => q.id === p.parentId && q.system === p.system);
  return {...p, position:p.position.map((v,i)=>v-parent.position[i])};
});
function fixture(id=runtime, locations=index) {
  const state = new LogEvidence({locations});
  const base = {at:'2026-11-03T10:00:00.000Z',source:{input:'synthetic',generation:0,line:1}};
  const events = [
    {...base,type:'game-build-observed',build:'12913470'},
    {...base,type:'accepted',missionId:id,title:'Synthetic large contract'},
    ...stops.map((p,i)=>({...base,type:'marker-observed',missionId:id,hauling:true,definitionId:large,
      role:i===0?'pickup':'dropoff',objectiveId:`${i===0?'pickup':'dropoff'}_${obj}_${i===2?3:0}`,position:p.position})),
  ];
  for (const e of events) state.add(e);
  return {state,events,contract:state.snapshot().contracts[0]};
}

test('explicit symmetric delivery bundles resolve without quantity notices, not by total division',()=>{
  const {state,contract:c} = fixture();
  const m = c.originalManifest;
  assert.equal(m.status,'resolved-original-manifest');
  assert.equal(m.pickup.name,'ArcCorp Mining Area 061');
  assert.deepEqual(m.deliveries.map(d=>d.name).sort(),['Canard View','Sunset Mesa']);
  assert.equal(m.shipments.length,6);
  for(const d of m.deliveries) assert.deepEqual(m.shipments.filter(s=>s.dropoffId===d.id).map(s=>[s.commodity,s.scu,s.boxes]),[
    ['Ship Ammunition',32,[{size:16,count:2}]],['Hydrogen',32,[{size:16,count:2}]],['Medical Supplies',20,[{size:2,count:10}]],
  ]);
  assert.equal(m.currentInventoryVerified,false);
  assert.equal(m.remainingCargoVerified,false);
  assert.equal(state.snapshot().statistics.withOriginalManifest,1);
  assert.equal(state.snapshot().statistics.planningReady,0);
  assert.equal(c.manifest,null);
  assert.throws(()=>requireVerifiedManifest({...c,planning:{allowed:true},manifest:m}),/manifest-not-verified/);
});

test('missing, additional, changed, duplicate-place or unfamiliar markers never allocate',()=>{
  const original=fixture().contract;
  const modifications=[
    c=>c.markerObservations.pop(),
    c=>c.markerObservations.push({...c.markerObservations[1],objectiveId:`dropoff_${obj}_6`}),
    c=>c.markerObservations[1].position[0]+=1,
    c=>c.markerObservations[2].position=[...c.markerObservations[1].position],
    c=>c.markerObservations[1].role='pickup',
    c=>c.markerObservations.push({...c.markerObservations[1],position:[1,2,3]}),
    c=>c.markerObservations[1].missionId='22222222-2222-4222-8222-222222222222',
  ];
  for(const change of modifications){const c=structuredClone(original);change(c);assert.notEqual(resolveOriginalManifest(c,index).status,'resolved-original-manifest');}
  assert.equal(resolveOriginalManifest(original,null).status,'location-catalog-unavailable');
  const unrelated={...index,match:()=>({status:'coordinate-match',candidates:[{...stops[0],id:'unrelated'}]})};
  assert.equal(resolveOriginalManifest(original,unrelated).status,'route-outside-profile');
});

test('unknown build, medium, conflicting totals and forged manifests cannot feed packing preview',()=>{
  for(const change of [
    c=>c.gameBuild.value='13000000',
    c=>{c.definitionId='6f207f9c-0575-4a88-82f8-ccc348eab9da';c.definitionObservations=[c.definitionId];},
    c=>c.quantityObservations.push({missionId:c.missionId,objectiveId:`dropoff_${obj}_0`,unit:'SCU',total:31}),
    c=>c.conflicts.push('definition-conflict'),
  ]){const c=fixture().contract;change(c);c.originalManifest={status:'resolved-original-manifest'};assert.throws(()=>originalPackingPreview(c,index),/original-manifest-unverified/);}
});

test('preview preserves every small box, ownership and disabled grids in the real packing engine',()=>{
  const a=fixture().contract, b=fixture('22222222-2222-4222-8222-222222222222').contract;
  const previews=[a,b].map(c=>originalPackingPreview(c,index));
  const map=new Map(stops.map(p=>[p.id,p]));
  const ship=selectShipGrids(DEFAULT_SHIP,[DEFAULT_SHIP.grids[0].id]);
  const {shipments,warnings}=makeShipments(previews.map(p=>p.mission),map,{ship});
  assert.deepEqual(warnings,[]);
  assert.ok(shipments.every(s=>!s.estimated));
  const boxes=shipments.flatMap(s=>s.boxes);
  assert.equal(boxes.length,56);assert.equal(new Set(boxes.map(b=>b.boxId)).size,56);
  for(const c of [a,b]){
    const owned=boxes.filter(b=>b.missionId===c.missionId);
    assert.equal(owned.length,28);assert.equal(owned.filter(b=>b.size===2).length,20);
    assert.equal(owned.reduce((n,b)=>n+b.size,0),168);
  }
  const packed=packBoxes(boxes,[],ship);
  assert.ok(packed);assert.equal(packed.used,336);assert.ok(packed.boxes.every(b=>b.bin!==0));
  assert.deepEqual(new Set(packed.boxes.map(b=>b.boxId)),new Set(boxes.map(b=>b.boxId)));
});

test('terminal history stays history, reordered duplicate markers do not duplicate shipments',()=>{
  const {events,state}=fixture();
  const reversed=new LogEvidence({locations:index});
  for(const e of [...events,...events].reverse())reversed.add(e);
  assert.deepEqual(reversed.snapshot().contracts[0].originalManifest,state.snapshot().contracts[0].originalManifest);
  state.add({type:'ended',missionId:runtime,completion:'Complete',at:'2026-11-03T11:00:00.000Z',source:{input:'synthetic',line:10}});
  const c=state.snapshot().contracts[0];
  assert.equal(c.status,'end-observed');assert.equal(c.planning.allowed,false);
  assert.equal(c.originalManifest.scope,'original-contract');
  assert.throws(()=>requireVerifiedManifest(c),/manifest-not-verified/);
});
