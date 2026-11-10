import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { copyFor, screenTitle } from './copy';
import { parseRoute, routeHash, stationLayout, stations } from './navigation';
import type { Locale, Route } from './navigation';
import { InterfaceGlyph, HudFrame } from './InterfaceGlyph';
import { GlassNavigation } from './GlassNavigation';
import { MissionConsole, TrialBrief } from './MissionConsole';
import { useLogReceipts } from './use-log-receipts';
import { itinerary, readDraft, trialKey } from './mission-trial';
import stamLogo from '../../../assets/stam-logo-transparent.png';
import roomImage from './assets/control-room-stanton.png';

export function ControlRoom() {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  const heading = useRef<HTMLHeadingElement>(null);
  const lastStation = useRef(route.screen === 'bridge' ? null : route.screen);
  const mounted = useRef(false);
  const copy = copyFor(route.locale);
  const isHome = route.screen === 'bridge';
  const [draft, setDraft] = useState(readDraft);
  const receipts = useLogReceipts();
  useEffect(() => { try { sessionStorage.setItem(trialKey, JSON.stringify(draft)); } catch { /* Tab memory still works. */ } }, [draft]);
  const prepared = draft.reviewed && draft.jobs.length > 0;

  useEffect(() => {
    const sync = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    document.documentElement.lang = route.locale === 'en' ? 'en' : 'ko';
    document.title = `STAM · ${screenTitle(route.screen, copy)} · ${copy.preview}`;
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

  return <div className={`control-room ${isHome ? 'at-bridge' : 'at-console'}`}>
    <a href="#station-navigation" className="skip-link" onClick={event => {
      event.preventDefault(); document.getElementById('nav-mission')?.focus();
    }}>{copy.skip}</a>
    <header className="room-topbar">
      <a className="room-brand" href={routeHash({ ...route, screen: 'bridge' })} aria-label={`STAM · ${copy.home}`}>
        <img className="brand-emblem" src={stamLogo} alt="" width="64" height="64" /><span className="brand-wordmark">STAM<small>FREIGHT CONTROL</small></span>
      </a>
      <a className="console-lounge-link" href={`#/lounge?lang=${route.locale}`}>{route.locale === 'en' ? 'STAM Lounge' : 'STAM 라운지'}</a><div className="header-location"><span>COMMAND BRIDGE</span><i aria-hidden="true" /><span className="preview-badge">{copy.preview}</span></div>
      <label className="language-control"><span>{copy.language}</span><select value={route.locale} onChange={event => {
        // Locale changes do not create a new navigation step or write legacy preferences.
        const next = { ...route, locale: event.target.value as Locale };
        history.replaceState(null, '', routeHash(next)); setRoute(next);
      }}>
        <option value="ko">한국어</option><option value="mix">한/영</option><option value="en">English</option>
      </select></label>
    </header>

    <main id="main-content">
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
        <div className="console-heading"><div><p className="eyebrow">STAM / {route.screen.toUpperCase()}</p><h1 id="workspace-title" ref={heading} tabIndex={-1}>{copy[route.screen]}</h1><p>{copy.descriptions[route.screen]}</p></div><a className="return-link" href={routeHash({ ...route, screen: 'bridge' })}>↖ {copy.back}</a></div>
        <div className="workspace-layout" data-screen={route.screen}>
          {route.screen === 'mission' ? <MissionConsole draft={draft} change={setDraft} locale={route.locale} receipts={receipts}/> : route.screen === 'map' ? <>
            {prepared && <TrialBrief draft={draft} locale={route.locale}/>}
            <GlassNavigation locale={route.locale} calls={prepared ? itinerary(draft).map(s=>s.place) : undefined}/>
          </> : prepared ? <TrialBrief draft={draft} locale={route.locale} operations/> : copy.areas[route.screen].map(([title, description], index) => <article className={`workspace-area area-${index}`} key={title}>
            <span className="area-number">0{index + 1}</span><h2>{title}</h2><p>{description}</p>
          </article>)}
        </div>
        <p className="preview-notice">{route.locale==='en'?'Route preview · Stops follow contract order.':'항로 미리보기 · 계약 순서대로 방문합니다.'}</p>
      </section>}
    </main>

    <nav className="station-navigation" id="station-navigation" aria-label={copy.navigate}><div className="dock-rule" aria-hidden="true"><span>CONSOLE ACCESS</span><i /></div>
      <a className="bridge-link" href={routeHash({ ...route, screen: 'bridge' })} aria-current={isHome ? 'page' : undefined}><InterfaceGlyph kind="bridge" /><span>{copy.home}</span></a>
      {stations.map(station => <a key={station} id={`nav-${station}`} href={routeHash({ ...route, screen: station })} aria-current={route.screen === station ? 'page' : undefined}>
        <InterfaceGlyph kind={station} /><span className="nav-copy"><small className="nav-code">{station === 'mission' ? 'MISSION' : station === 'map' ? 'NAVIGATION' : 'OPERATIONS'}</small><b>{copy[station]}</b></span><span className="nav-number" aria-hidden="true">{stationLayout[station].number}</span>
      </a>)}
    </nav>
  </div>;
}
