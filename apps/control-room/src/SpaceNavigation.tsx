import {useEffect, useRef, useState, type MouseEvent} from 'react';
import {parentSpace, spaceHash,type SpaceScreen,type ArchiveView,type DivisionFacility,type LobbyRoom} from './space-navigation';
import {facilityLobbies} from './facility-lobby-content';
import {extensionFacilities} from './division-facilities';
import type {Locale} from './navigation';

// Space membership is separate from navigation/rendering so new activities can
// join a space without another global row of shortcuts.
const groups = [
  {id:'lounge', code:'PLANETSIDE / ARRIVALS', name:['라운지','SPACEPORT LOUNGE'],
    description:['다음 항해가 시작되는 곳.','Every journey begins here.'],
    links:[['guide','안내 데스크','Welcome desk'],['service','서비스센터','Service centre'],['information','아카이브','Archive'],['cinema','시네마','Cinema']]},
  {id:'bridge', code:'ORBITAL / COMMAND', name:['관제센터','CONTROL CENTER'],
    description:['항로를 펼치고, 다음 운송을 준비하세요.','Chart your route. Prepare your next haul.'],
    links:[['mission','미션 콘솔','Mission console'],['map','항로 지도','Star map'],['operations','관제 콘솔','Control console']]},
] as const;

export function SpaceNavigation({screen,locale,pending,view,facility,lobbyRoom,href,onNavigate,onFacility}:{
  screen:SpaceScreen;locale:Locale;pending:boolean;
  view?:ArchiveView;facility?:DivisionFacility;lobbyRoom?:LobbyRoom;
  onFacility:(event:MouseEvent,facility:DivisionFacility,room?:LobbyRoom)=>void;
  href:(screen:SpaceScreen,view?:ArchiveView)=>string;
  onNavigate:(event:MouseEvent,screen:SpaceScreen,view?:ArchiveView)=>void;
}) {
  const scene=screen==='division'?(facility??null):parentSpace(screen), en=locale==='en';
  const [expanded,setExpanded]=useState<string|null>(null);
  const [mobileOpen,setMobileOpen]=useState(false);
  const requestedGroup=useRef<string|null>(null);
  useEffect(()=>{setExpanded(scene===requestedGroup.current?scene:null);requestedGroup.current=null;},[scene]);
  useEffect(()=>{setMobileOpen(false);},[scene,screen,view,facility,lobbyRoom]);
  useEffect(()=>{
    if(!mobileOpen)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();setMobileOpen(false);document.querySelector<HTMLButtonElement>('.space-menu-toggle')?.focus();}};
    window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);
  },[mobileOpen]);
  return <>
    <button className="space-menu-toggle" aria-expanded={mobileOpen} aria-controls="space-navigation"
      onClick={()=>setMobileOpen(!mobileOpen)}><span aria-hidden="true">☰</span> {en?'Spaces':'공간 메뉴'}</button>
    <nav id="space-navigation" className="space-dock" data-mobile-open={mobileOpen} inert={pending}
      aria-label={en?'Spaces and shortcuts':'공간과 바로가기'}>
      <p className="space-sidebar-caption">STAM / DESTINATIONS</p>
      <div className="space-nav-group space-division-home">
        <a className="space-division-button" href={href('division')} aria-current={screen==='division'&&!facility?'page':undefined} onClick={event=>onNavigate(event,'division')}>
          <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="m20 4 15 9-15 9-15-9Z" fill="#d2b87a44"/><path d="m5 13 15 9v15L5 28Z" fill="#d2b87a16"/><path d="m35 13-15 9v15l15-9Z" fill="#d2b87a30"/><path d="M10 19v9m5-6v9m10-9v9m5-12v9"/></svg>
          <span><small>STAM / FREIGHT</small><strong>{en?'FREIGHT DIVISION':'운송사업부'}</strong></span><span aria-hidden="true">↗</span>
        </a>
      </div>
      {groups.map(group=>{
        const open=expanded===group.id;
        return <div className="space-nav-group" key={group.id} data-active={scene===group.id}>
          <a className="space-group-button" href={href(group.id)} aria-current={scene===group.id?'location':undefined}
            aria-expanded={open} aria-controls={`space-links-${group.id}`} onClick={event=>{
              if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
              requestedGroup.current=open&&screen===group.id?null:group.id;
              setExpanded(requestedGroup.current);
              onNavigate(event,group.id);
            }}>
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
              {group.id==='lounge'?<><path d="M8 37h32M12 35V17l12-8 12 8v18M18 35V22h12v13M24 9v8"/><path d="M7 17 24 5l17 12M21 27h6"/></>:<><circle cx="24" cy="24" r="10"/><ellipse cx="24" cy="24" rx="21" ry="7" transform="rotate(-35 24 24)"/><path d="M24 3v5m0 32v5M3 24h5m32 0h5"/></>}
            </svg>
            <span><small>STAM / {group.id==='lounge'?'01':'02'}</small><strong>{group.name[en?1:0]}</strong></span>
            <span className="space-group-chevron" aria-hidden="true">⌄</span>
          </a>
          <div className="space-group-reveal" id={`space-links-${group.id}`} data-open={open} inert={!open} aria-hidden={!open}>
            <div className="space-group-content">
              <p className="space-group-description"><small>{group.code}</small>{group.description[en?1:0]}</p>
              <div className="space-nav-links">
                {group.links.map(([target,ko,english],index)=><div className="space-room-link" key={target}>
                  <a href={href(target)} aria-current={screen===target?'page':undefined}
                    onClick={event=>onNavigate(event,target)}><span className="space-link-index" aria-hidden="true">0{index+1}</span><span>{en?english:ko}</span><span className="space-link-arrow" aria-hidden="true">›</span></a>
                </div>)}
              </div>
            </div>
          </div>
        </div>;
      })}
      {extensionFacilities.map(({id,name,code})=>{const open=expanded===id;return <div className="space-nav-group" key={id} data-active={scene===id}>
        <a className="space-group-button" href={spaceHash({screen:'division',locale,facility:id})} aria-current={scene===id?'location':undefined} aria-expanded={open} aria-controls={`space-links-${id}`} onClick={event=>{
          if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
          requestedGroup.current=open&&scene===id?null:id;setExpanded(requestedGroup.current);onFacility(event,id);
        }}>
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">{id==='trade'?<><path d="M7 38V19l17-10 17 10v19H7ZM16 38V25h16v13M12 19h24M21 25v13M27 25v13"/><path d="M8 13 24 4l16 9"/></>:<><path d="M24 12C17 7 9 8 5 10v27c6-2 12-2 19 3 7-5 13-5 19-3V10c-4-2-12-3-19 2ZM24 12v28M11 17h7M11 23h7M30 17h7M30 23h7"/></>}</svg>
          <span><small>STAM / {code}</small><strong>{en?name[1].toUpperCase():name[0]}</strong></span>
          <span className="space-group-chevron" aria-hidden="true">⌄</span>
        </a>
        <div className="space-group-reveal" id={`space-links-${id}`} data-open={open} inert={!open} aria-hidden={!open}>
          <div className="space-group-content"><p className="space-group-description"><small>{facilityLobbies[id].code}</small>{en?'Explore the lobby spaces.':'로비의 공간을 살펴보세요.'}</p>
            <div className="space-nav-links">{facilityLobbies[id].places.map((place,index)=><div className="space-room-link" key={place.id}>
              <a href={spaceHash({screen:'division',locale,facility:id,lobbyRoom:place.id})} aria-current={scene===id&&lobbyRoom===place.id?'page':undefined} onClick={event=>onFacility(event,id,place.id)}><span className="space-link-index" aria-hidden="true">0{index+1}</span><span>{place.name[en?1:0]}</span><span className="space-link-arrow" aria-hidden="true">›</span></a>
            </div>)}</div>
          </div>
        </div>
      </div>;})}
    </nav>
  </>;
}
