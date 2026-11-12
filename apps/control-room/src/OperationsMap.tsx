import {useEffect,useState} from 'react';
import {InterfaceGlyph} from './InterfaceGlyph';
import {NavigationChart} from './NavigationChart';
import type {ChartCommand} from './NavigationChart';
import {PortSearch} from './PortSearch';
import {placeName} from './mission-trial';
import type {Locale} from './navigation';
import type {FlightPlan} from './flight-types';
import './map-console.css';
type Props={locale:Locale;plan:FlightPlan|null;index:number;position?:string};
export function OperationsMap({locale,plan,index,position}:Props){
 const [command,setCommand]=useState<ChartCommand>();
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko;
 const send=(next:Omit<ChartCommand,'serial'>)=>setCommand({...next,serial:performance.now()});
 useEffect(()=>{if(position)send({kind:'focus',id:position});},[position]);
 const visit=plan?.visits[index],origin=plan?.visits[index-1]?.locationId??plan?.startId;
 const where=(id:string)=>placeName(id,locale==='ko'?0:1);
 return <section className="ops-map" aria-label={t('운항 지도','Flight map')}>
  <header className="ops-panel-head"><InterfaceGlyph kind="map"/><h2>{t('운항 지도','Flight map')}</h2></header>
  <div className="ops-chart">
   <NavigationChart locale={locale} plan={plan} index={index} command={command}/>
   {visit&&<div className="map-route-readout"><small>{t('현재 구간','Current leg')} · {index+1} / {plan!.visits.length}</small><p>{origin&&origin!==visit.locationId&&<>{where(origin)} → </>}{where(visit.locationId)}</p><small>{Math.round(visit.leg.meters/1000).toLocaleString()} km</small></div>}
  </div>
  <details className="ops-map-tools"><summary>{t('지도 조작','Map controls')}</summary><div className="ops-map-dock"><div className="chart-systems"><button onClick={()=>send({kind:'home'})}>{t('전체 보기','Reset view')}</button><button onClick={()=>send({kind:'top'})}>{t('위에서 보기','Top view')}</button><button onClick={()=>send({kind:'zoom',value:1.3})}>＋</button><button onClick={()=>send({kind:'zoom',value:1/1.3})}>−</button></div><PortSearch label={t('거점 검색','Search locations')} locale={locale} onSelect={id=>send({kind:'focus',id})}/></div></details>
 </section>;
}
