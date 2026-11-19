import profiles from '../../../data/partner-greetings.json';
export type PartnerId = 'director' | 'operator' | 'navigator';
export const partnerDialogue = {
 director: {
  name: ['플라이트 가이드', 'Flight Guide'],
  greetings: [
   [profiles.director.ko, profiles.director.en],
   ['서두르실 것 없어요. 멋진 출발에는 준비할 시간이 필요하니까요.', 'No need to rush. A fine departure deserves a little preparation.'],
   ['길을 잃으셨나요? 괜찮아요. 저를 찾으셨으니 잘 오신 거예요.', 'Lost your way? Quite all right. You found me, so you are in the right place.'],
  ],
 },
 operator: {
  name: ['브리지 오퍼레이터', 'Bridge Operator'],
  greetings: [
   [profiles.operator.ko, profiles.operator.en],
   ['여기예요, 여기! 잠깐 얘기하고 가실래요?', 'Over here! Have a moment for a chat?'],
   ['반가워요! 우주가 넓어도 말 걸어주시는 건 바로 알아챈다니까요.', 'Good to see you! Space is huge, but I never miss someone saying hello.'],
  ],
 },
 navigator: {
  name: ['수석 항해사', 'Senior Navigator'],
  greetings: [
   [profiles.navigator.ko, profiles.navigator.en],
   ['말씀하십시오. 정확한 판단에는 충분한 정보가 필요합니다.', 'Go ahead. Sound judgement requires sufficient information.'],
   ['서두를 필요는 없습니다. 준비를 마친 뒤 움직이는 편이 낫습니다.', 'There is no need to hurry. It is better to move once preparations are complete.'],
  ],
 },
} as const;
