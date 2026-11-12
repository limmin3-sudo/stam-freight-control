import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { copyFor, screenTitle } from './copy';
import { parseRoute, routeHash, stationLayout, stations } from './navigation';
import type { Locale, Route } from './navigation';
import { InterfaceGlyph, HudFrame } from './InterfaceGlyph';
import {ContractBackup} from './ContractBackup';
import {FlightOperations} from './FlightOperations';
import type {useFlight} from './use-flight';
import { CargoPanel } from './CargoPanel';
import './cargo-workspace.css';
import { MissionConsole } from './MissionConsole';
import stamLogo from '../../../assets/stam-logo-transparent.png';
import roomImage from './assets/control-room-stanton.png';
import './console-display.css';
import './mission-screen.css';
import './mission-material-review.css';
import './mission-optical-review.css';

export function ControlRoom({flight}:{flight:ReturnType<typeof useFlight>}) {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  const heading = useRef<HTMLHeadingElement>(null);
  const lastStation = useRef(route.screen === 'bridge' ? null : route.screen);
  const mounted = useRef(false);
  const copy = copyFor(route.locale);
  const isHome = route.screen === 'bridge';
  const missionScreen=route.screen==='mission';
  const {draft,plan} = flight.session;
  const receipts = flight.receipts;
  const controlMode = new URLSearchParams(location.hash.split('?')[1]).get('mode') !== 'workspace';
  useEffect(() => {
    const sync = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    document.documentElement.lang = route.locale === 'en' ? 'en' : 'ko';
    document.title = `STAM · ${screenTitle(route.screen, copy)}`;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isHome && !event.defaultPrevented &&
          !(event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable], dialog'))) {
        location.hash = routeHash({ ...route, screen: 'bridge' });
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [route, copy, isHome]);

  useLayoutEffect(() => {
    if (!mounted.current) { mounted.current = true; if (route.screen === 'bridge') return; }
    if (route.screen !== 'bridge') {
      lastStation.current = route.screen;
      heading.current?.focus({ preventScroll: true });
    } else if (lastStation.current) {
      document.getElementById(`nav-${lastStation.current}`)?.focus({ preventScroll: true });
    }
  }, [route.screen]);

  const requestedMaterial=import.meta.env.DEV?new URLSearchParams(location.search).get('material'):null;
  const material=missionScreen?(['lumen','noctis','hybrid','projection','chip'].includes(requestedMaterial||'')?requestedMaterial:'projection'):undefined;
  const requestedTypeface=import.meta.env.DEV?new URLSearchParams(location.search).get('typeface'):null;
  const typeface=missionScreen?(['air','grotesk','semi'].includes(requestedTypeface||'')?requestedTypeface:['projection','chip'].includes(material||'')?'grotesk':undefined):undefined;
  return <div data-mission-typeface={typeface} data-mission-material={material} className={`control-room ${missionScreen?'monitor-ui':''} ${isHome ? 'at-bridge' : 'at-console'} ${route.screen === 'operations' ? 'at-display' : ''}`}>
    <a href="#station-navigation" className="skip-link" onClick={event => {
      event.preventDefault(); document.getElementById('nav-mission')?.focus();
    }}>{copy.skip}</a>
    <header className="room-topbar">
      <a className="room-brand" href={routeHash({ ...route, screen: 'bridge' })} aria-label={`STAM · ${copy.home}`}>
        <img className="brand-emblem" src={stamLogo} alt="" width="64" height="64" /><span className="brand-wordmark">STAM<small>FREIGHT CONTROL</small></span>
      </a>
      <a className="console-lounge-link" href={`#/lounge?lang=${route.locale}`}>{route.locale === 'en' ? 'STAM Lounge' : 'STAM 라운지'}</a><div className="header-location"><span>COMMAND BRIDGE</span><i aria-hidden="true" /></div>
      <label className="language-control"><span>{copy.language}</span><select aria-label={copy.language} value={route.locale} onChange={event => {
        // Locale changes do not create a new navigation step or write legacy preferences.
        const next = { ...route, locale: event.target.value as Locale };
        history.replaceState(null, '', routeHash(next)+(route.screen==='operations'&&!controlMode?'&mode=workspace':'')); setRoute(next);
      }}>
        <option value="ko">한국어</option><option value="mix">한/영</option><option value="en">English</option>
      </select></label>
    </header>

    <div id="main-content">
      {isHome ? <section className="bridge-scene" aria-labelledby="bridge-title">
        <div className="room-picture">
          <img src={roomImage} width="1672" height="941" alt={copy.roomAlt} fetchPriority="high" />
          <div className="scene-shade" aria-hidden="true" />
          <div className="bridge-intro"><p><span aria-hidden="true" />{copy.welcome}</p><h1 id="bridge-title">{copy.title}</h1><span>{copy.intro}</span><div className="intro-rule" aria-hidden="true"><i /><i /><i /></div></div>
          {stations.map(station => <a key={station} className={`console-hotspot hotspot-${station}`}
            style={{ '--x': `${stationLayout[station].x}%`, '--y': `${stationLayout[station].y}%` } as CSSProperties}
            href={routeHash({ ...route, screen: station })} aria-label={`${copy[station]} · ${copy.hints[station]}`}>
            <span className="hotspot-target" aria-hidden="true"><i /></span><span className="hotspot-leader" aria-hidden="true" /><span className="hotspot-label"><HudFrame /><InterfaceGlyph kind={station} /><span className="hotspot-copy"><small>{stationLayout[station].number} / {station === 'mission' ? 'MISSION' : station === 'map' ? 'NAVIGATION' : 'OPERATIONS'}</small><b>{copy[station]}</b><span>{copy.hints[station]}</span></span><span className="hotspot-arrow" aria-hidden="true">⌁</span></span>
          </a>)}
        </div>
        <div className="bridge-bottom"><span className="scene-caption" aria-hidden="true">STAM / ORBITAL FREIGHT DIVISION</span><p>{copy.status}</p></div>
      </section> : <section className={`console-workspace workspace-${route.screen}`} aria-labelledby="workspace-title">
        <div className="console-heading">{missionScreen&&<nav className="monitor-navigation" aria-label={copy.navigate}><a href={routeHash({...route,screen:'mission'})} aria-current="page">{copy.mission}</a><a href={routeHash({...route,screen:'map'})}>{route.locale==='en'?'Navigation hologram':'항법 홀로그램'}</a><a href={routeHash({...route,screen:'operations'})}>{copy.operations}</a><label>{copy.language}<select value={route.locale} onChange={e=>{const next={...route,locale:e.target.value as Locale};history.replaceState(null,'',routeHash(next));setRoute(next);}}><option value="ko">한국어</option><option value="mix">한/영</option><option value="en">English</option></select></label></nav>}<div><p className="eyebrow">STAM / {route.screen.toUpperCase()}</p><h1 id="workspace-title" ref={heading} tabIndex={-1}>{copy[route.screen]}</h1><p>{copy.descriptions[route.screen]}</p></div></div>
        <div className="console-display-content" tabIndex={0} role="region" aria-label={copy[route.screen]}>
        <div className="workspace-layout" data-screen={route.screen}>
          {route.screen === 'mission' ?
            <MissionConsole draft={draft} change={flight.change} locale={route.locale} receipts={receipts} locked={flight.active || flight.busy || flight.blocked}
              onReview={next=>{if(next)flight.change(next);flight.calculate(()=>{if(parseRoute(location.hash).screen==='mission')location.hash=routeHash({...route,screen:'map'});});}}/> :
            <>{!controlMode && draft.partner==='navigator' && plan?.mode!=='simple' && <CargoPanel draft={draft} locale={route.locale} session={flight.session}/>}
              <FlightOperations flight={flight} locale={route.locale} controlMode={controlMode}/></>}
          {route.screen==='mission' && <ContractBackup flight={flight} locale={route.locale}/>}
          {route.screen==='mission' && flight.hasSaved && !flight.active && <button type="button" className="return-link" disabled={flight.busy||flight.blocked} onClick={()=>{
            if(!draft.jobs.length||window.confirm(route.locale==='en'?'Replace this manifest with the saved flight?':'현재 계약 목록을 이전에 저장한 운항으로 바꿀까요?'))flight.calculate(undefined,false,'saved');
          }}>{route.locale==='en'?'Load previous flight':'이전 운항 불러오기'}</button>}
          {(route.screen!=='operations'||!controlMode) && flight.error && <p role="alert">{flight.error}</p>}
          {(route.screen!=='operations'||!controlMode) && flight.storageError && <p role="alert">{flight.storageError} <button onClick={flight.backup}>JSON</button></p>}
          {(route.screen!=='operations'||!controlMode) && flight.busy && <p role="status">{route.locale==='en'?'Calculating route…':'항로 계산 중…'}</p>}
          {route.screen==='mission' && plan && <a className="return-link" href={routeHash({...route,screen:'map'})}>{route.locale==='en'?'View flight route':'계산된 항로 보기'} →</a>}
        </div>
        </div>
      </section>}
    </div>

    {!isHome ? <aside className="space-sidebar console-side-navigation"><p className="space-sidebar-caption">STAM / CONSOLE ACCESS</p><nav className="space-dock" id="station-navigation" aria-label={copy.navigate}>
      <a href={`#/lounge?lang=${route.locale}`}><span>{route.locale==='en'?'STAM Lounge':'STAM 라운지'}</span></a>
      <a href={routeHash({...route,screen:'bridge'})}><span>{route.locale==='en'?'Control centre':'STAM 관제센터'}</span></a>
      {stations.map(station=><a key={station} id={`nav-${station}`} href={routeHash({...route,screen:station})} aria-current={route.screen===station?'page':undefined}><span>{copy[station]}</span></a>)}
    </nav></aside> : <nav className="station-navigation" id="station-navigation" aria-label={copy.navigate}><div className="dock-rule" aria-hidden="true"><span>CONSOLE ACCESS</span><i /></div>
      <a className="bridge-link" href={routeHash({ ...route, screen: 'bridge' })} aria-current={isHome ? 'page' : undefined}><InterfaceGlyph kind="bridge" /><span>{copy.home}</span></a>
      {stations.map(station => <a key={station} id={`nav-${station}`} href={routeHash({ ...route, screen: station })} aria-current={route.screen === station ? 'page' : undefined}>
        <InterfaceGlyph kind={station} /><span className="nav-copy"><small className="nav-code">{station === 'mission' ? 'MISSION' : station === 'map' ? 'NAVIGATION' : 'OPERATIONS'}</small><b>{copy[station]}</b></span><span className="nav-number" aria-hidden="true">{stationLayout[station].number}</span>
      </a>)}
    </nav>}
    {!isHome&&<footer className="console-empty-footer"/>}
  </div>;
}
