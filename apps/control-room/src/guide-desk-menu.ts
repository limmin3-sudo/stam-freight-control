import type {Locale} from './navigation';
import type {GuideTopic} from './guide-journey-content';
import './guide-desk-menu.css';

type Choice='freight'|'trade'|'tour';
type Options={locale:Locale;onGuide(topic:GuideTopic):void;onTour():void};
// Changes content inside the approved live panel; media and return are controller-owned.
export function mountGuideDeskMenu(root:HTMLElement,{locale,onGuide,onTour}:Options){
 const en=locale==='en',t=(ko:string,eng:string)=>en?eng:ko;
 const choices:Choice[]=['freight','trade','tour'];
 const buttons=[...root.querySelectorAll<HTMLButtonElement>('.actions .holo-action')];
 const replies=[...root.querySelectorAll<HTMLButtonElement>('.replies .holo-action')];
 const greeting=root.querySelector<HTMLElement>('#greeting')!;
 const panel=root.querySelector<HTMLElement>('.unified')!;
 panel.dataset.guideMenu='true';
 const title=document.createElement('h3');title.className='guide-menu-title';title.id='guide-menu-title';
 greeting.before(title);greeting.dataset.liveInk='true';
 const copy={
  freight:{label:t('운송 튜토리얼','Hauling tutorial'),body:t('예시 계약으로 파트너 선택부터 항로·적재 확인, 운송 완료까지 연습해요. 실제 운항에는 저장되지 않아요.','Practice choosing a partner, planning routes, checking cargo and completing a haul with sample contracts. Your real flight is unchanged.'),action:t('운송 연습 시작','Start practice')},
  trade:{label:t('무역 튜토리얼','Trading tutorial'),body:t('시장 확인부터 무역 계획, 매입·판매와 기록까지 안내할 예정이에요. 튜토리얼은 준비 중이며, 실제 무역 기능은 무역센터에서 이용할 수 있어요.','Guidance through markets, planning, buying, selling and records is coming soon. Trading is already available at the trade centre.'),action:t('안내 준비 중','Coming soon')},
  tour:{label:t('시설 둘러보기','Facility tour'),body:t('셔틀 출발 전에 시네마, 아카이브, 서비스센터를 둘러보고 게이트로 안내할게요. 각 공간에서 잠시 살펴본 뒤 다음으로 이동해요.','Before the shuttle departs, visit the cinema, archive and service centre, then head to the gate. Take a moment at each stop before continuing.'),action:t('둘러보기 시작','Start tour')},
 };
 const setLabel=(button:HTMLButtonElement,label:string)=>{button.dataset.liveInk='true';button.querySelector('span')!.textContent=label;};
 choices.forEach((choice,index)=>{setLabel(buttons[index]!,copy[choice].label);buttons[index]!.dataset.guideChoice=choice;buttons[index]!.setAttribute('aria-controls','guide-menu-title greeting');});
 // Retain the original return ink and its controller/ID. New copy uses shared fonts.
 const listeners:Array<()=>void>=[];
 const listen=(button:HTMLButtonElement,run:()=>void)=>{button.addEventListener('click',run);listeners.push(()=>button.removeEventListener('click',run));};
 let selected:Choice='freight';
 const select=(choice:Choice)=>{
  selected=choice;panel.dataset.guideChoice=choice;
  choices.forEach((id,i)=>{buttons[i]!.classList.toggle('selected',id===choice);buttons[i]!.setAttribute('aria-pressed',String(id===choice));});
  title.textContent=copy[choice].label;greeting.textContent=copy[choice].body;
  setLabel(replies[0]!,copy[choice].action);replies[0]!.disabled=choice==='trade';
  replies[0]!.classList.add('selected');
  setLabel(replies[1]!,t('운송 절차 먼저 보기','Read hauling steps'));
  replies[1]!.hidden=choice!=='freight';
 };
 choices.forEach((choice,i)=>listen(buttons[i]!,()=>select(choice)));
 listen(replies[0]!,()=>{if(selected==='freight')onGuide('practice');else if(selected==='tour')onTour();});
 listen(replies[1]!,()=>{if(selected==='freight')onGuide('procedure');});
 select('freight');
 return()=>listeners.forEach(remove=>remove());
}
