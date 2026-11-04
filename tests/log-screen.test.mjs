import test from 'node:test';import assert from 'node:assert/strict';
import {screenSignal,createScreenEvidence} from '../integration/log/screen-evidence.mjs';
const now=Date.parse('2026-11-04T12:00:00Z');
const contract=(id='one',title='Cargo Test',at=now)=>({missionId:id,title,acceptedAt:new Date(at).toISOString(),acceptanceObservations:[{type:'accepted'}]});
test('screen reader recognizes only explicit acceptance or active counts, and rejects weak OCR',()=>{
 assert.deepEqual(screenSignal('Contract Accepted: Cargo Test','notification',90),{kind:'accepted',title:'Cargo Test'});
 assert.equal(screenSignal('Contract Accepted: Cargo Test','notification',60),null);
 assert.equal(screenSignal('Contract Complete: Cargo Test','notification',90),null);
 assert.deepEqual(screenSignal('계약 수락: 중형 화물 운송','notification',90),{kind:'accepted',title:'중형 화물 운송'});
 assert.deepEqual(screenSignal('Accepted (2/10)','list',90),{kind:'count',count:2});
 assert.equal(screenSignal('Accepted (20/10)','list',90),null);
});
test('screen hints survive missing logs, correlate late evidence, and do not alter contract state',()=>{
 const e=createScreenEvidence(),signal={kind:'accepted',title:'Cargo Test'};e.observe(signal,now);e.observe(signal,now+1000);
 assert.equal(e.rows(now+1000).length,1);assert.equal(e.rows(now+1000)[0].status,'waiting');assert.equal(e.rows(now+16000)[0].status,'unmatched');
 const snapshot={contracts:[contract()]},before=structuredClone(snapshot);e.update(snapshot);assert.equal(e.rows(now+16000)[0].status,'corroborated');assert.deepEqual(snapshot,before);
 e.update({contracts:[contract('one'),contract('two')]});assert.equal(e.rows(now+16000)[0].status,'ambiguous');
 e.update({contracts:[contract('old','Cargo Test',now-60000)]});assert.equal(e.rows(now+16000)[0].status,'unmatched');
});
test('repeated same-title notifications cannot consume one contract twice; mixed identities do not corroborate',()=>{
 const e=createScreenEvidence();e.observe({kind:'accepted',title:'Cargo Test'},now);e.observe(null,now+1000);e.observe({kind:'accepted',title:'Cargo Test'},now+2000);
 e.update({contracts:[contract()]});assert.ok(e.rows(now+3000).every(r=>r.status==='ambiguous'));
 e.reset();e.observe({kind:'accepted',title:'Cargo Test'},now);e.update({contracts:[contract()],identity:{mixedPlayers:true}});assert.equal(e.rows(now+16000)[0].status,'unmatched');
});
test('contract count increases remain aggregate observations even when log counts agree',()=>{
 const e=createScreenEvidence();e.observe({kind:'count',count:2},now);assert.equal(e.rows(now).length,0);
 e.observe({kind:'count',count:4},now+2000);e.update({pendingContracts:[contract('a','a',now+1000),contract('b','b',now+1500)]});
 const r=e.rows(now+3000)[0];assert.equal(r.count,2);assert.equal(r.logCount,2);assert.equal(r.status,'count-only');assert.equal(r.missionId,undefined);
 e.dismiss(r.id);assert.equal(e.rows(now+3000).length,0);e.reset();
});
test('OCR title mistakes cannot report an already observed acceptance as missed or create duplicates',()=>{
 const e=createScreenEvidence(),snapshot={contracts:[contract()]},before=structuredClone(snapshot);
 e.observe({kind:'accepted',title:'Cargo Tost'},now+3000);e.update(snapshot);
 const row=e.rows(now+30000)[0];assert.equal(row.status,'log-observed');assert.equal(row.missionId,undefined);assert.deepEqual(snapshot,before);
});
