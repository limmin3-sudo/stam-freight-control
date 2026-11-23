import guide from './assets/lounge-guide-welcome.webp';
import operator from './assets/first-departure/operator-standing.webp';
import navigator from './assets/first-departure/navigator-standing.webp';
import professor from './assets/first-departure/professor-standing.webp';
import broker from './assets/first-departure/broker-standing.webp';
import officer from './assets/first-departure/officer-standing.webp';
import loungeLocation from './assets/first-departure/crew-lounge.webp';
import bridgeLocation from './assets/first-departure/crew-bridge.webp';
import academyLocation from './assets/first-departure/crew-academy.webp';
import tradeLocation from './assets/first-departure/crew-trade.webp';
import type {Locale} from './navigation';
import {spaceHash, type SpaceRoute} from './space-navigation';
import './opening-crew.css';

type Localized = readonly [ko: string, en: string];
type Partner = Readonly<{
  image: string;
  location: string;
  name: Localized;
  specialty: Localized;
  greeting: Localized;
  body: Localized;
  destination: Localized;
  route: Omit<SpaceRoute, 'locale'>;
}>;

const partners: readonly Partner[] = [
  {
    image: guide,
    location: loungeLocation,
    name: ['플라이트 가이드', 'Flight Guide'],
    specialty: ['시설 안내 · 튜토리얼 연결', 'Facility orientation · Tutorials'],
    greeting: ['어서 오세요, 함장님. 어디부터 안내해 드릴까요?', 'Welcome, Captain. Where would you like to begin?'],
    body: [
      '안내데스크에서 시설 위치와 이용 방법을 알려드립니다. 첫 운송이나 무역을 준비 중이시면 아카데미 교수님께 연결해 드릴게요.',
      'I can show you where to go and how each facility works. If you’re preparing for your first haul or trade, I’ll introduce you to our academy instructor.',
    ],
    destination: ['안내데스크로', 'Visit the welcome desk'],
    route: {screen: 'guide'},
  },
  {
    image: operator,
    location: bridgeLocation,
    name: ['브리지 오퍼레이터', 'Bridge Operator'],
    specialty: ['계약 정리 · 픽업과 배송 · 근거리 항로', 'Contracts · Pickup and delivery · Local routes'],
    greeting: ['함장님, 여기예요! 오늘 들어온 계약부터 같이 볼까요?', 'Captain, over here! Shall we check today’s contracts?'],
    body: [
      '게임 로그나 스크린샷으로 들어온 계약을 정리하고 어디서 몇 상자를 싣고 내릴지 확인해요. 가까운 픽업과 배송지를 묶어서 짧은 동선부터 짜볼게요!',
      'We’ll review the contracts that came in from your game log or screenshots and check how many crates go at each stop. Then I’ll group nearby pickups and deliveries so we can plan a short run.',
    ],
    destination: ['미션 콘솔로', 'Open the mission console'],
    route: {screen: 'mission'},
  },
  {
    image: navigator,
    location: bridgeLocation,
    name: ['수석 항해사', 'Senior Navigator'],
    specialty: ['퀀텀 항로 · 장거리 운항 · 거점 순서', 'Quantum routes · Long-haul planning · Stop order'],
    greeting: ['왔나, 함장. 오늘은 좀 멀리 나가나 보군.', 'Good to see you, Captain. A long run today?'],
    body: [
      '먼 길이라면 한 행성권에서 실을 화물을 먼저 모아 가는 게 좋지. 퀀텀 항로하고 들를 거점을 지도에 펼쳐 놓고, 어디부터 가야 두 번 들르는 일이 줄어드는지 같이 보자고.',
      'On a long run, it pays to collect everything you can in one planetary region before moving on. Let’s lay out the quantum route and work out which stops to make first so we don’t have to double back.',
    ],
    destination: ['항로 지도로', 'Open the route map'],
    route: {screen: 'map'},
  },
  {
    image: professor,
    location: academyLocation,
    name: ['아카데미 지도 교수', 'Academy Instructor'],
    specialty: ['운송 실습 · 무역 실습', 'Freight practice · Trade practice'],
    greeting: ['함장, 이리 와요. 계약서 한 장부터 같이 볼까요?', 'Come on over, Captain. Shall we start with one contract?'],
    body: [
      '운송 실습에서는 어디서 싣고 어디에 내릴지부터 짚어요. 무역 실습에서는 시세표를 읽고 매입·판매 계획을 직접 짜볼 거예요. 처음이면 운송부터 천천히 해봐요.',
      'In freight practice we’ll start with where to load and where to unload. In trade practice you’ll read the price board and make your own buying and selling plan. If you’re new, we can take freight one step at a time.',
    ],
    destination: ['아카데미로', 'Visit the academy'],
    route: {screen: 'division', facility: 'guide-center'},
  },
  {
    image: broker,
    location: tradeLocation,
    name: ['링 가문 중개인', 'Ling Family Broker'],
    specialty: ['시세 비교 · 품목 선정 · 무역 경로', 'Price comparison · Commodity selection · Trade routes'],
    greeting: ['함장님, 시세부터 보시죠. 판단은 그다음입니다.', 'Prices first, Captain. Then we can make a decision.'],
    body: [
      '어디에서 얼마에 살 수 있고 어디에서 팔 수 있는지 비교해 드리죠. 예산과 적재 한도를 알려주시면 그 조건에서 검토할 품목과 경로를 골라드리겠습니다.',
      'I’ll compare where you can buy and what each market pays. Give me your budget and cargo limit, and I’ll narrow down the commodities and routes worth considering.',
    ],
    destination: ['무역 시세표로', 'Open the price board'],
    route: {screen: 'division', facility: 'trade', lobbyRoom: 'market'},
  },
  {
    image: officer,
    location: tradeLocation,
    name: ['수석 무역관', 'Senior Trade Officer'],
    specialty: ['매입·판매 기록 · 운송 비용 · 거래 수익', 'Trade records · Operating costs · Profit'],
    greeting: ['수고했네, 함장. 장부는 나랑 같이 보세.', 'Well done, Captain. Let’s go over the ledger together.'],
    body: [
      '실제 매입과 판매를 기록하고 이번 운항에 든 비용을 빼 보세. 아직 팔지 않은 화물도 따로 표시해 두면 다음에 얼마를 더 팔아야 할지 알 수 있다네.',
      'Let’s log what you bought and sold and deduct the cost of the run. We’ll set aside what hasn’t sold so you know what’s left to move next time.',
    ],
    destination: ['거래 기록으로', 'Open trade records'],
    route: {screen: 'division', facility: 'trade', lobbyRoom: 'trade-operations'},
  },
];

export function OpeningCrew({locale}: {locale: Locale}) {
  const lang = locale === 'en' ? 1 : 0;

  return <section className="departure-crew" id="departure-crew" aria-labelledby="departure-crew-title" tabIndex={-1}>
    <h2 id="departure-crew-title" data-departure-reveal>{lang ? 'Meet your partners' : '함장님을 맞이할 파트너들'}</h2>
    <div className="departure-crew-layout">
      <div className="departure-crew-stage" aria-hidden="true">
        {partners.map((partner, index) => <figure key={partner.image} data-crew-figure={index}
          data-active={index === 0 ? 'true' : 'false'}>
          <img className="departure-crew-location" src={partner.location} alt="" loading="lazy" />
          <img className="departure-crew-actor" src={partner.image} alt="" loading="lazy" />
        </figure>)}
      </div>
      <div className="departure-crew-messages">
        {partners.map((partner, index) => <article key={partner.image} data-crew-row={index} data-departure-reveal>
          <figure className="departure-crew-mobile-figure" aria-hidden="true">
            <img className="departure-crew-location" src={partner.location} alt="" loading="lazy" />
            <img className="departure-crew-actor" src={partner.image} alt="" loading="lazy" />
          </figure>
          <div className="departure-crew-message">
            <h3>{partner.name[lang]}</h3>
            <p className="departure-crew-specialty">{partner.specialty[lang]}</p>
            <blockquote>
              <p>{partner.greeting[lang]}</p>
              <p>{partner.body[lang]}</p>
            </blockquote>
            <a href={spaceHash({...partner.route, locale})}>{partner.destination[lang]} <span aria-hidden="true">↗</span></a>
          </div>
        </article>)}
      </div>
    </div>
  </section>;
}
