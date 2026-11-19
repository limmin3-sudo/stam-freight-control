import welcomeDesk from '../../../docs/cinematics/lounge-guide-dialogue-20261119/01-approach-start.png';
import {spaceConfig} from './space-config';
import bridgeArrival from './assets/guided-visit/arrival.webp';
import operator from './assets/guided-visit/contractlist.webp';
import navigator from './assets/guided-visit/starmap.webp';
import bridgeCrew from './assets/guided-visit/bridge-crew.webp';
import tradeLobby from './assets/guided-visit/trade.webp';
import tradeTeam from './assets/guided-visit/trade-team.webp';
import officer from './assets/guided-visit/priceboard.webp';
import broker from './assets/guided-visit/brokerdesk.webp';
import faculty from './assets/guided-visit/academy.webp';
import professor from './assets/guided-visit/classroom.webp';
import academyTeam from './assets/guided-visit/academy-team.webp';
import {divisionFacilities} from './division-facilities';

export const speakers = {
  guide: ['플라이트 가이드', 'Flight guide'],
  desk: ['접수 직원', 'Receptionist'],
  operator: ['브리지 오퍼레이터', 'Bridge operator'],
  navigator: ['수석 항해사', 'Senior navigator'],
  senior: ['수석 무역관', 'Senior trade officer'],
  broker: ['링 가문 중개인', 'House Ling broker'],
  professor: ['교수', 'Professor'],
} as const;

function line(speaker: keyof typeof speakers, plate: string, ko: string, en: string, loungeView?: 'guide' | 'gate') {
  return {speaker, plate, loungeView, text: [ko, en] as const};
}

function chapter(id: string, lines: ReturnType<typeof line>[]) {
  const place = divisionFacilities.find(facility => facility.id === id)!;
  return {name: place.name, marker: place.marker, lines};
}

export const boardingLounge = spaceConfig.scenes.lounge.image;
export const boardingGate = spaceConfig.scenes.lounge.targets.find(target => target.id === 'gate')!;

export const visitChapters = [
  chapter('lounge', [
    line('guide', welcomeDesk, '어서 오세요. 출항 전에 네 곳만 잠깐 둘러보시죠. 여기가 라운지 안내 데스크예요.',
      'Welcome. Let me show you our four facilities before departure. This is the lounge welcome desk.'),
    line('desk', welcomeDesk, '다시 오시면 여기서 운송 준비를 시작하거나 시설 안내를 다시 받으실 수 있어요.',
      'When you come back, you can start preparing a haul here or take the tour again.'),
    line('guide', boardingLounge, '지난 운송 기록은 서비스센터에서, 함선과 화물 자료는 아카이브에서 확인하실 수 있어요.',
      'The service centre keeps your haul records. The archive has references for ships and cargo.', 'guide'),
    line('desk', boardingLounge, '관제센터로 가시려면 데스크 옆 탑승 게이트를 이용하세요. 셔틀은 거기서 타시면 돼요.',
      'For the control centre, take the shuttle from the boarding gate beside this desk.', 'gate'),
    line('guide', boardingLounge, '저쪽 유리문이에요. 저와 함께 가시죠. 도착하면 오퍼레이터를 소개해 드릴게요.',
      'Through those glass doors. Come with me. I’ll introduce you to the operator when we arrive.', 'gate'),
  ]),
  chapter('bridge', [
    line('guide', bridgeArrival, '오퍼레이터님, 첫 운송을 준비하시는 분을 모셔 왔어요.',
      'Operator, we have a visitor getting ready for a first haul.'),
    line('operator', bridgeArrival, '잘 오셨어요! 마침 의뢰 목록을 열어 뒀어요.',
      'Perfect timing! I’ve got the contract list open.'),
    line('operator', operator, '미션 콘솔에서 픽업지랑 배송지, 보수를 보고 마음에 드는 의뢰를 고르세요.',
      'At the mission console, compare pickup sites, destinations and payouts, then choose a job.'),
    line('navigator', navigator, '의뢰를 골랐으면 지도를 봐요. 어디서 싣고 어느 순서로 내릴지 한눈에 보이지.',
      'Once you’ve picked a job, bring up the star map. It shows where to load and the order of your stops.'),
    line('operator', bridgeCrew, '비행 중엔 관제 콘솔로 오세요. 지금 실은 짐과 다음 할 일이 같이 떠요!',
      'Once you’re flying, open the control console. Your cargo and your next task are right there together!'),
  ]),
  chapter('trade', [
    line('guide', tradeLobby, '이번엔 무역센터예요. 무역관님, 오늘 처음 오신 분이에요.',
      'Here we are at the trade centre. Let me introduce our newest visitor.'),
    line('senior', tradeLobby, '아이고, 잘 왔어요. 이 행성계 안에서 다닐 길은 내가 같이 찾아 줄게요.',
      'Good to meet you. If you’re staying in this system, I’ll help you find a run.'),
    line('senior', officer, '유리벽 안 무역관제실에서 시세부터 봐요. 내 배와 가진 돈에 맞춰 경로도 짤 수 있지.',
      'Start with prices in trade control, behind the glass. You can plan a route for your ship and budget there.'),
    line('broker', broker, '행성계 간 항로는 제가 맡고 있어요. 어느 행성계에서 출발하실지 알려 주시죠.',
      'I handle routes between systems. Tell me which system you intend to depart from.'),
    line('broker', tradeTeam, '거래를 마치면 옆 거래기록실로 오세요. 실제 매입·판매를 기록하고 남은 화물과 수익을 정산할 수 있어요.',
      'After trading, visit the records room next door. Log your purchases and sales, then tally your stock and profit.'),
  ]),
  chapter('guide-center', [
    line('guide', faculty, '마지막은 아카데미예요. 교수님, 첫 의뢰를 고르기 전에 들러 볼 만한 곳이 있을까요?',
      'Our last stop is the academy. Professor, where should a new pilot look before choosing a first job?'),
    line('professor', faculty, '잘 왔어요. 함선이나 미션 이름이 낯설 땐 운송 정보실에서 찾아보면 돼요.',
      'I’m glad you asked. If a ship or mission is unfamiliar, look it up in the freight reference room.'),
    line('professor', professor, '교육실에서는 내 배와 평판에 맞는 의뢰를 비교해 봐요. 처음이면 여기부터 같이 볼까요?',
      'In the classroom, compare contracts for your ship and reputation rank. Shall we start there?'),
    line('professor', academyTeam, '두 계약을 묶을까 싶으면 작전 연구실로 와요. 따로 나를 때와 한 번에 나를 때를 비교할 수 있어요.',
      'If you’re thinking of pairing two contracts, come to operations study. You can compare one combined run with two separate trips.'),
    line('guide', academyTeam, '안내는 여기까지예요. 시설 지도로 돌아가시면 가 보고 싶은 곳을 직접 고르실 수 있어요.',
      'That concludes our tour. Back at the facility map, you can choose where you’d like to go first.'),
  ]),
];
