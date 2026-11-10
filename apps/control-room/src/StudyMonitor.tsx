import { copyFor } from './copy';
import type { Locale, Station } from './navigation';
import { GlassNavigation } from './GlassNavigation';
import stamLogo from '../../../assets/stam-logo-transparent.png';

// Responsive work surface after the 3D camera docks. Real work modules will use this slot.
export function StudyMonitor({ station, locale }: { station: Station; locale: Locale }) {
  const copy = copyFor(locale);
  return <section className="study-monitor" aria-label={copy[station]} data-monitor={station}>
    <div className="study-monitor-screen">
      <header>{station === 'map' && <img className="study-monitor-brand" src={stamLogo} alt="STAM" />}<div><span>STAM / {station === 'map' ? 'NAVIGATION' : station.toUpperCase()}</span><h3>{copy[station]}</h3></div></header>
      {station === 'map' ? <GlassNavigation locale={locale} /> : <div className="monitor-preview-areas">{copy.areas[station].map(([title, description]) => <article key={title}><h4>{title}</h4><p>{description}</p></article>)}</div>}
      <p className="monitor-preview-note">{copy.status}</p>
    </div>
  </section>;
}
