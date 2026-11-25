import {useEffect, useRef, useState, type ReactNode} from 'react';
import logo from '../../../assets/stam-logo-64.png';
import terminal from './assets/first-departure/terminal-exterior.webp';
import celebration from './assets/first-departure/lounge-celebration.webp';
import flagship from './assets/first-departure/flagship-clouds.webp';
import divisionPanorama from './assets/first-departure/division-panorama.webp';
import lounge from './assets/guided-visit/lounge.webp';
import bridge from './assets/guided-visit/bridge.webp';
import trade from './assets/guided-visit/trade.webp';
import academy from './assets/guided-visit/academy.webp';
import {divisionFacilities, type Facility} from './division-facilities';
import {FilmScreen} from './FilmScreen';
import {firstDeparture, fleetIntroduction} from './film-screenings';
import type {Locale} from './navigation';
import {OpeningCrew} from './OpeningCrew';
import {useOpeningMotion} from './opening-motion';
import {isOpeningReplay, openingEligible, openingHiddenKey, openingSeenKey} from './opening-policy';
import {parseSpaceRoute, spaceHash} from './space-navigation';
import './opening-film.css';
import './opening-looks.css';

type StorageKind = 'sessionStorage' | 'localStorage';
type OpeningMode = 'welcome' | 'replay' | null;

function readPreference(kind: StorageKind, key: string) {
  try { return window[kind].getItem(key); }
  catch { return null; }
}

function savePreference(kind: StorageKind, key: string, enabled: boolean) {
  try {
    if (enabled) window[kind].setItem(key, '1');
    else window[kind].removeItem(key);
  } catch { /* A blocked storage area must not prevent entry. */ }
}

const facilityArt = new Map([
  ['lounge', lounge], ['bridge', bridge], ['trade', trade], ['guide-center', academy],
]);
const featuredFacilities = divisionFacilities.filter(facility => facilityArt.has(facility.id));
const sections = [
  ['division-intro', '사업부 소개', 'Introduction'],
  ['departure-premiere', '첫 출항', 'First Departure'],
  ['departure-crew', '파트너', 'Partners'],
  ['departure-directory', '시설', 'Facilities'],
] as const;

function facilityHref(facility: Facility, locale: Locale) {
  if (facility.id === 'trade' || facility.id === 'guide-center') {
    return spaceHash({screen: 'division', facility: facility.id, locale});
  }
  return spaceHash({screen: facility.destination ?? 'division', locale});
}

function scrollToSection(id: string) {
  const section = document.getElementById(id);
  section?.focus({preventScroll: true});
  section?.scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });
}

export function OpeningFilm({children}: {children: ReactNode}) {
  const [hidden, setHidden] = useState(() => readPreference('localStorage', openingHiddenKey) === '1');
  const [mode, setMode] = useState<OpeningMode>(() => {
    if (isOpeningReplay(location.hash)) return 'replay';
    return openingEligible(location.hash, readPreference('sessionStorage', openingSeenKey), hidden ? '1' : null)
      ? 'welcome' : null;
  });
  const [workspaceStarted, setWorkspaceStarted] = useState(mode === null);
  const [playingFilm, setPlayingFilm] = useState<string>();
  const root = useRef<HTMLElement>(null);
  const visible = mode !== null;
  const {locale} = parseSpaceRoute(location.hash || ('#' + location.search));
  const english = locale === 'en';
  const lang = english ? 1 : 0;

  useOpeningMotion(root, visible);

  useEffect(() => {
    const followRoute = () => {
      const hash = location.hash;
      if (isOpeningReplay(hash)) {
        setHidden(readPreference('localStorage', openingHiddenKey) === '1');
        setMode('replay');
        window.scrollTo({top: 0, behavior: 'instant'});
      } else if (mode === 'replay' || (mode === 'welcome' && !openingEligible(hash, null))) {
        setMode(null);
        setWorkspaceStarted(true);
        setPlayingFilm(undefined);
        window.scrollTo({top: 0, behavior: 'instant'});
      }
    };
    window.addEventListener('hashchange', followRoute);
    return () => window.removeEventListener('hashchange', followRoute);
  }, [mode]);

  useEffect(() => {
    if (mode === 'replay') root.current?.querySelector('h1')?.focus({preventScroll: true});
  }, [mode]);

  function enter() {
    savePreference('sessionStorage', openingSeenKey, true);
    const destination = spaceHash({screen: 'division', locale});
    if (mode === 'replay') {
      location.replace(destination);
      return;
    }
    history.replaceState(history.state, '', destination);
    window.scrollTo({top: 0, behavior: 'instant'});
    setMode(null);
    setWorkspaceStarted(true);
    setPlayingFilm(undefined);
  }

  const opening = visible && <main className="opening-film" data-look="mixed" ref={root} lang={english ? 'en' : 'ko'} aria-labelledby="departure-title">
    <header className="departure-bar">
      <div className="departure-bar-inner">
        <div className="departure-brand">
          <img src={logo} alt="" width="42" height="42" />
          <span>STAM <small>FREIGHT DIVISION</small></span>
        </div>
        <nav className="departure-chapters" aria-label={english ? 'Introduction chapters' : '첫 화면 메뉴'}>
          {sections.map(([id, ko, en]) => <button key={id} type="button" onClick={() => scrollToSection(id)}>
            {english ? en : ko}
          </button>)}
        </nav>
        <button type="button" className="departure-enter" onClick={enter}>
          {english ? 'Enter Freight Division' : '사업부 전경으로'} <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>

    <section className="departure-hero" aria-labelledby="departure-title">
      <img className="departure-hero-panorama" src={divisionPanorama} alt="" width="1672" height="941" fetchPriority="high" />
      <div className="departure-hero-body">
        <div className="departure-hero-copy">
          <h1 id="departure-title" tabIndex={-1}>STAM <span>{english ? 'Freight Division' : '운송사업부'}</span></h1>
          <p>{english
            ? 'Plan freight routes and cargo loads, compare trade prices, and train for your first haul.'
            : '계약을 정리하고 항로와 화물 적재를 계획하세요. 무역 시세부터 첫 운송 실습까지 한곳에서 시작할 수 있습니다.'}</p>
          <div className="departure-hero-actions">
            <button className="departure-watch" type="button" onClick={() => scrollToSection('division-intro-player')}>
              <span aria-hidden="true">▶</span> {english ? 'Watch the introduction' : '사업부 소개영상 보기'}
            </button>
            <label className="departure-preference">
              <input type="checkbox" checked={hidden} onChange={event => {
                setHidden(event.currentTarget.checked);
                savePreference('localStorage', openingHiddenKey, event.currentTarget.checked);
              }} />
              {english ? 'Don’t show this again' : '다시 보지 않기'}
            </label>
            {mode === 'replay' && <a className="departure-service-return" href={spaceHash({screen: 'service', locale})}>
              {english ? 'Return to service centre' : '서비스센터로 돌아가기'}
            </a>}
          </div>
        </div>
      </div>
      <button type="button" className="departure-scroll-cue" onClick={() => scrollToSection('division-intro')}>
        {english ? 'Scroll down' : '아래로 스크롤'}
        <span aria-hidden="true">↓</span>
      </button>
    </section>

    <section className="departure-feature" id="division-intro" aria-labelledby="division-intro-title" tabIndex={-1}>
      <div className="departure-flagship" data-departure-reveal>
        <img src={flagship} width="1672" height="941" loading="lazy"
          alt={english ? 'The ultra-heavy freighter cruising above a sea of clouds' : '구름바다를 항해하는 운송사업부 초대형함'} />
        <h2 id="division-intro-title">{fleetIntroduction.title[lang]}</h2>
      </div>
      <div className="departure-screening departure-theater" id="division-intro-player" tabIndex={-1}
        data-departure-reveal data-active={playingFilm === fleetIntroduction.video}>
        <div className="departure-intro-player">
          <FilmScreen screening={fleetIntroduction} english={english} active={playingFilm === fleetIntroduction.video}
            onPlay={() => setPlayingFilm(fleetIntroduction.video)} />
          <div className="departure-meta">
            <span>{fleetIntroduction.length[lang]} · {english ? 'Up to 4K UHD' : '최대 4K UHD'}</span>
            <a href={spaceHash({screen: 'cinema', locale})}>{english ? 'Watch in the cinema' : '시네마에서 보기'} <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </div>
      <figure className="departure-celebration" data-departure-reveal>
        <img src={celebration} alt="" width="1672" height="941" loading="lazy" />
        <figcaption>{english ? 'First Departure celebration' : '첫 출항 기념 파티'}</figcaption>
      </figure>
    </section>

    <section className="departure-premiere" id="departure-premiere" aria-labelledby="departure-premiere-title" tabIndex={-1}>
      <img className="departure-terminal" src={terminal} alt="" width="1672" height="941" loading="lazy" />
      <div className="departure-screening" data-departure-reveal>
        <h2 id="departure-premiere-title" className="departure-reveal-heading">{firstDeparture.title[lang]}</h2>
        <div className="departure-reveal-player">
          <FilmScreen screening={firstDeparture} english={english} active={playingFilm === firstDeparture.video}
            onPlay={() => setPlayingFilm(firstDeparture.video)} />
          <div className="departure-meta">
            <span>{firstDeparture.length[lang]} <span aria-hidden="true">·</span> 720p</span>
            <span>{english ? 'Plays with sound' : '소리와 함께 재생'}</span>
          </div>
        </div>
      </div>
    </section>

    <OpeningCrew locale={locale} />

    <section className="departure-directory" id="departure-directory" aria-labelledby="departure-directory-title" tabIndex={-1}>
      <div className="departure-directory-inner">
        <div className="departure-directory-board" data-departure-reveal>
          <img src={divisionPanorama} alt="" width="1672" height="941" loading="lazy" />
          <div className="departure-map-pins" aria-hidden="true">
            {featuredFacilities.map(facility => <i key={facility.id} style={{
              left: `${facility.marker[0]}%`,
              top: `${facility.marker[1]}%`,
            }} />)}
          </div>
          <h2 id="departure-directory-title">{english ? 'Explore Freight Division' : '운송사업부 둘러보기'}</h2>
        </div>
        <nav className="departure-facilities" aria-label={english ? 'Facilities' : '사업부 시설'} data-departure-reveal>
          {featuredFacilities.map(facility => <a href={facilityHref(facility, locale)} key={facility.id}>
            <img src={facilityArt.get(facility.id)} alt="" width="320" height="180" loading="lazy" />
            <span className="departure-facility-label">
              <strong>{facility.name[lang]}</strong>
              <span>{facility.summary?.[lang]}</span>
              <span className="departure-facility-arrow" aria-hidden="true">↗</span>
            </span>
          </a>)}
        </nav>
        <button type="button" className="departure-enter departure-directory-enter" onClick={enter}>
          {english ? 'Enter Freight Division' : '사업부 전경으로'} <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  </main>;

  return <>
    {workspaceStarted && <div className="opening-workspace" hidden={visible}>{children}</div>}
    {opening}
  </>;
}
