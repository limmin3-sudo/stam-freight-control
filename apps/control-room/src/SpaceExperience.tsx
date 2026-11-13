import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import {PartnerConversation} from './PartnerConversation';
import {partnerDialogue} from './partner-dialogue';
import type {PartnerId} from './partner-dialogue';
import {MapConsole} from './MapConsole';
import {SpaceNavigation} from './SpaceNavigation';
import {InterfaceGlyph} from './InterfaceGlyph';
import {PartnerChoice} from './PartnerChoice';
import {needsPartnerChoice} from './partner-policy';
import { bridgePatches, bridgePartners } from './hologram-layout';
import cleanPlate from './assets/control-room-clean-plate.png';
import { ControlRoom } from './ControlRoom';
import {ServiceAccountHistory} from './ServiceAccountHistory';
import {useFlight} from './use-flight';
import {GuideDesk} from './GuideDesk';
import {ShuttleBoarding} from './ShuttleBoarding';
import {ConsoleArrival} from './ConsoleArrival';
import {isReturnTravel} from './travel-direction';
import type {GuideDeskHandle} from './GuideDesk';
import { spaceConfig } from './space-config';
import type { SceneTarget } from './space-config';
import { isStation, parentSpace, parseSpaceRoute, spaceHash } from './space-navigation';
import type { SpaceScreen } from './space-navigation';
import type { Locale } from './navigation';
import logo from '../../../assets/stam-logo-transparent.png';
import standingDirector from './assets/director-standing.png';
import bridgeOperator from './assets/operator-identity-v2.png';
import bridgeNavigator from './assets/navigator-standing.png';
import intro from '../../../assets/intro/intro.mp4';
import poster from '../../../assets/intro/poster.jpg';
import './space-experience.css';
import './left-space-navigation.css';
import './lounge-labels.css';
import './content-optics.css';
import './console-arrival.css';

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
// Keep the previous 850ms approach + 180ms reveal budget, with a brief ignition.
const departureMs = Math.round(spaceConfig.approachMs * .82);
const ignitionMs = spaceConfig.approachMs + revealMs - departureMs;
type ArrivalView = {screen:SpaceScreen;returning:boolean;focus:readonly [number,number]};
type Entry = { screen: SpaceScreen; kind: 'short' | 'long' | 'boarding'; target?: SceneTarget; returning?:boolean };
const appDownload = 'https://github.com/limmin3-sudo/stam-freight-control/releases/tag/app.1.3.2';
// Full-body director in front of the desk: keep selection/approach tied to her,
// rather than to the separate receptionist seated in the background.
const directorContour = 'M541 400 Q576 393 586 433 L581 473 L602 493 L615 569 L606 642 L596 709 L586 784 L581 847 L544 850 L531 822 L525 745 L516 682 L509 616 L502 549 L512 493 L538 474 L527 441 Z';

export function SpaceExperience() {
  const flight = useFlight();
  const [conversation,setConversation]=useState<{partner:PartnerId;variant:number}|null>(null);
  const greetingVisits=useRef<Record<PartnerId,number>>({director:0,operator:0,navigator:0});
  const [route, setRoute] = useState(() => parseSpaceRoute(location.hash));
  const guideController=useRef<GuideDeskHandle|null>(null);
  const guideApproach=useRef(true);
  const [active, setActive] = useState<string | null>(null);
  const [pending, setPending] = useState<Entry | null>(null);
  const [powerOn, setPowerOn] = useState(false);
  const [arrivalView,setArrivalView] = useState<ArrivalView|null>(null);
  const arrivalDestination = useRef<ArrivalView | null>(null);
  const ignitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (ignitionTimer.current !== null) clearTimeout(ignitionTimer.current);
    ignitionTimer.current = null; arrivalDestination.current = null; setPowerOn(false);setArrivalView(null);
    if (!hoveredTarget.current) setActive(null);
  }, []);

  useEffect(() => {
    const sync = () => {
      const next = parseSpaceRoute(location.hash);
      const arrival = arrivalDestination.current;
      const ignite = arrival?.screen === next.screen;
      if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
      hoverTimer.current = null; hoveredTarget.current = null;
      cancel(); setConversation(null); setActive(null); setPlaying(false); setMediaError(false);
      setRoute(next);
      if (ignite) {
        setArrivalView(arrival);
        setPowerOn(true);
      }
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
      if (ignitionTimer.current !== null) clearTimeout(ignitionTimer.current);
    };
  }, [cancel]);

  useEffect(() => {
    if (!powerOn) return;
    // Start the short visible hold after the real destination has committed,
    // so a cold console mount cannot consume the entire logo/ignition interval.
    const frame = requestAnimationFrame(() => {
      ignitionTimer.current = setTimeout(() => { ignitionTimer.current = null; setPowerOn(false);setArrivalView(null); }, arrivalView?.returning?departureMs:ignitionMs);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (ignitionTimer.current !== null) clearTimeout(ignitionTimer.current);
      ignitionTimer.current = null;
    };
  }, [powerOn,arrivalView?.returning]);

  useEffect(() => {
    const ctx = audio.current;
    if (!powerOn || arrivalView?.returning || !sound || !ctx || ctx.state !== 'running') return;
    const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .11), ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = noise; filter.type = 'bandpass'; filter.frequency.value = 2400; filter.Q.value = .7;
    const at = ctx.currentTime + .08;
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume / 100 * .25, at + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .11);
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination); source.start(at);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    return () => { source.stop(); source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }, [powerOn, arrivalView?.returning, sound, volume]);

  useEffect(() => () => { void audio.current?.close().catch(() => {}); audio.current = null; }, []);
  useEffect(() => { setImageReady(false); setImageError(false); }, [scene]);
  useEffect(() => {
    document.documentElement.lang = en ? 'en' : 'ko';
    document.title = `${word(names[route.screen])} · STAM FREIGHT DIVISION`;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isStation(route.screen) && route.screen !== 'map') return;
      if (document.querySelector('dialog[open]')) return;
      if (event.target instanceof Element && event.target.closest('select, input, textarea, video, [contenteditable]')) return;
      if(route.screen==='guide'){event.preventDefault();guideController.current?.navigate('lounge');return;}
      if (destination.current) { cancel(); return; }
      if (route.screen === 'map') return; // The chart owns Escape for hierarchical navigation.
      if (!isOverview) beginTravel(scene);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [route, cancel, en, scene, isOverview, motion, sound, volume]);

  useLayoutEffect(() => {
    if (previousScreen.current === route.screen) return;
    previousScreen.current = route.screen;
    if (route.screen === 'map') {
      document.getElementById('chart-title')?.focus({ preventScroll: true });
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
    beginTravel(screen,target);
  };
  function beginTravel(screen:SpaceScreen,target?:SceneTarget) {
    if(route.screen==='guide'){guideController.current?.navigate(screen);return;}
    if (destination.current || route.screen === screen) return;
    cancel();
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
    const returning = isReturnTravel(route.screen,screen);
    const returnPlace = returning ? spaceConfig.scenes[screen as 'lounge'|'bridge'].targets.find(place=>place.to===route.screen) : undefined;
    // Normal sidebar, scene and text visits share one camera/ignition sequence.
    // Guided desk travel above keeps its approved tutorial video.
    setConversation(null);
    setPending({ screen, kind: 'short', target: target ?? configuration.targets.find(place => place.to === screen), returning });
    setActive(target?.id ?? null);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (destination.current) {
        arrivalDestination.current = {screen:destination.current,returning,focus:returnPlace?.focus??[50,50]};
        location.hash = spaceHash({ ...route, screen: destination.current });
      }
    }, returning?ignitionMs:departureMs);
  }
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
  const consoleOpen = isStation(route.screen);
  const choosePartner=!flight.blocked&&(consoleOpen||route.screen==='bridge')&&needsPartnerChoice(flight.session);

  const captureFrame = import.meta.env.DEV && route.screen === scene && new URLSearchParams(location.search).get('capture') === 'frame';
  const approaching = pending?.kind === 'short';
  return <><div data-console-shell={consoleOpen||undefined} className={`space-experience space-${scene}`} data-screen={route.screen} data-moving={approaching} data-entry={pending?.kind} data-travel-direction={pending?.returning?'out':'in'} data-returning={powerOn&&arrivalView?.returning||undefined} style={{'--return-focus-x':`${arrivalView?.focus[0]??50}%`,'--return-focus-y':`${arrivalView?.focus[1]??50}%`} as CSSProperties} data-motion={motion} data-capture-frame={captureFrame || undefined}>
    <a className="skip-link" href="#space-navigation" onClick={event => {
      event.preventDefault(); Array.from(document.querySelectorAll<HTMLElement>('.space-menu-toggle,.space-group-button[aria-current],.guide-desk button:not([disabled])')).find(element=>element.getClientRects().length)?.focus();
    }}>{en ? 'Skip to navigation' : '주요 메뉴로 건너뛰기'}</a>
    <header className="space-topbar">
      <a className="room-brand" href={href('lounge')} onClick={event=>enter(event,'lounge')} aria-label={`STAM FREIGHT DIVISION · ${word(names.lounge)}`}>
