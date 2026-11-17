import {useEffect,useRef,useState,type CSSProperties} from 'react';
import type {DivisionFacility,LobbyRoom,TradeScope} from './space-navigation';
import type {Locale} from './navigation';
import {facilityLobbies,type LobbyCopy} from './facility-lobby-content';
import {ApprovedGlass} from './ApprovedGlass';
import './lobby-staff.css';

type Staff={id:string;name:LobbyCopy;role:LobbyCopy;intro:LobbyCopy;image:string;x:number;room:LobbyRoom;action:LobbyCopy;scope?:TradeScope};
const staff:Record<DivisionFacility,readonly Staff[]>={
 trade:[
  {id:'senior-trade-officer',scope:'intrasystem',name:['수석 무역관','Senior trade officer'],role:['행성계 내부 무역','In-system trade'],intro:['같은 행성계 안에서 거래처와 이동 동선을 살피는 일을 맡고 있습니다. 함선과 가용 자본에 맞는 거래를 함께 검토하겠습니다.','I focus on trading locations and routes within a single star system. Together we will assess trades suited to your ship and available capital.'],image:new URL('./assets/facility-staff/senior-trade-officer.png',import.meta.url).href,x:55,room:'planning',action:['무역 계획하기','Plan a trade']},
  {id:'ling-broker',scope:'interstellar',name:['링 가문 중개인','Ling family broker'],role:['행성계 간 무역','Interstellar trade'],intro:['행성계를 오가는 거래를 맡고 있어요. 출발지와 목적지뿐 아니라 이동 구간과 자금 계획까지 함께 살펴보죠. 위험도와 합법성은 각각 선택하는 기준이에요.','I handle trades between star systems. Let’s consider the journey and your budget alongside the origin and destination. Risk and legality are separate choices.'],image:new URL('./assets/facility-staff/ling-broker.png',import.meta.url).href,x:67,room:'planning',action:['무역 계획하기','Plan a trade']},
 ],
 'guide-center':[
  {id:'academic-advisor',name:['지도 교수','Academic advisor'],role:['운송 교육 · 실전 노하우','Freight education · Practical guidance'],intro:['미션을 어떻게 조합하고 어떤 순서로 운송할지 함께 살펴볼게요. 초반 평판을 쌓는 방법부터 경로 설계와 실제 운송 사례까지 차근차근 다룹니다.','We’ll explore which missions work together and how to order your deliveries, from building early reputation to route planning and real freight case studies.'],image:new URL('./assets/facility-staff/academic-advisor.png',import.meta.url).href,x:63,room:'education',action:['교육실 둘러보기','Explore education']},
 ],
};

// Local introductions only: never select a flight partner or modify an active run.
export function LobbyStaff({facility,locale,travelling,onRoom}:{facility:DivisionFacility;locale:Locale;travelling:boolean;onRoom:(room:LobbyRoom,scope?:TradeScope,person?:string,point?:readonly[number,number])=>void}){
 const en=locale==='en',t=(copy:LobbyCopy)=>copy[en?1:0],people=staff[facility];
 const [selected,setSelected]=useState<Staff|null>(null),[closing,setClosing]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);
 const host=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),buttons=useRef(new Map<string,HTMLButtonElement>());
 useEffect(()=>()=>{if(timer.current!==null)clearTimeout(timer.current);},[]);
 useEffect(()=>{if(!selected||facility==='trade')return;heading.current?.focus({preventScroll:true});if(matchMedia('(max-width:760px)').matches)heading.current?.closest('aside')?.scrollIntoView({block:'start'});},[selected]);
 useEffect(()=>{if(!travelling&&facility==='trade')setSelected(null);},[travelling,facility]);
 const close=(next?:()=>void)=>{
  if(closing)return;
  const finish=()=>{setSelected(null);setClosing(false);if(next)next();else if(selected)buttons.current.get(selected.id)?.focus({preventScroll:true});};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||host.current?.closest('.space-experience')?.getAttribute('data-motion')==='false';
  if(reduced){finish();return;}
  setClosing(true);timer.current=setTimeout(()=>{timer.current=null;finish();},420);
 };
 return <div ref={host} className="lobby-staff" data-open={!!selected} data-closing={closing} onKeyDown={e=>{if(e.key==='Escape'&&selected&&!e.defaultPrevented&&!document.querySelector('dialog[open]')){e.preventDefault();e.stopPropagation();close();}}}>
  {selected&&<button type="button" className="lobby-staff-shade" tabIndex={-1} aria-label={en?'Close introduction':'소개 닫기'} onClick={()=>close()}/>}
  <div className="lobby-staff-people" aria-label={en?'Meet the staff':'담당자 안내'}>
   {people.map(person=><button key={person.id} type="button" className="lobby-person" data-staff={person.id} data-selected={selected?.id===person.id} hidden={!!selected&&selected.id!==person.id} aria-expanded={facility==='guide-center'?selected?.id===person.id:undefined} aria-controls={facility==='guide-center'&&selected?.id===person.id?'lobby-staff-intro':undefined} style={{'--staff-x':`${person.x}%`} as CSSProperties} ref={node=>{if(node)buttons.current.set(person.id,node);else buttons.current.delete(person.id);}} onClick={()=>{if(!closing){setSelected(person);if(facility==='trade')onRoom(person.room,person.scope,person.id,[person.x,56]);}}}>
    <img src={person.image} alt="" width="1024" height="1536" draggable={false}/>
    <span className="lobby-person-label"><strong>{t(person.name)}</strong></span>
   </button>)}
  </div>
  {selected&&facility==='guide-center'&&<aside id="lobby-staff-intro" className="lobby-detail lobby-staff-detail" data-align={selected.x>50?'left':'right'} data-closing={closing} inert={closing} role="region" aria-label={t(selected.name)}>
   <ApprovedGlass kind="panel"/><p className="lobby-detail-code">{t(selected.role)}</p><h2 ref={heading} tabIndex={-1}>{t(selected.name)}</h2><p>{t(selected.intro)}</p>
   <div className="lobby-staff-rooms" aria-label={en?'Choose an academy room':'아카데미 방 선택'}>{facilityLobbies[facility].places.map(place=><button key={place.id} type="button" className="lobby-reset" onClick={()=>close(()=>onRoom(place.id,undefined,selected.id,place.point))}><ApprovedGlass/><span>{t(place.name)}</span></button>)}</div>
   <button type="button" className="lobby-staff-close" onClick={()=>close()}>{en?'Close introduction':'소개 닫기'}</button>
  </aside>}
 </div>;
}
