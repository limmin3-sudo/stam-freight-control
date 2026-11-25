import { lazy, Suspense, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { parseRoute } from './navigation';
import { isOpeningReplay } from './opening-policy';
import './tablet-workspace.css';

const SpaceExperience = lazy(() => import('./SpaceExperience').then(module => ({ default: module.SpaceExperience })));
const minimumWidth = window.matchMedia('(min-width: 600px)');

function supportsWorkspace() {
  return minimumWidth.matches && Math.min(screen.width, screen.height) >= 600;
}

function subscribe(onChange: () => void) {
  minimumWidth.addEventListener('change', onChange);
  window.addEventListener('resize', onChange);
  window.addEventListener('hashchange', onChange);
  return () => {
    minimumWidth.removeEventListener('change', onChange);
    window.removeEventListener('resize', onChange);
    window.removeEventListener('hashchange', onChange);
  };
}

function ScreenNotice() {
  const dialog = useRef<HTMLDialogElement>(null);
  const english = useSyncExternalStore(subscribe, () => parseRoute(location.hash).locale === 'en');
  useLayoutEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  return <dialog ref={dialog} className="screen-notice" lang={english ? 'en' : 'ko'}
    aria-labelledby="screen-notice-title" onCancel={event => event.preventDefault()}>
    <h1 id="screen-notice-title">{english ? 'Open STAM on a tablet or computer' : '태블릿이나 PC에서 열어 주세요'}</h1>
    <p>{english ? 'The freight division workspace requires a screen at least 600 CSS pixels wide.' : 'STAM 운송사업부는 화면 폭 600px 이상의 태블릿과 PC에서 이용할 수 있습니다.'}</p>
  </dialog>;
}

export function TabletWorkspace() {
  const supported = useSyncExternalStore(subscribe, supportsWorkspace);
  const replayingOpening = useSyncExternalStore(subscribe, () => isOpeningReplay(location.hash));
  const [started, setStarted] = useState(supported);
  // Keep an open workspace and any unsaved form when a tablet enters split view.
  useLayoutEffect(() => { if (supported) setStarted(true); }, [supported]);
  return <>
    {started && <Suspense fallback={null}><SpaceExperience /></Suspense>}
    {!supported && !replayingOpening && <ScreenNotice />}
  </>;
}
