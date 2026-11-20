import greetings from '../../../data/partner-greetings.json';
import {useLayoutEffect,useState,type CSSProperties} from 'react';
import type {DivisionFacility,TradeScope,AcademyLesson} from './space-navigation';
import type {Locale} from './navigation';
import {academyTutorials,professorWelcome} from './partner-tutorials';
import {spaceHash} from './space-navigation';
import type {LobbyCopy} from './facility-lobby-content';
import {CrewEncounter} from './CrewEncounter';
import seniorClose from '../../../docs/cinematics/guide-close-dialogue-20261117/assets/senior-trade-officer-close.png';
import lingBroker from './assets/facility-staff/ling-broker.png';
import professorClose from './assets/dialogue-originals/academic-advisor.webp';
import brokerClose from './assets/dialogue-originals/ling-broker.webp';
import './lobby-staff.css';

type Staff={id:string;name:LobbyCopy;intro:LobbyCopy;image:string;x:number;};
const staff:Record<DivisionFacility,readonly Staff[]>={
 trade:[
  {id:'senior-trade-officer',name:['수석 무역관','Senior trade officer'],intro:[greetings['senior-trade-officer'].ko,greetings['senior-trade-officer'].en],image:new URL('./assets/facility-staff/officer-lobby.webp',import.meta.url).href,x:56.5},
  {id:'ling-broker',name:['링 가문 중개인','Ling family broker'],intro:[greetings['ling-broker'].ko,greetings['ling-broker'].en],image:lingBroker,x:63.8},
 ],
 'guide-center':[
  {id:'academic-advisor',name:['지도 교수','Academic advisor'],intro:[greetings['academic-advisor'].ko,greetings['academic-advisor'].en],image:new URL('./assets/facility-staff/academic-advisor.png',import.meta.url).href,x:63},
 ],
};

const portraits:Record<string,string>={'senior-trade-officer':seniorClose,'ling-broker':brokerClose,'academic-advisor':professorClose};

// Room and scope still use the existing facility entry controller. Meeting a
// staff member never selects a flight partner or edits a plan or stored run.
export function LobbyStaff({facility,guideLesson,locale,motion,sound,volume,background,onPlan,onConversationChange}:{facility:DivisionFacility;guideLesson?:AcademyLesson;locale:Locale;motion:boolean;sound:boolean;volume:number;background:string;onPlan:(scope:TradeScope,source:string)=>void;onConversationChange:(open:boolean)=>void}){
 const en=locale==='en',t=(copy:LobbyCopy)=>copy[en?1:0],people=staff[facility];
 const [professorButton,setProfessorButton]=useState<HTMLButtonElement|null>(null);
 const [clicked,setClicked]=useState<{person:Staff;origin:HTMLButtonElement}|null>(null);
 const professor=guideLesson&&people.find(member=>member.id==='academic-advisor');
 const selected=professor&&professorButton?{person:professor,origin:professorButton}:clicked;
 useLayoutEffect(()=>{onConversationChange(!!selected);return()=>onConversationChange(false);},[!!selected,onConversationChange]);
 const person=selected?.person;
 const endHandoff=(start:boolean)=>location.replace(spaceHash({screen:'division',facility:'guide-center',locale,lesson:start?guideLesson:undefined}));
 const destinations=guideLesson?[{
  id:guideLesson,skipReturn:true,label:en?'Start lesson':'실습 시작',open:()=>endHandoff(true),
 }]:person?.id==='academic-advisor'
  ? academyTutorials(en,route=>{location.hash=spaceHash({...route,locale});})
  : person && facility==='trade' ? [{
    id:'planning',
    label:person.id==='ling-broker' ? t(['행성계 간 경로 계획','Plan an interstellar route']) : t(['행성계 내부 경로 계획','Plan an in-system route']),
    open:()=>onPlan(person.id==='ling-broker'?'interstellar':'intrasystem',person.id),
  }] : [];
 return <div className="lobby-staff">
  <div className="lobby-staff-people" aria-label={en?'Meet the staff':'담당자 안내'}>
   {people.map(person=><button key={person.id} ref={person.id==='academic-advisor'?setProfessorButton:undefined} type="button" className="lobby-person" data-staff={person.id} data-selected={false} aria-haspopup="dialog" aria-expanded={selected?.person.id===person.id} style={{'--staff-x':`${person.x}%`} as CSSProperties} onClick={event=>setClicked({person,origin:event.currentTarget})}>
    <img src={person.image} alt="" width="1024" height="1536" draggable={false}/>
    <span className="lobby-person-label"><strong>{t(person.name)}</strong></span>
   </button>)}
  </div>
  {selected&&<CrewEncounter id={selected.person.id} name={t(selected.person.name)} questions={!guideLesson} line={guideLesson?professorWelcome(guideLesson,en):t(selected.person.intro)} image={portraits[selected.person.id]!} background={background} key={selected.person.id} sound={sound} volume={volume} en={en} motion={motion} origin={selected.origin} destinations={destinations} onClose={continuing=>{setClicked(null);if(guideLesson&&!continuing)endHandoff(false);}}/>}
 </div>;
}
