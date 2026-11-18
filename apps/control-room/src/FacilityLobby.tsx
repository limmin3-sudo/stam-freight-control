import type {PlanFromQuote} from './TradeMarketBoard';
import {tradeViewKey} from './use-trade-view';
import {readyTradeOwner} from './trade-storage';
import {defaultSuiteOptions} from './trade-suite';
import {tradeShips} from './trade-cargo.mjs';
import {shipIdFor} from './ship-profile.mjs';
import {lazy,Suspense,useEffect,useRef,useState,type CSSProperties,type MouseEvent} from 'react';
import type {Locale} from './navigation';
import {spaceHash,type DivisionFacility,type LobbyRoom,type TradeScope} from './space-navigation';
import {ApprovedGlass} from './ApprovedGlass';
import {AcademyFinder,type AcademyDestination} from './AcademyFinder';
import {LobbyStaff} from './LobbyStaff';
import {facilityLobbies,type LobbyCopy} from './facility-lobby-content';
import './facility-lobby.css';
import './trade-monitor.css';
import './academy-monitor.css';
import {useLobbyTravel} from './use-lobby-travel';
import {ConsoleArrival} from './ConsoleArrival';
import './facility-travel.css';
import './midnight-glass.css';

const TradeWorkspace=lazy(()=>import('./TradeWorkspace'));
const MarketInformation=lazy(()=>import('./MarketInformation'));
const AcademyRoom=lazy(()=>import('./AcademyRoom'));
const FreightInformation=lazy(()=>import('./FreightInformation'));
// Only the visited lobby image is requested. No flight/account writes occur here.
const plates={
 trade:new URL('./assets/facility-lobbies/trade-two-door.png',import.meta.url).href,
 'guide-center':new URL('./assets/facility-lobbies/academy-lobby-approved.png',import.meta.url).href,
};
export function FacilityLobby({facility,locale,room,tradeScope,initialShip,motion=true,navigationKey=0,onRoom,onExit}:{facility:DivisionFacility;locale:Locale;room?:LobbyRoom;tradeScope?:TradeScope;initialShip?:string;motion?:boolean;navigationKey?:number;onRoom:(room?:LobbyRoom,scope?:TradeScope)=>void;onExit:()=>void}){
 const data=facilityLobbies[facility],en=locale==='en',t=(copy:LobbyCopy)=>copy[en?1:0];
 const [academyTarget,setAcademyTarget]=useState<AcademyDestination>();
 const previousRoom=useRef(room);
 useEffect(()=>{
  const old=previousRoom.current;
  previousRoom.current=room;
  if(old!==room)setAcademyTarget(target=>target?.room===room?target:undefined);
 },[room]);
 useEffect(()=>setAcademyTarget(undefined),[navigationKey]);
 const finder=facility==='guide-center'?<AcademyFinder locale={locale} onSelect={target=>{
  setAcademyTarget({...target});
  if(target.room!==room)onRoom(target.room);
 }}/> : null;
 const [hovered,setHovered]=useState<string|null>(null);
 const [staffTalking,setStaffTalking]=useState(false);
 const [handoffError,setHandoffError]=useState(false);
 const host=useRef<HTMLElement>(null);
 const [loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);
 const travel=useLobbyTravel({host,room,scope:tradeScope,motion,navigationKey,locale,onRoom});
 const placeId=room==='planning'?'market':room;
 const active=data.places.find(p=>p.id===placeId),lit=data.places.find(p=>p.id===(hovered??placeId));
 const closing=travel.phase==='blackout';
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[]);
 useEffect(()=>{host.current?.scrollTo({top:0});host.current?.querySelector('.lobby-stage')?.scrollTo({top:0});setHovered(null);},[room,navigationKey]);
 const enter=(next:LobbyRoom,scope?:TradeScope,person?:string,point?:readonly[number,number])=>{
  const place=data.places.find(p=>p.id===(next==='planning'?'market':next));if(!place)return;
  setHovered(null);travel.enter(next,scope,point??place.point,person??next);
 };
 const planFromQuote:PlanFromQuote=(origin,commodity,destination=0,scope='intrasystem',policy)=>{
  try {
   const owner=readyTradeOwner(),key=tradeViewKey(owner,'personal-options');
   const shipId=shipIdFor(initialShip||'');
   const capacity=tradeShips.find(ship=>ship.id===shipId)?.grids.reduce((sum,g)=>sum+g.w*g.h*g.l,0)??0;
   const old=JSON.parse(sessionStorage.getItem(key)||'null');
   sessionStorage.setItem(key,JSON.stringify({...defaultSuiteOptions,shipId,capacity,...old,...policy,mode:'direct',
    originId:origin,commodityIds:[commodity],destinationId:destination,scope,
    priceBasis:'reported',stockBasis:'reported',nearbyGm:0,cargo:[],reserveEnabled:false,reservePercent:0}));
   sessionStorage.setItem(tradeViewKey(owner,'mode'),JSON.stringify('personal'));
  } catch {setHandoffError(true);return;}
  setHandoffError(false);
  onRoom('planning',scope);
 };
 const reset=()=>{setHovered(null);travel.leave(active?.point??[50,50]);};
 const exit=(event:MouseEvent)=>{if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();onExit();};
 return <section ref={host} className="facility-lobby" data-facility-lobby={facility} data-monitor={!!active} data-room={room} data-selected={!!active} aria-labelledby="lobby-title" data-travel={travel.phase} aria-busy={travel.busy} style={{'--travel-x':`${travel.focus[0]}%`,'--travel-y':`${travel.focus[1]}%`} as CSSProperties} onKeyDown={event=>{
  if(event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('dialog[open]')&&(active||travel.busy)){event.preventDefault();event.stopPropagation();if(travel.busy)travel.cancel();else reset();}
 }}>
  <div className="lobby-stage" data-loaded={loaded} inert={travel.busy||staffTalking}>
   <div className="lobby-camera" style={{'--lobby-focus-x':`${travel.focus[0]}%`,'--lobby-focus-y':`${travel.focus[1]}%`,'--lobby-zoom':travel.phase==='approach'?5.2:1} as CSSProperties}>
    <img className="lobby-plate" src={plates[facility]} alt={t(data.alt)} width="1672" height="941" fetchPriority="high" onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)}/>
    <svg className="lobby-spotlight" viewBox="0 0 1672 941" aria-hidden="true" data-active={!!lit&&!failed}>
     <defs><filter id="lobby-feather"><feGaussianBlur stdDeviation="22"/></filter><mask id="lobby-mask"><rect width="1672" height="941" fill="white"/>{lit&&<path d={lit.contour} fill="black" filter="url(#lobby-feather)"/>}</mask></defs>
     <rect width="1672" height="941" fill="#020b13" mask="url(#lobby-mask)"/>
    </svg>
   </div>
   <header className="lobby-heading"><p>{data.code}</p><h1 id="lobby-title" ref={heading} tabIndex={-1}>{t(data.name)}</h1><span>{t(data.intro)}</span>{!active&&finder}</header>
   {(!loaded||failed)&&<p className="lobby-loading" role="status">{failed?(en?'The lobby image could not load. Navigation remains available.':'로비 배경을 불러오지 못했습니다. 공간 메뉴는 사용할 수 있습니다.'):(en?'Opening the lobby…':'로비를 불러오고 있습니다…')}</p>}
   <svg className="lobby-regions" viewBox="0 0 1672 941" aria-hidden="true" data-hidden={!!active||!loaded} onMouseLeave={()=>setHovered(null)}>{data.places.map(p=><path key={p.id} d={p.contour} onMouseEnter={()=>setHovered(p.id)} onClick={()=>{enter(p.id);}}/> )}</svg>
   <svg className="lobby-leaders" viewBox="0 0 1672 941" aria-hidden="true" data-hidden={!!active}>
    {data.places.map(p=><g key={p.id} data-lit={lit?.id===p.id}><polyline points={`${p.point[0]*16.72},${p.point[1]*9.41} ${p.label[0]*16.72},${(p.point[1]+8)*9.41} ${p.label[0]*16.72},${(p.label[1]-3)*9.41}`}/><circle cx={p.point[0]*16.72} cy={p.point[1]*9.41} r="9"/><circle className="lobby-dot" cx={p.point[0]*16.72} cy={p.point[1]*9.41} r="3"/></g>)}
   </svg>
   <nav className="lobby-places" aria-label={en?'Explore the lobby':'로비 둘러보기'} data-hidden={!!active} inert={!!active}>
    {data.places.map(p=><button type="button" key={p.id} className="lobby-place" data-place={p.id} data-lit={lit?.id===p.id} style={{'--place-x':`${p.label[0]}%`,'--place-y':`${p.label[1]}%`} as CSSProperties} onMouseEnter={()=>setHovered(p.id)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(p.id)} onBlur={()=>setHovered(null)} onClick={()=>{enter(p.id);}}><strong>{t(p.name)}</strong>{facility!=='trade'&&<small>{t(p.summary)}</small>}</button>)}
   </nav>
   {room==='planning'||room==='trade-operations'?<Suspense fallback={<aside className="lobby-loading-panel"><p role="status">{en?'Opening trade planning…':'무역 화면을 열고 있습니다…'}</p></aside>}><TradeWorkspace locale={locale} room={room} advisor={tradeScope} initialShip={initialShip} onRoom={onRoom} onExit={reset} closing={closing}/></Suspense>:active?.id==='market'?<Suspense fallback={<aside className="lobby-loading-panel"><p role="status">{en?'Opening market information…':'무역관제실을 열고 있습니다…'}</p></aside>}><MarketInformation locale={locale} onExit={reset} closing={closing} onOpenPlan={()=>onRoom('planning')} onPlan={planFromQuote}/></Suspense>:active?.id==='freight-information'?<Suspense fallback={<aside className="lobby-loading-panel"><p role="status">{en?'Opening freight information…':'운송 정보실을 열고 있습니다…'}</p></aside>}><FreightInformation finder={finder} target={academyTarget?.room==='freight-information'?academyTarget:undefined} locale={locale} onExit={reset} closing={closing}/></Suspense>:active?.id==='education'||active?.id==='operations-study'?<Suspense fallback={<aside className="lobby-loading-panel"><p role="status">{en?'Opening academy…':'아카데미 자료를 열고 있습니다…'}</p></aside>}><AcademyRoom finder={finder} target={academyTarget?.room==='education'?academyTarget:undefined} room={active.id} locale={locale} initialShip={initialShip} onExit={reset} closing={closing}/></Suspense>:active&&<aside className="lobby-detail" data-closing={closing} inert={closing} data-align={active.point[0]>50?'left':'right'} key={active.id} role="region" aria-label={t(active.name)}>
    <ApprovedGlass kind="panel"/><p className="lobby-detail-code">{en?'SPACE / INTRODUCTION':'공간 소개'}</p><h2>{t(active.name)}</h2><p>{t(active.description)}</p>
    <button autoFocus type="button" className="lobby-reset" onClick={reset}><ApprovedGlass/><span>{en?'Lobby overview':'로비 전체 보기'}</span></button>
   </aside>}
   {!active&&<LobbyStaff key={`${navigationKey}-${locale}`} facility={facility} locale={locale} motion={motion} background={plates[facility]} onConversationChange={setStaffTalking} onRoom={enter}/>}
   <a className="lobby-exit" href={spaceHash({screen:'division',locale})} onClick={exit}><span aria-hidden="true">◇ ─</span> {en?'Division grounds':'사업부 전경'} <span aria-hidden="true">↗</span></a>
  </div>
  {handoffError&&room==='market'&&<p className="trade-handoff-error" role="alert">{en?'Could not transfer this quote. Check session storage and try again.':'시세를 계획에 전달하지 못했습니다. 브라우저 저장 공간을 확인하고 다시 시도하세요.'}</p>}
  <div className="facility-arrival"  aria-hidden="true"><ConsoleArrival departing={travel.phase==='approach'} powerOn={travel.phase==='ignite'} returning={false} departureMs={697} ignitionMs={333}/></div>
  {travel.busy&&<button className="facility-travel-cancel" onClick={()=>travel.cancel()}>{en?'Cancel transition':'이동 연출 취소'}</button>}
  <p className="lobby-travel-status" role="status">{travel.busy?(en?'Moving through the lobby…':'공간을 이동하고 있습니다…'):''}</p>
  <p className="lobby-hint">{en?'Select a place to look closer. Use the sidebar to move between facilities.':'장소를 누르면 가까이 살펴봅니다. 다른 시설은 사이드바로 이동하세요.'}</p>
 </section>;
}
