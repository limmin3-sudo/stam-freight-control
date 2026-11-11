import {useEffect, useState} from 'react';
import {InterfaceGlyph} from './InterfaceGlyph';
import {StantonHologram} from './StantonHologram';
import {placeName} from './mission-trial';
import type {Locale} from './navigation';
import type {FlightPlan} from './flight-types';

type Props = {locale: Locale; plan: FlightPlan | null; index: number; position?: string};

export function OperationsMap({locale, plan, index, position}: Props) {
  const en = locale === 'en';
  const [dock, setDock] = useState<HTMLDivElement | null>(null);
  const [motion, setMotion] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setMotion(!media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  const visit = plan?.visits[index];
  const origin = plan?.visits[index - 1]?.locationId ?? plan?.startId;
  const where = (id: string) => placeName(id, en ? 1 : 0);

  return <section className="ops-map" aria-label={en ? 'Flight map' : '운항 지도'}>
    <header className="ops-panel-head"><InterfaceGlyph kind="map"/><h2>{en ? 'Flight map' : '운항 지도'}</h2></header>
    <div className="ops-chart">
      <StantonHologram embedded expanded motion={motion} locale={locale} dockTarget={dock} plan={plan} currentPlace={position}/>
      {visit && <div className="map-route-readout">
        <small>{en ? 'Current leg' : '현재 구간'} · {index + 1} / {plan!.visits.length}</small>
        <p>{origin && origin !== visit.locationId && <>{where(origin)} → </>}{where(visit.locationId)}</p>
        <small>{Math.round(visit.leg.meters / 1000).toLocaleString()} km · {en ? 'Est.' : '예상'} {Math.ceil(visit.seconds / 60)} {en ? 'min' : '분'}</small>
      </div>}
    </div>
    <details className="ops-map-tools"><summary>{en ? 'Map controls' : '지도 조작'}</summary><div className="ops-map-dock" ref={setDock}/></details>
  </section>;
}
