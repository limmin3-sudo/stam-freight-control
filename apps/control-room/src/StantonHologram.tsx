import {PortSearch} from './PortSearch';
import {createPortal} from 'react-dom';
import {useEffect,useRef,useState} from 'react';
import type {FlightPlan, Visit} from './flight-types';
import {placeName} from './mission-trial';
import type {Locale} from './navigation';
import type {HologramPoint} from './hologram-layout';
import {systemPoints,systemThemes,markerKind,isBody,type SystemId} from './hologram-catalogue';
import type {createHologram} from './hologram-scene';
import korean from '../../../data/stam-korean.json';
import './stanton-hologram.css';

type Props={embedded?:boolean;expanded:boolean;motion:boolean;locale:Locale;dockTarget:HTMLElement|null;plan?:FlightPlan|null;currentPlace?:string};
const translated:Record<string,string>=korean.places;
const localNames:Record<string,string>={Stanton:'스탠턴',Pyro:'파이로',Nyx:'닉스',Hurston:'허스턴',Crusader:'크루세이더',ArcCorp:'아크코프',microTech:'마이크로텍'};
function visitAction(visit:Visit,en:boolean){
 const kinds=new Set(visit.events.map(event=>event.type));
 if(kinds.has('pickup') && kinds.has('delivery'))return en?'Pickup and delivery':'픽업·배송';
 if(kinds.has('pickup'))return en?'Pickup':'픽업';
 if(kinds.has('delivery'))return en?'Delivery':'배송';
 if(kinds.has('departure'))return en?'Departure':'출발';
 return en?'Waypoint':'경유';
}
export function StantonHologram({embedded=false,expanded,motion,locale,dockTarget,plan,currentPlace}:Props){
 const host=useRef<HTMLDivElement>(null),labels=useRef(new Map<string,HTMLElement>()),view=useRef<ReturnType<typeof createHologram>|null>(null);
 const [selected,setSelected]=useState(''),[example,setExample]=useState(false),[orbits,setOrbits]=useState(true),[system,setSystem]=useState<SystemId>((currentPlace||plan?.startId||'stanton').split(':')[0] as SystemId);
 const [extraId,setExtraId]=useState('');
 const [quality,setQuality]=useState(()=>{try{return localStorage.getItem('vh-map-quality')||'high';}catch{return 'high';}});
 const focusRequest=useRef('');
 const [failure,setFailure]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{if(embedded&&ready)view.current?.setQuality(quality);},[embedded,ready,quality]);
 const calls=plan?.visits;
 const firstWork=calls?.find(v=>v.events.some(event=>event.type==='pickup'||event.type==='delivery'));
 const where=(id:string)=>placeName(id,locale==='ko'?0:1);
 const activeSystem=expanded?system:'stanton',points=systemPoints(activeSystem,extraId?[...(plan?.points||[]),{id:extraId}]:plan?.points),theme=systemThemes[activeSystem];
 const options=useRef({expanded,motion,selected,example,system:activeSystem,orbits,plan,extraId});options.current={expanded,motion,selected,example,system:activeSystem,orbits,plan,extraId};
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko;
 const name=(p:HologramPoint)=>locale==='ko'?localNames[p.name]||translated[p.name]||p.name:p.name;
 const systemName=locale==='ko'?theme.ko:theme.name;
 useEffect(()=>{if(!expanded)return;let cancelled=false;const element=host.current!;setReady(false);setFailure(false);
  void import('./hologram-scene').then(({createHologram})=>{if(cancelled)return;try{view.current=createHologram(element,labels.current,id=>{setSelected(id);view.current?.focus(id);});view.current.setState(options.current);setReady(true);}catch{setFailure(true);}}).catch(()=>{if(!cancelled)setFailure(true);});
  return()=>{cancelled=true;view.current?.dispose();view.current=null;};
 },[expanded]);
 useEffect(()=>{view.current?.setState({expanded,motion,selected,example,system:activeSystem,orbits,plan,extraId});if(ready&&focusRequest.current){view.current?.focus(focusRequest.current);focusRequest.current='';}},[expanded,motion,selected,example,activeSystem,orbits,plan,extraId,ready]);
 function locate(id:string){
   const target=id.split(':')[0] as SystemId;
   if(!Object.hasOwn(systemThemes,target))return;
   if(target===system && points.some(p=>p.id===id)){choose(id);return;}
   setExtraId(id);setSystem(target);setSelected(id);focusRequest.current=id;
 }
 useEffect(()=>{
   if(!currentPlace||!expanded)return;
   const next=currentPlace.split(':')[0] as SystemId;
   if(Object.hasOwn(systemThemes,next)){
     setSystem(next);
     if(embedded){
       setExtraId(currentPlace);
       setSelected(currentPlace);
       focusRequest.current=currentPlace;
       if(view.current && currentPlace===extraId)view.current.focus(currentPlace);
     }
   }
 },[currentPlace,expanded,embedded]);
 const choose=(id:string)=>{setSelected(id);if(expanded)view.current?.focus(id);};
 const chosen=points.find(p=>p.id===selected),star=points.find(p=>p.type==='Star');
 const parents=points.filter(p=>p.type==='Planet'),stations=points.filter(p=>!isBody(p));
 const groups=[['lagrange',t('라그랑주 정거장','Lagrange stations')],['station',t('정거장','Stations')],['gateway',t('게이트웨이','Gateways')],['relay',t('통신 시설','Comm arrays')]] as const;
 if(!expanded)return null;
 return <div className="hologram-layer" data-expanded={expanded} data-motion={motion} data-ready={ready} data-system={activeSystem}>
  <div ref={host} className="hologram-viewport" aria-label={t(`${systemName} 입체지도`,`${systemName} 3D star map`)}>
   {points.map(p=><button key={p.id} ref={el=>{if(el)labels.current.set(p.id,el);else labels.current.delete(p.id);}} hidden className="hologram-label" data-kind={isBody(p)?p.type:markerKind(p)} title={name(p)} data-full-name={name(p)} tabIndex={expanded?0:-1} aria-pressed={selected===p.id} onClick={()=>choose(p.id)}>{name(p)}</button>)}
  </div>
  {!ready&&!failure&&<p className="hologram-loading" role="status">{t('입체지도 준비 중…','Preparing star map…')}</p>}
  {failure&&<p className="hologram-failure" role="alert">{t('입체지도를 열지 못했습니다. 브라우저 하드웨어 가속을 확인해 주세요.','The star map could not start. Check browser hardware acceleration.')}</p>}
  <div className="hologram-interface" inert={!expanded} aria-hidden={!expanded}>
   {!embedded && <header className="hologram-heading"><div><small>STAM / NAVIGATION</small><h1 tabIndex={-1}>{t(`${systemName} 항로 지도`,`${systemName} star map`)}</h1></div><a href={'#/bridge?lang='+locale}>{t('관제센터로','Return to bridge')}</a></header>}
   {!embedded && (dockTarget && firstWork ? <section className="map-flight-brief" aria-label={t('이번 운송 항로','Flight route')}>
    <span>{t('첫 작업 거점','First working stop')} · {visitAction(firstWork,en)}</span>
    <button onClick={()=>locate(firstWork.locationId)} aria-label={t('지도에서 보기','Locate on map')+' · '+where(firstWork.locationId)}>{where(firstWork.locationId)}</button>
    <a href={'#/operations?lang='+locale+'&mode=control'}>{t('관제 콘솔로','Open control console')} →</a>
   </section> : <div className="hologram-sector" aria-hidden="true"><span>STELLAR CARTOGRAPHY</span><strong>{theme.name.toUpperCase()}</strong></div>)}
   {expanded&&dockTarget?createPortal(<aside className="hologram-panel" aria-label={t('지도 탐색','Map navigation')}>
    {!!calls?.length && <section className="hologram-stations"><details open><summary>{t('방문 순서','Stop order')}</summary>
     <ol className="map-flight-stops">{calls.map((visit,i)=><li key={i}><button onClick={()=>locate(visit.locationId)}><strong>{where(visit.locationId)}</strong><span>{visitAction(visit,en)}</span></button></li>)}</ol>
     </details></section>}
    <small>STAM / STAR SYSTEM</small>
    <div className="hologram-system-select" aria-label={t('항성계 선택','Select star system')}>{(Object.keys(systemThemes) as SystemId[]).map(id=><button key={id} aria-pressed={system===id} onClick={()=>{setSystem(id);setSelected('');setExample(false);setExtraId('');}}>{locale==='ko'?systemThemes[id].ko:systemThemes[id].name}</button>)}</div>
    {star&&<button className="hologram-stellar-focus" aria-pressed={selected===star.id} onClick={()=>choose(star.id)}>{name(star)}<small>{t('항성','STAR')}</small></button>}
    <div className="hologram-destinations">{parents.map(p=><button key={p.id} aria-pressed={selected===p.id} onClick={()=>choose(p.id)}>{name(p)}</button>)}</div>
    {chosen&&<section className="hologram-selection" aria-live="polite"><small>{t('선택한 위치','SELECTED LOCATION')}</small><h2>{name(chosen)}</h2></section>}
    <div className="hologram-tools"><div className="hologram-zoom"><button onClick={()=>view.current?.zoomBy(1/1.3)}>{t('축소 −','Zoom out −')}</button><button onClick={()=>view.current?.zoomBy(1.3)}>{t('확대 +','Zoom in +')}</button></div><button onClick={()=>view.current?.home()}>{t('시점 초기화','Reset view')}</button><button aria-pressed={orbits} onClick={()=>setOrbits(!orbits)}>{t('궤도 표시','Orbit guides')} {orbits?'ON':'OFF'}</button>{!plan&&system==='stanton'&&<button aria-pressed={example} onClick={()=>setExample(!example)}>{t('경로 표현 예시','Sample route styling')} {example?'ON':'OFF'}</button>}</div>
    {embedded && <div className="hologram-tools">
     <button onClick={()=>view.current?.home(true)}>{t('위에서 보기','Top view')}</button>
     <select aria-label={t('지도 품질','Map quality')} value={quality} onChange={e=>{
       setQuality(e.target.value);
       try{localStorage.setItem('vh-map-quality',e.target.value);}catch{}
     }}><option value="normal">{t('품질 보통','Normal')}</option><option value="high">{t('품질 높음','High')}</option><option value="ultra">{t('품질 최고','Ultra')}</option></select>
    </div>}
    <div className="hologram-stations">
     <PortSearch label={t('전체 항성계 거점 검색','Search all systems')} locale={locale} onSelect={locate}/>
     {groups.map(([kind,title])=>{const items=stations.filter(p=>markerKind(p)===kind);return items.length?<details key={kind}><summary>{title} <span>{items.length}</span></summary>{items.map(p=><button key={p.id} aria-pressed={selected===p.id} onClick={()=>choose(p.id)}>{name(p)}</button>)}</details>:null;})}
    </div>

    {example&&system==='stanton'&&<p className="hologram-example">{t('포트 트레슬러 → 바이니 포인트 표현 예시입니다.','Styling sample: Port Tressler → Baijini Point.')}</p>}
    <p className="hologram-scale-note">{t('천체 크기와 근접 간격은 식별을 위한 표시 축척입니다.','Body sizes and nearby spacing use a display scale for readability.')}</p>
   </aside>,dockTarget):null}
   <div className="hologram-instructions">{t('드래그 회전 · 우클릭 또는 Shift+드래그 이동 · 휠 확대','Drag to orbit · Right or Shift-drag to pan · Scroll to zoom')}</div>
  </div>
 </div>;
}
