import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMissionText} from '../ocr.mjs';
import {screenObjectives} from '../screen-objectives.mjs';
import points from '../data/locations.json' with {type:'json'};
const text=(item,total,from,to)=>`납품: 0/${total} SCU · 화물: ${item} · 목적지: ${to}.\n${item}을 ${from}에서 수집하세요.`;
const cases=[['폐기물',22,'가스라이트','차울라 해변'],['수소',11,'세이크런스 플롯','차울라 해변'],['가공 식품',9,'세이크런스 플롯','차울라 해변'],['탄소',26,'세이크런스 플롯','가스라이트'],['알루미늄',20,'세이크런스 플롯','가스라이트']];
test('five Korean mobiGlas examples retain the observed quota, cargo, reward, and both specific facilities',()=>{
 for(const [item,quota,from,to] of cases){
  const s='직송 · 수습생 등급 · 소량 운송 화물\n보상 104,500\n'+text(item,quota,from,to),m=parseMissionText(s,points.locations),[r]=m.cargo;
  assert.equal(m.title,'직송 · 수습생 등급 · 소량 운송 화물');assert.equal(m.reward,104500);
  assert.deepEqual([r.commodity,r.scu,r._pickupText,r._dropoffText],[item,quota,from,to]);assert.ok(r.pickupId&&r.dropoffId);assert.equal(m.rawText,s);
 }
});
test('separate drops and several pickups do not duplicate the delivered quota or invent a pickup share',()=>{
 const m=parseMissionText(text(...cases[0])+'\n폐기물을 세이크런스 플롯에서 수집하세요.\n'+text(...cases[4]),points.locations);
 assert.equal(m.cargo.length,3);assert.deepEqual(m.cargo.map(r=>r.scu),[null,null,20]);assert.deepEqual(m._deliveryTotals.map(t=>t.scu),[22,20]);assert.equal(new Set(m.cargo.map(r=>r.pickupId)).size,2);
});
test('missing, unrelated and clipped instructions are not assigned to this objective',()=>{
 assert.deepEqual(screenObjectives('납품: 7/22 SCU · 화물: 폐기물 · 목적지: 차울라 해변.\n수소를 가스라이트에서 수집하세요.')[0].pickups,[]);
 assert.equal(screenObjectives('보상 104,500').length,0);
});
test('wrapped English game goals keep their pickups, cleaner cargo labels, and route IDs',()=>{
 const raw='PRIMARY OBJECTIVES\n< Deliver 0/3 SCU of Processed ‘Food to microTech\nLogistics Depot S4LDO1 on microTech.\n¢ Collect Processed Food from’ Port Tressler.';
 const m=parseMissionText(raw,points.locations);
 assert.equal(m.cargo[0].commodity,'Processed Food');assert.equal(m.cargo[0].scu,3);
 assert.equal(points.locations.find(p=>p.id===m.cargo[0].pickupId)?.name,'Port Tressler');
 assert.equal(points.locations.find(p=>p.id===m.cargo[0].dropoffId)?.name,'microTech Logistics Depot S4LD01');
});
