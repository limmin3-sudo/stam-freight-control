import {useState} from 'react';
import {PortSearch} from './PortSearch';
import {placeName} from './mission-trial';
import type {Locale} from './navigation';
import type {useFlight} from './use-flight';

export function FlightRouteEditor({flight,locale}:{flight:ReturnType<typeof useFlight>;locale:Locale}){
  const {plan,run}=flight.session;
  const [stops,setStops]=useState<string[]|null>(null);
  const [extra,setExtra]=useState('');
  const [origin,setOrigin]=useState('');
  const en=locale==='en', name=(id:string)=>placeName(id,locale==='ko'?0:1);
  if(!plan||!run||run.finished)return null;
  const remaining=plan.visits.slice(run.index).filter(v=>!v.events.some(e=>e.type==='departure')).map(v=>v.locationId);
  function move(index:number,by:number){
    if(!stops)return;
    const next=[...stops];next.splice(index+by,0,...next.splice(index,1));setStops(next);
  }
  return <details className="flight-route-editor" onToggle={e=>setStops(e.currentTarget.open?remaining:null)}>
    <summary>{en?'Edit stop order':'방문 순서 수정'}</summary>
    {stops&&<fieldset disabled={flight.busy}>
      <ol>{stops.map((id,i)=><li key={i}><span>{name(id)}</span>
        <button aria-label={name(id)+' ↑'} disabled={!i} onClick={()=>move(i,-1)}>↑</button>
        <button aria-label={name(id)+' ↓'} disabled={i===stops.length-1} onClick={()=>move(i,1)}>↓</button>
        <button onClick={()=>setStops(stops.filter((_,j)=>j!==i))}>{en?'Remove':'빼기'}</button></li>)}</ol>
      <PortSearch locale={locale} label={en?'Additional stop':'추가할 거점'} value={extra} onSelect={setExtra}/>  <button disabled={!extra} onClick={()=>setStops([...stops,extra])}>{en?'Add stop':'거점 추가'}</button>
      <button disabled={!stops.length} onClick={()=>flight.calculate(undefined,flight.active,undefined,stops)}>{en?'Apply and recalculate':'적용하고 재계산'}</button>
      {flight.active&&<div className="flight-location-correction">
        <PortSearch locale={locale} label={en?'Actual ship location':'실제 함선 위치'} value={origin||run.positionId} onSelect={setOrigin}/>
        <button disabled={!origin||origin===run.positionId} onClick={()=>flight.calculate(()=>setOrigin(''),true,undefined,undefined,origin)}>
          {en?'Replan from this location':'선택한 위치에서 재계산'}
        </button>
      </div>}
    </fieldset>}
  </details>;
}
