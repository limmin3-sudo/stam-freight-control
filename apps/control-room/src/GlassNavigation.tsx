import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Locale } from './navigation';
import { InterfaceGlyph } from './InterfaceGlyph';
import { previewDestinations as destinations, visualConfig } from './visual-config';
import './glass-navigation.css';

const routeStyle = visualConfig.map.route;

// Isolated design interaction: no real contracts, route engine or saved preferences.
export function GlassNavigation({ locale, calls }: { locale: Locale; calls?:string[] }) {
  const mapped=calls?.map(id=>destinations.find(p=>p.id===id));
  const [selected, setSelected] = useState<string>(mapped?.[0]?.id ?? 'microtech');
  const [showRoute, setShowRoute] = useState(false);
  const en = locale === 'en', koreanNames = locale === 'ko';
  const target = destinations.find(item => item.id === selected)!;
  const origin = selected === 'microtech' ? destinations[2] : destinations[3];
  const name = (item: typeof destinations[number]) => koreanNames ? item.ko : item.en;
  const filterId = `route-light-${useId().replace(/:/g, '')}`;
  return <div className="glass-navigation" data-design="glass-a">
    <div className="glass-chart">
      <div className="glass-chart-heading"><InterfaceGlyph kind="map" /><div><span>{koreanNames ? '스탠턴' : 'STANTON'}</span><small>{en ? 'SYSTEM OVERVIEW' : '항성계 전체 보기'}</small></div><span className="glass-live-mark">{en ? 'DESIGN PREVIEW' : '디자인 시안'}</span></div>
      <div className="glass-chart-space"><div className="glass-chart-stage">
        <img src={visualConfig.map.artwork} alt="" draggable={false} />
        <svg className="glass-route-layer" viewBox="0 0 1600 1000" aria-hidden="true">
          <defs><filter id={filterId} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation={routeStyle.glowBlur} /></filter></defs>
          {mapped?.every(p=>p!==undefined) && <polyline points={mapped.map(p=>`${p.x*16},${p.y*10}`).join(' ')} fill="none" stroke={routeStyle.color} strokeWidth={3} vectorEffect="non-scaling-stroke"/>}
          {!calls && showRoute && <g className="glass-route-preview">
            <path d={`M ${origin.x * 16} ${origin.y * 10} L ${target.x * 16} ${target.y * 10}`} stroke={routeStyle.glowColor} strokeWidth={routeStyle.glowWidth} opacity={routeStyle.glowOpacity} filter={`url(#${filterId})`} vectorEffect="non-scaling-stroke" />
            <path d={`M ${origin.x * 16} ${origin.y * 10} L ${target.x * 16} ${target.y * 10}`} stroke={routeStyle.color} strokeWidth={routeStyle.width} vectorEffect="non-scaling-stroke" />
            <circle cx={origin.x * 16} cy={origin.y * 10} r={routeStyle.originRadius} fill={routeStyle.originColor} />
            <circle cx={origin.x * 16} cy={origin.y * 10} r={routeStyle.targetRadius} fill="none" stroke={routeStyle.glowColor} strokeWidth={routeStyle.targetWidth} />
            <g transform={`translate(${(origin.x + target.x) * 8} ${(origin.y + target.y) * 5}) rotate(${Math.atan2((target.y - origin.y) * 10, (target.x - origin.x) * 16) * 180 / Math.PI})`}>
              <path d="M -8 -10 L 3 0 L -8 10 M 4 -10 L 15 0 L 4 10" stroke="#fff4dc" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>}
          <circle className="glass-selected-ring" cx={target.x * 16} cy={target.y * 10} r={routeStyle.targetRadius} fill={routeStyle.targetFill} stroke={routeStyle.targetColor} strokeWidth={routeStyle.targetWidth} />
          <circle cx={target.x * 16} cy={target.y * 10} r={routeStyle.targetDotRadius} fill={routeStyle.targetColor} />
        </svg>
        {destinations.map(item => <button key={item.id} type="button" className="glass-planet-label" data-planet={item.id} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)} style={{ left: `${item.labelX}%`, top: `${item.labelY}%` }}><i />{name(item)}</button>)}
      </div></div>
      <div className="glass-chart-footer"><span><i />{name(target)}</span><small>{en ? 'Illustrative layout · not a calculated route' : '예시 배치 · 실제 계산 경로 아님'}</small></div>
    </div>
    <aside className="glass-destinations" aria-label={en ? 'Destinations' : '목적지'}>
      <header><span className="glass-section-code">NAV / 01</span><h3>{en ? 'Destinations' : '목적지 선택'}</h3><p>{en ? 'Select a planet on the map or below.' : '지도 또는 목록에서 행성을 선택하세요.'}</p></header>
      <div className="glass-destination-list">{destinations.map((item, index) => <button type="button" key={item.id} data-destination={item.id} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
        <span className="glass-body-icon" style={{ '--body-color': item.color } as CSSProperties} aria-hidden="true" /><span><small>0{index + 1}</small><b>{name(item)}</b></span><span className="glass-chevron" aria-hidden="true">›</span>
      </button>)}</div>
      <div className="glass-selected-destination" role="status"><span>{en ? 'SELECTED' : '선택한 목적지'}</span><strong>{name(target)}</strong></div>
      {!calls && <button type="button" className="glass-primary" data-action="preview-route" aria-pressed={showRoute} onClick={() => setShowRoute(value => !value)}><InterfaceGlyph kind="map" /><span>{en ? (showRoute ? 'Hide sample route' : 'Show sample route') : (showRoute ? '예시 항로 숨기기' : '예시 항로 보기')}</span><span aria-hidden="true">↗</span></button>}
    </aside>
  </div>;
}
