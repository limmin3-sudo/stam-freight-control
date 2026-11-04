import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LogEvidence} from '../integration/log/state.mjs';
import {parseLogLine} from '../integration/log/parser.mjs';
import {createPlanSelection} from '../integration/log/preview-session.mjs';
import {previewContractSignature,previewReadiness} from '../integration/log/preview-packing.mjs';
import {definitionIndex} from '../integration/log/catalog.mjs';
import {fixture,index} from './helpers/log-preview.mjs';
const catalog=definitionIndex(JSON.parse(readFileSync(new URL('../data/log-mission-index.json',import.meta.url))));
const zero='00000000-0000-0000-0000-000000000000',second='22222222-2222-4222-8222-222222222222';
const at='2026-11-03T10:01:00.000Z',source={input:'synthetic',generation:0,line:10};
const notice=(text,id=zero,n=1)=>`<${at}> [Notice] <SHUDEvent_OnNotification> Added notification "${text}" [${n}] to queue. MissionId: [${id}], ObjectiveId: []`;
const stateEvent=(id,obj,state,time=at)=>({type:'objective-state-observed',missionId:id,objectiveId:obj,state,at:time,source});
const goalEvent=(id,obj,current,total,time=at)=>({type:'quantity-observed',missionId:id,objectiveId:obj,current,total,unit:'SCU',notification:'Synthetic amount',at:time,source});
const contract=f=>f.state.snapshot().contracts.find(c=>c.missionId===f.contract.missionId);

test('zero-ID credits remain unassigned, repeated reads dedupe and distinct notice IDs stay separate',()=>{
 const f=fixture(),id=f.contract.missionId;
 f.state.ingest(notice('계약 완료: Synthetic: ',id),source);
 const award=notice('50,250 aUEC 지급: ');f.state.ingest(award,source);f.state.ingest(award,{...source,input:'backup'});
 f.state.ingest(notice('Awarded 50,250 aUEC',zero,2),source);
 const snap=f.state.snapshot();assert.equal(snap.rewards.length,2);assert.equal(snap.contracts.length,1);assert.equal(f.state.contracts.has(zero),false);
 for(const r of snap.rewards){assert.equal(r.amount,50250);assert.equal(r.missionId,null);assert.equal(r.attribution,'unassigned');assert.equal(r.accountHistoryWritten,false);}
 assert.equal(contract(f).progress.outcome,'completed');
});
test('credit assignment needs the exact instance ID, not title/type or preceding completion',()=>{
 const f=fixture();for(const e of fixture(second).events)f.state.add(e);
 f.state.ingest(notice('Awarded 100 aUEC',second),source);
 f.state.ingest(notice('Awarded 200 aUEC','33333333-3333-4333-8333-333333333333',2),source);
 const rewards=f.state.snapshot().rewards;assert.equal(rewards.find(r=>r.amount===100).attribution,'exact-mission-id');assert.equal(rewards.find(r=>r.amount===100).missionId,second);
 assert.equal(rewards.find(r=>r.amount===200).attribution,'unassigned');
});
test('mission service ending or another participant ending alone cannot prove my completion',()=>{
 const f=fixture(),id=f.contract.missionId;
 f.state.add({type:'local-character-observed',playerId:'1001',characterState:'STATE_CURRENT',at:'2026-11-03T09:00:00.000Z',source});
 f.state.add({type:'ended',missionId:id,completion:'Complete',playerId:'2002',at,source});
 assert.equal(contract(f).progress.outcome,'unconfirmed');
 f.state.ingest(`<${at}> [Notice] <MissionEnded> Received MissionEnded push message for: mission_id ${id} - mission_state MISSION_STATE_COMPLETED [Team_GameServices][Missions]`,source);
 assert.equal(contract(f).progress.outcome,'ended-unverified');
 f.state.add({type:'ended',missionId:id,completion:'Complete',playerId:'1001',at,source});assert.equal(contract(f).progress.outcome,'completed');
 assert.ok(!JSON.stringify(f.state.snapshot()).includes('2002'));
});
test('conflicting end evidence blocks completion and automatic planning, even with a valid original manifest',()=>{
 const f=fixture(),id=f.contract.missionId;
 f.state.ingest(notice('계약 완료: Synthetic: ',id),source);
 f.state.add({type:'mission-state-observed',missionId:id,state:'MISSION_STATE_FAILED',at,source});
 const c=contract(f);assert.equal(c.progress.outcome,'conflict');assert.equal(c.status,'conflict');assert.ok(c.conflicts.includes('terminal-state-conflict'));assert.equal(previewReadiness(c,catalog,index).ready,false);
});
test('goals and SCU progress remain per instance/objective; completion does not generate onboard cargo',()=>{
 const f=fixture(),id=f.contract.missionId,obj=f.events[3].objectiveId;
 for(const e of fixture(second).events)f.state.add(e);
 f.state.add(stateEvent(id,obj,'MISSION_OBJECTIVE_STATE_COMPLETED'));f.state.add(goalEvent(id,obj,8,32));
 const c=contract(f),g=c.progress.goals.find(g=>g.objectiveId===obj);
 assert.equal(g.state,'completed');assert.deepEqual(g.quantity,{current:8,total:32,unit:'SCU',at});
 assert.equal(c.progress.outcome,'unconfirmed');assert.equal(c.progress.currentInventoryVerified,false);assert.equal(c.manifest,null);
 assert.equal(f.state.snapshot().contracts.find(c=>c.missionId===second).progress.completedGoals,0);
 const before=previewContractSignature(f.contract,catalog,index),after=previewContractSignature(c,catalog,index);assert.equal(before,after);
});
test('quantity regressions and equal-time state conflicts are exposed rather than summed or guessed',()=>{
 const f=fixture(),id=f.contract.missionId,obj=f.events[3].objectiveId;
 f.state.add(goalEvent(id,obj,12,32));f.state.add(goalEvent(id,obj,4,32,'2026-11-03T10:02:00.000Z'));
 f.state.add(stateEvent(id,obj,'MISSION_OBJECTIVE_STATE_COMPLETED'));f.state.add(stateEvent(id,obj,'MISSION_OBJECTIVE_STATE_INPROGRESS'));
 const g=contract(f).progress.goals.find(g=>g.objectiveId===obj);assert.equal(g.state,'conflict');assert.equal(g.quantity,null);assert.equal(g.quantityConflict,true);
});
test('a local completion without EndMission ends auto selection, and late acceptance cannot reactivate it',()=>{
 const f=fixture(),id=f.contract.missionId,s=createPlanSelection();s.reconcile([contract(f)],new Set([id]));assert.equal(s.selected.size,1);
 f.state.ingest(notice('Contract Complete: Synthetic: ',id),source);s.reconcile([contract(f)],new Set([id]));assert.equal(s.selected.size,0);assert.equal(contract(f).status,'end-observed');
 f.state.add({...f.events[1],at:'2026-11-03T10:02:00.000Z'});assert.equal(contract(f).progress.outcome,'conflict');
 s.reconcile([contract(f)],new Set([id]));assert.equal(s.selected.size,0);
});
test('invalid awards and missing/zero contract IDs never create terminal missions',()=>{
 const s=new LogEvidence();
 for(const text of ['Awarded 1,23 aUEC','Awarded -100 aUEC','Awarded 2.5 aUEC','Awarded 9007199254740992 aUEC','Awarded 0 aUEC','Balance 500 aUEC','Reward might be 500 aUEC'])s.ingest(notice(text),source);
 assert.equal(s.snapshot().rewards.length,0);assert.equal(s.contracts.size,0);
 assert.equal(parseLogLine(notice('계약 완료: Synthetic: ',zero),source).event,undefined);
});
