import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LogEvidence} from '../integration/log/state.mjs';
import {definitionIndex} from '../integration/log/catalog.mjs';
import {previewReadiness,previewContractSignature} from '../integration/log/preview-packing.mjs';
import {fixture,index} from './helpers/log-preview.mjs';
import {createPlanSelection} from '../integration/log/preview-session.mjs';
const catalog=definitionIndex(JSON.parse(await readFile(new URL('../data/log-mission-index.json',import.meta.url))));
const second='22222222-2222-4222-8222-222222222222';

test('acceptance without markers stays pending and late markers resolve the same instance exactly once',()=>{
 const {events}=fixture();const state=new LogEvidence({locations:index});
 for(const e of events.slice(0,2))state.add(e);
 assert.equal(state.snapshot().contracts.length,0);assert.equal(state.snapshot().pendingContracts.length,1);
 const pending=state.snapshot().pendingContracts[0];assert.equal(pending.classification,'unverified');
 state.add({...events[1],missionId:second});assert.equal(state.snapshot().pendingContracts.length,2);
 state.add(events[2]);let snapshot=state.snapshot();
 assert.equal(snapshot.pendingContracts.length,1);assert.equal(snapshot.pendingContracts[0].missionId,second);
 assert.equal(snapshot.contracts.length,1);assert.equal(previewReadiness(snapshot.contracts[0],catalog,index).ready,false);
 // Original demand can be resolved by corroborated definition/markers even if quantity notifications were omitted.
 for(const e of events.slice(3))state.add({...e,at:'2026-11-03T10:05:00.000Z'});
 snapshot=state.snapshot();assert.equal(previewReadiness(snapshot.contracts[0],catalog,index).ready,true);
 assert.equal(snapshot.contracts[0].quantityObservations.length,0);
 assert.equal(snapshot.contracts[0].originalManifest.boxCount,28);
 for(const e of events)state.add(e);
 assert.equal(state.snapshot().contracts.length,1);assert.equal(state.snapshot().pendingContracts.length,1);
 const selection=createPlanSelection();selection.reconcile(snapshot.contracts,new Set(snapshot.contracts.map(c=>c.missionId)));
 assert.deepEqual([...selection.selected],[events[1].missionId]);
});

test('pending records do not guess hauling from title, resurrect an ended mission or expose player identity',()=>{
 const {events}=fixture();const state=new LogEvidence({locations:index});
 state.add({...events[1],title:'Hauling 200 SCU'});
 const base={at:events[1].at,source:events[1].source};
 state.add({...base,type:'local-character-observed',playerId:'9999',characterState:'STATE_CURRENT'});
 state.add({...base,type:'ended',missionId:events[1].missionId,playerId:'9999',completion:'Complete'});
 let snapshot=state.snapshot();assert.equal(snapshot.statistics.classificationPending,0);
 assert.equal(snapshot.pendingContracts[0].status,'end-observed');assert.ok(!JSON.stringify(snapshot).includes('9999'));
 for(const e of events.filter(e=>e.type!=='accepted'))state.add(e);
 assert.equal(state.snapshot().contracts[0].status,'end-observed');
 const other=new LogEvidence();other.add(events[1]);other.add({...events[2],hauling:false});
 assert.equal(other.snapshot().pendingContracts.length,0);assert.equal(other.snapshot().contracts.length,0);
});

test('late progress and repeated markers keep a resolved plan stable; conflicting demand invalidates it',()=>{
 const {state,events,contract}=fixture();const before=previewContractSignature(contract,catalog,index);
 state.add({...events[2],at:'2026-11-03T10:02:00.000Z',source:{input:'synthetic',line:100}});
 state.add({...events[3],type:'objective-state-observed',state:'MISSION_OBJECTIVE_STATE_COMPLETED',at:'2026-11-03T10:03:00.000Z'});
 assert.equal(previewContractSignature(state.snapshot().contracts[0],catalog,index),before);
 state.add({...events[3],type:'quantity-observed',current:4,total:32,unit:'SCU',notification:'New Objective: Deliver 4/32 SCU of Hydrogen',at:'2026-11-03T10:04:00.000Z'});
 assert.equal(previewContractSignature(state.snapshot().contracts[0],catalog,index),before);
 state.add({...events[3],type:'quantity-observed',current:0,total:33,unit:'SCU',notification:'New Objective: Deliver 0/33 SCU of Hydrogen',at:'2026-11-03T10:05:00.000Z'});
 assert.notEqual(previewContractSignature(state.snapshot().contracts[0],catalog,index),before);
 assert.equal(previewReadiness(state.snapshot().contracts[0],catalog,index).ready,false);
});
