import test from 'node:test';import assert from 'node:assert/strict';
import {createCompletionStore,completionTotals} from '../integration/log/completion-store.mjs';
const id='11111111-1111-4111-8111-111111111111';
const mem=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('completion and payout totals survive reconnect, ignore unrelated payouts and revoke contradictions',()=>{
 const storage=mem(),s=createCompletionStore(storage),contract={missionId:id,acceptanceObservations:[{}],conflicts:[],progress:{outcome:'completed',observedAt:'2026-11-04T10:00:00.000Z'}};
 s.observe([contract]);s.observe([contract]);const again=createCompletionStore(storage);assert.equal(again.snapshot().records.length,1);
 const rewards=[{missionId:id,amount:100},{missionId:null,linkedMissionId:null,amount:999}];
 assert.deepEqual(completionTotals(again.snapshot().records,rewards),{completed:1,paidContracts:1,income:100,unassigned:999});
 assert.equal(storage.getItem('sfc-history'),null);
 again.observe([{...contract,progress:{outcome:'conflict'}}]);assert.equal(again.snapshot().records.length,0);
 assert.equal(completionTotals(again.snapshot().records,rewards).income,0);
});
