import greetings from '../../../data/partner-greetings.json';
import {useLayoutEffect,useState,type CSSProperties} from 'react';
import type {DivisionFacility} from './space-navigation';
import type {Locale} from './navigation';
import {academyTutorials} from './partner-tutorials';
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
export function LobbyStaff({facility,locale,motion,sound,volume,background,onConversationChange}:{facility:DivisionFacility;locale:Locale;motion:boolean;sound:boolean;volume:number;background:string;onConversationChange:(open:boolean)=>void}){
 const en=locale==='en',t=(copy:LobbyCopy)=>copy[en?1:0],people=staff[facility];
 const [selected,setSelected]=useState<{person:Staff;origin:HTMLButtonElement}|null>(null);
 useLayoutEffect(()=>{onConversationChange(!!selected);return()=>onConversationChange(false);},[!!selected,onConversationChange]);
 const person=selected?.person;
 const destinations=person?.id==='academic-advisor'
  ? academyTutorials(en,route=>{location.hash=spaceHash({...route,locale});})
  : [];
 return <div className="lobby-staff">
  <div className="lobby-staff-people" aria-label={en?'Meet the staff':'담당자 안내'}>
   {people.map(person=><button key={person.id} type="button" className="lobby-person" data-staff={person.id} data-selected={false} aria-haspopup="dialog" aria-expanded={selected?.person.id===person.id} style={{'--staff-x':`${person.x}%`} as CSSProperties} onClick={event=>setSelected({person,origin:event.currentTarget})}>
    <img src={person.image} alt="" width="1024" height="1536" draggable={false}/>
    <span className="lobby-person-label"><strong>{t(person.name)}</strong></span>
   </button>)}
  </div>
  {selected&&<CrewEncounter id={selected.person.id} name={t(selected.person.name)} line={t(selected.person.intro)} image={portraits[selected.person.id]!} background={background} key={selected.person.id} sound={sound} volume={volume} en={en} motion={motion} origin={selected.origin} destinations={destinations} onClose={()=>setSelected(null)}/>}
 </div>;
}
