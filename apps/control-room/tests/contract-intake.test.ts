import test from 'node:test';
import assert from 'node:assert/strict';
import {textContracts} from '../src/contract-intake.mjs';
import {quantityPlan} from '../src/mission-quantities.mjs';
import {calculateFlight,missionFor} from '../src/flight-engine.mjs';
import {emptyDraft} from '../src/mission-trial.ts';

test('Korean OCR keeps one delivery reservation across unknown pickup shares',()=>{
 const [job]=textContracts(`미션명: 신입 화물 운송
Mission ID: OCR-POOLED-KO
보상: 73500
알루미늄을(를) 0/22 SCU 에어리어 18에 배송하십시오.
로빌에서 알루미늄을(를) 접수하십시오.
뉴 배비지에서 알루미늄을(를) 접수하십시오.`);
 assert.ok(job);
 assert.deepEqual(job.shipments.map(row=>row.scu),[0,0]);
 assert.equal(Object.values(job.reservations||{})[0],22);
 assert.equal(job.pay,73500);
 const quantity=quantityPlan(missionFor(job),false);
 assert.equal(quantity.ready,true);assert.equal(quantity.scu,22);
 const plan=calculateFlight({...emptyDraft(),partner:'navigator',jobs:[job]});
 assert.equal(plan.peak,22);
 assert.equal(plan.visits.flatMap(v=>v.events).filter(e=>e.type==='delivery').reduce((n,e)=>n+e.scu,0),22);
});

test('English text retains known delivery total without inventing pickup quantities',()=>{
 const [job]=textContracts(`Title: Junior Hauler Needed for Small Shipment
Mission ID: OCR-POOLED-EN
Reward: 0 aUEC
Collect Aluminum from Lorville
Collect Aluminum from New Babbage
Deliver 22 SCU of Aluminum to Areal8`);
 assert.ok(job);
 assert.deepEqual(job.shipments.map(row=>row.scu),[0,0]);
 assert.equal(Object.values(job.reservations||{})[0],22);
 assert.equal(job.rewardUnknown,false,'explicit zero is a known reward');
 assert.equal(quantityPlan(missionFor(job),false).scu,22);
});

test('a missing or partially unread delivery quantity is never filled from another objective',()=>{
 const [job]=textContracts(`Title: Junior Hauler Needed for Small Shipment
Mission ID: OCR-PARTIAL
Collect Aluminum from Lorville
Collect Aluminum from New Babbage
Deliver 22 SCU of Aluminum to Area18
Deliver Aluminum to Area18`);
 assert.ok(job);
 assert.equal(job.rewardUnknown,true);
 assert.deepEqual(job.reservations||{},{});
 assert.equal(quantityPlan(missionFor(job),false).ready,false);
});
