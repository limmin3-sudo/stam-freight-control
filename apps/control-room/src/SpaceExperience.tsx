import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import {PartnerConversation} from './PartnerConversation';
import {partnerDialogue} from './partner-dialogue';
import type {PartnerId} from './partner-dialogue';
import { StantonHologram } from './StantonHologram';
import { bridgePatches, bridgePartners } from './hologram-layout';
import cleanPlate from './assets/control-room-clean-plate.png';
import { ControlRoom } from './ControlRoom';
import {ServiceAccountHistory} from './ServiceAccountHistory';
import {useFlight} from './use-flight';
import {GuideDesk,guideLoungeFrame,guideReturnFrame} from './GuideDesk';
import {ShuttleBoarding} from './ShuttleBoarding';
import type {GuideDeskHandle} from './GuideDesk';
import { spaceConfig } from './space-config';
import type { SceneTarget } from './space-config';
import { isStation, parentSpace, parseSpaceRoute, spaceHash } from './space-navigation';
import type { SpaceScreen } from './space-navigation';
import type { Locale } from './navigation';
import logo from '../../../assets/stam-logo-transparent.png';
import bridgeOperator from './assets/operator-identity-v2.png';
import bridgeNavigator from './assets/navigator-standing.png';
import intro from '../../../assets/intro/intro.mp4';
import poster from '../../../assets/intro/poster.jpg';
import './space-experience.css';
import './left-space-navigation.css';
import './lounge-labels.css';

const names: Record<SpaceScreen, readonly [string, string]> = {
  lounge: ['STAM 라운지', 'STAM Lounge'], bridge: ['STAM 관제센터', 'STAM Control Centre'],
  guide: ['안내 데스크', 'Welcome desk'], information: ['정보실', 'Information'],
  cinema: ['영상관', 'Cinema'], service: ['서비스센터', 'Service centre'], mission: ['미션 콘솔', 'Mission console'],
  map: ['항로 지도', 'Star map'], operations: ['관제 콘솔', 'Control console'],
};
// Read-only public resources. This preview never imports the legacy app's DOM
// bootstrap or moves its contracts into another origin/storage namespace.
const publicSite = 'https://limmin3-sudo.github.io/stam-freight-control/';
const flightSite = new URL('flight.html', import.meta.env.DEV ? publicSite : location.href).href;
const revealMs = 180;
const longEntryMs = 1400;
type Entry = { screen: SpaceScreen; kind: 'short' | 'long' | 'boarding'; target?: SceneTarget };
const appDownload = 'https://github.com/limmin3-sudo/stam-freight-control/releases/tag/app.1.3.2';
// Full-body director in front of the desk: keep selection/approach tied to her,
// rather than to the separate receptionist seated in the background.
const directorContour = 'M541 400 Q576 393 586 433 L581 473 L602 493 L615 569 L606 642 L596 709 L586 784 L581 847 L544 850 L531 822 L525 745 L516 682 L509 616 L502 549 L512 493 L538 474 L527 441 Z';

export function SpaceExperience() {
  const flight = useFlight();
  const [conversation,setConversation]=useState<{partner:PartnerId;variant:number}|null>(null);
  const greetingVisits=useRef<Record<PartnerId,number>>({director:0,operator:0,navigator:0});
  const [mapDock,setMapDock]=useState<HTMLDivElement|null>(null);
  const [route, setRoute] = useState(() => parseSpaceRoute(location.hash));
  const [returnedLounge,setReturnedLounge]=useState<string|null>(null);
  const guideController=useRef<GuideDeskHandle|null>(null);
  const guideApproach=useRef(true);
  const [active, setActive] = useState<string | null>(null);
  const [pending, setPending] = useState<Entry | null>(null);
  const [sound, setSound] = useState(false);
  const [motion, setMotion] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [volume, setVolume] = useState(20);
  const [playing, setPlaying] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [imageError, setImageError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredTarget = useRef<string | null>(null);
  const destination = useRef<SpaceScreen | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const lastTone = useRef(0);
  const previousScreen = useRef(route.screen);
  const returnTarget = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const en = route.locale === 'en';
  const word = (pair: readonly [string, string]) => pair[en ? 1 : 0];
  const scene = parentSpace(route.screen);
  const isOverview = route.screen === 'lounge' || route.screen === 'bridge' || route.screen === 'map';
  const configuration = spaceConfig.scenes[scene];
  const selectedTarget = configuration.targets.find(target => target.id === active);

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null; destination.current = null; setPending(null);
    if (!hoveredTarget.current) setActive(null);
  }, []);

  useEffect(() => {
    const sync = () => {
      if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
      hoverTimer.current = null; hoveredTarget.current = null;
      cancel(); setConversation(null); setActive(null); setPlaying(false); setMediaError(false);
      setRoute(parseSpaceRoute(location.hash));
    };
    window.addEventListener('hashchange', sync);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const motionChanged = () => { setMotion(!media.matches); cancel(); };
    media.addEventListener('change', motionChanged);
    return () => {
      window.removeEventListener('hashchange', sync);
      media.removeEventListener('change', motionChanged);
      if (timer.current !== null) clearTimeout(timer.current);
      if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
    };
  }, [cancel]);

  useEffect(() => () => { void audio.current?.close().catch(() => {}); audio.current = null; }, []);
  useEffect(() => { setImageReady(false); setImageError(false); }, [scene]);
  useEffect(() => {
    document.documentElement.lang = en ? 'en' : 'ko';
    document.title = `${word(names[route.screen])} · STAM · ${en ? 'Preview' : '미리보기'}`;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isStation(route.screen) && route.screen !== 'map') return;
      if (event.target instanceof Element && event.target.closest('select, input, textarea, video')) return;
      if(route.screen==='guide'){event.preventDefault();guideController.current?.navigate('lounge');return;}
      if (destination.current) { cancel(); return; }
      if (route.screen === 'map') { location.hash = spaceHash({...route,screen:'bridge'});return; }
      if (!isOverview) location.hash = spaceHash({ ...route, screen: scene });
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [route, cancel, en, scene, isOverview]);

  useLayoutEffect(() => {
    if (previousScreen.current === route.screen) return;
    previousScreen.current = route.screen;
    if (route.screen === 'map') {
      document.querySelector<HTMLElement>('.hologram-heading h1')?.focus({ preventScroll: true });
    } else if (isOverview && returnTarget.current && configuration.targets.some(target => target.id === returnTarget.current)) {
      document.getElementById(`space-marker-${returnTarget.current}`)?.focus({ preventScroll: true });
    } else heading.current?.focus({ preventScroll: true });
  }, [route.screen, isOverview, configuration, scene]);

  const tone = (confirmed = false) => {
    const ctx = audio.current;
    if (!sound || !ctx || ctx.state !== 'running' || performance.now() - lastTone.current < 140) return;
    lastTone.current = performance.now();
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(confirmed ? 740 : 520, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(confirmed ? 1080 : 690, ctx.currentTime + .07);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume / 100 * .12, ctx.currentTime + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .11);
    oscillator.connect(gain); gain.connect(ctx.destination);
    oscillator.start(); oscillator.stop(ctx.currentTime + .12);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  };
  const finish = () => {
    const next = destination.current;
    cancel();
    if (next) location.hash = spaceHash({ ...route, screen: next });
  };
  const enter = (event: MouseEvent, screen: SpaceScreen, target?: SceneTarget) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if(route.screen==='guide'){guideController.current?.navigate(screen);return;}
    if (destination.current || route.screen === screen) return;
    returnTarget.current = target?.id ?? null;
    tone(true);
    if(screen==='guide'){
      guideApproach.current=!!target&&motion;
      cancel();setConversation(null);
      location.hash=spaceHash({...route,screen:'guide'});return;
    }
    if (!motion || (target && (!imageReady || imageError))) {
      location.hash = spaceHash({ ...route, screen }); return;
    }
    destination.current = screen;
    if(route.screen==='lounge'&&screen==='bridge'&&target?.id==='gate'){
      setConversation(null);setPending({screen,kind:'boarding',target});setActive(null);return;
    }
    setPending({ screen, kind: target ? 'long' : 'short', target: target ?? configuration.targets.find(place => place.to === screen) });
    setActive(target?.id ?? null);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (destination.current) location.hash = spaceHash({ ...route, screen: destination.current });
    }, target ? longEntryMs : spaceConfig.approachMs);
  };
  const stopHoverTimer = () => {
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };
  const highlight = (id: string) => {
    stopHoverTimer(); hoveredTarget.current = id; setActive(id); tone();
  };
  const releaseHighlight = () => {
    stopHoverTimer();
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = null;
      if (destination.current) return;
      const focused = document.activeElement;
      const keyboardTarget = focused instanceof HTMLElement && focused.matches(':focus-visible')
        ? focused.dataset.marker ?? focused.dataset.target ?? null : null;
      setActive(keyboardTarget ?? hoveredTarget.current);
    }, 140);
  };
  const leaveTarget = () => { hoveredTarget.current = null; releaseHighlight(); };
  const focusTarget = (id: string) => { setActive(id); tone(); releaseHighlight(); };
  const href = (screen: SpaceScreen) => spaceHash({ ...route, screen });

  // Existing console preview stays reachable by deep links and browser history.
  // It owns no production contract state. Room-sized 3D experiments are retired.
  const consoleOpen = isStation(route.screen) && route.screen !== 'map';

  const captureFrame = import.meta.env.DEV && route.screen === scene && new URLSearchParams(location.search).get('capture') === 'frame';
  const approaching = pending?.kind === 'short' && route.screen === scene;
  return <>{consoleOpen ? <ControlRoom flight={flight} /> : <div className={`space-experience space-${scene}`} data-screen={route.screen} data-moving={approaching} data-entry={pending?.kind} data-motion={motion} data-capture-frame={captureFrame || undefined}>
    <a className="skip-link" href="#space-navigation" onClick={event => {
      event.preventDefault(); document.querySelector<HTMLElement>('.space-dock a,.guide-desk button:not([disabled])')?.focus();
    }}>{en ? 'Skip to navigation' : '주요 메뉴로 건너뛰기'}</a>
    <header className="space-topbar">
      <a className="room-brand" href={href('lounge')} onClick={event=>{if(route.screen==='guide')enter(event,'lounge');}} aria-label={word(names.lounge)}>
        <img className="brand-emblem" src={logo} alt="" width="54" height="54" />
        <span className="brand-wordmark">STAM<small>FREIGHT CONTROL</small></span>
      </a>
      <nav className="space-switch" aria-label={en ? 'Locations' : '공간 이동'}>
        <a href={href('lounge')} onClick={event => enter(event, 'lounge')} aria-current={scene === 'lounge' ? 'location' : undefined}>{en ? 'Lounge' : '라운지'}</a>
        <span aria-hidden="true">/</span>
        <a href={href('bridge')} onClick={event => enter(event, 'bridge')} aria-current={scene === 'bridge' ? 'location' : undefined}>{word(names.bridge)}</a>
      </nav>
      <a className="control-mode-link" href={href('operations')+'&mode=control'}>{en ? 'Control console' : '관제 콘솔'}</a>
      <a className="space-download" href={appDownload} target="_blank" rel="noopener noreferrer">{en ? 'Download app' : '앱 다운로드'}</a>
      <label className="space-language"><span className="sr-only">{en ? 'Display language' : '표시 언어'}</span><select value={route.locale} onChange={event => {
        cancel();
        const next = { ...route, locale: event.target.value as Locale };
        history.replaceState(null, '', spaceHash(next)); setRoute(next);
      }}><option value="ko">한국어</option><option value="mix">한/영</option><option value="en">English</option></select></label>
    </header>

    <main className="space-main">
      {isOverview ? <section className="space-overview" aria-labelledby="space-title">
        <div className="space-artwork" data-selected={!!active && !pending} onMouseLeave={leaveTarget} style={{ '--approach-ms': `${spaceConfig.approachMs}ms`, '--zoom': spaceConfig.approachScale, '--focus-x': `${pending?.target?.focus[0] ?? 50}%`, '--focus-y': `${pending?.target?.focus[1] ?? 50}%` } as CSSProperties}>
          <div className="space-camera">
            <img key={scene} className="space-background" src={scene==='lounge'?(returnedLounge??guideLoungeFrame):configuration.image} width="1672" height="941" alt={en ? (scene === 'lounge' ? 'Sunlit STAM lounge with a receptionist seated behind the welcome desk and the smiling Flight Guide standing in front of its right corner, boarding gate, information room and cinema.' : 'Orbital control centre with the operator on the left, navigator on the right, a central hologram and two empty user seats.') : (scene === 'lounge' ? '별도 접수 직원이 앉은 안내데스크 오른쪽 앞에 미소 지으며 서 있는 플라이트 가이드, 탑승 게이트, 정보실과 영상관의 밝은 STAM 라운지' : '왼쪽 오퍼레이터와 오른쪽 항해사, 중앙 홀로그램과 두 빈 사용자 좌석이 있는 우주 관제센터')} fetchPriority="high" onLoad={() => setImageReady(true)} onError={() => setImageError(true)} />
            {scene === 'bridge' && <svg className="bridge-background-patches" viewBox="0 0 1672 941" aria-hidden="true">
              <defs><filter id="bridge-patch-feather"><feGaussianBlur stdDeviation="5" /></filter><mask id="bridge-patch-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941">
                {bridgePatches.map((p,i)=><rect key={i} x={p.x} y={p.y} width={p.width} height={p.height} rx={p.radius} fill="white" filter="url(#bridge-patch-feather)"/>)}
              </mask></defs><image href={cleanPlate} width="1672" height="941" mask="url(#bridge-patch-mask)"/>
            </svg>}
            {scene === 'lounge' && <svg className="space-spotlight" viewBox="0 0 1672 941" aria-hidden="true">
              <defs>
                <filter id="space-block-feather" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
                <mask id="space-block-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941">
                  <rect width="1672" height="941" fill="white" />
                  {selectedTarget && <path className="space-selected-region" d={selectedTarget.contour} fill="black" fillRule="evenodd" filter="url(#space-block-feather)" />}
                  {selectedTarget?.id === 'desk' && <path d={directorContour} fill="black" filter="url(#space-block-feather)" />}
                </mask>
              </defs>
              <rect className="space-surround-shade" width="1672" height="941" mask="url(#space-block-mask)" />
            </svg>}
            <svg className="space-segments" viewBox="0 0 1672 941" aria-hidden="true">
              {configuration.targets.map(target => <a key={target.id} href={href(target.to)} tabIndex={-1} onClick={event => enter(event, target.to, target)} onMouseEnter={() => highlight(target.id)} onMouseLeave={leaveTarget}>
                <path d={target.contour} fillRule="evenodd" />
              </a>)}

            </svg>
          </div>
          {scene === 'bridge' && <StantonHologram plan={flight.session.plan} expanded={route.screen === 'map'} motion={motion} locale={route.locale} dockTarget={mapDock}/> }
          {scene === 'bridge' && <div className="bridge-partners">
              <div className="space-person space-bridge-operator" style={{left:`${bridgePartners.operator.x}%`,top:`${bridgePartners.operator.y}%`,height:`${bridgePartners.operator.height}%`}} aria-hidden="true"><img src={bridgeOperator} alt="" width="887" height="1774" /></div>
              <div className="space-person space-bridge-navigator" style={{left:`${bridgePartners.navigator.x}%`,top:`${bridgePartners.navigator.y}%`,height:`${bridgePartners.navigator.height}%`}} aria-hidden="true"><img src={bridgeNavigator} alt="" width="887" height="1774" /></div>
              <span className="bridge-partner-name operator-name">{en ? 'Bridge operator' : '브리지 오퍼레이터'}</span>
              <span className="bridge-partner-name navigator-name">{en ? 'Senior navigator' : '수석 항해사'}</span>
          </div>}
          {scene === 'lounge' && <span className="director-partner-name">{word(partnerDialogue.director.name)}</span>}
          {(scene==='lounge'?['director'] as const:['operator','navigator'] as const).map(id=>{
            const at=id==='director'?{x:32.9,y:42.5,height:47.7}:bridgePartners[id];
            return <button key={id} type="button" className="partner-hit" data-partner={id}
              style={{left:`${at.x}%`,top:`${at.y}%`,height:`${at.height}%`}}
              aria-label={en?`Talk to ${partnerDialogue[id].name[1]}`:`${partnerDialogue[id].name[0]}와 대화`}
              aria-haspopup={id==='director'?undefined:'dialog'} disabled={!!pending||route.screen==='map'}
              onClick={event=>{if(id==='director'){enter(event,'guide',configuration.targets.find(target=>target.id==='desk'));return;}event.currentTarget.focus();cancel();setActive(null);tone(true);setConversation({partner:id,variant:greetingVisits.current[id]++});}}/>;
          })}
          <div className="space-markers" inert={!!pending}>
            {configuration.targets.map(target => <a key={target.id} id={`space-marker-${target.id}`} className={`space-marker ${active === target.id ? 'is-lit' : ''}`} data-marker={target.id}
              aria-label={`${word(target.label)} · ${word(target.detail)}`} href={href(target.to)} style={{ left: `${target.marker[0]}%`, top: `${target.marker[1]}%` }}
              onClick={event => enter(event, target.to, target)} onMouseEnter={() => highlight(target.id)} onMouseLeave={leaveTarget} onFocus={() => focusTarget(target.id)} onBlur={releaseHighlight}>
              <svg className="space-marker-glyph" viewBox="0 0 40 40" aria-hidden="true">
                <circle className="marker-disc" cx="20" cy="20" r="15.5" />
                <circle className="marker-inner" cx="20" cy="20" r="10.5" />
                <path className="marker-ticks" d="M20 1v4M39 20h-4M20 39v-4M1 20h4" />
                <circle className="marker-core" cx="20" cy="20" r="3" />
              </svg>
            </a>)}
          </div>
          <div className="space-vignette" />
          <svg className="space-leaders" viewBox="0 0 1672 941" aria-hidden="true">
            <defs><marker id="space-direction" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M 1 1 L 7 4 L 1 7" /></marker></defs>
            {configuration.targets.map(target => {
              const points = `${target.marker[0]*16.72},${target.marker[1]*9.41} ${target.x*16.72},${(target.marker[1]+4)*9.41} ${target.x*16.72},${(target.y-2)*9.41}`;
              return <g key={target.id}>
                <polyline className="leader-underlay" points={points} />
                <polyline points={points} />
              </g>;
            })}
          </svg>
          <div className="space-intro">
            <p>{scene === 'lounge' ? 'PLANETSIDE / ARRIVALS' : 'ORBITAL / COMMAND'}</p>
            <h1 id="space-title" ref={heading} tabIndex={-1}><span className="space-title-depth" aria-hidden="true">{word(names[scene])}</span><span>{word(names[scene])}</span></h1>
            <span>{en ? (scene === 'lounge' ? 'Every journey begins here.' : 'Your next route starts here.') : (scene === 'lounge' ? '다음 항해가 시작되는 곳.' : '항로를 펼치고, 다음 운송을 준비하세요.')}</span>
          </div>
          <div className="space-labels" inert={!!pending}>
            {configuration.targets.map(target => <div key={target.id} className="space-target" data-target={target.id}
              style={{ left: `${target.x}%`, top: `${target.y}%` }}>
              <span className="space-target-text"><strong>{word(target.label)}</strong><span>{word(target.detail)}</span></span>
            </div>)}
          </div>
          {imageError && <p className="space-image-error" role="alert">{en ? 'The scene could not load. Use the shortcuts.' : '전경을 불러오지 못했습니다. 바로가기를 이용해주세요.'}</p>}
        </div>
        <div className="space-scene-note"><span>{scene === 'lounge' ? 'STAM / WELCOME ABOARD' : 'STAM / ORBITAL FREIGHT DIVISION'}</span><p>{en ? 'Select a location, or use the shortcuts.' : '공간 속 대상을 선택하거나 바로가기를 이용하세요.'}</p></div>
      </section> : route.screen==='guide' ? <GuideDesk ref={guideController} locale={route.locale} startWithApproach={guideApproach.current} motion={motion} sound={sound}
        onNavigate={screen=>{location.hash=spaceHash({...route,screen});}}
        onLounge={()=>{setReturnedLounge(guideReturnFrame);location.hash=spaceHash({...route,screen:'lounge'});}}/> : <section className={`space-room room-${route.screen}`} aria-labelledby="space-title">
        <div className="space-room-background" style={{ backgroundImage: `url(${configuration.image})` }} aria-hidden="true" />
        <header className="space-room-heading"><div><p>STAM LOUNGE / {route.screen.toUpperCase()}</p><h1 id="space-title" ref={heading} tabIndex={-1}>{word(names[route.screen])}</h1></div><a className="return-link" href={href('lounge')}>↖ {en ? 'Return to lounge' : '라운지로'}</a></header>
        {route.screen === 'service' && <div className="space-information space-service">
          <ServiceAccountHistory locale={route.locale} />
          {[
            [en ? 'Feedback & bug reports' : '피드백 · 오류 신고', en ? 'Use Feedback on STAM to send suggestions or report a problem.' : 'STAM의 피드백·오류 신고 메뉴에서 의견과 문제를 접수합니다.', flightSite],
            [en ? 'Release history' : '업데이트 기록', en ? 'Browse the changes in each STAM release.' : 'STAM의 버전별 변경 내용을 확인합니다.', `${publicSite}patch-notes.html`],
            [en ? 'User guide' : '이용안내', en ? 'Read the full guide and find help for each feature.' : '기능별 설명과 전체 이용안내를 확인합니다.', `${publicSite}guide.html`],
          ].map(([title, description, link]) => <a key={title} href={link} target="_blank" rel="noopener noreferrer"><h2>{title}</h2><p>{description}</p><span>{en ? 'Open STAM' : 'STAM에서 열기'}</span></a>)}
        </div>}
        {route.screen === 'information' && <div className="space-information">
          <p>{en ? 'Reference material for ships, missions and cargo.' : '함선·미션·화물 운송에 필요한 자료를 확인하세요.'}</p>
          <a href={`${publicSite}guide.html`} target="_blank" rel="noopener noreferrer"><h2>{en ? 'Freight reference' : '운송 자료'}</h2><p>{en ? 'Ship preparation, contracts, routes and cargo rules.' : '함선 준비·계약·항로·화물 적재 규칙을 확인합니다.'}</p><span>{en ? 'Open reference' : '자료 열기'}</span></a>
        </div>}
        {route.screen === 'cinema' && <div className="space-cinema"><div className="space-screen">
          {playing ? <video controls autoPlay playsInline preload="metadata" src={intro} poster={poster} aria-label={en ? 'STAM introduction' : 'STAM 소개영상'} onError={() => setMediaError(true)} /> : <button className="space-play" onClick={() => setPlaying(true)} aria-label={en ? 'Play STAM introduction' : 'STAM 소개영상 재생'}><img src={poster} alt=""/><span><b aria-hidden="true">▷</b>{en ? 'Play introduction' : '소개영상 재생'}</span></button>}
        </div><div className="space-cinema-caption"><span>STAM / FREIGHT CONTROL</span><p>{en ? 'The STAM fleet, beyond the horizon.' : '더 넓은 우주로 향하는 STAM 함대.'}</p></div>{mediaError && <p role="alert">{en ? 'Playback failed. Please reopen the cinema and try again.' : '영상 재생에 실패했습니다. 영상관을 다시 열어 시도해주세요.'}</p>}</div>}
      </section>}
      {route.screen!=='guide' && <aside className="space-sidebar" aria-label={en?'Space navigation':'공간 메뉴'}>
        <div className="space-sidebar-caption" aria-hidden="true">STAM / ACCESS</div>
      <nav id="space-navigation" className="space-dock" aria-label={en ? 'Direct access' : '공간 바로가기'}>
        {(scene === 'lounge' ? ['bridge', 'guide', 'service', 'information', 'cinema'] as const : ['lounge', 'mission', 'map', 'operations'] as const).map(screen => <a key={screen} href={href(screen)} aria-current={route.screen === screen ? 'page' : undefined}
          onClick={event => enter(event, screen)}><span>{word(names[screen])}</span></a>)}
      </nav>
      <details className="space-settings"><summary>{en ? 'Sound & motion' : '소리·연출'}</summary><div>
        <button aria-pressed={sound} onClick={async () => {
          if (sound) { setSound(false); return; }
          try { audio.current ??= new AudioContext(); await audio.current.resume(); setSound(audio.current.state === 'running'); } catch { setSound(false); }
        }}>{en ? `Sound ${sound ? 'on' : 'off'}` : `효과음 ${sound ? '켜짐' : '꺼짐'}`}</button>
        <label>{en ? 'Volume' : '음량'}<input aria-label={en ? 'Effect volume' : '효과음 크기'} type="range" min="0" max="50" value={volume} onChange={event => setVolume(Number(event.target.value))} /></label>
        <button aria-pressed={motion} onClick={() => { setMotion(!motion); cancel(); }}>{en ? `Transitions ${motion ? 'on' : 'off'}` : `이동 연출 ${motion ? '켜짐' : '꺼짐'}`}</button>
      </div></details>
        <div className="space-map-sidebar" ref={setMapDock} hidden={route.screen!=='map'} />
      </aside>}
      {pending?.kind === 'long' && <div className="space-transition" role="status"><span>{word(names[pending.screen])} · {en ? 'Approaching' : '접근 중'}</span><button onClick={finish}>{en ? 'Skip transition' : '연출 건너뛰기'}</button><button onClick={cancel}>{en ? 'Cancel' : '취소'}</button></div>}
    </main>

    {conversation && <PartnerConversation partner={conversation.partner} variant={conversation.variant} en={en} onClose={()=>setConversation(null)}/>}
    {route.screen!=='guide' && <footer className="space-footer" aria-hidden="true" />}
  </div>}
    {pending?.kind==='boarding'&&<ShuttleBoarding en={en} sound={sound} volume={volume} onSound={setSound} onComplete={finish} onCancel={cancel}/>}
    <div aria-hidden="true" className="entry-fade" data-dark={!!pending&&pending.kind!=='boarding'}
      style={{ transitionDuration: `${!motion ? 0 : pending ? (pending.kind === 'long' ? longEntryMs : spaceConfig.approachMs) : revealMs}ms` }} />
  </>;
}
