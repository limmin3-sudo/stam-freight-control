import {useLayoutEffect,useState,type CSSProperties} from 'react';
import type {DivisionFacility,LobbyRoom,TradeScope} from './space-navigation';
import type {Locale} from './navigation';
import {facilityLobbies,type LobbyCopy} from './facility-lobby-content';
import {CrewEncounter} from './CrewEncounter';
import seniorClose from '../../../docs/cinematics/guide-close-dialogue-20261117/assets/senior-trade-officer-close.png';
import lingClose from '../../../docs/cinematics/guide-close-dialogue-20261117/assets/ling-broker-close.png';
import professorClose from '../../../docs/cinematics/guide-close-dialogue-20261117/assets/academic-advisor-close.png';
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

const portraits:Record<string,string>={'senior-trade-officer':seniorClose,'ling-broker':lingClose,'academic-advisor':professorClose};

// Room and scope still use the existing facility entry controller. Meeting a
// staff member never selects a flight partner or edits a plan or stored run.
export function LobbyStaff({facility,locale,motion,background,onConversationChange,onRoom}:{facility:DivisionFacility;locale:Locale;motion:boolean;background:string;onConversationChange:(open:boolean)=>void;onRoom:(room:LobbyRoom,scope?:TradeScope,person?:string,point?:readonly[number,number])=>void}){
 const en=locale==='en',t=(copy:LobbyCopy)=>copy[en?1:0],people=staff[facility];
 const [selected,setSelected]=useState<{person:Staff;origin:HTMLButtonElement}|null>(null);
 useLayoutEffect(()=>{onConversationChange(!!selected);return()=>onConversationChange(false);},[!!selected,onConversationChange]);
 const person=selected?.person;
 const actions=person?(facility==='trade'?[{label:t(person.action),onSelect:()=>onRoom(person.room,person.scope,person.id,[person.x,56])}]:facilityLobbies[facility].places.map(place=>({label:t(place.name),onSelect:()=>onRoom(place.id,undefined,person.id,place.point)}))):[];
 return <div className="lobby-staff">
  <div className="lobby-staff-people" aria-label={en?'Meet the staff':'담당자 안내'}>
   {people.map(person=><button key={person.id} type="button" className="lobby-person" data-staff={person.id} data-selected={false} aria-haspopup="dialog" aria-expanded={selected?.person.id===person.id} style={{'--staff-x':`${person.x}%`} as CSSProperties} onClick={event=>setSelected({person,origin:event.currentTarget})}>
    <img src={person.image} alt="" width="1024" height="1536" draggable={false}/>
    <span className="lobby-person-label"><strong>{t(person.name)}</strong></span>
   </button>)}
  </div>
  {selected&&<CrewEncounter id={selected.person.id} name={t(selected.person.name)} line={t(selected.person.intro)} image={portraits[selected.person.id]!} background={background} focus={selected.person.x} en={en} motion={motion} origin={selected.origin} actions={actions} onClose={()=>setSelected(null)}/>}
 </div>;
}
