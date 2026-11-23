import test from 'node:test';
import assert from 'node:assert/strict';
import {readFrame,collectedGoals,matchFrame,withScreens} from '../src/contract-screen.ts';
import type {Job} from '../src/mission-trial.ts';
const image=new Blob(['stub'],{type:'image/jpeg'});
const sample='직송 · 수습생 등급 · 소량 운송 화물\n보상 104,500\n주요 목표\n납품: 0/22 504ㆍ화물: 폐기물ㆍ목적지: 차울라 해변.';
const withPickup=sample+'\n폐기물을 가스라이트에서 수집하세요.';
const frame=(s:string)=>({...readFrame(s,image)!,acceptedTab:true});
const job:Job={id:'11111111-1111-4111-8111-111111111111',signature:'log',state:'incomplete',title:['직송 · 수습생 등급 · 소량 운송 화물','Haul'],pay:0,rewardUnknown:true,shipments:[{id:'one',cargo:['폐기물','Waste'],from:'',to:'',scu:22}]};
test('unique receipt corroborated by title and cargo can be filled; indistinguishable receipts require a choice',()=>{
 assert.equal(matchFrame(frame(withPickup),[job]).length,1);assert.equal(matchFrame({...frame(withPickup),acceptedTab:false},[job]).length,0);assert.equal(matchFrame(frame(withPickup),[job,{...job,id:'second'}]).length,0);
 const out=withScreens(job,[frame(withPickup),frame(withPickup)]);
 assert.equal(out.id,job.id);assert.equal(out.signature,job.signature);assert.equal(out.shipments.length,1);assert.equal(out.pay,104500);
 assert.ok(out.shipments[0]?.from&&out.shipments[0]?.to);assert.equal(out.mission?.cargo[0]?.scu,22);
 assert.equal(withScreens({...job,state:'ended'},[frame(withPickup)]).state,'ended');
});
test('scroll overlap preserves repeated objective multiplicity and can complete a clipped pickup',()=>{
 assert.equal(collectedGoals([frame(sample),frame(withPickup),frame(withPickup)]).length,1);
 const pair=withPickup+'\n'+withPickup.split('주요 목표\n')[1];
 assert.equal(collectedGoals([frame(pair),frame(pair)]).length,2);
 const tail=frame('주요 목표\n폐기물을 가스라이트에서 수집하세요.');
 assert.deepEqual(collectedGoals([frame(sample),tail])[0]?.pickups,['가스라이트']);
});
test('a delivery total with two pickups is reserved once in the planner',()=>{
 const multi=frame(withPickup+'\n폐기물을 세이크런스 플롯에서 수집하세요.');
 const out=withScreens({...job,shipments:[]},[multi]);
 assert.equal(out.shipments.length,2);assert.deepEqual(out.shipments.map(r=>r.scu),[0,0]);assert.deepEqual(Object.values(out.reservations||{}),[22]);
});
test('a screen showing only the delivery counter keeps its quota as a destination total',()=>{
 const out=withScreens({...job,shipments:[]},[frame(sample)]);
 assert.equal(out.shipments[0]?.from,'');assert.equal(Object.values(out.reservations||{})[0]??out.shipments[0]?.scu,22);
});
test('an English header keeps the title and reads only a complete screen reward',()=>{
 const body='\nPRIMARY OBJECTIVES\nDeliver 0/3 SCU of Food to Orison.\nCollect Food from Lorville.';
 const good=frame('Reward          a 65,250\nJunior Rank - Small Cargo Haul           Contract Availability'+body);
 assert.equal(good.pay,65250);assert.equal(good.title,'Junior Rank - Small Cargo Haul');
 assert.equal(frame('Reward       a 123,50C\nExperienced Rank - Small Cargo Haul'+body).pay,null);
});
