import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { ControlRoom } from './ControlRoom';
import { spaceConfig } from './space-config';
import type { SceneTarget } from './space-config';
import { isStation, parentSpace, parseSpaceRoute, spaceHash } from './space-navigation';
import type { SpaceScreen } from './space-navigation';
import type { Locale } from './navigation';
import logo from '../../../assets/stam-logo-transparent.png';
import partner from '../../../assets/partners/director-portrait.webp';
import intro from '../../../assets/intro/intro.mp4';
import poster from '../../../assets/intro/poster.jpg';
import './space-experience.css';

const names: Record<SpaceScreen, readonly [string, string]> = {
  lounge: ['STAM 라운지', 'STAM Lounge'], bridge: ['관제센터', 'Control centre'],
  guide: ['안내 데스크', 'Welcome desk'], information: ['정보실', 'Information'],
  cinema: ['영상관', 'Cinema'], mission: ['미션 콘솔', 'Mission console'],
  map: ['항로 지도', 'Star map'], operations: ['운항 관제', 'Operations'],
};
// Read-only public resources. This preview never imports the legacy app's DOM
// bootstrap or moves its contracts into another origin/storage namespace.
const publicSite = 'https://limmin3-sudo.github.io/stam-freight-control/';

export function SpaceExperience() {
  const [route, setRoute] = useState(() => parseSpaceRoute(location.hash));
  const [active, setActive] = useState<string | null>(null);
  const [pending, setPending] = useState<SceneTarget | null>(null);
  const [sound, setSound] = useState(false);
  const [motion, setMotion] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [volume, setVolume] = useState(20);
  const [playing, setPlaying] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [imageError, setImageError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destination = useRef<SpaceScreen | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const lastTone = useRef(0);
  const previousScreen = useRef(route.screen);
  const returnTarget = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const en = route.locale === 'en';
  const word = (pair: readonly [string, string]) => pair[en ? 1 : 0];
  const scene = parentSpace(route.screen);
  const isOverview = route.screen === 'lounge' || route.screen === 'bridge';
  const configuration = spaceConfig.scenes[scene];

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null; destination.current = null; setPending(null);
  }, []);

  useEffect(() => {
    const sync = () => {
      cancel(); setActive(null); setPlaying(false); setMediaError(false);
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
    };
  }, [cancel]);

  useEffect(() => () => { void audio.current?.close().catch(() => {}); audio.current = null; }, []);
  useEffect(() => { setImageReady(false); setImageError(false); }, [scene]);
  useEffect(() => {
    document.documentElement.lang = en ? 'en' : 'ko';
    document.title = `${word(names[route.screen])} · STAM · ${en ? 'Preview' : '미리보기'}`;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isStation(route.screen)) return;
      if (event.target instanceof Element && event.target.closest('select, input, textarea, video')) return;
      if (destination.current) { cancel(); return; }
      if (!isOverview) location.hash = spaceHash({ ...route, screen: scene });
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [route, cancel, en, scene, isOverview]);

  useLayoutEffect(() => {
    if (previousScreen.current === route.screen) return;
    previousScreen.current = route.screen;
    if (isOverview && returnTarget.current && configuration.targets.some(target => target.id === returnTarget.current)) {
      document.getElementById(`space-link-${returnTarget.current}`)?.focus({ preventScroll: true });
    } else heading.current?.focus({ preventScroll: true });
  }, [route.screen, isOverview, configuration]);

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
  const enter = (event: MouseEvent, target: SceneTarget) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (destination.current) return;
    returnTarget.current = target.id;
    tone(true);
    if (!motion || !imageReady || imageError || target.id === 'terminal') {
      location.hash = spaceHash({ ...route, screen: target.to }); return;
    }
    destination.current = target.to; setPending(target); setActive(target.id);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (destination.current) location.hash = spaceHash({ ...route, screen: destination.current });
    }, spaceConfig.approachMs);
  };
  const highlight = (id: string) => { setActive(id); tone(); };
  const href = (screen: SpaceScreen) => spaceHash({ ...route, screen });

  // Existing console preview stays reachable by deep links and browser history.
  // It owns no production contract state. Room-sized 3D experiments are retired.
  if (isStation(route.screen)) return <ControlRoom />;

  return <div className={`space-experience space-${scene}`} data-screen={route.screen} data-moving={!!pending}>
    <a className="skip-link" href="#space-navigation" onClick={event => {
      event.preventDefault(); document.querySelector<HTMLAnchorElement>('.space-dock a')?.focus();
    }}>{en ? 'Skip to navigation' : '주요 메뉴로 건너뛰기'}</a>
    <header className="space-topbar">
      <a className="room-brand" href={href('lounge')} aria-label={word(names.lounge)}>
        <img className="brand-emblem" src={logo} alt="" width="54" height="54" />
        <span className="brand-wordmark">STAM<small>FREIGHT CONTROL</small></span>
      </a>
      <nav className="space-switch" aria-label={en ? 'Locations' : '공간 이동'}>
        <a href={href('lounge')} aria-current={scene === 'lounge' ? 'location' : undefined}>{en ? 'Lounge' : '라운지'}</a>
        <span aria-hidden="true">/</span>
        <a href={href('bridge')} aria-current={scene === 'bridge' ? 'location' : undefined}>{word(names.bridge)}</a>
      </nav>
      <span className="space-preview">{en ? 'INTERACTIVE PREVIEW' : '인터랙션 미리보기'}</span>
      <label className="space-language"><span className="sr-only">{en ? 'Display language' : '표시 언어'}</span><select value={route.locale} onChange={event => {
        cancel();
        const next = { ...route, locale: event.target.value as Locale };
        history.replaceState(null, '', spaceHash(next)); setRoute(next);
      }}><option value="ko">한국어</option><option value="mix">한/영</option><option value="en">English</option></select></label>
    </header>

    <main className="space-main">
      {isOverview ? <section className="space-overview" aria-labelledby="space-title">
        <div className="space-artwork" style={{ '--approach-ms': `${spaceConfig.approachMs}ms`, '--zoom': spaceConfig.approachScale, '--focus-x': `${pending?.focus[0] ?? 50}%`, '--focus-y': `${pending?.focus[1] ?? 50}%` } as CSSProperties}>
          <div className="space-camera">
            <img key={scene} className="space-background" src={configuration.image} width="1672" height="941" alt={en ? (scene === 'lounge' ? 'Sunlit STAM lounge with a welcome desk, boarding gate, information room and cinema.' : 'Orbital control centre with a central hologram and an empty console seat on either side.') : (scene === 'lounge' ? '안내데스크, 탑승 게이트, 정보실과 영상관이 있는 햇빛 가득한 STAM 라운지' : '중앙 홀로그램과 좌우 빈 콘솔 좌석이 있는 우주 관제센터')} fetchPriority="high" onLoad={() => setImageReady(true)} onError={() => setImageError(true)} />
            <svg className="space-segments" viewBox="0 0 1672 941" aria-hidden="true">
              {configuration.targets.map(target => <a key={target.id} href={href(target.to)} tabIndex={-1} onClick={event => enter(event, target)} onMouseEnter={() => highlight(target.id)} onMouseLeave={() => setActive(null)}>
                <polygon className={active === target.id ? 'is-lit' : ''} points={target.outline} />
              </a>)}
            </svg>
          </div>
          <div className="space-vignette" />
          <div className="space-intro">
            <p>{scene === 'lounge' ? 'PLANETSIDE / ARRIVALS' : 'ORBITAL / COMMAND'}</p>
            <h1 id="space-title" ref={heading} tabIndex={-1}>{word(names[scene])}</h1>
            <span>{en ? (scene === 'lounge' ? 'Every journey begins here.' : 'Your next route starts here.') : (scene === 'lounge' ? '다음 항해가 시작되는 곳.' : '항로를 펼치고, 다음 운송을 준비하세요.')}</span>
          </div>
          <div className="space-labels" inert={!!pending}>
            {configuration.targets.map((target, index) => <a key={target.id} id={`space-link-${target.id}`} className={`space-target ${active === target.id ? 'is-lit' : ''}`} data-target={target.id}
              aria-label={`${word(target.label)} · ${word(target.detail)}`} href={href(target.to)} style={{ left: `${target.x}%`, top: `${target.y}%` }} onClick={event => enter(event, target)}
              onMouseEnter={() => highlight(target.id)} onMouseLeave={() => setActive(null)} onFocus={() => highlight(target.id)} onBlur={() => setActive(null)}>
              <span className="space-target-pin" aria-hidden="true"><i /></span><span className="space-target-text"><small>0{index + 1}</small><strong>{word(target.label)}</strong><span>{word(target.detail)}</span></span>
            </a>)}
          </div>
          {imageError && <p className="space-image-error" role="alert">{en ? 'The scene could not load. Use the navigation below.' : '전경을 불러오지 못했습니다. 아래 바로가기를 이용해주세요.'}</p>}
        </div>
        <div className="space-scene-note"><span>{scene === 'lounge' ? 'STAM / WELCOME ABOARD' : 'STAM / ORBITAL FREIGHT DIVISION'}</span><p>{en ? 'Select a location, or use the shortcuts below.' : '공간 속 이름을 선택하거나 아래 바로가기를 이용하세요.'}</p></div>
      </section> : <section className={`space-room room-${route.screen}`} aria-labelledby="space-title">
        <div className="space-room-background" style={{ backgroundImage: `url(${configuration.image})` }} aria-hidden="true" />
        <header className="space-room-heading"><div><p>STAM LOUNGE / {route.screen.toUpperCase()}</p><h1 id="space-title" ref={heading} tabIndex={-1}>{word(names[route.screen])}</h1></div><a className="return-link" href={href('lounge')}>↖ {en ? 'Return to lounge' : '라운지로'}</a></header>
        {route.screen === 'guide' && <div className="space-guide">
          <figure className="space-partner"><img src={partner} alt={en ? 'STAM tutorial partner' : 'STAM 튜토리얼 파트너'} /><figcaption><span>STAM / GUIDE</span><strong>{en ? 'Your welcome partner' : '이용안내 파트너'}</strong></figcaption></figure>
          <div className="space-guide-content"><p className="eyebrow">WELCOME ABOARD</p><h2>{en ? 'Welcome to STAM.' : 'STAM에 오신 것을 환영합니다.'}</h2><p>{en ? 'Start at the mission console. Choose a ship, review your contracts, then check your route and cargo.' : '미션 콘솔에서 함선을 고르고 계약을 확인하세요. 항로와 적재를 검토하면 운송을 시작할 수 있어요.'}</p>
            <ol>{(en ? ['Prepare a ship and departure', 'Review received contracts', 'Check the route and cargo'] : ['함선과 출발지 준비', '수신한 운송 계약 확인', '항로와 화물 적재 검토']).map(item => <li key={item}>{item}</li>)}</ol>
            <a className="space-primary" href={href('mission')}>{en ? 'View mission console' : '미션 콘솔 둘러보기'} <span>↗</span></a>
            <a className="space-text-link" href={`${publicSite}guide.html`} target="_blank" rel="noopener noreferrer">{en ? 'Open the full guide ↗' : '기존 이용안내 열기 ↗'}</a>
            <small>{en ? 'The guided tutorial over the working site will follow later.' : '실제 화면 위에서 진행하는 파트너 튜토리얼은 다음 단계에 연결됩니다.'}</small>
          </div>
        </div>}
        {route.screen === 'information' && <div className="space-information">
          <p>{en ? 'Find the current reference material and release history on the existing site.' : '현재 운영 중인 사이트의 안내와 업데이트 기록을 확인하실 수 있습니다.'}</p>
          {[['01', en ? 'Freight reference' : '운송 정보', en ? 'Companies, reputation and contract rules' : '운송 회사·평판·계약 규칙', `${publicSite}guide.html`], ['02', en ? 'Connection guide' : '연결 앱 안내', en ? 'Installation and receiving game logs' : '앱 설치와 게임 로그 수신 방법', `${publicSite}guide.html`], ['03', en ? 'Release history' : '업데이트 기록', en ? 'What changed in STAM' : 'STAM의 버전별 변경 사항', `${publicSite}patch-notes.html`]].map(([number, title, description, link]) => <a key={number} href={link} target="_blank" rel="noopener noreferrer"><small>REFERENCE / {number}</small><h2>{title}</h2><p>{description}</p><span>{en ? 'Open ↗' : '열기 ↗'}</span></a>)}
        </div>}
        {route.screen === 'cinema' && <div className="space-cinema"><div className="space-screen">
          {playing ? <video controls autoPlay playsInline preload="metadata" src={intro} poster={poster} aria-label={en ? 'STAM introduction' : 'STAM 소개영상'} onError={() => setMediaError(true)} /> : <button className="space-play" onClick={() => setPlaying(true)} aria-label={en ? 'Play STAM introduction' : 'STAM 소개영상 재생'}><img src={poster} alt=""/><span><b aria-hidden="true">▷</b>{en ? 'Play introduction' : '소개영상 재생'}</span></button>}
        </div><div className="space-cinema-caption"><span>STAM / FREIGHT CONTROL</span><p>{en ? 'The STAM fleet, beyond the horizon.' : '더 넓은 우주로 향하는 STAM 함대.'}</p></div>{mediaError && <p role="alert">{en ? 'Playback failed. Please reopen the cinema and try again.' : '영상 재생에 실패했습니다. 영상관을 다시 열어 시도해주세요.'}</p>}</div>}
      </section>}
      {pending && <div className="space-transition" role="status"><span>{word(pending.label)} · {en ? 'Approaching' : '접근 중'}</span><button onClick={finish}>{en ? 'Skip transition' : '연출 건너뛰기'}</button><button onClick={cancel}>{en ? 'Cancel' : '취소'}</button></div>}
    </main>

    <footer className="space-footer">
      <nav id="space-navigation" className="space-dock" aria-label={en ? 'Direct access' : '공간 바로가기'}>
        {(scene === 'lounge' ? ['guide', 'bridge', 'information', 'cinema'] as const : ['lounge', 'mission', 'map', 'operations'] as const).map((screen, index) => <a key={screen} href={href(screen)} aria-current={route.screen === screen ? 'page' : undefined}><small>{scene === 'lounge' ? ['01', '02', '04', '05'][index] : ['↖', '01', '02', '03'][index]}</small><span>{word(names[screen])}</span><span aria-hidden="true">↗</span></a>)}
      </nav>
      <details className="space-settings"><summary>{en ? 'Sound & motion' : '소리·연출'}</summary><div>
        <button aria-pressed={sound} onClick={async () => {
          if (sound) { setSound(false); return; }
          try { audio.current ??= new AudioContext(); await audio.current.resume(); setSound(audio.current.state === 'running'); } catch { setSound(false); }
        }}>{en ? `Sound ${sound ? 'on' : 'off'}` : `효과음 ${sound ? '켜짐' : '꺼짐'}`}</button>
        <label>{en ? 'Volume' : '음량'}<input aria-label={en ? 'Effect volume' : '효과음 크기'} type="range" min="0" max="50" value={volume} onChange={event => setVolume(Number(event.target.value))} /></label>
        <button aria-pressed={motion} onClick={() => { setMotion(!motion); cancel(); }}>{en ? `Transitions ${motion ? 'on' : 'off'}` : `이동 연출 ${motion ? '켜짐' : '꺼짐'}`}</button>
      </div></details>
    </footer>
  </div>;
}
