import type {AcademyLesson,SpaceRoute} from './space-navigation';

const lessons = {
 practice: {
  title: ['운송 튜토리얼','Hauling tutorial'],
  guide: ['함장님, 아카데미로 연결하겠습니다. 교수님, 함장님의 첫 운송 계약을 함께 봐 주시겠어요?',
   'Captain, let me put you through to the academy. Professor, would you walk the Captain through a first hauling contract?'],
  professor: ['그럼요. 반가워요, 함장님. 계약서를 같이 볼까요? 짐을 어디서 싣고 어디에 내리는지, 두 곳부터 짚어 봐요.',
   'Of course. Good to meet you, Captain. Shall we read the contract together? Let’s find two places first. Where do we pick up the cargo, and where do we deliver it?'],
 },
 trade: {
  title: ['무역 튜토리얼','Trading tutorial'],
  guide: ['함장님, 아카데미로 연결하겠습니다. 교수님, 함장님께서 첫 교역을 준비 중이세요. 시세표부터 부탁드려도 될까요?',
   'Captain, let me put you through to the academy. Professor, the Captain is preparing for a first trade. Could you start with the price board?'],
  professor: ['물론이죠. 어서 와요, 함장님. 같은 화물도 항구마다 값이 달라요. 우리 시세표에서 어디서 사고 어디서 팔지 같이 골라 봐요.',
   'Of course. Welcome, Captain. The same cargo can fetch a different price at each port. Let’s look at the board together and pick where to buy and where to sell.'],
 },
} as const;

export function professorWelcome(lesson:AcademyLesson,en:boolean){
 return lessons[lesson].professor[en?1:0];
}

export function academyTutorials(en:boolean,navigate:(route:Omit<SpaceRoute,'locale'>)=>void,fromDesk=false){
 return (['practice','trade'] as const).map(lesson=>({
  id:lesson,label:lessons[lesson].title[en?1:0],
  ...(fromDesk?{introduction:lessons[lesson].guide[en?1:0],skipReturn:true}:{}),
  open:()=>navigate({screen:'division',facility:'guide-center',lesson,...(fromDesk?{fromDesk:true}:{})}),
 }));
}
