import type {SpaceScreen} from './space-navigation';

export type LoungeTourStop={
 id:string;code:string;name:readonly[string,string];detail:readonly[string,string];
 focus:number;foot:readonly[number,number];height:number;guide:'cinema'|'archive'|'service'|'waiting';
 screen:SpaceScreen;travel:readonly[string,string];intro:readonly[string,string];
};
// Explain the purpose of each place, rather than describing changing card
// positions or feature-specific data. Routing ids remain the existing ids.
export const loungeTourStops:readonly LoungeTourStop[]=[
 {id:'cinema',code:'CINEMA',name:['시네마','Cinema'],detail:['준비된 영상과 소개 콘텐츠','Films and introductions'],focus:1190,foot:[1260,760],height:340,guide:'cinema',screen:'cinema',
 travel:['먼저 시네마로 가시죠. 이쪽이에요. 제가 앞에서 안내해 드릴게요.','The cinema comes first. This way, please. I’ll lead you there.'],
 intro:['여기가 시네마예요. 준비된 영상과 소개 콘텐츠를 감상하실 수 있죠. 자세히 둘러보실 시간은 나중에 드릴게요. 지금은 셔틀 시간에 맞춰 다음으로 가시죠.','This is the cinema, where you can watch our films and introductions. You can explore at your leisure later. For now, let’s keep to the shuttle schedule.']},
 {id:'archive',code:'ARCHIVE',name:['아카이브','Archive'],detail:['함선 · 미션 · 화물 자료','Ships · missions · cargo'],focus:1120,foot:[1160,790],height:360,guide:'archive',screen:'information',
 travel:['이번에는 아카이브예요. 시네마 옆에 있으니 금방 도착해요.','Next is the archive. It’s right beside the cinema.'],
 intro:['아카이브에는 함선과 미션, 화물에 관한 자료가 모여 있어요. 운송을 준비하시면서 필요한 내용을 찾아보시면 돼요. 지금은 위치만 기억해 두시고, 서비스센터로 가실까요?','The archive brings together information about ships, missions and cargo. Return here when you need a reference for your run. Shall we visit the service center next?']},
 {id:'service',code:'SERVICE CENTER',name:['서비스센터','Service center'],detail:['계정 · 기록 · 이용안내','Account · history · help'],focus:930,foot:[1000,760],height:350,guide:'service',screen:'service',
 travel:['도움이 필요하실 땐 서비스센터를 찾아주세요. 저쪽 중앙이에요.','The service center is where you can find help. It’s over in the center.'],
 intro:['여기는 서비스센터예요. 계정과 이용 기록, 이용안내 같은 도움말을 확인하실 수 있어요. 필요한 건 나중에 천천히 살펴보시죠. 이제 게이트로 안내해 드릴게요.','This is the service center. You can find account services, history and help here. There will be time to look around later. Now, let me show you the gate.']},
 {id:'gate',code:'BOARDING GATE',name:['탑승 게이트','Boarding gate'],detail:['셔틀 탑승 전 집결 장소','Meet here before boarding'],focus:730,foot:[760,810],height:410,guide:'waiting',screen:'lounge',
 travel:['셔틀 출발 전에 맞춰 왔네요. 게이트까지 조금만 더 따라오세요.','We’re on time for the shuttle. Follow me just a little farther to the gate.'],
 intro:['게이트에 도착했어요. 라운지는 돌아오셔서 천천히 둘러보셔도 돼요. 오늘 라운지 안내는 여기까지예요. 준비되시면 관제센터에서 다음 운송을 시작하시죠.','We’ve reached the gate. You can explore the lounge when you return. That completes our lounge tour. When you’re ready, continue to the control center to prepare your next run.']},
];
