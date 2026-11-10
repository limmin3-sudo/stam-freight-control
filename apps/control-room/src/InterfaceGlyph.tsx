import type { Screen } from './navigation';
import { visualConfig } from './visual-config';

// Current reference uses line icons. Image artwork remains available as an explicit option.
export function InterfaceGlyph({ kind }: { kind: Screen }) {
  if (visualConfig.icons.style === 'image') return <img className="interface-glyph" data-icon={kind} src={visualConfig.icons.images[kind]} width="64" height="64" alt="" aria-hidden="true" draggable={false} decoding="async" />;
  return <svg className="interface-glyph" data-icon={kind} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'bridge' && <><path d="M20 4 34 12v16l-14 8L6 28V12Z" opacity=".5"/><path d="m12 23 8-10 8 10H12Zm8-10v15M10 28h20"/><circle cx="20" cy="8" r="1" fill="currentColor"/></>}
    {kind === 'mission' && <><path d="M10 5h15l6 6v24H10Z" opacity=".6"/><path d="M25 5v7h6M15 18h11M15 23h7M15 28h4"/><path d="M5 12v16m-2-8h4"/><circle cx="28" cy="28" r="4"/><path d="m26 28 1.4 1.4L30 26"/></>}
    {kind === 'map' && <><circle cx="20" cy="20" r="6"/><ellipse cx="20" cy="20" rx="17" ry="8" transform="rotate(-28 20 20)"/><ellipse cx="20" cy="20" rx="17" ry="8" transform="rotate(45 20 20)" opacity=".4"/><circle cx="32" cy="10" r="2.4" fill="currentColor" stroke="none"/><path d="M20 2v4m0 28v4M2 20h4m28 0h4" opacity=".65"/></>}
    {kind === 'operations' && <><path d="m20 4 14 8v16l-14 8-14-8V12Z" opacity=".5"/><path d="m12 16 8-5 8 5v10l-8 5-8-5V16Zm0 0 8 5 8-5m-8 5v10"/><path d="M3 7V3h5m24 0h5v4M3 33v4h5m24 0h5v-4"/></>}
  </svg>;
}

export function HudFrame() {
  return <svg className="hud-frame" viewBox="0 0 260 76" preserveAspectRatio="none" aria-hidden="true" fill="none">
    <path className="frame-fill" d="M12 1H259V62L246 75H1V12Z"/>
    <path className="frame-edge" d="M12 1H259V62L246 75H1V12Z"/>
    <path className="frame-lit" d="M1 28V12L12 1h38m160 74h36l13-13V48"/>
    <path className="frame-detail" d="M17 7h27m-27 4h15m195 56h12"/>
  </svg>;
}
