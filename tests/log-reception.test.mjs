import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {contractReception,receptionActive} from '../integration/log/reception.mjs';
import {previewReadiness} from '../integration/log/preview-packing.mjs';
import {createPlanSelection} from '../integration/log/preview-session.mjs';
import {definitionIndex} from '../integration/log/catalog.mjs';
import {LogEvidence} from '../integration/log/state.mjs';
import {fixture,index} from './helpers/log-preview.mjs';
const catalog=definitionIndex(JSON.parse(await readFile(new URL('../data/log-mission-index.json',import.meta.url),'utf8')));
const reception=c=>contractReception(c,previewReadiness(c,catalog,index),catalog,index);
test('late metadata completes one reception without inventing notices or changing contract ownership',()=>{
 const {events}=fixture(),s=new LogEvidence({locations:index});s.add(events[0]);s.add(events[1]);
 const pending=s.snapshot().pendingContracts[0];assert.equal(contractReception(pending,null,catalog,index).stage,'waiting');
 s.add(events[2]);assert.equal(reception(s.snapshot().contracts[0]).stage,'waiting');
 for(const e of events.slice(3))s.add(e);const c=s.snapshot().contracts[0],r=reception(c);
 assert.equal(c.quantityObservations.length,0);assert.equal(r.stage,'ready');assert.match(r.items.find(i=>i.name==='품목·총량').text,/168 SCU/);assert.equal(r.items.find(i=>i.name==='상자 구성').state,'linked');
 assert.equal(c.missionId,pending.missionId);assert.equal(s.snapshot().pendingContracts.length,0);
});
test('partial space evidence does not claim full quantities, known boxes or completed locations',()=>{
 const {contract}=fixture();const ready={ready:true,reservation:true,preview:{partial:true,mission:{cargo:[{scu:32,boxes:[]}]}}};
 const r=contractReception(contract,ready,catalog,index);assert.equal(r.stage,'partial');assert.match(r.note,/전체 항로는 보류/);assert.match(r.items.find(i=>i.name==='품목·총량').text,/일부 화물 32 SCU/);assert.equal(r.items.find(i=>i.name==='상자 구성').state,'waiting');
 const unknown=contractReception(contract,{ready:false},catalog,{match:()=>({status:'unmatched',candidates:[]})});assert.equal(unknown.items.find(i=>i.name==='픽업 지점').state,'waiting');
 for(const changed of [{status:'end-observed'},{participation:{state:'left-observed'}}]){const c={...contract,...changed};assert.equal(receptionActive(c),false);assert.equal(reception(c).stage,'closed');}
 assert.equal(reception({...contract,conflicts:['definition-conflict']}).stage,'conflict');
});
test('newly ready contracts wait during guidance; manual inclusion is honored and other missions stay distinct',()=>{
 const first=fixture().contract,second=fixture('22222222-2222-4222-8222-222222222222').contract,s=createPlanSelection();
 s.reconcile([first],new Set([first.missionId]));s.reconcile([first,second],new Set([first.missionId,second.missionId]),{autoSelect:false});assert.deepEqual([...s.selected],[first.missionId]);
 s.set(second.missionId,true);s.reconcile([first,second],new Set([first.missionId,second.missionId]),{autoSelect:false});assert.equal(s.selected.size,2);
 s.set(second.missionId,false);s.reconcile([first,second],new Set([first.missionId,second.missionId]));assert.deepEqual([...s.selected],[first.missionId]);
});
