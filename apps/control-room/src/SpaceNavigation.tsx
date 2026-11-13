import {useEffect, useState, type MouseEvent} from 'react';
import {parentSpace, type SpaceScreen,type ArchiveView} from './space-navigation';
import type {Locale} from './navigation';

// Space membership is separate from navigation/rendering so new activities can
// join a space without another global row of shortcuts.
const groups = [
  {id:'lounge', code:'PLANETSIDE / ARRIVALS', name:['SPACEPORT LOUNGE','SPACEPORT LOUNGE'],
    description:['다음 항해가 시작되는 곳.','Every journey begins here.'],
    links:[['guide','안내 데스크','Welcome desk'],['service','서비스센터','Service centre'],['information','아카이브','Archive'],['cinema','시네마','Cinema']]},
  {id:'bridge', code:'ORBITAL / COMMAND', name:['CONTROL CENTER','CONTROL CENTER'],
    description:['항로를 펼치고, 다음 운송을 준비하세요.','Chart your route. Prepare your next haul.'],
    links:[['mission','미션 콘솔','Mission console'],['map','항로 지도','Star map'],['operations','관제 콘솔','Control console']]},
] as const;

export function SpaceNavigation({screen,locale,pending,view,href,onNavigate}:{
  screen:SpaceScreen;locale:Locale;pending:boolean;
  view?:ArchiveView;
  href:(screen:SpaceScreen,view?:ArchiveView)=>string;
  onNavigate:(event:MouseEvent,screen:SpaceScreen,view?:ArchiveView)=>void;
}) {
  const scene=parentSpace(screen), en=locale==='en';
  const [expanded,setExpanded]=useState<string|null>(scene);
  const [mobileOpen,setMobileOpen]=useState(false);
  useEffect(()=>{setExpanded(scene);setMobileOpen(false);},[scene,screen,view]);
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
      {groups.map(group=>{
        const open=expanded===group.id;
        return <div className="space-nav-group" key={group.id} data-active={scene===group.id}>
          <a className="space-group-button" href={href(group.id)} aria-current={scene===group.id?'location':undefined}
            aria-expanded={open} aria-controls={`space-links-${group.id}`} onClick={event=>{
              if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
              setExpanded(open&&screen===group.id?null:group.id);
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
                  <a href={href(target)} aria-current={screen===target&&!view?'page':undefined}
                    aria-expanded={target==='information'?screen==='information':undefined} aria-controls={target==='information'?'archive-subnavigation':undefined}
                    onClick={event=>onNavigate(event,target)}><span className="space-link-index" aria-hidden="true">0{index+1}</span><span>{en?english:ko}</span><span className="space-link-arrow" aria-hidden="true">›</span></a>
                  {target==='information'&&<div className="archive-subnavigation" data-open={screen==='information'} inert={screen!=='information'} aria-hidden={screen!=='information'} id="archive-subnavigation"><div>
                    <a href={href('information','missions')} aria-current={view==='missions'?'page':undefined} onClick={event=>onNavigate(event,'information','missions')}>{en?'Mission catalogue':'미션 자료'}</a>
                  </div></div>}
                </div>)}
              </div>
            </div>
          </div>
        </div>;
      })}
    </nav>
  </>;
}
