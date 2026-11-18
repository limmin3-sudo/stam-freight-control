import host from './assets/guided-visit/host.webp';
import reception from './assets/guided-visit/reception.webp';
import service from './assets/guided-visit/service.webp';
import shipbay from './assets/guided-visit/shipbay.webp';
import cinema from './assets/guided-visit/cinema.webp';
import gate from './assets/guided-visit/gate.webp';
import oncomms from './assets/guided-visit/oncomms.webp';
import preflight from './assets/guided-visit/preflight.webp';
import contractlist from './assets/guided-visit/contractlist.webp';
import starmap from './assets/guided-visit/starmap.webp';
import hold from './assets/guided-visit/hold.webp';
import handover from './assets/guided-visit/handover.webp';
import officer from './assets/guided-visit/officer.webp';
import priceboard from './assets/guided-visit/priceboard.webp';
import brokerdesk from './assets/guided-visit/brokerdesk.webp';
import budget from './assets/guided-visit/budget.webp';
import ledger from './assets/guided-visit/ledger.webp';
import settle from './assets/guided-visit/settle.webp';
import profhello from './assets/guided-visit/profhello.webp';
import library from './assets/guided-visit/library.webp';
import classroom from './assets/guided-visit/classroom.webp';
import containers from './assets/guided-visit/containers.webp';
import research from './assets/guided-visit/research.webp';
import farewell from './assets/guided-visit/farewell.webp';
import welcome from './assets/guided-visit/lounge.webp';
import arrival from './assets/guided-visit/arrival.webp';
import contract from './assets/guided-visit/bridge.webp';
import chart from './assets/guided-visit/maptable.webp';
import merchants from './assets/guided-visit/trade.webp';
import terminal from './assets/guided-visit/quote.webp';
import faculty from './assets/guided-visit/academy.webp';
import lesson from './assets/guided-visit/study.webp';
import exhibit from './assets/guided-visit/archive.webp';
import concourse from './assets/lounge-original-composite.png';
import tradeHall from './assets/facility-lobbies/trade-lobby-approved.png';
import campus from './assets/facility-lobbies/academy-lobby-approved.png';
import operations from './assets/operations-console-closeup.png';
import operatorPortrait from './assets/partner-close/operator.png';
import officerPortrait from './assets/dialogue-poses/senior-trade-officer/02.webp';
import director from './assets/partner-close/director.png';
import broker from './assets/dialogue-poses/ling-broker/03.webp';
import professor from './assets/dialogue-poses/academic-advisor/05.webp';
import {divisionFacilities} from './division-facilities';

export const speakers = {
 guide:['플라이트 가이드','Flight guide'], desk:['접수 직원','Receptionist'],
 operator:['브리지 오퍼레이터','Bridge operator'], navigator:['수석 항해사','Senior navigator'],
 senior:['수석 무역관','Senior trade officer'], broker:['링 가문 중개인','House Ling broker'],
 professor:['교수','Professor'],
} as const;
type Speaker = keyof typeof speakers;
type Shot = {plate:string; x:number; y:number; scale:number; person?:string; clearLeftHand?:boolean};
function shot(plate:string, x=50, y=50, scale=1, person?:string):Shot {
 return {plate,x,y,scale,person};
}
export type VisitLine = {speaker:Speaker; shot:Shot; text:readonly [string,string]};
function line(speaker:Speaker, camera:Shot, ko:string, en:string):VisitLine {
 return {speaker,shot:camera,text:[ko,en]};
}
function chapter(id:string, lines:VisitLine[]) {
 const place=divisionFacilities.find(f=>f.id===id)!;
 return {name:place.name,marker:place.marker,lines};
}
export const visitChapters=[
 chapter('lounge',[
  line('guide',shot(host),'어서 오세요. 출항 전에 이곳부터 잠시 둘러보시죠.','Welcome aboard. Let me show you around before your first flight.'),
  line('guide',shot(welcome),"저기 데스크에 계신 분께 먼저 인사드리죠. 이곳에 돌아오시면 반겨 주실 분이에요.","Let me introduce our receptionist. She looks after this desk."),
  line('desk',shot(reception),'돌아오실 땐 이 데스크를 찾으세요. 저는 늘 여기 있거든요.','Look for this desk when you come back. You can always find me here.'),
  line('guide',shot(welcome,80,35,1.14),'저보다 찾기 쉬우실 거예요. 저는 보통 이렇게 손님을 모시고 다니니까요.','Much easier to find than me. As you can see, I tend to be out with guests.'),
  line('guide',shot(welcome,25,42,1.1),"돌아오신 손님이 지난 운송 기록을 찾으시면 어디로 안내하시죠?","And if our guest forgets how far they got on a previous haul?"),
  line('desk',shot(service),'지난 운송 기록이나 계정을 보시려면 저쪽 서비스센터로 가시면 돼요.','For your account or past haul records, the service centre is just over there.'),
  line('guide',shot(concourse,58,55,1.14,director),"이용 중 불편한 점을 남기는 곳도 서비스센터 안에 있어요. 돌아오실 때는 이쪽 표식을 찾으세요.","You can also leave feedback at the service centre. Look for this marker when you come back."),
  line('guide',shot(exhibit),'이쪽은 아카이브예요. 마음에 드는 함선이 있으세요? 실을 수 있는 화물도 함께 살펴보시죠.','This is the archive. See a ship you like? You can check what it carries, too.'),
  line('guide',shot(shipbay),"함선 자료에서 화물칸 용량을 먼저 보세요. 옆의 화물 자료에서는 상자 규격도 살펴볼 수 있어요.","Start with hold capacity in the ship reference. The cargo reference next to it lists container sizes."),
  line('guide',shot(cinema),'오른쪽은 시네마예요. 오늘은 상영이 없군요. 이제 게이트로 가실까요?','The cinema is on your right. No screenings today. Shall we head to the gate?'),
  line('operator',shot(oncomms),'가이드님, 두 분 오시는 거 맞죠? 여기서 기다리고 있어요!','Guide, is that the two of you coming through? I’m waiting up here!'),
  line('guide',shot(concourse,39,46,1.15,director),'마침 게이트 앞이에요. 곧 뵙죠.','Perfect timing. We’re at the gate. See you shortly.'),
  line('guide',shot(gate),"준비되셨어요? 게이트를 지나면 방금 무전한 분이 맞아 주실 거예요.","Ready? The person you just heard on the radio will meet us on the other side."),
 ]),
 chapter('bridge',[
  line('operator',shot(arrival),'아, 여기예요! 방금 무전한 사람이 저예요. 첫 미션, 저랑 같이 골라볼까요?','Over here! That was me on the radio. Shall we pick your first mission?'),
  line('guide',shot(contract),'반갑네요. 첫 미션은 어디서 고르면 되죠?','Lovely to see you. Where do we start?'),
  line('operator',shot(preflight),"먼저 타고 갈 함선이랑 출발지를 골라 주세요. 좋은 의뢰라도 내 배에 실을 수 있어야 하잖아요!","Pick your ship and departure point first. Even a great contract has to fit in your hold!"),
  line('operator',shot(contract,78,67,1.18),'이 콘솔이요! 여기 보세요. 이 의뢰, 보수가 꽤 괜찮죠?','Right at this console! Look at this contract. Pretty good payout, isn’t it?'),
  line('operator',shot(contractlist),"픽업지랑 배송지도 같이 보세요. 보수는 좋은데 왕복 시간이 길면 고민되거든요.","Check the pickup and delivery sites here as well. A long round trip can take the shine off a good payout."),
  line('navigator',shot(chart),'허허, 보수 보기 전에 어디까지 가는지도 봐야지. 지도 좀 이리 줘 봐.','Hang on there. Best see how far you’re hauling first. Let’s pull up the chart.'),
  line('operator',shot(chart,36,41,1.12),'그래서 항해사님부터 모셨잖아요! 자, 목적지 찍었어요.','That’s why I brought you in! There, I’ve marked the destination.'),
  line('navigator',shot(starmap),"여기 좀 봐요. 이게 출발지, 이 점이 화물을 내릴 곳이야. 항로 지도에서 먼저 짚어 봅시다.","Take a look here. This is where you start, and this dot is your drop-off. Let’s trace it on the star chart."),
  line('navigator',shot(chart,67,60,1.17),'그다음엔 들를 순서를 봐요. 이 둘은 가까워도, 화물을 실은 뒤에야 내리러 갈 수 있으니까.','Now check the order of stops. These two are close, but you still have to pick up the load before you can deliver it.'),
  line('operator',shot(hold),'출발하면 이쪽 관제 콘솔을 봐요. 지금 할 일하고 실은 화물을 같이 볼 수 있어요.','Once you’re moving, use operations to check the current job and what’s in your hold.'),
  line('operator',shot(operations,50,50,1.04,operatorPortrait),"화물칸을 열면 상자 자리도 입체로 보여요. 어디에 실었는지 기억에만 맡기지 마세요!","Open the 3D hold to see where your crates sit. No need to keep every box in your head!"),
  line('navigator',shot(handover),"먼저 내릴 상자가 안쪽에 있으면 하역 전에 옮길 상자부터 봐요. 현장에서 덜 헤매거든.","If the first delivery is buried, check which crates need moving before unloading. Saves fumbling at the dock."),
  line('guide',shot(arrival,22,44,1.12),'의뢰도 골랐고 길도 찾았네요. 이번엔 내 화물을 사고파는 분들을 만나 보시죠.','A job and a route. Now let’s meet the people who can help you trade your own cargo.'),
 ]),
 chapter('trade',[
  line('guide',shot(merchants),'무역관님, 오늘 처음 오신 분이에요. 첫 거래라면 뭘 먼저 살펴볼까요?','Our guest is new here. What would you check before making a first trade?'),
  line('senior',shot(officer),'아이고, 잘 왔어요. 우선 배에 자리가 얼마나 남았나 봐야지. 못 싣고 두고 오면 아깝잖아.','Glad you came by. First, see how much room you have left. A bargain is no use if you can’t take it home.'),
  line('broker',shot(tradeHall,70,50,1.04,broker),'목적지도 정해 두시죠. 행성계 밖으로 가신다면 제게 오세요. 링 가문의 중개인이에요.','Choose a destination as well. If your business takes you beyond this system, come to me. I represent House Ling.'),
  line('broker',shot(brokerdesk),"행성계 간 계획을 열면 출발지를 먼저 골라 주세요. 어느 쪽에서 건너가느냐에 따라 후보가 달라지니까요.","Start your interstellar plan by choosing where you’ll depart. Different starting points give you different options."),
  line('senior',shot(terminal),'이 행성계 안에서는 내가 봐 줄게요. 자, 유리벽 안 무역관제실에서 시세부터 봅시다.','For local runs, you’ve got me. Come through the glass doors. We’ll check the prices first.'),
  line('senior',shot(priceboard),"품목 하나를 찾아보세요. 여기 거래소마다 살 때와 팔 때 값이 다르죠? 조회한 시각도 같이 봐요.","Look up one commodity. See how buy and sell prices vary by terminal? Check when the quote was fetched, too."),
  line('guide',shot(terminal,55,65,1.16),'눈에 드는 거래가 하나 있군요. 지금 가진 자금으로도 될까요?','That trade looks promising. Would our trading funds cover it?'),
  line('senior',shot(budget),'그럼, 함선하고 가진 돈을 넣어 봐요. 무리 없이 다녀올 길부터 골라 줄 테니.','Let’s put in your ship and your budget. We’ll find a run you can comfortably afford.'),
  line('guide',shot(merchants,24,41,1.14),"계획대로 전부 못 사도 괜찮나요? 현장에 그만큼 남아 있지 않을 수도 있잖아요.","What if we can’t buy the whole planned load? The terminal might have less in stock."),
  line('broker',shot(ledger),"그럴 땐 옆 거래기록실에 실제로 산 수량과 단가를 적으세요. 예상과 실제 거래는 구분해서 봐야죠.","Enter the quantity and price you actually paid in the records room next door. Keep estimates separate from actual trades."),
  line('broker',shot(merchants,87,42,1.18),'매출만 보고 만족하기엔 이르겠죠, 무역관님? 배에 남은 짐도 있을 테니까요.','A little early to celebrate the revenue alone, wouldn’t you say? There may still be cargo aboard.'),
  line('senior',shot(tradeHall,82,48,1.12,officerPortrait),'거기서 산 값, 판 값, 남은 짐까지 챙겨 봐요. 첫 정산이니 천천히 해도 돼요.','Check purchases, sales and remaining stock there. Take your time with that first settlement.'),
  line('senior',shot(settle),"절반만 팔았다면 절반만 적어요. 쓴 비용까지 기록하면 팔아서 남은 돈과 배에 남은 짐을 따로 볼 수 있어요.","Sold half? Record just that half. Enter your expenses too, and you can see what you made and what’s still aboard."),
 ]),
 chapter('guide-center',[
  line('guide',shot(faculty),'교수님, 잠시 괜찮으세요? 오늘 처음 오신 분과 한 바퀴 도는 중이에요.','Professor, have a moment? I’m showing our newest arrival around.'),
  line('professor',shot(profhello),'그럼요. 이리 와서 앉아요. 한꺼번에 많이 들었죠? 여기서는 하나씩 같이 보면 돼요.','Of course. Come sit by me. A lot to take in, wasn’t it? We can go through it one piece at a time.'),
  line('professor',shot(library),"아까 본 함선이 기억나요? 운송 정보실에서 그 이름을 찾아봐요. 함선이나 미션 자료가 필요할 때 들르는 곳이에요.","Remember that ship you saw? Look it up in freight reference. That’s where to find ship and mission information."),
  line('guide',shot(faculty,30,43,1.1),"첫 의뢰로 뭘 고를지 막막하면 교육실로 모시면 될까요?","And if picking a first contract feels daunting, should I bring our guest to the classroom?"),
  line('professor',shot(classroom),"맞아요. 함선하고 지금 평판 단계를 골라 봐요. 그 조건에서 어떤 미션을 함께 받을지 비교할 수 있어요.","Exactly. Choose your ship and reputation rank. You can compare contract types that might pair well for you."),
  line('guide',{...shot(lesson),clearLeftHand:true},'제가 대신 여쭤봐도 될까요? 미션 둘을 같이 받아도 괜찮을지 궁금해하시던데요.','May I ask on our guest’s behalf? Can two contracts go on the same run?'),
  line('professor',shot(containers),"먼저 제일 큰 상자가 내 배에 들어가는지 봐요. 총량이 맞는다고 상자도 꼭 맞는 건 아니거든요.","Check that the biggest crate fits your ship first. Total volume only tells part of the story."),
  line('professor',{...shot(lesson,78,54,1.06),clearLeftHand:true},'자, 이 두 상자 보이죠? 둘 다 실려도 내리는 순서가 다르면 먼저 꺼낼 걸 앞에 둬요.','See these two crates? Even when both fit, load the one you’ll deliver first where you can reach it.'),
  line('guide',shot(faculty,24,37,1.15),"그럼 계약을 하나씩 도는 편이 나을 때도 있겠군요. 두 방법을 한번 비교해 볼 수 있을까요?","So sometimes it might pay to fly contracts separately. Can we compare the two approaches?"),
  line('professor',shot(research),"작전 연구실로 와요. 실제 Hull B 사례에서 계약을 골라 합쳐서 실을 때와 따로 돌 때를 비교해 봐요.","Come to operations study. Pick contracts from a real Hull B run and compare hauling together or separately."),
  line('professor',shot(campus,42,48,1.1,professor),'다녀와서 헷갈렸던 거 하나만 기억해 와요. 여기 자료 펼쳐 놓고 같이 풀면 돼요.','After your flight, bring back one thing that puzzled you. We’ll look it up and work it out together.'),
  line('guide',shot(faculty,26,42,1.1),'다음 방문은 두 분께 맡겨도 되겠군요. 이제 시설 지도로 돌아가시죠.','I’ll leave the next visit to the two of you. Shall we return to the directory?'),
  line('guide',shot(farewell),"이제 다음 행선지는 직접 골라 보시죠. 반가운 얼굴이 있는 곳부터 들르셔도 좋아요.","I’ll leave the next stop to you. You could start with a face you’d like to see again."),
 ]),
];
