import {useEffect, useState, type ReactNode} from 'react';
import logo from '../../../assets/stam-logo-64.png';
import guide from './assets/first-departure/guide.webp';
import operator from './assets/first-departure/operator.webp';
import {FilmScreen} from './FilmScreen';
import {firstDeparture} from './film-screenings';
import {openingEligible, openingHiddenKey, openingSeenKey} from './opening-policy';
import {parseSpaceRoute, spaceHash} from './space-navigation';
import './opening-film.css';

type StorageKind = 'sessionStorage' | 'localStorage';

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

const welcomes = [
  {image: guide, name: ['플라이트 가이드', 'Flight Guide'],
    message: ['어서 오세요, 함장님. 첫 출항을 함께 축하해요.', 'Welcome, Captain. Join us for our first departure.']},
  {image: operator, name: ['브리지 오퍼레이터', 'Bridge Operator'],
    message: ['함장님, 창가에 자리 맡아뒀어요!', 'Captain, I saved you a seat by the window!']},
];

export function OpeningFilm({children}: {children: ReactNode}) {
  const [visible, setVisible] = useState(() => openingEligible(
    location.hash, readPreference('sessionStorage', openingSeenKey), readPreference('localStorage', openingHiddenKey),
  ));
  const [hidden, setHidden] = useState(false);
  const {locale} = parseSpaceRoute(location.hash || ('#' + location.search));
  const english = locale === 'en';
  const lang = english ? 1 : 0;

  useEffect(() => {
    if (!visible) return;
    const followDirectLink = () => {
      if (!openingEligible(location.hash, null)) setVisible(false);
    };
    window.addEventListener('hashchange', followDirectLink);
    return () => window.removeEventListener('hashchange', followDirectLink);
  }, [visible]);

  function enter() {
    savePreference('sessionStorage', openingSeenKey, true);
    history.replaceState(history.state, '', spaceHash({screen: 'division', locale}));
    setVisible(false);
  }

  if (!visible) return <>{children}</>;

  return <main className="opening-film" lang={english ? 'en' : 'ko'} aria-labelledby="departure-title">
    <div className="departure-inner">
      <header className="departure-heading">
        <div className="departure-brand">
          <img src={logo} alt="" width="46" height="46" />
          <span>STAM <small>FREIGHT DIVISION</small></span>
        </div>
        <h1 id="departure-title">{firstDeparture.title[lang]}</h1>
      </header>
      <div className="departure-layout">
        <section className="departure-screening" aria-label={firstDeparture.title[lang]}>
          <FilmScreen screening={firstDeparture} english={english} />
          <div className="departure-meta">
            <span>{firstDeparture.length[lang]} <span aria-hidden="true">·</span> 720p</span>
            <span>{english ? 'Plays with sound' : '소리와 함께 재생'}</span>
          </div>
          <div className="departure-actions">
            <button type="button" className="departure-enter" onClick={enter}>
              {english ? 'Enter Freight Division' : '사업부 전경으로'} <span aria-hidden="true">→</span>
            </button>
            <label className="departure-preference">
              <input type="checkbox" checked={hidden} onChange={event => {
                setHidden(event.currentTarget.checked);
                savePreference('localStorage', openingHiddenKey, event.currentTarget.checked);
              }} />
              {english ? 'Don’t show this again' : '다시 보지 않기'}
            </label>
          </div>
        </section>
        <aside className="departure-welcomes" aria-label={english ? 'Crew welcome' : '파트너 환영 인사'}>
          {welcomes.map(partner => <figure className="departure-partner" key={partner.image}>
            <img src={partner.image} alt="" width="96" height="132" />
            <figcaption>
              <strong>{partner.name[lang]}</strong>
              <p>{partner.message[lang]}</p>
            </figcaption>
          </figure>)}
          <p className="departure-cinema-note">{english ? 'Also showing in the Lounge Cinema.' : '라운지 시네마에서 다시 감상할 수 있어요.'}</p>
        </aside>
      </div>
    </div>
  </main>;
}
