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

test('two incomplete receipts with the same title never compete on which card has an empty field',()=>{
 const f=frame(withPickup),other:Job={...job,id:'other',shipments:[{...job.shipments[0]!,cargo:['',''],scu:0}]};
 assert.deepEqual(matchFrame(f,[job,other]),[]);
 assert.deepEqual(matchFrame({...f,missionId:job.id},[other,job]).map(j=>j.id),[job.id]);
 assert.equal(withScreens(other,[{...f,missionId:job.id}]),other);
 const priced={...job,pay:104500,rewardUnknown:false};
 assert.deepEqual(matchFrame(f,[priced,{...other,pay:30000,rewardUnknown:false}]).map(j=>j.id),[job.id]);
 assert.deepEqual(matchFrame(f,[priced,other]),[]);
});
test('a unique objective fills only missing fields; conflicting known values and ambiguous rows survive',()=>{
 const f=frame(withPickup),r=job.shipments[0]!;
 const blank:Job={...job,shipments:[{...r,cargo:['','']}]};
 const updated=withScreens(blank,[f]);
 assert.equal(updated.shipments.length,1);assert.equal(updated.shipments[0]!.id,r.id);
 assert.equal(updated.shipments[0]!.cargo[0],'폐기물');assert.ok(updated.shipments[0]!.to);
 const conflicting={...job,shipments:[{...r,scu:31}]};
 assert.equal(withScreens(conflicting,[f]),conflicting);
 const twins={...job,shipments:[r,{...r,id:'other'}]};
 assert.equal(withScreens(twins,[f]),twins);
 const priced={...job,pay:80000,rewardUnknown:false};
 assert.equal(withScreens(priced,[f]).pay,80000);
});

test('a later observed single-delivery counter resolves a held screen only within its original cohort',async()=>{
 const {retryFrame}=await import('../src/contract-screen.ts');
 const first={...job,singleDeliveryScu:22},other={...job,id:'second'},ids=[first.id,other.id],f=frame(withPickup);
 assert.equal(retryFrame(f,ids,[first,other]),undefined);
 assert.equal(retryFrame(f,ids,[first]),undefined);
 assert.equal(retryFrame(f,ids,[first,{...other,state:'ended'}]),undefined);
 assert.equal(retryFrame(f,ids,[first,{...other,singleDeliveryScu:11},{...job,id:'new'}])?.id,job.id);
 assert.equal(retryFrame(f,ids,[first,{...other,singleDeliveryScu:22}]),undefined);
});

test('five equal titles retain instance ownership when a sibling ends and a new contract is accepted',async()=>{
 const {retryFrame,frameCandidates}=await import('../src/contract-screen.ts');
 const f=frame(withPickup),row=withScreens(job,[f]).shipments[0]!;
 const copy=(id:string,cargo:string,from:string,to:string):Job=>({...job,id,directEvidence:{cargo,from,to}});
 const target=copy('four','Waste',row.from,row.to);
 const cohort=[copy('one','Hydrogen',row.from,row.to),copy('two','Waste',row.to,row.from),
  copy('three','Waste',row.to,row.to),target,copy('five','Waste',row.from,row.from)];
 const ids=cohort.map(j=>j.id);
 assert.deepEqual(frameCandidates(f,cohort).map(j=>j.id),['four']);
 const next=[{...target,id:'six'},...cohort.map(j=>j.id==='two'?{...j,state:'ended' as const}:j)];
 assert.equal(retryFrame(f,ids,next)?.id,'four');
 assert.equal(retryFrame(f,ids,next.map(j=>j.id==='four'?{...j,state:'ended'}:j)),undefined);
 const ambiguous=cohort.map(j=>j.id==='two'?{...target,id:'two'}:j);
 assert.deepEqual(frameCandidates(f,ambiguous).map(j=>j.id),['two','four']);
 assert.equal(retryFrame(f,ids,ambiguous.map(j=>j.id==='two'?{...j,state:'ended'}:j)),undefined);
 assert.equal(retryFrame(f,ids,cohort.map(j=>j.id==='one'?{...j,directEvidence:undefined}:j)),undefined);
});
test('two known pickups and one delivery total stay one contract through route planning and first pickup',async()=>{
 const {calculateFlight}=await import('../src/flight-engine.mjs');
 const {blankRun,startRun,completeStep}=await import('../src/flight-session.ts');
 const {emptyDraft,routeReady,receiptRouteLabel}=await import('../src/mission-trial.ts');
 const {planningPartner}=await import('../src/partner-policy.ts');
 const f=frame(withPickup+'\n폐기물을 세이크런스 플롯에서 수집하세요.');
 const card=withScreens(job,[f]);
 assert.deepEqual(card.shipments.map(r=>r.scu),[0,0]);
 assert.deepEqual(Object.values(card.reservations||{}),[22]);
 const routeOnly={...card,reservations:{},mission:undefined};
 assert.ok(routeReady(routeOnly));assert.equal(receiptRouteLabel(routeOnly,false),'경로 준비됨 · 수량 확인 필요');
 const partner=planningPartner([routeOnly],'navigator');assert.equal(partner,'operator');
 const draft={...emptyDraft(),jobs:[routeOnly],start:card.shipments[0]!.from,partner};
 const plan=calculateFlight(draft);
 const pickupVisits=plan.visits.filter(v=>v.events.some(e=>e.type==='pickup'));
 assert.equal(pickupVisits.length,2);assert.equal(plan.visits.at(-1)?.locationId,card.shipments[0]!.to);
 let run=startRun(blankRun(plan));
 for(let n=0;n<30&&run.index<=plan.visits.indexOf(pickupVisits[0]!);n++)run=completeStep(plan,run);
 assert.equal(run.finished,false);assert.ok(plan.visits.slice(run.index).includes(pickupVisits[1]!));
});

test('spoken choice refers to the numbered crop candidates and respects pickup and delivery roles',async()=>{
 const {spokenScreenChoice}=await import('../src/contract-screen.ts');
 const make=(id:string,from:string,to:string)=>({...job,id,shipments:[{...job.shipments[0]!,from,to}]});
 const a=make('a','가스라이트','루인'),b=make('b','루인','가스라이트'),pick=(text:string,cards=[a,b])=>spokenScreenChoice(text,cards,v=>v)?.id;
 assert.equal(pick('가스라이트에서 싣는 거'),'a');
 assert.equal(pick('가스라이트에서 내리는 거'),'b');
 assert.equal(pick('가스라이트'),undefined);
 assert.equal(pick('가스라이트 말고'),undefined);
 assert.equal(pick('루인에서 싣는 거',[b,{...b,id:'c'}]),undefined);
 assert.equal(pick('2번'),'b');assert.equal(pick('두 번째'),'b');assert.equal(pick('8번'),undefined);
});

test('a damaged Korean title requires a unique shipment and its observed delivery quota',()=>{
 const damaged={...frame(withPickup),title:'직송 ㆍ수습생 등급 aT 운송 화물'};
 const expected={...job,singleDeliveryScu:22},other={...expected,id:'sibling',singleDeliveryScu:14};
 assert.deepEqual(matchFrame(damaged,[other,expected]).map(j=>j.id),[expected.id]);
 assert.equal(matchFrame(damaged,[{...expected,singleDeliveryScu:undefined}]).length,0);
 assert.equal(matchFrame(damaged,[expected,{...other,singleDeliveryScu:undefined}]).length,0);
 assert.equal(matchFrame({...damaged,acceptedTab:false},[expected]).length,0);
});

test('Korean station spellings lead to the same Ruin Station route',()=>{
 const route=(name:string)=>withScreens(job,[frame(withPickup.replace('차울라 해변',name))]).shipments[0]!.to;
 assert.ok(route('Ruin Station'));
 assert.equal(route('루인 스테이션'),route('Ruin Station'));
 assert.equal(route('루인 정거장'),route('Ruin Station'));
});
