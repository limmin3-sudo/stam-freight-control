import type {AcademyLesson, AcademyText} from './academy-lessons';

export const firstHaul:AcademyText = ['첫 운송', 'First haul'];
export const firstTrade:AcademyText = ['첫 무역', 'First trade'];
const contracts:AcademyText = ['계약 비교', 'Choosing contracts'];
const market:AcademyText = ['무역 판단', 'Trade decisions'];
const rsi = {name:'RSI · Missions and Contracts', url:'https://support.robertsspaceindustries.com/hc/en-us/articles/360008918933-Missions-and-Contracts'};
const elevator = {name:'Star Citizen Docs · Hauling', url:'https://docs.sc/topics/careers/missions/hauling/'};
const firstMission = {name:'SCANZ · Your first cargo mission',url:'https://scanz.space/new-player-guide/your-first-cargo-mission'};
const tractor = {name:'Star Citizen Docs · Tractor beam',url:'https://docs.sc/topics/fps/equipment/tractor-beam/'};
const cargo = {name:'CIG · Cargo Guide',url:'https://api.star-citizen.wiki/comm-links/20040'};
const prices = {name:'UEX API · Commodity prices',url:'https://uexcorp.space/api/documentation/id/get_commodities_prices/'};
const terminals = {name:'UEX API · Terminals',url:'https://uexcorp.space/api/documentation/id/get_terminals/'};
const routes = {name:'UEX API · Commodity routes',url:'https://uexcorp.space/api/documentation/id/get_commodities_routes/'};
const haulers = {name:'SC Haulers · Commodity route planner',url:'https://schaulers.com/tools/commodity-route-planner'};
const definition = (name:string,slug:string)=>({name,url:'https://api.star-citizen.wiki/missions/'+slug});
const build:AcademyText = ['4.10.3 게임 계약 정의 · 실제 배정은 계약 화면에서 확인', '4.10.3 game contract definition · check your assigned contract'];
const sample:AcademyText = ['STAM 계산 예시 · 2026-11-16 수집 티타늄 시세(4.10.3), 비용·시간은 예시 조건', 'STAM worked example · 4.10.3 titanium quotes collected 2026-11-16, illustrative costs and times'];

export const fieldLessons:AcademyLesson[] = [
  {
    id:'red-wind-pyro-loop',topic:firstHaul,
    title:['파이로 레드 윈드 평판작 · 골렘 Ox로 한 바퀴 522,500 aUEC','Pyro Red Wind reputation loop · 522,500 aUEC in a Golem OX'],
    summary:['가스라이트를 기점으로 레드 윈드 물류의 수습생 직송 소량 운송 5건을 묶습니다. 차울라행 3건과 복귀편 2건이 각각 건당 104,500 aUEC입니다. 골렘 Ox(64 SCU)로 한 바퀴를 직접 재니 21분이 걸렸습니다.', 'Run five Red Wind trainee small direct hauls from Gaslight in a 64 SCU Golem OX. Three outbound and two return contracts pay 104,500 aUEC each. One lap was timed at 21 minutes.'],
    steps:[
      ['가스라이트(파이로 V L2)를 부활 지점으로 설정하고 의뢰 목록을 엽니다. 레드 윈드 물류의 「직송 · 수습생 등급 · 소량 운송 화물」을 찾으세요. 같은 이름의 계약이 여럿이므로 주요 목표의 픽업지와 배송지를 확인합니다.', 'Set your respawn at Gaslight (Pyro V L2). Open contracts and look for Red Wind’s trainee small direct hauls. Several offers have the same title, so read both the pickup and the destination.'],
      ['가스라이트에서 「지역 화물 운송」을 펼쳐 세이크런스 플롯 → 차울라 해변 2건을 수락합니다. 이어서 「행성 내 화물 운송」에서 가스라이트 → 차울라 해변 1건을 받습니다. 이제 3건의 배송지가 모두 차울라 해변입니다. 이 운항에서는 가스라이트 출발분인 폐기물 22 SCU만 여기서 싣습니다.', 'At Gaslight, open the local hauling category and accept two Sacren’s Plot → Chawla’s Beach offers. Open the planetary hauling category and accept one Gaslight → Chawla’s Beach offer. All three now share a destination. Load only the Gaslight pickup here: 22 SCU of waste on this run.'],
      ['약 3.9 Gm를 퀀텀 1회로 이동해 파이로 IV의 세이크런스 플롯에 착륙합니다. 수소 11 SCU와 가공 식품 9 SCU를 실으면 차울라행 적재량은 42 SCU입니다.', 'Make one quantum jump of about 3.9 Gm and land at Sacren’s Plot on Pyro IV. Load 11 SCU of hydrogen and 9 SCU of processed food for 42 SCU aboard.'],
      ['세이크런스 플롯에서 차울라 해변까지는 약 15 km입니다. 과속 주의! 왕복 모두 착륙 지점에 가까워지기 전에 NAV 부스트를 풀고 감속하세요. 차울라에서 3건을 납품하면 313,500 aUEC를 받습니다. 미션 쿨타임을 고려해 복귀편은 여기서 「행성 내 화물 운송」의 세이크런스 플롯 → 가스라이트 2건을 받으세요. 화물 엘리베이터를 미리 내려 두거나, 엘리베이터가 올라오는 동안 복귀 계약을 수락하면 대기 시간을 줄일 수 있습니다.', 'From Sacren’s Plot, fly about 15 km to Chawla’s Beach. Watch your speed on both legs: release NAV boost and slow down well before the landing site. Deliver the three contracts at Chawla for 313,500 aUEC. To work around the contract cooldowns, take the two planetary hauling contracts from Sacren’s Plot to Gaslight here. Send the freight elevator down ahead of time, or accept the return contracts while it comes back up.'],
      ['세이크런스 플롯으로 돌아가 탄소 26 SCU와 알루미늄 20 SCU를 싣습니다. 가스라이트에서 2건을 납품하면 209,000 aUEC를 더 받고 다음 바퀴를 시작할 수 있습니다.', 'Return to Sacren’s Plot for 26 SCU of carbon and 20 SCU of aluminium. Deliver both at Gaslight for another 209,000 aUEC and check the board for the next lap.'],
      ['골렘 Ox에 상자가 전부 안 실릴 때는 남는 상자를 두고 출발해도 됩니다. 배송지에서 실어 온 화물을 내리고 계약 화면에 표시된 수량과 보상을 확인한 뒤 제출하세요. 한 바퀴 522,500 aUEC는 다섯 건을 전량 납품한 기준입니다.', 'If some boxes will not fit in the Golem OX, leave the excess behind. Unload what you brought at the destination, check the quantity and reward shown in the contract, then submit it. The 522,500 aUEC lap assumes full delivery on all five contracts.'],
    ],
    example:{
      caption:['실제 계약 5건 · 최대 4 SCU 상자 조합','Five in-game contracts · box combinations up to 4 SCU'],
      columns:[['이번 화물 · 수량','Cargo on this run'],['계약 분류','Category'],['픽업 → 배송','Pickup → delivery'],['상자 크기 × 개수','Box size × count']],
      rows:[
        [['폐기물 22 SCU','Waste 22 SCU'],['행성 내 화물 운송','Planetary hauling'],['가스라이트 → 차울라','Gaslight → Chawla'],['4×5 + 2×1 (6개)','4×5 + 2×1 (6 boxes)']],
        [['수소 11 SCU','Hydrogen 11 SCU'],['지역 화물 운송','Local hauling'],['세이크런스 → 차울라','Sacren’s → Chawla'],['4×2 + 2×1 + 1×1 (4개)','4×2 + 2×1 + 1×1 (4 boxes)']],
        [['가공 식품 9 SCU','Processed food 9 SCU'],['지역 화물 운송','Local hauling'],['세이크런스 → 차울라','Sacren’s → Chawla'],['4×2 + 1×1 (3개)','4×2 + 1×1 (3 boxes)']],
        [['탄소 26 SCU','Carbon 26 SCU'],['행성 내 화물 운송','Planetary hauling'],['세이크런스 → 가스라이트','Sacren’s → Gaslight'],['4×6 + 2×1 (7개)','4×6 + 2×1 (7 boxes)']],
        [['알루미늄 20 SCU','Aluminium 20 SCU'],['행성 내 화물 운송','Planetary hauling'],['세이크런스 → 가스라이트','Sacren’s → Gaslight'],['4×5 (5개)','4×5 (5 boxes)']],
      ],
    },
    check:['왕복 88 SCU · 25상자. 최대 적재는 복귀편 46 SCU로 골렘 Ox에 18 SCU가 남습니다. 처음 도는 분은 한 바퀴에 넉넉히 30분을 잡으세요(시간당 1,045,000 aUEC). 직접 잰 한 바퀴는 21분(시간당 약 149만 aUEC)이었습니다. 동선이 익숙하고 엘리베이터 대기 중에 계약을 받으면 20분 안에도 돌 수 있습니다. 20분 페이스면 시간당 3바퀴, 계약 15건, 1,567,500 aUEC입니다.', '88 SCU in 25 boxes per lap. The return leg peaks at 46 SCU, leaving 18 SCU free. Allow 30 minutes for a first lap (1,045,000 aUEC/h at that pace). One timed lap took 21 minutes, equivalent to about 1.49 million aUEC/h. With a familiar route and contracts accepted during elevator travel, a lap can take under 20 minutes. At a 20-minute pace, three laps complete 15 contracts and earn 1,567,500 aUEC/h.'],
    fieldNote:{
      title:['다른 후보지 · 모녹스, 패치 시티, 체크메이트','Alternative area · Monox, Patch City and Checkmate'],
      body:['이 일대에서도 픽업지나 배송지가 겹치는 의뢰를 묶으면 가스라이트 코스보다 더 벌 수 있습니다. 다만 운항 경험상 모녹스에서는 다른 플레이어가 운송을 방해하는 일이 잦고, 지상 기지에 대형함이 장시간 주차돼 상하차가 밀리기도 합니다. 적대 NPC까지 나타나면 한 바퀴 걸리는 시간이 크게 달라집니다. 수습생 평판을 꾸준히 올리고 싶다면 가스라이트 코스부터 돌고, 이쪽은 현장 상황이 좋을 때 시도하세요.', 'Stacking contracts with shared pickups or destinations in this area can pay more than the Gaslight loop. Pilots report frequent player disruption around Monox and long-parked large ships at surface bases that delay loading. Hostile NPCs can make lap times even less predictable. Start with Gaslight for steady trainee reputation and try this area when local conditions are favourable.'],
    },
    basis:['플레이어가 제공한 게임 내 계약 화면 5건과 한 바퀴 실측 기준. 수주할 때 주요 목표에서 픽업지·배송지·수량을 확인하세요.', 'Based on five player-supplied in-game contracts and one timed lap. Check the pickup, delivery and quantities in each offer.'],
    sources:[],tool:'mission',
  },
  {
    id:'accept-first-haul',topic:firstHaul,title:['운송 계약, 어디서 받고 무엇부터 읽을까?', 'Where do I accept my first haul?'],
    summary:['의뢰인이 맡긴 상자를 목적지까지 가져가는 일입니다. 화물을 살 자본 없이도 시작할 수 있습니다.', 'Deliver the client’s boxes to the requested destination. You do not need to buy those goods.'],
    steps:[
      ['게임에서 mobiGlas → Contracts를 열고 Verified의 Hauling(운송) 의뢰를 고르세요. 계약 상세에서 픽업지, 배송지, 화물량과 보상을 읽으세요.', 'Open mobiGlas → Contracts. Choose a Hauling offer under Verified. Read the pickup, delivery, cargo and reward in the offer details.'],
      ['첫 계약은 픽업 한 곳·배송 한 곳으로 골라 보세요. SCU는 상자가 차지하는 공간 단위입니다. 총 SCU와 가장 큰 상자가 둘 다 내 함선에 맞는지 확인하세요.', 'For a first run, look for one pickup and one delivery. SCU measures cargo volume. Check both the total load and the largest individual box against your ship.'],
      ['수락한 뒤 Accepted에서 해당 계약을 추적하세요. 화면의 첫 표식이 픽업지와 일치하면 출발하세요. 표식이 다르면 추적 중인 계약부터 확인하세요.', 'After accepting, track that contract under Accepted. Depart when the marker matches your pickup. If it points elsewhere, check which contract you are tracking.']
    ],check:['어디에서 몇 SCU를 받아 어디로 가져갈지 말할 수 있나요?', 'Can you name the pickup, the amount and the destination?'],sources:[rsi,elevator],tool:'guide'
  },{
    id:'load-elevator',topic:firstHaul,title:['픽업지에 왔는데 상자가 어디 있지?', 'Where are my boxes at the pickup?'],
    summary:['화물 엘리베이터는 창고에 보관된 화물을 격납고 바닥까지 올려주는 장치입니다.', 'The freight elevator brings cargo from storage up to the hangar floor.'],
    steps:[
      ['계약에 적힌 장소에 착륙하고 화물 엘리베이터 옆 단말기를 여세요. 플랫폼을 내린 뒤 창고(Warehouse)에서 해당 계약 화물을 찾으세요.', 'Land at the named location and open the terminal beside its freight elevator. Lower the platform and find the contract goods in Warehouse.'],
      ['품목 옆 ×8은 같은 항목 여덟 개라는 뜻일 수 있습니다. 상자 한 개의 SCU와 개수를 따로 확인한 뒤 필요한 상자를 플랫폼으로 보내고 올리세요.', 'A grouped ×8 can mean eight individual boxes. Check the size per box and the count separately, move the required boxes to the platform and raise it.'],
      ['트랙터 빔으로 상자를 함선 화물 그리드에 붙이세요. 멀티툴이 작동하지 않으면 TruHold 트랙터 부착물을 장착했는지 확인하세요.', 'Use a tractor beam to snap the boxes onto the ship’s cargo grid. If your multi-tool will not move a box, check that its TruHold tractor attachment is fitted.']
    ],check:['출발 전에 함선에 실린 수량과 플랫폼에 남은 상자를 확인하세요.', 'Before departure, count the loaded boxes and check the platform for leftovers.'],sources:[elevator,tractor,firstMission]
  },{
    id:'finish-delivery',topic:firstHaul,title:['내렸는데 배송이 완료되지 않아요', 'I unloaded. Why is delivery still open?'],
    summary:['도착 표식은 장소를 알려줍니다. 계약 진행 수량은 화물을 인도한 뒤 확인합니다.', 'The marker identifies the location. Check the contract counter after handing the cargo over.'],
    steps:[
      ['계약에서 이번 배송지의 이름·품목·수량을 다시 읽으세요. 여러 곳에 내릴 때는 이번 목적지 몫만 꺼내세요.', 'Read the name, goods and quantity for this drop. On a multi-stop job unload only the cargo assigned here.'],
      ['해당 화물 엘리베이터 플랫폼의 그리드에 상자를 붙이고 단말기에서 내리세요. 화물 인도 확인 창이 나오면 계약과 수량을 대조해 Confirm을 누르세요.', 'Snap the boxes onto the destination freight platform and lower it at the terminal. If a delivery confirmation appears, match the contract and quantity before confirming.'],
      ['Accepted의 배송 수량과 남은 목적지를 확인하세요. 숫자가 그대로면 계약 표식, 플랫폼에 붙지 않은 상자, 인도 확인 창 순서로 살펴보세요.', 'Check delivered quantities and remaining drops under Accepted. If the counter did not move, check the marker, unsnapped boxes and the delivery confirmation.']
    ],check:['이번 목적지의 수량이 반영됐나요? 마지막 배송이면 계약 완료까지 확인하세요.', 'Did this drop register? At the final stop, verify that the contract completed.'],sources:[rsi,elevator,firstMission]
  },{
    id:'red-wind-trial',topic:firstHaul,title:['첫 계약 읽기 실례 · 레드 윈드 7 SCU', 'Read a real offer · Red Wind’s 7 SCU trial'],
    summary:['Red Wind Seeking New Haulers의 도착지는 Teasa Spaceport입니다. 같은 제목이어도 내 픽업지는 계약에서 읽으세요.', 'Red Wind Seeking New Haulers delivers to Teasa Spaceport. Read your own assigned pickup.'],
    steps:[
      ['철 1 SCU와 함선 탄약 6 SCU를 더하면 총 7 SCU입니다. 품목이 둘이므로 어느 하나를 빼먹지 않았는지 확인하세요.', 'Add 1 SCU of iron and 6 SCU of ship ammunition for a total of 7 SCU. Count both commodities before leaving.'],
      ['의뢰는 4 SCU 상자를 취급할 함선을 요구합니다. 빈 공간이 총 7 SCU라는 사실만으로 수락을 결정하면 안 됩니다.', 'The offer calls for a ship able to handle 4 SCU boxes. Seven free SCU alone do not establish that the boxes fit.'],
      ['일회성 평가 계약입니다. 완료 후에는 발주처가 새로 제시하는 의뢰와 평판 조건을 확인하세요.', 'This is a one-time evaluation. After completion check the contractor’s newly available offers and rank requirements.']
    ],check:['총량 7 SCU와 요구 상자 4 SCU 중 함선에서 각각 어디를 확인해야 할까요?', 'What do you check on the ship for total volume and for the 4 SCU box requirement?'],basis:build,sources:[definition('Red Wind · Seeking New Haulers','red-wind-seeking-new-haulers')]
  },{
    id:'read-first-quote',topic:firstTrade,title:['첫 무역 · 무엇을 어디서 사서 어디에 팔까?', 'First trade · what do I buy, where, and who buys it?'],
    summary:['개인 무역은 내 돈으로 사서 다른 거래소에 파는 일입니다. 한 품목의 출발지와 판매처를 짝지어 보세요.', 'In personal trade you buy goods with your money and sell them at another terminal. Start by pairing two locations for one commodity.'],
    example:{
      caption:['티타늄(TITA) · 2026-11-16 수집 시세 예시', 'Titanium (TITA) · sample collected 2026-11-16'],
      columns:[['내 행동','My action'],['거래소','Terminal'],['1 SCU 가격','Price per SCU']],
      rows:[
        [['매입','Buy'],['Everus Harbor · Admin','Everus Harbor · Admin'],['7,315 aUEC','7,315 aUEC']],
        [['판매','Sell'],['ARC-L5 · Admin','ARC-L5 · Admin'],['7,900 aUEC','7,900 aUEC']]
      ]
    },
    steps:[
      ['무역센터 시세 검색에서 ‘티타늄’ 또는 TITA를 찾아 품목을 누르세요. 매입가는 내가 살 때 내는 1 SCU 가격, 판매가는 내가 팔 때 받을 1 SCU 가격입니다.', 'Search the trade board for Titanium or TITA and select it. Buy is what you pay per SCU. Sell is what a buyer pays you per SCU.'],
      ['출발지에 매입가와 재고가 있고 도착지에 판매가와 수요가 있는지 보세요. 출발지의 매입가를 도착지 판매가에서 빼면 비용 전 1 SCU 차익입니다.', 'Look for a buy quote and stock at origin and a sell quote and demand at destination. Subtract the origin buy price from the destination sell price for the gross spread per SCU.'],
      ['거래소 이름과 수정 시각을 메모하고 게임 단말기에서 가격과 수량을 다시 보세요. 매입·판매 경로가 있으면 품목 상세에서 ‘이 품목의 경로 보기’를 누른 뒤 원하는 행의 ‘경로 검토’를 누르면 그 품목과 두 거래소가 계획에 들어갑니다.', 'Note the exact terminal and update time. Recheck price and quantity in the game kiosk. When routes are available, choose “View routes for this commodity”, then “Plan route” on the row you want to carry that commodity and both terminals into the planner.']
    ],check:['출발지·판매처의 거래소 이름과 두 단가를 각각 찾았나요?', 'Can you name both terminals and their respective prices?'],sources:[prices,cargo],tool:'market'
  },{
    id:'first-trade-quantity',topic:firstTrade,title:['얼마나 살까? 자금·적재량·재고·수요 비교', 'How much should I buy? Compare four limits'],
    summary:['계획할 수량은 네 조건 중 가장 작은 값에서 출발합니다.', 'Start your planned quantity at the smallest of four limits.'],
    steps:[
      ['예시로 1 SCU에 7,315 aUEC이고 매입에 쓸 돈이 80,000이면 정수 SCU로 최대 10을 살 수 있습니다. 11 SCU는 80,465가 필요합니다.', 'At 7,315 aUEC per SCU, an 80,000 purchase budget buys at most 10 whole SCU. Eleven would cost 80,465.'],
      ['함선 빈자리 16, 출발지 재고 20, 판매처 예측 수요 8 SCU라면 우선 8 SCU를 검토하세요. 상자 규격과 예정된 비용도 확인하세요.', 'With 16 SCU free aboard, 20 in stock and forecast demand of 8, start by planning for 8 SCU. Check container fit and expected expenses.'],
      ['UEX의 판매처 수요는 예측치입니다. 0과 자료 없음(—)을 구분하세요. 값이 있어도 실제로 팔 수 있는 양은 도착 시 단말기에 따라 달라집니다.', 'UEX buyer demand is a forecast. Distinguish a zero from a missing value (—). Even a positive value can differ from the quantity the terminal accepts on arrival.']
    ],check:['이 예시에서 10 대신 8을 검토하는 이유를 찾았나요?', 'Which limit brings this plan down from 10 SCU to 8?'],sources:[prices],tool:'market'
  },{
    id:'trade-loading',topic:firstTrade,title:['샀는데 화물이 안 보여요 · 창고와 함선 확인', 'I paid. Where did the cargo go?'],
    summary:['주문에 선택한 보관 장소에 따라 다음 행동이 달라집니다.', 'Your next step depends on the storage location selected in the order.'],
    steps:[
      ['구매 단말기에서 품목·수량·수령 장소를 확인한 뒤 주문하세요. 창고로 샀다면 해당 장소의 화물 엘리베이터에서 올려 직접 선적합니다.', 'Check commodity, quantity and receiving location before buying. If you bought into a warehouse, raise the boxes at that location’s freight elevator and load them.'],
      ['자동 상하역을 쓸 계획이면 해당 거래소의 지원 여부·요금·대기 시간을 확인하세요. 착륙 구역의 자동 서비스에는 함선을 보관해야 하는 경우가 있습니다.', 'For automatic handling, check service availability, fees and waiting time at that terminal. Landing-zone automatic service can require the ship to be stored.'],
      ['출발 전에 실제 선적을 확인하고 판매처의 하역 방식도 확인하세요. 엘리베이터 유무와 자동 상하역 지원은 별도 항목입니다.', 'Verify the cargo is aboard before departure and check unloading at the destination too. Freight-elevator availability and auto-loading support are separate terminal properties.']
    ],check:['물건이 지금 창고·상하역 대기·함선 중 어디에 있는지 확인했나요?', 'Is the cargo in storage, awaiting handling or aboard?'],sources:[cargo,terminals,elevator]
  },{
    id:'first-trade-profit',topic:firstTrade,title:['첫 판매 · 매출과 실제로 번 돈 읽기', 'First sale · how much did I actually earn?'],
    summary:['판매 대금에서 판 화물의 원가와 비용을 빼야 이익을 알 수 있습니다.', 'Subtract the cost of goods sold and your expenses from sale proceeds.'],
    steps:[
      ['시세 표본에서 티타늄은 Everus Harbor 매입 7,315, ARC-L5 판매 7,900 aUEC/SCU였습니다. 8 SCU 상자 두 개를 그 가격에 사면 16 SCU의 매입액은 117,040입니다.', 'In the sample, Titanium cost 7,315 at Everus Harbor and sold for 7,900 aUEC/SCU at ARC-L5. Buying two 8 SCU boxes at that price costs 117,040 for all 16 SCU.'],
      ['16 SCU를 전부 팔면 매출은 126,400입니다. 매입액과 예시 비용 164를 빼면 순이익은 9,196 aUEC입니다. 가격이나 비용이 바뀌면 결과도 달라집니다.', 'Selling all 16 yields 126,400. Subtract the purchase and an illustrative 164 expense to get 9,196 aUEC net. Different prices or expenses change that result.'],
      ['한 상자만 팔았으면 거래기록실에서 ‘판매’를 고르고 해당 화물 묶음에 수량 8 SCU, 단가 7,900을 입력하세요. 저장 전에 판매 총액 63,200을 확인하세요. 장부가 비용 전 실현 차익 4,680과 선내 잔량 8 SCU를 계산합니다.', 'If one box sells, choose Sell in Trade records and select its cargo lot. Enter 8 SCU at 7,900 per SCU. Check the sale total of 63,200 before saving. The ledger shows a realized margin of 4,680 before expenses and 8 SCU still aboard.']
    ],check:['거래기록에 실제 판매량과 남은 재고가 따로 보이나요?', 'Does your record distinguish actual sales from remaining inventory?'],basis:sample,sources:[prices],tool:'trade-operations'
  },{
    id:'compare-small-contracts',topic:contracts,title:['초반 평판 · 작은 계약 두 건을 같이 받을까?', 'Early reputation · should I take two small contracts?'],
    summary:['4.10.3 탄소·알루미늄 계약으로 적재량과 추가 배송지를 먼저 비교해 보세요.', 'Compare load and extra drops using two 4.10.3 carbon and aluminium contracts.'],
    steps:[
      ['탄소는 6~12 SCU, 알루미늄은 두 배송지에 각각 3~6 SCU입니다. 두 건의 합은 12~24 SCU이고 두 정의의 최대 상자는 1 SCU입니다.', 'Carbon is 6–12 SCU. Aluminium goes to two drops of 3–6 SCU each. Together that is 12–24 SCU, with a 1 SCU maximum box in both definitions.'],
      ['제시 보상은 45,750과 61,500 aUEC, 정의상 평판 보상은 각각 50입니다. 실제 발주처·평판 자격과 픽업지가 맞으면 함께 운송할 후보입니다.', 'The listed payouts are 45,750 and 61,500 aUEC, with 50 reputation in each definition. Compare them if you qualify and the actual contractor and pickups align.'],
      ['추가 배송지에서 착륙·하역하는 시간까지 생각하세요. 내 계약에 적힌 장소가 겹치지 않거나 한 번에 못 실으면 한 건부터 마치는 편이 단순합니다.', 'Allow time to land and unload at the extra drop. If your assigned stops do not overlap or the boxes do not fit, finish one contract first.']
    ],check:['같은 패치 예시를 찾았더라도 내 계약의 실제 픽업지를 대조했나요?', 'Did you compare your actual pickup assignments before bundling?'],basis:build,sources:[definition('Carbon','ato-b-non-metal-carbon-stanton4-small-grade'),definition('Aluminium','single-to-multi2-refined-ore-aluminium-stanton4-small-grade')]
  },{
    id:'ling-contract-types',topic:contracts,title:['링 가문 의뢰 · 운송과 회수 구별하기', 'Ling Family offers · hauling or recovery?'],
    summary:['발주처 이름이 같아도 필요한 장비와 거점 수가 크게 달라집니다.', 'The same contractor can offer jobs with very different equipment and stops.'],
    steps:[
      ['신입 운송 예시는 파이로 네 곳에서 기념품 2, 주류 1, 식품 4, 자극제 2 SCU를 픽업합니다. 순서는 자유이며 총 9 SCU, 요구 상자는 2 SCU입니다.', 'In the rookie Pyro example, collect 2 SCU of souvenirs, 1 of spirits, 4 of food and 2 of stims across four pickups in any order. Total 9 SCU; required box capacity 2 SCU.'],
      ['이 계약에는 배송 비율에 따른 지급과 기한 후 미인도 화물의 도난 처리가 명시돼 있습니다. 수락 전에 시간 조건을 읽으세요.', 'This particular contract specifies proportional payment and stolen status for undelivered cargo after the deadline. Read its timing conditions before accepting.'],
      ['비슷한 이름의 방치 화물 회수 의뢰는 Mercenary(용병) 분류입니다. 32 SCU 상자와 중장비 트랙터를 요구하므로 운송 계약과 장비 목록을 혼동하지 마세요.', 'The similarly named abandoned cargo recovery is a Mercenary mission requiring 32 SCU containers and a heavy tractor. Check the category before packing for it.']
    ],check:['총 9 SCU만 보고 네 번의 픽업이나 제한 시간을 놓치지 않았나요?', 'Did you account for the four pickups and deadline as well as the 9 SCU total?'],basis:build,sources:[definition('Ling · Rookie haul','ling-family-reputation-rank-cargo-haul-cargo-grade-token-scale-4'),definition('Ling · Cargo recovery','delivery-of-abandoned-ling-cargo')]
  },{
    id:'read-gateway',topic:contracts,title:['행성계 간 의뢰면 직접 점프해야 할까?', 'Does an interstellar contract require me to jump?'],
    summary:['의뢰 분류보다 내 배송 구간의 마지막 장소를 먼저 확인하세요.', 'Read the final destination of your assigned leg.'],
    steps:[
      ['농업 보급품 예시는 Interstellar 분류지만 이번 구간은 Pyro Gateway까지입니다. 다음 운송인이 점프 구간을 맡는다고 설명합니다.', 'The agricultural supplies example is classified Interstellar, but your leg ends at Pyro Gateway. The description assigns onward transport through the jump to another hauler.'],
      ['예시 총량은 8~16 SCU, 최대 상자는 4 SCU입니다. 계약에서 실제 배정량과 배송지를 확인하고 그 장소까지만 경로를 비교하세요.', 'The example lists 8–16 SCU with boxes up to 4 SCU. Confirm your assignment, then compare routes ending at that delivery point.']
    ],check:['목적지가 관문인지, 관문을 건너야 하는 다른 장소인지 확인했나요?', 'Is the gateway itself your drop, or must you cross to another destination?'],basis:build,sources:[definition('Agricultural supplies · Gateway handoff','ato-b-processed-agricultural-supplies-interstellar-small-grade')]
  },{
    id:'distribution-quantity',topic:contracts,title:['세 곳에 배송할 때 · 수량은 전체일까, 한 곳당일까?', 'Three deliveries · is the quantity per stop or for the whole job?'],
    summary:['레드 윈드의 폐기물 운송 계약을 읽으며 가장 큰 상자와 전체 물량을 따로 찾아봅니다.', 'Read a Red Wind waste haul and identify the largest box separately from the total load.'],
    steps:[
      ['이 정규 단계 계약은 Ruin Station에서 픽업해 세 곳에 배송합니다. 목적지마다 16~116 SCU이므로 계약 정의의 전체 범위는 48~348 SCU입니다.', 'This Member contract picks up at Ruin Station and delivers to three stops. Each takes 16–116 SCU, so the definition covers 48–348 SCU in total.'],
      ['가장 큰 상자는 8 SCU입니다. 이 숫자를 한 번에 실어야 할 전체 물량으로 읽으면 함선 선택이 달라집니다. 내 계약에 배정된 세 수량을 더하세요.', 'The largest container is 8 SCU. Mistaking this for the total load changes your ship choice. Add the three quantities assigned in your own contract.'],
      ['세 목적지는 순서를 정할 수 있습니다. 첫 목적지 화물을 꺼내기 쉽게 싣고, 배송할 때마다 그곳의 인도 수량을 확인하세요.', 'You may choose the order of the three drops. Load so that the first drop is accessible and verify the quantity delivered at each stop.']
    ],check:['한 상자·한 목적지·전체 계약의 세 수량을 구분했나요?', 'Can you distinguish one box, one drop and the whole contract?'],basis:build,sources:[definition('Red Wind · Waste shipment','reputation-rank-hauler-needed-for-cargo-grade-token-shipment-102')]
  },{
    id:'riker-bundle',topic:contracts,title:['빈자리 96 SCU · 두 계약을 한 번에 실을 수 있을까?', '96 SCU free · can I load both contracts at once?'],
    summary:['같은 지역의 두 계약도 배정량에 따라 한 번에 실을 수도, 두 번 가야 할 수도 있습니다.', 'Two jobs in one region may fit in one load or require two trips, depending on their assigned quantities.'],
    steps:[
      ['Riker Memorial 출발 자극제 운송 예시는 80~112 SCU, 최대 상자 8 SCU입니다. 가공식품 예시는 두 곳에 각각 7~16 SCU, 최대 상자 4 SCU입니다.', 'The stims example from Riker Memorial lists 80–112 SCU with boxes up to 8. The processed food example delivers 7–16 SCU to each of two drops, in boxes up to 4.'],
      ['실제 픽업지가 일치한다면 두 건의 총량 범위는 94~144 SCU입니다. 빈자리 96은 최솟값은 넘지만 최댓값에는 모자랍니다. 내 배정량과 상자 배치를 확인하세요.', 'If your actual pickups coincide, their combined range is 94–144 SCU. A free 96 SCU covers the minimum but falls short of the maximum. Check your assigned quantities and box fit.']
    ],check:['96 SCU에 실제 상자가 안 들어가면 어떤 계약부터 끝낼지 골랐나요?', 'If the boxes do not fit, which contract will you complete first?'],basis:build,sources:[definition('Stims · Riker Memorial','ato-b-processed-stims-stanton3-supply-grade'),definition('Processed food','single-to-multi2-processed-processed-food-stanton3-small-grade')]
  },{
    id:'share-contract',topic:contracts,title:['친구와 첫 운송 · 파티와 계약 공유', 'Hauling with a friend · share the contract'],
    summary:['같이 탄 사람에게도 계약이 보이는지 출발 전에 확인하세요.', 'Check that your crewmate can see the contract before departure.'],
    steps:[
      ['파티를 구성하고 수락된 계약에서 Share를 선택하세요. 파티원이 받은 공유 제안을 수락한 뒤 각자의 계약 화면을 확인하세요.', 'Form a party, select Share on the accepted contract, then have each participant accept the offer and check their contract list.'],
      ['RSI는 공유한 미션의 보상을 참여자에게 균등 분배한다고 안내합니다. 매입 자본을 모아 나누는 STAM 함대 무역 정산과 구분하세요.', 'RSI describes equal reward shares for a shared mission. STAM fleet trade separately accounts for contributed trading capital.']
    ],check:['동료도 같은 계약과 목적지를 자기 화면에서 확인했나요?', 'Can your crewmate see the same contract and destination on their screen?'],sources:[rsi]
  },{
    id:'time-per-loop',topic:market,title:['시간당 수입 · 빈 배로 돌아오는 시간도 셀까?', 'Income per hour · count the empty return?'],
    summary:['한 번의 판매와 반복 가능한 왕복을 같은 기준으로 비교하세요.', 'Compare one completed sale with a repeatable round trip using consistent timing.'],
    steps:[
      ['티타늄 예시 순이익 9,196을 한 번 버는 데 33분 26초가 걸린다고 두면 약 16,503 aUEC/시간입니다. 이 값은 계산에 넣은 시간에만 해당합니다.', 'Earning the sample 9,196 in an assumed 33 min 26 s gives about 16,503 aUEC per hour. The estimate covers only the time included.'],
      ['같은 출발지로 빈 배를 가져가는 데 20분이 더 들면 한 주기는 53분 26초, 약 10,326 aUEC/시간입니다. 귀환 화물이 있다면 별도 매입·판매·상하역 시간도 더하세요.', 'With a 20-minute empty return, the cycle takes 53 min 26 s, about 10,326 aUEC per hour. For a return load include its purchases, sales and handling time.'],
      ['경로 도구의 시간에 수동 상하역·접안·대기가 들어가는지 확인하세요. 다음번에는 자기 출발부터 다시 살 수 있는 시점까지 재서 비교하세요.', 'Check whether a route tool includes manual handling, docking and queues. Time your next run from departure until you are ready to buy again.']
    ],check:['비교하는 두 경로가 모두 편도 또는 모두 왕복 기준인가요?', 'Are both routes measured one-way or both as repeatable loops?'],basis:sample,sources:[prices,haulers]
  },{
    id:'alternative-buyer',topic:market,title:['절반만 팔렸다 · 기다릴까, 다른 곳에 팔까?', 'Half sold · wait or try another buyer?'],
    summary:['남은 수량에만 새 가격을 적용하고 우회 비용과 시간을 비교하세요.', 'Apply the alternative price only to your remaining cargo, then compare detour cost and time.'],
    steps:[
      ['예시에서 티타늄 8 SCU를 이미 7,900에 팔았고 8 SCU가 남았습니다. 다른 거래소에서 7,700에 판다면 남은 화물의 매출은 61,600입니다.', 'In the example, 8 SCU sold at 7,900 and 8 remain. A different buyer offering 7,700 would pay 61,600 for the rest.'],
      ['원래 가격에 전량 판매했을 때보다 1,600 덜 받고 우회 비용이 300 늘어납니다. 최초 비용 164까지 포함하면 이번 거래 순이익은 7,296입니다.', 'The lower price costs 1,600 in proceeds and the detour costs another 300. Including the original 164 expense, net profit for the whole trade is 7,296.'],
      ['원래 판매처의 보충 시점은 보장되지 않습니다. 기다림으로 더 받을 수 있는 1,900과 내가 추가로 쓰는 시간을 비교하고, 다른 판매처의 실제 수요도 확인하세요.', 'The original buyer has no guaranteed refill time. Weigh a potential 1,900 improvement against the extra time and check demand at the alternative buyer too.']
    ],check:['이미 판 8 SCU를 새 가격으로 다시 계산하지 않았나요?', 'Did you keep the first 8 SCU at their actual sale price?'],basis:sample,sources:[prices,haulers],tool:'market'
  },{
    id:'quote-evidence',topic:market,title:['가격표에 숫자가 있는데 왜 거래가 안 될까?', 'Why can a quoted trade be unavailable?'],
    summary:['수정 시각·예측 수요·추천 경로의 의미를 구분하면 헛걸음을 줄일 수 있습니다.', 'Read update time, forecast demand and route estimates before committing to a trip.'],
    steps:[
      ['UEX 가격 기록에서 수정 시각은 그 기록이 갱신된 때입니다. 내가 출발할 때도 같은 가격과 물량이 있다는 확인 시각은 아닙니다.', 'UEX’s modification time tells you when the record changed. It does not confirm the same price and quantity at your departure time.'],
      ['UEX는 판매처의 예측 수요와 현장에서 보고한 수량을 별도 필드로 제공합니다. 가격이 있어도 수요가 0이거나 수량이 비어 있을 수 있습니다.', 'UEX provides forecast buyer demand and reported on-site quantities in separate fields. A price may coexist with zero demand or a missing quantity.'],
      ['경로 목록의 예상 이익은 조건이 맞을 때의 값입니다. 최신 가격, 두 거래소의 상하역, 내 자본과 적재 한계를 확인한 뒤 가장 작은 실행 가능 수량으로 다시 계산하세요.', 'A route estimate depends on its assumptions. Check prices, handling at both ends, your funds and cargo fit, then recalculate for the smallest feasible quantity.']
    ],check:['시세·물량·수정 시각 중 확인하지 못한 값이 무엇인지 알 수 있나요?', 'Can you identify what is still unknown about price, quantity or freshness?'],sources:[prices,routes,terminals],tool:'market'
  }
];
