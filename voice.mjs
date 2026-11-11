// Existing navigator/operator IDs remain stable; legacy officers fall back to the navigator.
import {isEn} from './i18n.mjs';
const KEY='sfc-voice';
export const VOICE_PORTRAITS={standard:'assets/partners/navigator.jpg',broker:'assets/partners/broker-portrait.webp',aide:'assets/partners/aide-portrait.webp'};
export const VOICE_LIST=isEn?[
 ['aide','Bridge Operator','Finish small, simple contracts one by one, with short stops along the way.'],
 ['standard','Senior Navigator','Collect cargo across contracts and reduce repeat visits.'],
 ['broker','Smuggling Broker','Ship and budget based trading · coming soon.']
]:[
 ['aide','브리지 오퍼레이터','소량의 간단한 계약부터 하나씩 완료하고, 가까운 경유는 함께 챙깁니다.'],
 ['standard','수석 항해사','여러 계약의 화물을 모아 운송하고, 재방문과 불필요한 이동을 줄입니다.'],
 ['broker','밀수 브로커','함선과 자금에 맞춘 구매·판매 추천 · 무역 준비 중']
];
const L={
 standard:{
  role:'수석 항해사',welcome:'환영합니다, 함장님.',welcomeSub:'STAM 수석 항해사입니다. 수주하신 계약을 확인하고 효율적인 항로와 적재 계획을 준비하겠습니다.',left:n=>`이전에 접수하신 계약 ${n}건이 남아 있습니다. 이어서 검토하실 수 있습니다.`,
  ship:s=>`운용 함선은 ${s}입니다.`,shipSub:c=>`화물칸 ${c} SCU를 기준으로 적재를 검토하겠습니다. 오늘 이용하실 함선을 확인해 주십시오.`,shipOk:'함선 확인',
  start:'출발 위치를 확인하겠습니다.',startSub:'현재 계신 곳을 입력해 주십시오. 지명 일부로도 검색할 수 있습니다.',startOk:'출발 위치 확인',notFound:'위치를 확인하지 못했습니다. 검색 결과에서 정확한 지명을 선택해 주십시오.',
  shots:'수주하신 계약 화면을 올려 주십시오.',shotsSub:'방문 순서와 적재 계획을 함께 검토하겠습니다. 여러 장을 한 번에 올리거나 끌어다 놓기, Ctrl+V로 추가하실 수 있습니다.',reading:'화물 명세를 확인하고 있습니다. 픽업지가 겹치는 계약도 함께 검토하겠습니다.',readDone:n=>`계약 ${n}건을 확인했습니다.`,
  confirm:n=>`계약 ${n}건의 내용을 확인해 주십시오.`,confirmSub:'잘못 읽힌 항목은 수정하실 수 있습니다. 품목과 크기가 같아도 화물은 수주한 계약별로 구분합니다.',confirmOk:'계약 내용 확인',locationIssue:id=>`${id}의 위치를 확인하지 못했습니다. 수정에서 픽업지와 배송지를 선택해 주십시오.`,
  boxes:'상자 구성이 확인되지 않은 화물이 있습니다.',boxesSub:'총량만으로는 실제 적재를 확정할 수 없습니다. 상자 크기별 칸에 개수만 적어 주십시오. 한 번 입력한 구성은 같은 품목 조합의 미션에 자동으로 재사용하며, 미확인 상태로 진행하면 가정값을 사용합니다.',boxesOk:'적재 계획 계산',
  fail:'현재 입력으로는 항로를 확정하지 못했습니다.',failSub:'위치와 화물 수량, 상자 구성을 다시 확인해 주십시오.',
  brief:'항로가 준비됐습니다, 함장님.',briefSub:(n,t,r,rate,b)=>`총 ${n}곳을 경유하며, 예상 소요 시간은 ${t}분입니다.${r?` 예상 수익은 ${r} aUEC, 시간당 약 ${rate} aUEC입니다.`:''}${b?` 하역 전에 다른 상자를 옮겨야 할 수 있는 거점이 ${b}곳 있습니다. 해당 적재 목록을 확인해 주십시오.`:''}`,launch:'출항',
  ready:'출항 준비가 끝났습니다. 첫 거점에서 작업을 마치시면 완료를 기록해 주십시오.',atStop:p=>`${p} 작업을 마치시면 완료 버튼을 눌러 주십시오. 다음 구간을 안내하겠습니다.`,first:p=>`출항합니다. 첫 거점은 ${p}입니다. 도착 후 해당 계약의 화물을 확인하고 작업해 주십시오.`,
  next:(p,k,n,m)=>`${p} ${k} 완료를 기록했습니다. 다음 목적지는 ${n}, 예상 소요 시간은 약 ${m}분입니다.`,jump:g=>` ${g}를 경유해 점프합니다.`,jumpDone:(x,n)=>`점프 완료를 기록했습니다. ${x}에 도착했습니다. 다음은 ${n}입니다.`,cargo:(u,x)=>u?` 하역할 화물: ${x}. 아래 목록을 확인해 주십시오.`:` 적재할 화물: ${x}. 아래 목록대로 실어 주십시오.`,
  undo:x=>`${x}의 완료 기록을 되돌렸습니다. 실제 화물 상태를 확인한 뒤 진행해 주십시오.`,defer:p=>`${p}를 후순위로 조정했습니다. 변경된 방문 순서를 확인해 주십시오.`,replan:'현재 적재 위치를 유지한 상태로 남은 항로를 다시 계산했습니다.',done:'수고하셨습니다, 함장님.',doneSub:'모든 거점의 완료가 기록됐습니다. 게임 내 계약 완료 상태를 확인해 주십시오. 운항 기록을 아래에 정리했습니다.'
 },
 aide:{
  role:'브리지 오퍼레이터',welcome:'어서 오세요, 함장님!',welcomeSub:'오늘 운송 일정과 화물 배치는 제가 정리해 드릴게요! 복잡한 계약도 하나씩 풀어볼까요?!',left:n=>`지난번 계약 ${n}건이 남아 있어요! 이어서 정리해 드릴까요?`,
  ship:s=>`오늘 함께할 함선은 ${s}예요!`,shipSub:c=>`화물칸은 ${c} SCU네요! 오늘 이용하실 함선이 맞는지 확인해 주세요. 빈틈은 찾아봐도 화물칸을 늘리는 건 아직 못 해요!`,shipOk:'이 함선으로 준비',
  start:'함장님, 어디서 출발할까요?!',startSub:'현재 위치를 알려 주세요! 지명 일부만 입력하셔도 찾아볼게요. 출발점부터 잘 잡아야 헛걸음이 줄어드니까요!',startOk:'여기서 출발',notFound:'앗, 위치를 찾지 못했어요! 검색 결과에서 정확한 지명을 골라 주세요.',
  shots:'함장님, 오늘 계약도 가져오셨죠?!',shotsSub:'스샷 올려 주세요! 여러 장 한 번에 올리거나 끌어다 놓기, Ctrl+V도 좋아요. 복잡한 일정은 제가 정리해 드릴게요!',reading:'계약서 읽고 있어요! 동선은 제가 줄여볼게요. 상자 무게는… 제 담당이 아니라서요!',readDone:n=>`계약 ${n}건 확인했어요! 같이 살펴볼까요?!`,
  confirm:n=>`계약 ${n}건, 이렇게 정리했어요!`,confirmSub:'함장님, 수량이랑 목적지만 확인해 주세요! 같은 상자처럼 보여도 다른 계약 화물이에요. 계약별로 꼭 구분할게요!',confirmOk:'내용 확인 완료',locationIssue:id=>`함장님, ${id}의 위치를 확인하지 못했어요! 수정에서 픽업지와 배송지를 골라 주세요.`,
  boxes:'함장님! 실제 상자 구성이 필요해요.',boxesSub:'총 SCU만으로는 몇 상자인지 알 수 없어요! 크기별 칸에 개수만 적어 주세요! 한 번 알려 주시면 같은 품목 조합 미션엔 제가 알아서 채울게요! 지금 모르시면 가정값으로 먼저 계산할 수 있어요.',boxesOk:'이대로 계산하기',
  fail:'앗, 이대로는 경로를 정할 수 없어요!',failSub:'함장님, 위치와 화물 수량, 상자 구성을 확인해 주세요! 수정해 주시면 다시 맞춰볼게요.',
  brief:'함장님, 준비 끝났어요!',briefSub:(n,t,r,rate,b)=>`총 ${n}곳 들르고, 예상 시간은 ${t}분이에요!${r?` 예상 수익은 ${r} aUEC, 시간당 약 ${rate} aUEC예요!`:' 가까운 계약부터 하나씩 끝내봐요!'}${b?` 다만 ${b}곳은 하역 전에 다른 상자를 옮겨야 할 수 있어요. 해당 적재 목록을 꼭 확인해 주세요!`:''} 출발하실 때 말씀해 주세요!`,launch:'출발하기!',
  ready:'준비 끝났어요! 첫 거점에서 작업을 마치시면 완료 버튼을 눌러 주세요. 다음 일정은 제가 챙길게요!',atStop:p=>`함장님, ${p}에서 작업 끝나시면 버튼 눌러 주세요! 다음 목적지도 준비해 뒀어요!`,first:p=>`출발할게요, 함장님! 첫 거점은 ${p}예요. 화물은 차곡차곡, 목록대로 꼼꼼하게 확인해 주세요!`,
  next:(p,k,n,m)=>`${p} ${k} 끝! 좋아요, 함장님! 다음은 ${n}, 약 ${m}분 걸려요!`,jump:g=>` 이번엔 ${g}를 경유해서 점프해요!`,jumpDone:(x,n)=>`점프 성공이에요, 함장님! ${x} 도착! 다음 목적지: ${n}!`,cargo:(u,x)=>u?` 내릴 화물: ${x}! 아래 목록 꼭 봐 주세요!`:` 실을 화물: ${x}! 아래 목록대로 부탁해요!`,
  undo:x=>`앗, ${x} 완료 기록을 되돌렸어요! 실제 화물이 어디 있는지 확인하고 다시 진행해 주세요.`,defer:p=>`${p}는 나중에 들르는 순서로 바꿨어요! 바뀐 경로도 확인해 주세요!`,replan:'지금 실린 화물 위치는 그대로! 남은 경로를 다시 짰어요. 함장님, 새 일정 준비됐어요!',done:'전부 배송 완료로 기록했어요!!',doneSub:'함장님, 오늘도 고생 많으셨어요! 화물칸은 비우고, 지갑은 채우는 운항이었길 바라요! 게임에서도 계약이 모두 완료됐는지 마지막으로 확인해 주세요.'
 }
};

// English dialogue for the two active hauling partners.
const EN={
 standard:{
  role:'Senior Navigator',welcome:'Welcome aboard, Captain.',welcomeSub:'I am the STAM senior navigator. I will review your contracts and prepare an efficient route and loading plan.',left:n=>`${n} contract(s) from earlier are still open. You can continue reviewing them.`,
  ship:s=>`Your ship is the ${s}.`,shipSub:c=>`I will plan the loading around ${c} SCU of cargo space. Please confirm the ship you are flying today.`,shipOk:'Confirm ship',
  start:'Let us confirm your starting point.',startSub:'Enter where you are now. Part of the name is enough to search.',startOk:'Confirm start',notFound:'I could not find that location. Please pick the exact name from the search results.',
  shots:'Please upload your accepted contracts.',shotsSub:'I will review the visit order and loading plan together. Add several images at once, drag and drop, or paste with Ctrl+V.',reading:'Checking the cargo manifests. I will also look at contracts that share pickups.',readDone:n=>`${n} contract(s) checked.`,
  confirm:n=>`Please review ${n} contract(s).`,confirmSub:'You can correct anything misread. Even identical goods and container sizes stay separated by the contract they belong to.',confirmOk:'Contracts confirmed',locationIssue:id=>`I could not confirm the location for ${id}. Please choose the pickup and delivery in Edit.`,
  containers:'Some cargo has no container breakdown yet.',boxesSub:'Totals alone cannot fix the real loading. Just enter the count for each container size. A layout entered once is reused for missions with the same commodity mix; if you continue without it, assumed containers are used.',boxesOk:'Calculate loading plan',
  fail:'I cannot settle a route with the current input.',failSub:'Please recheck the locations, cargo amounts and container breakdowns.',
  brief:'Your route is ready, Captain.',briefSub:(n,t,r,rate,b)=>`${n} stops in total, about ${t} minutes.${r?` Expected reward ${r} aUEC, about ${rate} aUEC per hour.`:''}${b?` At ${b} stop(s) other containers may need moving before unloading. Please check those loading lists.`:''}`,launch:'Launch',
  ready:'Ready for departure. Record completion when you finish at the first stop.',atStop:p=>`Press the complete button when you finish at ${p}. I will guide the next leg.`,first:p=>`Departing. First stop: ${p}. On arrival, check that contract's cargo and get to work.`,
  next:(p,k,n,m)=>`${p} ${k} recorded. Next destination: ${n}, about ${m} min.`,jump:g=>` We jump via ${g}.`,jumpDone:(x,n)=>`Jump recorded. Arrived at ${x}. Next: ${n}.`,cargo:(u,x)=>u?` Unload: ${x}. Please check the list below.`:` Load: ${x}. Please load as listed below.`,
  undo:x=>`I reverted the completion for ${x}. Check the actual cargo before continuing.`,defer:p=>`${p} moved later in the order. Please review the updated visit order.`,replan:'Remaining route recalculated, keeping your current cargo positions.',done:'Well done, Captain.',doneSub:'Every stop is recorded as complete. Please confirm the contracts are complete in game as well. The run log is below.'
 },
 aide:{
  role:'Bridge Operator',welcome:'Welcome, Captain!',welcomeSub:'I will sort out today’s hauling schedule and cargo layout! Shall we untangle those contracts one by one?!',left:n=>`${n} contract(s) from last time are still here! Want me to keep sorting them?`,
  ship:s=>`Today we fly the ${s}!`,shipSub:c=>`That is ${c} SCU of cargo space! Please check it is the ship you are using. I can find gaps, but I cannot make the hold bigger yet!`,shipOk:'Ready with this ship',
  start:'Captain, where do we start?!',startSub:'Tell me where you are! Part of the name is fine, I will find it. A good start means fewer wasted trips!',startOk:'Start here',notFound:'Oops, I could not find that location! Please pick the exact name from the results.',
  shots:'Captain, you brought today’s contracts, right?!',shotsSub:'Upload the screenshots! Several at once, drag and drop or Ctrl+V all work. I will sort out the tricky schedule!',reading:'Reading the contracts! I will shorten the route. Container weight is… not my department!',readDone:n=>`${n} contract(s) checked! Shall we look together?!`,
  confirm:n=>`Here is how I sorted ${n} contract(s)!`,confirmSub:'Captain, just check the amounts and destinations! Containers may look the same but belong to different contracts. I will keep them apart!',confirmOk:'Looks good',locationIssue:id=>`Captain, I could not find the location for ${id}! Please pick the pickup and delivery in Edit.`,
  containers:'Captain! I need the real container breakdown.',boxesSub:'Total SCU alone does not tell me how many containers! Just enter the count for each size! Tell me once and I will fill it in for missions with the same commodity mix. If you do not know yet, I can calculate with assumed containers first.',boxesOk:'Calculate like this',
  fail:'Oops, I cannot set a route like this!',failSub:'Captain, please check the locations, amounts and container breakdown! Fix them and I will try again.',
  brief:'Captain, all set!',briefSub:(n,t,r,rate,b)=>`${n} stops in total, about ${t} minutes!${r?` Expected reward ${r} aUEC, about ${rate} aUEC per hour!`:' Let us finish nearby contracts one by one!'}${b?` But at ${b} stop(s) other containers may need moving before unloading. Please check those loading lists!`:''} Tell me when you are ready to go!`,launch:'Let’s go!',
  ready:'All set! Press complete when you finish at the first stop. I will handle the rest of the schedule!',atStop:p=>`Captain, press the button when you are done at ${p}! The next destination is ready!`,first:p=>`Off we go, Captain! First stop is ${p}. Load neatly and check the list carefully!`,
  next:(p,k,n,m)=>`${p} ${k} done! Nice, Captain! Next is ${n}, about ${m} min!`,jump:g=>` This time we jump via ${g}!`,jumpDone:(x,n)=>`Jump successful, Captain! Arrived at ${x}! Next: ${n}!`,cargo:(u,x)=>u?` Unload: ${x}! Check the list below!`:` Load: ${x}! As listed below, please!`,
  undo:x=>`Oops, I reverted the completion for ${x}! Check where the cargo actually is and carry on.`,defer:p=>`${p} moved to a later visit! Please check the new route too!`,replan:'Cargo stays where it is! I re-planned the rest of the route. New schedule ready, Captain!',done:'Everything delivered!!',doneSub:'Great work today, Captain! I hope the hold is empty and the wallet is full! Please double-check in game that every contract is complete.'
 }
};
// Functional introductions replace fictional CVs. Broker previews never become the active hauling partner.
L.standard.profile={headline:'여러 계약을 묶어, 한 번에 효율적으로.',intro:'함장님, 맡기신 계약을 함께 검토해 화물을 모으고 불필요한 왕복을 줄이겠습니다. 여러 계약을 동시에 처리하거나 대형 화물선을 운용하신다면 제게 맡겨주십시오.',points:[['픽업은 한 번에 모으겠습니다.','같은 거점에서 실을 수 있는 화물을 챙긴 뒤 출발하겠습니다.'],['겹치는 항로는 묶겠습니다.','배송지가 같은 계약을 함께 처리하겠습니다. 거리가 조금 늘어도 같은 행성권의 재진입·재착륙을 줄이는 순서를 우선하겠습니다.'],['하역까지 고려하겠습니다.','실제 적재 공간을 확인하고, 내릴 순서에 맞춰 상자를 배치하겠습니다.']]};
L.aide.profile={headline:'가까운 계약부터, 하나씩 확실하게!',intro:'함장님, 처음부터 화물칸을 꽉 채울 필요는 없어요! 가까운 계약부터 하나씩 끝내봐요. 작은 함선으로 시작하셔도 제가 차근차근 안내할게요.',points:[['가까운 계약부터!','적게 들르고 배송까지 끝낼 수 있는 일부터 찾아볼게요.'],['실었으면 배송하러 가요.','같은 행성권에서 가까운 픽업을 챙긴 뒤 배송하러 갈게요. 떠난 뒤에는 실은 화물을 다 배송하고 다음 픽업을 할게요.'],['지금 할 일을 알려드려요.','어디로 갈지, 몇 SCU 상자를 몇 개 싣고 내릴지, 다음에 뭘 누를지 짚어드릴게요!']]};
L.broker={role:'밀수 브로커',welcome:'함장, 돈 되는 항로를 찾고 있나?',welcomeSub:'난 파이로에서 거래를 연결하는 밀수 브로커야. 계약 운송과는 다른 일을 준비하고 있지.',profile:{headline:'다음 거래는 준비 중이야. 곧 보자고.',intro:'함선과 굴릴 자금만 알려줘. 어떤 물건을 얼마나 사고, 어디서 팔지 알아봐 줄게. 아직 거래망을 정비 중이니, 지금은 오퍼레이터나 항해사와 운송부터 다녀와.',points:[['함선과 자금에 맞는 거래','화물칸과 예산에 맞춰 품목·수량·매입 비용을 제안할 예정이야.'],['구매부터 판매까지','살 곳과 팔 곳, 예상 이익과 가격 확인 시각을 함께 보여줄 예정이지.'],['무역 기능 준비 중','아직 거래 추천은 시작할 수 없어. 준비가 끝나면 여기서 만나자고.']]}};
EN.standard.profile={headline:'Combine contracts. Haul efficiently.',intro:'Captain, I will review your contracts together, gather cargo and reduce unnecessary return trips. Leave multi-contract runs and heavy freighters to me.',points:[['Collect before departing.','I gather every shipment that fits at each pickup.'],['Combine overlapping routes.','I group shared destinations and prioritise fewer returns to a planet region over a slightly shorter distance.'],['Plan for unloading.','I check real cargo grids and arrange containers for the delivery order.']]};
EN.aide.profile={headline:'Nearby contracts, one clear delivery at a time!',intro:'Captain, we do not have to fill the whole hold! Let us finish nearby contracts one by one. Starting with a small ship? I will guide every step!',points:[['Start nearby!','I look for contracts we can finish with fewer stops.'],['Load, then deliver.','I collect nearby cargo within one planet region. After leaving, I finish delivering that batch before another pickup.'],['Know what to do next.','I point out the destination, container sizes and counts, and the next button to press!']]};
EN.broker={role:'Smuggling Broker',welcome:'Looking for a profitable route, Captain?',welcomeSub:'I connect deals out in Pyro. Something different from contract hauling is in the works.',profile:{headline:'The next deal is coming. See you soon.',intro:'Tell me your ship and working capital. I will help figure out what to buy, how much, and where to sell it. The trading network is still being prepared; take a haul with the operator or navigator for now.',points:[['Trades for your ship and budget','Planned: commodities, quantities and purchase costs that fit your hold and funds.'],['From purchase to sale','Planned: buying and selling locations, estimated profit and price timestamps.'],['Trading is coming soon','Trade recommendations are not available yet. Meet me here when preparations are complete.']]}};
// Intake and container review belong to the partner too, in both languages.
L.standard.inbox='수신한 계약을 확인하겠습니다.';
L.standard.inboxSub='계약을 체크한 뒤 한 번에 경로를 계산합니다. 실제 수량·상자 구성·최대치 기준을 구분해 확인하겠습니다.';
L.aide.inbox='함장님, 들어온 계약부터 챙겨봐요!';
L.aide.inboxSub='함장님, 할 계약만 체크해요! 경로는 한 번에 짤게요. 수량이 안 보이면 최대치로 자리를 넉넉히 잡을 수도 있어요.';
EN.standard.inbox='Let us review the received contracts.';
EN.standard.inboxSub='Check contracts, then plan them together. We distinguish confirmed boxes, actual total SCU and upper-bound estimates.';
EN.aide.inbox='Captain, let’s pick up those new contracts!';
EN.aide.inboxSub='Captain, check the jobs you want! I’ll plan them together. If quantities are missing, we can reserve space using their upper bounds.';
L.standard.boxes='상자 구성과 계산 근거를 확인하십시오.';
L.standard.boxesSub='이 계약의 직접 입력 구성과 미션의 최대 상자 규격을 대조했습니다. 자동 구성은 예상값이므로 실제 크기·개수와 다른 항목을 수정하십시오.';
L.aide.boxes='상자는 이렇게 나눠봤어요!';
L.aide.boxesSub='이 계약에 입력한 구성이나 미션 규격으로 채워뒀어요! 최대 크기로 잡은 예상 구성도 있으니 실제 상자와 비교해 주세요. 합계가 맞아도 상자 모양까지 같진 않거든요.';
EN.standard.boxes='Review the container breakdown and its source.';
EN.standard.boxesSub='I compared this contract’s manual layout and mission container limits. Automatic layouts are estimates; correct any differences in actual sizes and counts.';
EN.aide.boxes='Here is the container breakdown!';
EN.aide.boxesSub='I used this contract’s manual layout or mission limits to fill this in! Some layouts assume maximum-size crates, so check the real counts too. Equal SCU does not mean equal shapes.';
L.aide.welcomeSub='가까운 계약부터 하나씩 끝내봐요! 픽업부터 마지막 배송까지 제가 안내할게요.';
EN.aide.welcomeSub='Let’s finish nearby contracts one by one! I’ll guide you from pickup to the final delivery.';
L.aide.start='어디서 출발할까요, 함장님?';
L.aide.startSub='지금 계신 곳을 알려주세요! 지명 일부만 입력하고 목록에서 고르면 돼요. 출발점은 정확히 잡고 가요!';
L.aide.reading='계약서 확인 중이에요! 수량과 배송지부터 맞춰볼게요. 상자보다 일정이 먼저 엉키면 곤란하니까요.';
L.aide.readDone=n=>`계약 ${n}건 읽었어요! 수량과 목적지, 같이 확인해봐요.`;
L.aide.atStop=p=>`${p}에서 목록대로 싣고 내려주세요! 작업이 끝나면 완료를 눌러요. 다음 일정은 제가 챙길게요.`;
L.aide.first=p=>`첫 거점은 ${p}예요! 도착하면 목록부터 확인해요. 상자가 닮았다고 다른 계약 것까지 가져오시면 안 돼요!`;
EN.aide.start='Where are we starting, Captain?';
EN.aide.startSub='Tell me where you are! Type part of the name and choose a result. Let’s get the starting point right!';
EN.aide.reading='Checking amounts and destinations! Let’s untangle the schedule before we touch the crates.';
EN.aide.readDone=n=>`${n} contract(s) read! Let’s check the quantities and destinations.`;
EN.aide.atStop=p=>`Load and unload at ${p} as listed! Press Complete when the work is done. I’ll keep the next stop ready.`;
EN.aide.first=p=>`First stop: ${p}! Check the list when we arrive. Matching crates can still belong to different contracts!`;
L.standard.departure=p=>`${p}에서 출발합니다. 실제 출발 후 출발 완료를 기록하십시오.`;
L.aide.departure=p=>`${p}에서 출발해요! 이륙하시면 출발 완료를 눌러주세요. 첫 픽업지는 제가 안내할게요.`;
EN.standard.departure=p=>`Departing from ${p}. Record departure after you actually leave.`;
EN.aide.departure=p=>`We’re leaving ${p}! Press Departed once we’re away. I’ll guide you to the first pickup.`;
L.standard.jumpWork=(entry,exit)=>`${entry}에서 진입해 ${exit}로 나갑니다. 점프 완료 후 진행하십시오. 이 단계에는 화물 작업이 없습니다.`;
L.aide.jumpWork=(entry,exit)=>`${entry}로 들어가서 ${exit}로 나와요! 실제로 건넌 뒤 점프 완료를 눌러주세요. 이번엔 상자 들 일이 없네요!`;
EN.standard.jumpWork=(entry,exit)=>`Enter at ${entry} and exit at ${exit}. Record completion after crossing. No cargo handling at this step.`;
EN.aide.jumpWork=(entry,exit)=>`In through ${entry}, out through ${exit}! Press Jump complete after crossing. No crates to lift this time!`;
export function voiceId(){try{const v=localStorage.getItem(KEY);return v==='aide'?'aide':'standard';}catch{return 'standard';}}
export function setVoice(v){if(!['standard','aide'].includes(v))return;try{localStorage.setItem(KEY,v);}catch{}}
export function flightVoice(id,english){const voices=english?EN:L;return voices[id]||voices.standard;}
export const V=(id=voiceId())=>flightVoice(id,isEn);
export const routePolicy=()=>voiceId()==='aide'?'delivery-first':'batch';
