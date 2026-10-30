import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMissionText} from '../ocr.mjs';

const loc=(id,name,type='Outpost',system='stanton')=>({id,name,type,system});
const locations=[loc('monox','Monox','Planet','pyro'),loc('sunset','Sunset Mesa','Outpost','pyro'),loc('norgaard','HDMS-Norgaard'),loc('brio',"Brio's Breaker Yard"),loc('smca8','Shubin Mining Facility SMCa-8'),loc('smca6','Shubin Mining Facility SMCa-6'),loc('arc056','ArcCorp Mining Area 056')];

test('Korean mission screen: translated site names, site over planet, reward and title', ()=>{
  const r=parseMissionText(`링 가문 신입 화물 운송 - 소량 화물 [BP] [100 평판]
보상 ¤ 476,500
기념품을(를) 0/2 SCU 파이로 II의 선셋 메사에 배송하십시오.
HDMS-노가드에서 기념품을(를) 접수하십시오.
증류주를(를) 0/1 SCU 파이로 II의 선셋 메사에 배송하십시오.
브레오 함선 폐기장에서 증류주를(를) 접수하십시오.
가공 식품을(를) 0/4 SCU 파이로 II의 선셋 메사에 배송하십시오.
슈빈 채광 시설 SMCa-8에서 가공 식품을(를) 접수하십시오.
스윙을(를) 0/2 SCU 파이로 II의 선셋 메사에 배송하십시오.
아크릴 채광 구역 056에서 스윙을(를) 접수하십시오.`,locations);
  assert.equal(r.title,'링 가문 신입 화물 운송 - 소량 화물 [BP] [100 평판]');
  assert.equal(r.reward,476500);
  assert.deepEqual(r.cargo.map(c=>[c.commodity,c.scu,c.pickupId,c.dropoffId]),[
    ['기념품',2,'norgaard','sunset'],['증류주',1,'brio','sunset'],['가공 식품',4,'smca8','sunset'],['스윙',2,'arc056','sunset']]);
});

const pyro=[loc('ignis','Ignis','Moon','pyro'),loc('vatra','Vatra','Moon','pyro'),loc('seer',"Seer's Canyon",'Outpost','pyro'),loc('ashland','Ashland','Outpost','pyro'),loc('gaslight','Gaslight','Manmade','pyro'),loc('orbituary','Orbituary','Manmade','pyro'),loc('shallow','CRU-L4 Shallow Fields Station','Manmade'),loc('frontier','MIC-L1 Shallow Frontier Station','Manmade'),loc('grim','Grim HEX','Manmade'),loc('orison','Orison','LandingZone'),loc('lorville','Lorville','LandingZone'),...locations];
const route=r=>r.cargo.map(c=>[c.commodity,c.scu,c.pickupId,c.dropoffId]);

test('Dead Saints: bracketed English names, wrapped lines and title with reputation on the next line', ()=>{
  const r=parseMissionText(`DEAD SAINTS - 신입 Rank - 중형 Cargo Haul
[100 평판]
보상 ¤ 525,500
계약 발주자 데드 세인츠
레버넌트 나무 꿀가루를(를) 0/16 SCU 파이로 5b의 시어스 캐니언에
배송하십시오.
CRU-L4 섈로우 필즈 스테이션 [Shallow Fields]에서 레버넌트 나무
꿀가루를(를) 접수하십시오.
네온을(를) 0/8 SCU 파이로 5b의 시어스 캐니언에 배송하십시오.
CRU-L4 섈로우 필즈 스테이션 [Shallow Fields]에서 네온을(를)
접수하십시오.
SLAM을(를) 0/4 SCU 파이로 5a의 에쉬랜드에 배송하십시오.
CRU-L4 섈로우 필즈 스테이션 [Shallow Fields]에서 SLAM을(를)
접수하십시오.`,pyro);
  assert.equal(r.title,'DEAD SAINTS - 신입 Rank - 중형 Cargo Haul [100 평판]');
  assert.equal(r.reward,525500);
  assert.match(r.company,/dead saints|데드\s*세인츠/i);
  assert.deepEqual(route(r),[['레버넌트 나무 꿀가루',16,'shallow','seer'],['네온',8,'shallow','seer'],['SLAM',4,'shallow','ashland']]);
});

test('"…에 있는" locations, OCR "504" for SCU and Korean spaceport names', ()=>{
  const r=parseMissionText(`DEAD SAINTS - 신입 Rank - 중형 Cargo Haul [100 평판]
보상: 477,750
유기체을(를) 0/64 504 파이로 V의 L2 라그랑주에 있는 가스라이트에 배송하십시오.
오리슨에서 유기체을(를) 접수하십시오.
유기체을(를) 0/64 SCU 파이로 III 상공에 있는 오비츄어리에 배송하십시오.
오리슨에서 유기체을(를) 접수하십시오.
---
냉동포드을(를) 0/4 SCU 파이로 II의 선셋 메사에 배송하십시오.
티사 스페이스포트에서 냉동포드을(를) 접수하십시오.
그림 헥스에서 SLAM을(를) 접수하십시오.`.split('---')[0],pyro);
  assert.equal(r.reward,477750);
  assert.deepEqual(route(r),[['유기체',64,'orison','gaslight'],['유기체',64,'orison','orbituary']]);
  const t=parseMissionText(`중형 신입 화물 계약자 필요 [200-4,000 평판]
냉동포드을(를) 0/4 SCU 파이로 II의 선셋 메사에 배송하십시오.
티사 스페이스포트에서 냉동포드을(를) 접수하십시오.`,pyro);
  assert.equal(t.title,'중형 신입 화물 계약자 필요 [200-4,000 평판]');
  assert.deepEqual(route(t),[['냉동포드',4,'lorville','sunset']]);
});
