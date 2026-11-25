import test from 'node:test';
import assert from 'node:assert/strict';
import {receiptVoiceHints,fillSpokenReceipt,receiptNumber,receiptQuantityEdit,receiptAddress,type ReceiptConversation} from '../src/spoken-receipt.ts';
import type {Job} from '../src/mission-trial';
const job:Job={id:'m2',title:['소량 운송','Small haul'],signature:'received',pay:500,state:'incomplete',shipments:[]};
const begin=():ReceiptConversation=>({fields:{}});
test('card position markers are separate from quantities and existing edit commands',()=>{
 for(const text of ['두 번째 미션은 로어빌에서','미션 2번 로어빌에서','2번 계약 로어빌에서','contract 2 로어빌에서']){
  assert.deepEqual(receiptAddress(text),{number:2,body:'로어빌에서'});
 }
 assert.equal(receiptAddress('2번 계약 제외해줘'),null);
 assert.equal(receiptAddress('티타늄 40 SCU'),null);
});
test('a received card accepts shuffled fields, colloquial units and reversed pickup/delivery order',()=>{
 const sentences=['로어빌에서 오리슨으로 티타늄 40 SCU 실을 거야','오리슨까지, 로어빌에서 실을 건 티타늄이고 양은 마흔이야',
  '로어빌에서 티타늄 마흔 싣고 오리슨 가는 거야','품목은 티타늄, 수량은 사십, 배송지는 오리슨, 출발지는 로어빌','로어빌에서 오리슨으로 티타늄 40을 실을 거야'];
 const results=sentences.map(text=>fillSpokenReceipt(job,text,begin()));
 for(const result of results){
  assert.ok(result.job,result.question);assert.equal(result.job.id,'m2');assert.equal(result.job.shipments[0]?.scu,40);
  assert.deepEqual(result.job.shipments[0]?.cargo,['티타늄','Titanium']);assert.deepEqual(result.job.shipments,results[0]?.job?.shipments);
 }
 assert.deepEqual(job.shipments,[]);
});
test('an unqualified port prompts for its role; subsequent turns retain amount and cargo',()=>{
 const state=begin();
 assert.match(fillSpokenReceipt(job,'오리슨 티타늄 마흔 SCU',state).question,/픽업지인가요/);
 assert.match(fillSpokenReceipt(job,'배송지야',state).question,/어디에서/);
 assert.equal(fillSpokenReceipt(job,'로어빌',state).job?.shipments[0]?.scu,40);
});
test('one cargo row can be completed without assigning a quantity to a sibling or overwriting a known value',()=>{
 const base=fillSpokenReceipt(job,'로어빌에서 오리슨까지 티타늄 40 SCU',begin()).job!;
 const r={...base.shipments[0]!,scu:0};
 const two={...job,shipments:[r,{...r,id:'sibling'}]};
 const state=begin();
 assert.match(fillSpokenReceipt(two,'수량은 마흔',state).question,/어느 화물/);
 assert.deepEqual(fillSpokenReceipt(two,'두 번째 화물',state).job?.shipments.map(r=>r.scu),[0,40]);
 assert.match(fillSpokenReceipt(base,'티타늄 50 SCU',begin()).question,/달라요/);
});
test('a planet follow-up keeps the other stop, amount and commodity, and checks the facility',()=>{
 const state=begin();
 assert.match(fillSpokenReceipt(job,'허스턴에서 티타늄 마흔 SCU 싣고 오리슨으로 갈 거야',state).question,/허스턴의 어느/);
 assert.match(fillSpokenReceipt(job,'뉴 배비지',state).question,/속한 시설/);
 const completed=fillSpokenReceipt(job,'로어빌',state);
 assert.equal(completed.job?.shipments[0]?.scu,40,completed.question);
 assert.equal(completed.job?.shipments[0]?.cargo[1],'Titanium');
 assert.equal(receiptAddress('이번 미션은 수량 사십')?.number,0);
 assert.equal(receiptAddress('2번 미션 빼 줘'),null);
});
test('multi-stop allocation preserves totals and asks before mixing pickups',()=>{
 const draft=begin();
 const q=fillSpokenReceipt(job,'티타늄은 세이크에서 스물, 가스라이트에서 열 싣고, 차울라에 열다섯 내려. 나머지는 루인으로.',draft);
 assert.match(q.question,/자유 배분/);
 const result=fillSpokenReceipt(job,'자유 배분',draft);assert.ok(result.job,result.question);
 assert.match(result.summary!,/세이크런스 플롯 20/);assert.match(result.summary!,/루인 정거장 15/);
 assert.equal(result.job.shipments.reduce((n,r)=>n+r.scu,0),30);
});
test('an unknown split asks for a single stop and accepts a short answer',()=>{
 const state=begin();
 assert.match(fillSpokenReceipt(job,'티타늄 세이크에서 40 싣고 차울라랑 루인에 나눠 내려',state).question,/차울라.*몇 SCU/);
 const result=fillSpokenReceipt(job,'거기 열다섯',state);
 assert.ok(result.job,result.question);assert.deepEqual(result.job.shipments.map(r=>r.scu),[15,25]);
 const rows=result.job.shipments.map(r=>({...r,scu:0}));
 const saved=fillSpokenReceipt({...job,shipments:rows},'티타늄 세이크에서 40 싣고 차울라에 15, 루인에 25',begin());
 assert.deepEqual(saved.job?.shipments.map(r=>r.id),rows.map(r=>r.id));
});
test('same stop amounts are handled in English and contradictory totals cannot be applied',()=>{
 const state=begin();const q=fillSpokenReceipt(job,"Titanium from Gaslight 20 SCU to Ruin Station 10 SCU to Orison 15 SCU",state,true);
 assert.match(q.question,/totals differ/);
 const result=fillSpokenReceipt(job,'Orison 10 SCU',state,true);assert.ok(result.job,result.question);
});
test('explicit linked cargo legs can be spoken together without mixing commodities',()=>{
 const result=fillSpokenReceipt(job,'세이크에서 차울라로 티타늄 20 SCU, 가스라이트에서 루인으로 수소 10 SCU',begin());
 assert.ok(result.job,result.question);assert.deepEqual(result.job.shipments.map(r=>[r.cargo[1],r.scu]),[['Titanium',20],['Hydrogen',10]]);
 const original=result.job;
 const changed=fillSpokenReceipt(original,'세이크에서 차울라로 티타늄 40 SCU, 가스라이트에서 루인으로 수소 10 SCU',begin());
 assert.equal(changed.job,undefined);assert.equal(original.shipments[0]!.scu,20);
});
test('minor mishearings resolve only within the place and cargo fields',()=>{
 const baseline=fillSpokenReceipt(job,'가스라이트에서 차울라로 티타늄 40 SCU',begin());
 const corrected=fillSpokenReceipt(job,'가스라잇트에서 차울라로 티타뉼 40 SCU',begin());
 assert.ok(corrected.job,corrected.question);assert.deepEqual(corrected.job.shipments,baseline.job?.shipments);
 assert.equal(fillSpokenReceipt(job,'일째 이러고 있어 자이디 옵티머스 헬스 유어',begin()).job,undefined);
});

test('clear quantity changes keep sibling rows and ask once about the delivery or row',()=>{
 const multi=fillSpokenReceipt(job,'세이크에서 차울라로 티타늄 20 SCU, 가스라이트에서 루인으로 수소 10 SCU',begin()).job!;
 const state=begin();
 assert.match(receiptQuantityEdit(multi,'수량 14로 바꿔',state,false)!.question,/어느 배송지/);
 assert.equal(receiptQuantityEdit(multi,'모르는 곳',state,false)?.job,undefined);
 const next=receiptQuantityEdit(multi,'차울라',state,false)!.job!;
 assert.deepEqual(next.shipments.map(x=>x.scu),[14,10]);
 assert.deepEqual(multi.shipments.map(x=>x.scu),[20,10]);
 const same={...multi,shipments:multi.shipments.map(r=>({...r,to:multi.shipments[0]!.to}))};
 const repeated=begin();
 assert.match(receiptQuantityEdit(same,'14로 바꿔',repeated,false)!.question,/몇 번째 화물/);
 assert.deepEqual(receiptQuantityEdit(same,'두 번째 화물',repeated,false)?.job?.shipments.map(r=>r.scu),[20,14]);
 assert.equal(receiptQuantityEdit(multi,'수량 -3으로 바꿔',begin(),false)?.job,undefined);
 assert.equal(receiptAddress('2번 계약 빼고 경로 다시 짜'),null);
 assert.equal(receiptNumber('2번 계약 빼고 경로 다시 짜'),2);
});

test('a numbered contract edit matches every shipment qualifier even when receipts share goods or destinations',()=>{
 const manifest=fillSpokenReceipt(job,'세이크에서 루인으로 티타늄 10 SCU, 가스라이트에서 루인으로 수소 20 SCU, 가스라이트에서 차울라로 티타늄 30 SCU',begin()).job!;
 for(const command of ['2번 계약, 루인에 내릴 티타늄만 14로 바꿔','두 번째 미션은 티타늄 루인행 수량을 열 네 SCU로 변경해 줘','contract 2 change titanium to Ruin Station quantity to fourteen']){
  const address=receiptAddress(command)!;assert.equal(address.number,2);
  const changed=receiptQuantityEdit(manifest,address.body,begin(),false);
  assert.deepEqual(changed?.job?.shipments.map(r=>r.scu),[14,20,30],command);
 }
 assert.deepEqual(receiptVoiceHints([job,manifest]),['2|루인|티타늄','2|루인|수소','2|차울라|티타늄']);
 const sample=begin();
 receiptQuantityEdit(manifest,'루인에 내릴 티타늄 수량 바꿔줘',sample,false);
 assert.equal(receiptQuantityEdit(manifest,'[9] - [4]',sample,false)?.job,undefined);
 assert.deepEqual(receiptQuantityEdit(manifest,'[14]',sample,false)?.job?.shipments.map(r=>r.scu),[14,20,30]);
 const draft=begin();
 assert.match(receiptQuantityEdit(manifest,'루인에 내릴 수량을 14로 바꿔',draft,false)!.question,/어느 품목/);
 assert.equal(receiptQuantityEdit(manifest,'차울라',draft,false)?.job,undefined);
 assert.deepEqual(receiptQuantityEdit(manifest,'티타늄',draft,false)?.job?.shipments.map(r=>r.scu),[14,20,30]);
 const spoken=begin();
 assert.match(receiptQuantityEdit(manifest,'루인에 내릴 티타늄 수량 바꿔줘',spoken,false)!.question,/몇 SCU/);
 assert.match(receiptQuantityEdit(job,'루인에 내릴 티타늄만 14로 바꿔',begin(),false)!.question,/등록된 화물이 없어요/);
 assert.match(receiptQuantityEdit(manifest,'네',spoken,false)!.question,/몇 SCU/);
 assert.equal(receiptQuantityEdit(manifest,'이상한 값',spoken,false)?.job,undefined);
 assert.deepEqual(receiptQuantityEdit(manifest,'열네',spoken,false)?.job?.shipments.map(r=>r.scu),[14,20,30]);
 const wrong=begin();
 assert.equal(receiptQuantityEdit(manifest,'차울라행 수소만 14로 바꿔',wrong,false)?.job,undefined);
 assert.equal(receiptQuantityEdit(manifest,'수소',wrong,false)?.job,undefined);
 assert.equal(receiptQuantityEdit(manifest,'루인에 내릴 정체불명 티타늄만 14로 바꿔',begin(),false)?.job,undefined);
 assert.deepEqual(manifest.shipments.map(r=>r.scu),[10,20,30]);
});

test('quantity replies choose destinations first, then pickups within the same commodity',()=>{
 const work=fillSpokenReceipt(job,'세이크에서 루인으로 티타늄 10 SCU, 가스라이트에서 루인으로 티타늄 20 SCU, 세이크에서 차울라로 티타늄 30 SCU',begin()).job!;
 const draft=begin();
 assert.match(receiptQuantityEdit(work,'티타늄을 14로 바꿔',draft,false)!.question,/어느 배송지.*1번 루인.*2번 차울라/);
 assert.match(receiptQuantityEdit(work,'루인에서',draft,false)!.question,/일치하는 화물이 없어요/);
 assert.match(receiptQuantityEdit(work,'루인으로 가는 거요',draft,false)!.question,/어느 수거지/);
 assert.match(receiptQuantityEdit(work,'차울라',draft,false)!.question,/일치하는 화물이 없어요/);
 assert.deepEqual(receiptQuantityEdit(work,'2번',draft,false)?.job?.shipments.map(r=>r.scu),[10,14,30]);
 assert.deepEqual(work.shipments.map(r=>r.scu),[10,20,30]);
});
