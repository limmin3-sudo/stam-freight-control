import {useEffect,useRef,useState,type CSSProperties,type MouseEvent} from 'react';
import type {Locale} from './navigation';
import {spaceHash,type SpaceScreen,type DivisionFacility} from './space-navigation';
import {divisionFacilities,type Facility} from './division-facilities';
import overview from './assets/division/overview-approved.png';
import {ApprovedGlass as Glass} from './ApprovedGlass';
import './division-hub.css';

const visibleFacilities=divisionFacilities.filter(f=>f.state!=='construction');
export function DivisionHub({locale,facility,onNavigate,onFacility}:{locale:Locale;facility?:DivisionFacility;onNavigate:(event:MouseEvent,screen:SpaceScreen)=>void;onFacility:(facility?:DivisionFacility)=>void}){
 const en=locale==='en',t=(copy:readonly [string,string])=>copy[en?1:0];
 const [hovered,setHovered]=useState<string|null>(null),[failed,setFailed]=useState(false);
 const title=useRef<HTMLHeadingElement>(null),detailsTitle=useRef<HTMLHeadingElement>(null);
 const controls=useRef(new Map<string,HTMLElement>());
 const selected=visibleFacilities.find(f=>f.id===facility);
 useEffect(()=>{title.current?.focus({preventScroll:true});},[]);
 useEffect(()=>{if(!facility)return;detailsTitle.current?.focus({preventScroll:true});if(matchMedia('(max-width:760px)').matches)detailsTitle.current?.closest('aside')?.scrollIntoView({block:'nearest'});},[facility]);
 const close=()=>{const id=selected?.id;onFacility();if(id)requestAnimationFrame(()=>controls.current.get(id)?.focus({preventScroll:true}));};
 const activate=(event:MouseEvent,f:Facility)=>{if(f.destination)onNavigate(event,f.destination);else onFacility(f.id as DivisionFacility);};
 const href=(f:Facility)=>spaceHash({screen:f.destination??'division',locale,...(!f.destination?{facility:f.id as DivisionFacility}:{})});
 return <section className="division-hub" aria-labelledby="division-title" onKeyDown={event=>{if(event.key==='Escape'&&selected){event.preventDefault();event.stopPropagation();close();}}}>
   <div className="division-stage" data-failed={failed||undefined} onMouseLeave={()=>setHovered(null)}>
    <svg className="division-world" viewBox="0 0 1672 941" role="img" aria-label={en?'STAM freight headquarters, with the lounge, orbital control station, trade centre, academy and two construction sites.':'라운지·궤도 관제센터·무역센터·아카데미와 두 공사 부지가 있는 STAM 운송사업부 전경.'}>
     <defs>{divisionFacilities.map(f=><clipPath id={`division-clip-${f.id}`} key={f.id}><path d={f.contour}/></clipPath>)}</defs>
     <image href={overview} width="1672" height="941" onError={()=>setFailed(true)}/>
     {divisionFacilities.map(f=><g key={f.id} data-facility-layer={f.id}><image href={f.plate??overview} width="1672" height="941" clipPath={`url(#division-clip-${f.id})`}/></g>)}
    </svg>
    <header className="division-brand"><p>FLEET / FACILITY DIRECTORY</p><h1 id="division-title" ref={title} tabIndex={-1}>STAM<span>FREIGHT DIVISION</span></h1><p>{en?'Your next journey starts here.':'다음 항해가 시작되는 곳.'}</p></header>
    <svg className="division-regions" viewBox="0 0 1672 941" aria-hidden="true">
     {visibleFacilities.map(f=><a key={f.id} href={href(f)} tabIndex={-1} onClick={event=>{if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();activate(event,f);}} onMouseEnter={()=>setHovered(f.id)} onMouseLeave={()=>setHovered(null)}><path d={f.contour} data-region={f.id}/></a>)}
    </svg>
    <svg className="division-leaders" viewBox="0 0 1672 941" aria-hidden="true">
     {visibleFacilities.map(f=><g key={f.id} data-lit={hovered===f.id}>
      <polyline className="division-leader-underlay" points={`${f.marker[0]*16.72},${f.marker[1]*9.41} ${f.label[0]*16.72},${(f.marker[1]+3)*9.41} ${f.label[0]*16.72},${(f.label[1]-3)*9.41}`}/>
      <polyline points={`${f.marker[0]*16.72},${f.marker[1]*9.41} ${f.label[0]*16.72},${(f.marker[1]+3)*9.41} ${f.label[0]*16.72},${(f.label[1]-3)*9.41}`}/>
      <circle cx={f.marker[0]*16.72} cy={f.marker[1]*9.41} r="9"/><circle className="division-dot" cx={f.marker[0]*16.72} cy={f.marker[1]*9.41} r="3"/>
     </g>)}
    </svg>
    <nav className="division-destinations" aria-label={en?'Freight division facilities':'운송사업부 시설'}>
     {visibleFacilities.map(f=><a key={f.id} className="division-facility" href={href(f)} data-facility={f.id} data-state={f.state} data-lit={hovered===f.id} style={{'--facility-x':`${f.label[0]}%`,'--facility-y':`${f.label[1]}%`} as CSSProperties}
       ref={node=>{if(node)controls.current.set(f.id,node);else controls.current.delete(f.id);}} onMouseEnter={()=>setHovered(f.id)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(f.id)} onBlur={()=>setHovered(null)}
       onClick={event=>{if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();activate(event,f);}}>
       <strong>{t(f.name)}</strong><small>{f.summary?t(f.summary):''}</small>
      </a>)}
    </nav>
    {failed&&<p className="division-load-error" role="status">{en?'The scene could not load. Facility links are still available.':'전경을 불러오지 못했습니다. 시설 메뉴로 이동할 수 있습니다.'}</p>}
   </div>
   {selected&&<aside id="division-details" className="division-details" aria-label={en?'Selected facility':'선택한 시설'}>
    <Glass kind="panel"/>
    <div className="division-detail-content"><p className="division-detail-code">STAM / {selected.code}</p><h2 ref={detailsTitle} tabIndex={-1}>{t(selected.name)}</h2><p className="division-status">{selected.summary?t(selected.summary):''}</p><p className="division-description">{t(selected.description)}</p>
     <div className="division-detail-actions">
      {selected.id==='guide-center'&&<a className="division-action" href={`#/service?lang=${locale}&section=manual`}><Glass kind="gold"/><span>{en?'Current user guide':'현재 이용안내'} ↗</span></a>}
      <button className="division-action" type="button" onClick={close}><Glass/><span>{en?'Close':'닫기'}</span></button>
     </div>
    </div>
   </aside>}
   <p className="division-hint">{en?'Select a facility to explore. STAM at the top returns you here.':'시설을 선택해 둘러보세요. 상단 STAM을 누르면 이곳으로 돌아옵니다.'}</p>
 </section>;
}
