import { useEffect, useRef, useState } from 'react';
import { createBridgeScene } from './bridge-scene';
import type { StudyState } from './bridge-scene';
import type { Locale, Station } from './navigation';
import { stations } from './navigation';
import { copyFor } from './copy';
import { StudyMonitor } from './StudyMonitor';

export default function CameraStudy({ locale, onClose, onEnter }: { locale: Locale; onClose: () => void; onEnter: (station: Station) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), viewport = useRef<HTMLDivElement>(null);
  const api = useRef<ReturnType<typeof createBridgeScene> | null>(null);
  const [state, setState] = useState<StudyState>({ mode: 'overview', station: null });
  const [error, setError] = useState(false);
  const [artReady, setArtReady] = useState(false);
  const copy = copyFor(locale), en = locale === 'en';
  useEffect(() => {
    dialog.current?.showModal();
    let mounted = true;
    try { api.current = createBridgeScene(viewport.current!, setState, ready => { if (mounted) { setArtReady(ready); if (!ready) setError(true); } }); } catch { setError(true); }
    return () => { mounted = false; api.current?.dispose(); api.current = null; };
  }, []);
  return <dialog className="camera-study" ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }} aria-labelledby="camera-study-title">
    <header><div><p className="eyebrow">STAM / SPATIAL STUDY</p><h2 id="camera-study-title">{en ? 'Explore the bridge' : '관제실 둘러보기'}</h2></div><button type="button" onClick={onClose}>{en ? 'Close' : '닫기'}</button></header>
    <p className="study-disclaimer">{en ? 'Navigation test model only. This visual design was not approved. Crew and console data are placeholders.' : '동선 검증용 모형입니다. 이 시각 디자인은 승인되지 않았으며, 인물과 콘솔 데이터는 예시입니다.'}</p>
    <div className="study-display">
      {!artReady && <div className="study-loading" role="status">{error ? (en ? 'The 3D assets could not be loaded. Close and retry.' : '3D 자료를 불러오지 못했습니다. 닫은 후 다시 열어 주세요.') : (en ? 'Preparing the bridge…' : '관제실을 준비하고 있습니다…')}</div>}
      <div className="study-viewport" ref={viewport} data-mode={state.mode} data-station={state.station ?? ''} inert={state.mode === 'seated'} aria-hidden={state.mode === 'seated'} aria-label={en ? 'Interactive 3D control room' : '상호작용 가능한 3D 관제실'} />
      {state.mode === 'seated' && state.station && <StudyMonitor station={state.station} locale={locale} />}
    </div>
    <div className="study-controls">
      <button type="button" onClick={() => api.current?.explore()} aria-pressed={state.mode === 'explore'} disabled={error || !artReady}>{en ? 'Free exploration' : '자유 둘러보기'}</button>
      <button type="button" onClick={() => api.current?.home()} disabled={error || !artReady}>{en ? 'Overview' : '전체 보기'}</button>
      {stations.map(station => <button key={station} type="button" data-study-station={station} onClick={() => api.current?.command(station)} disabled={error || !artReady} aria-pressed={state.station === station}>{copy[station]}</button>)}
      {state.mode === 'seated' && state.station && <button className="study-enter" type="button" onClick={() => onEnter(state.station!)}>{en ? 'Open this monitor' : '이 모니터로 작업하기'} →</button>}
    </div>
    <div className="study-foot"><p role="status">{error ? (en ? 'WebGL could not start. Close this view to continue using the preview.' : '3D 화면을 시작하지 못했습니다. 닫고 기본 미리보기를 계속 사용할 수 있습니다.') : state.failed ? (en ? 'No clear path found. Move away from the obstacle and try again.' : '이동 가능한 경로가 없습니다. 장애물에서 조금 이동한 뒤 다시 선택해 주세요.') : state.mode === 'explore' ? (en ? 'Drag to look · WASD / arrow keys to move · Select a console to approach it' : '드래그로 시선 이동 · WASD / 방향키로 이동 · 콘솔을 누르면 좌석으로 접근') : state.mode === 'travel' ? (en ? 'Moving to the console. You can select another destination or switch to exploration.' : '콘솔로 이동 중입니다. 다른 목적지를 선택하거나 자유 이동으로 전환할 수 있습니다.') : (en ? 'Choose a console or start exploring. The map route circles the central table.' : '콘솔을 선택하거나 자유롭게 둘러보세요. 지도 콘솔은 중앙 테이블을 돌아 접근합니다.')}</p>
      {state.mode === 'explore' && <div className="study-walk" role="group" aria-label={en ? 'Movement controls' : '이동 조작'}>{[['KeyW', '↑'], ['KeyA', '←'], ['KeyS', '↓'], ['KeyD', '→']].map(([code, symbol]) => <button key={code} type="button" aria-label={en ? ({ KeyW: 'Forward', KeyA: 'Left', KeyS: 'Back', KeyD: 'Right' }[code!] ?? '') : ({ KeyW: '앞으로', KeyA: '왼쪽', KeyS: '뒤로', KeyD: '오른쪽' }[code!] ?? '')} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); api.current?.key(code!, true); }} onPointerUp={() => api.current?.key(code!, false)} onPointerCancel={() => api.current?.key(code!, false)} onLostPointerCapture={() => api.current?.key(code!, false)}>{symbol}</button>)}</div>}
    </div>
  </dialog>;
}
