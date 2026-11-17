import type {GuideShot} from './guide-scene-camera';
import type {SpaceScreen} from './space-navigation';
import {divisionFacilities,divisionTourOrder} from './division-facilities';
export type GuideTopic='practice'|'trade'|'procedure'|'reference'|'overview'|'bridge';
type Copy=readonly [string,string];
export type GuidePage={title:Copy;body:Copy;image?:'division'|'lounge'|'bridge';destination?:SpaceScreen;shot?:GuideShot};
export const guidePages:Record<GuideTopic,readonly GuidePage[]>={
 trade:[
  {title:['처음 시작하는 무역','Your first trade'],body:['무역센터에서는 시장을 확인하고 자금과 함선에 맞는 계획을 세워요. 먼저 담당 범위를 고른 뒤, 저장되지 않는 예시로 매입부터 정산까지 함께 해 볼게요.','At the trade centre, inspect the market and plan around your cash and ship. Choose your scope, then practice a purchase through settlement without saving anything.']},
  {title:['시장 확인','Read the market'],body:['가격이 좋아 보여도 수요·공급과 확인 시점을 함께 봐야 해요. 여기 있는 숫자는 연습용이며, 실제 무역을 시작할 때는 게임에서 다시 확인해 주세요.','A promising price is only part of the picture: check demand, supply and timestamps too. These numbers are for practice; verify the live situation in game before trading.']},
  {title:['계획 검토','Review your plan'],body:['32 SCU를 매입하는 예시예요. 매입에 32,000, 예상 판매에 38,400, 비용에 1,000 aUEC를 잡았어요. 예상 순이익은 5,400이지만 실제 판매 전에는 확정 수익이 아니에요.','Our example buys 32 SCU for 32,000, expects 38,400 from the sale and allows 1,000 aUEC in costs. The expected net result is 5,400, but it is not realized until the sale happens.']},
  {title:['매입부터 마감까지','From purchase to close'],body:['예시 버튼을 순서대로 눌러 보세요. 매입하면 자본이 줄고 화물이 생겨요. 이동만으로 판매되지는 않으며, 실제 거래와 비용을 기록한 뒤 마감하는 흐름이에요.','Use the example buttons in order. Buying reduces cash and adds cargo. Travelling does not sell it: record the actual transactions and costs, then close the trade.']},
  {title:['무역센터로 이어가기','Continue at the trade centre'],body:['연습을 마쳤어요. 선택한 담당자의 실제 계획 화면을 열 수 있어요. 기존 자료는 그대로 유지돼요. 공동 무역은 실제 화면의 함대 모드에서 초대 코드와 기존 승인·정산 흐름을 이용해요.','Practice complete. Open the real planning screen for your chosen advisor; your existing data stays intact. For joint trading, use Fleet mode with invite codes and its existing approval and settlement flow.']},
 ],
 practice:[
  {title:['첫 운송 연습','Your first practice haul'],body:['오늘은 Hull B로 스탠턴의 화물을 모아 파이로까지 운송해 볼게요. 확인된 6계약, 총 363 SCU예요. 연습 내용은 실제 운항이나 계정에 저장되지 않아요.','We’ll collect freight in Stanton and take it to Pyro aboard a Hull B: six confirmed contracts, 363 SCU. This practice never saves to your real flight or account.'],image:'bridge'},
  {title:['함선과 파트너','Ship and flight partner'],body:['함선은 Hull B, 출발지는 오리슨이에요. 항해사는 경로와 적재를 함께, 오퍼레이터는 경로만 안내해요. 원하는 방식을 골라 주세요.','Our ship is a Hull B, departing Orison. The navigator handles routes and loading; the operator guides the route while you handle cargo. Choose your partner.']},
  {title:['계약 불러오기 · 선택','Import and select contracts'],body:['예시 계약을 불러온 뒤 여섯 장을 선택해 주세요. 픽업지·배송지·수량을 먼저 확인하는 습관이 중요해요. 실제 운송에서는 로그, 스크린샷 또는 직접 입력으로 가져와요.','Load the practice contracts and select all six. Check pickup, delivery and quantities first. For a real haul, import a log or screenshot, or enter the details yourself.']},
  {title:['항로 계산 · 검토','Calculate and review'],body:['이제 경로를 계산해 주세요. 방문 순서를 눌러 지도와 작업을 살펴보세요. 항해사라면 픽업 후 예상 적재도 함께 볼 수 있어요.','Calculate the route, then select stops to inspect the map and tasks. With the navigator, you can also inspect the expected cargo after each stop.']},
  {title:['작업 완료 기록 연습','Practice confirming work'],body:['연습 운항을 시작하고 현재 작업을 하나씩 완료해 보세요. 실제 운항에서는 게임에서 화물을 옮긴 뒤 기록해야 해요. 잘못 눌렀다면 직전 작업을 되돌릴 수 있어요.','Start the practice run and confirm each task. During a real haul, confirm only after moving the cargo in the game. You can undo the previous task if needed.']},
  {title:['실제 운송을 시작할 준비','Ready for your real haul'],body:['연습을 마쳤어요. 실제 운송 준비를 누르면 기존 미션 화면으로 이동해요. 연습 계약은 가져가지 않으며, 이미 준비 중이던 계약과 운항은 그대로 남아 있어요.','Practice complete. Continue to the real mission console when ready. Practice contracts are discarded; any contracts or flight you already had remain unchanged.']},
 ],
 procedure:[
  {title:['운송 준비','Prepare your haul'],body:['관제센터에서 파트너를 고르고, 미션 콘솔에서 함선과 출발지를 확인하세요. 총 SCU를 모르면 오퍼레이터가 경로를 안내하고 적재는 직접 관리해요.','Choose a partner at the control centre, then check your ship and departure in the mission console. If the total SCU is unknown, the operator guides the route and you handle loading.']},
  {title:['받은 미션을 가져오기','Bring in accepted contracts'],body:['게임을 먼저 실행하고 STAM 로그 앱을 켜세요. 미션 콘솔에서 로그 앱을 연결하거나 파일을 읽을 수 있어요. 스크린샷은 자동 인식 후 검토하고, 직접 입력도 가능해요.','Start the game before the STAM log app. Connect the app or read a log file in the mission console. Screenshots are recognized for review; manual entry is also available.']},
  {title:['선택하고 경로 계산','Select and plan'],body:['실제 수주한 계약의 장소·수량을 확인한 뒤 이번에 운송할 것만 선택하세요. 계산 결과의 방문 순서와 구간별 적재를 살펴보세요. 총 운송량과 동시에 실리는 양은 달라요.','Check locations and quantities against your accepted contracts, then select this haul’s contracts. Review stop order and cargo at each stop. Total freight differs from the amount aboard at once.']},
  {title:['운항과 변경 확인','Fly and review changes'],body:['관제에서 운항을 시작하고 실제 작업 후 완료를 기록하세요. 로그가 계약 변경·종료를 알리면 확인한 뒤 남은 경로를 다시 계산해요. 취소된 계약의 선내 화물은 자동으로 없어지지 않아요.','Start the run and confirm work after doing it in game. Review logged contract changes before recalculating. Cargo already aboard for a cancelled contract is not silently removed.']},
 ],
 reference:[
  {title:['함선 자료','Ship references'],body:['아카이브에서 함선의 적재 용량·그리드·성능과 자료 출처를 확인할 수 있어요. 실제 운송에 쓸 함선 선택은 미션 콘솔에서 해 주세요.','The archive shows ship capacity, cargo grids, performance and sources. Select the ship for your real flight in the mission console.']},
  {title:['화물 자료','Cargo references'],body:['화물의 상자 크기와 적재 규칙을 확인하세요. 예를 들어 냉동 포드는 1개가 1 SCU이고 일반 상자와 쌓이는 규칙이 달라요. 자료는 실제 수주 계약의 수량을 대신하지 않아요.','Check container sizes and loading rules. A cryopod counts as 1 SCU and stacks differently from ordinary crates. Reference data does not replace your accepted contract’s actual quantities.']},
 ],
 overview:[
  {title:['빠르게 이동하거나, 둘러보거나','Quick access or scenic travel'],body:['사이드바는 원하는 화면으로 바로 가는 빠른 길이에요. 공간 속 장소나 표식을 직접 누르면 연결된 이동 연출을 보며 들어갈 수 있어요. 모바일에서는 공간 메뉴를 열어 바로가기를 사용하세요.','Use the sidebar for quick access to a screen. Select a place or marker in the scene to enter with its connected travel sequence. On mobile, open Spaces for the shortcuts.'],image:'division'},
  {title:['STAM FREIGHT DIVISION','STAM FREIGHT DIVISION'],body:['아카데미와 무역센터를 먼저 살펴보고 라운지로 갈게요. 라운지 게이트에서 셔틀을 타면 우주 관제센터로 이어져요.','We’ll visit the academy and trade centre before the lounge. From its gate, the shuttle takes us to the orbital control centre.'],image:'division'},
  ...divisionTourOrder.filter(id=>id!=='bridge').flatMap(id=>{const f=divisionFacilities.find(f=>f.id===id)!;return f.tour?.length?f.tour.map(p=>({...p,image:'division' as const,destination:f.destination,shot:p.shot??{scene:'division' as const,focus:f.marker,zoom:1.55,target:f.id}})):[{title:f.name,body:f.description,destination:f.destination,image:'division' as const,shot:{scene:'division' as const,focus:f.marker,zoom:id==='lounge'?1.3:1.55,target:f.id}}];}),
 ],
 bridge:[
  {title:['관제센터에 오신 것을 환영해요','Welcome to orbital control'],body:['여기서는 운항 파트너를 고르고 운송을 준비해요. 오퍼레이터는 경로만, 항해사는 경로와 적재를 함께 안내해요.','Choose your flight partner here. The operator guides routes; the navigator handles routes and loading together.'],image:'bridge'},
  {title:['미션 콘솔','Mission console'],body:['왼쪽 미션 콘솔에서 함선·출발지와 계약을 확인하고 항로를 계산하세요. 로그·스크린샷·직접 입력으로 가져온 계약을 여기서 검토해요.','At the left mission console, check your ship, departure and contracts, then calculate. Review contracts imported from logs, screenshots or manual entry here.'],image:'bridge',shot:{scene:'bridge',focus:[8,54],zoom:1.5,target:'mission'}},
  {title:['항로 지도','Star map'],body:['중앙의 입체지도에서 방문 순서와 각 거점의 작업을 살펴보세요. 현재 경로를 확인하면서 실사·홀로그램 표현을 선택할 수 있어요.','Inspect stop order and tasks on the central star map. Review the current route in realistic or holographic presentation.'],image:'bridge',shot:{scene:'bridge',focus:[50,34],zoom:1.35,target:'map'}},
  {title:['관제와 첫 운송','Operations and your first haul'],body:['운항을 시작하면 관제 콘솔에서 현재 목적지와 작업을 확인해요. 처음이라면 예시 운송을 먼저 연습해 볼까요? 기존 운항 기록에는 영향을 주지 않아요.','During a run, the control console shows your current destination and tasks. Shall we practice a haul first? Your real flight records remain untouched.'],image:'bridge',shot:{scene:'bridge',focus:[91,54],zoom:1.5,target:'operations'}},
 ],
};
