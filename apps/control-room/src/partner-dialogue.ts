// Local greeting scaffold only. Expand topics/replies here after the dialogue design is agreed.
// No generated replies, partner switching, mission actions or persistent conversation history yet.
export type PartnerId = 'director' | 'operator' | 'navigator';
export const partnerDialogue = {
 director: {
  name: ['플라이트 디렉터', 'Flight Director'],
  voice: '도도하고 여유 있는 존댓말. 세련된 자신감과 은근한 농담. 무례함이나 반복적인 명령은 피한다.',
  greetings: [
   ['오셨군요. 라운지는 마음에 드시나요? 안내는 제가 해드리죠.', 'There you are. Is the lounge to your liking? Allow me to show you around.'],
   ['서두르실 것 없어요. 멋진 출발에는 준비할 시간이 필요하니까요.', 'No need to rush. A fine departure deserves a little preparation.'],
   ['길을 잃으셨나요? 괜찮아요. 저를 찾으셨으니 잘 오신 거예요.', 'Lost your way? Quite all right. You found me, so you are in the right place.'],
  ],
 },
 operator: {
  name: ['브리지 오퍼레이터', 'Bridge Operator'],
  voice: '깨발랄하고 친근한 성인 여성의 존댓말. 경쾌한 리액션과 다양한 표현. 유아어·과도한 느낌표·근거 없는 완료 보고는 피한다.',
  greetings: [
   ['앗, 오셨어요! 오늘은 어디로 떠날까요? 벌써 기대되는데요!', 'Oh, you’re here! Where are we heading today? I’m already excited!'],
   ['여기예요, 여기! 잠깐 얘기하고 가실래요?', 'Over here! Have a moment for a chat?'],
   ['반가워요! 우주가 넓어도 말 걸어주시는 건 바로 알아챈다니까요.', 'Good to see you! Space is huge, but I never miss someone saying hello.'],
  ],
 },
 navigator: {
  name: ['수석 항해사', 'Senior Navigator'],
  voice: '엄격하고 진지한 존댓말. 간결하고 침착하며 근거를 중시한다. 무례함·과장·확인하지 않은 항로/안전 보장은 피한다.',
  greetings: [
   ['오셨습니까. 출발 전 확인할 사항부터 차례로 살펴보겠습니다.', 'Welcome. We will review the pre-departure checks in order.'],
   ['말씀하십시오. 정확한 판단에는 충분한 정보가 필요합니다.', 'Go ahead. Sound judgement requires sufficient information.'],
   ['서두를 필요는 없습니다. 준비를 마친 뒤 움직이는 편이 낫습니다.', 'There is no need to hurry. It is better to move once preparations are complete.'],
  ],
 },
} as const;
