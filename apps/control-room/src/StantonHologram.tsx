import {createPortal} from 'react-dom';
import {useEffect,useRef,useState} from 'react';
import type {Locale} from './navigation';
import type {HologramPoint} from './hologram-layout';
import {systemPoints,systemThemes,markerKind,isBody,type SystemId} from './hologram-catalogue';
import type {createHologram} from './hologram-scene';
import korean from '../../../data/stam-korean.json';
import './stanton-hologram.css';

type Props={expanded:boolean;motion:boolean;locale:Locale;dockTarget:HTMLElement|null};
const translated:Record<string,string>=korean.places;
const localNames:Record<string,string>={Stanton:'스탠턴',Pyro:'파이로',Nyx:'닉스',Hurston:'허스턴',Crusader:'크루세이더',ArcCorp:'아크코프',microTech:'마이크로텍'};
export function StantonHologram({expanded,motion,locale,dockTarget}:Props){
 const host=useRef<HTMLDivElement>(null),labels=useRef(new Map<string,HTMLElement>()),view=useRef<ReturnType<typeof createHologram>|null>(null);
 const [selected,setSelected]=useState(''),[example,setExample]=useState(false),[orbits,setOrbits]=useState(true),[system,setSystem]=useState<SystemId>('stanton');
 const [query,setQuery]=useState('');
 const [failure,setFailure]=useState(false),[ready,setReady]=useState(false);
 const activeSystem=expanded?system:'stanton',points=systemPoints(activeSystem),theme=systemThemes[activeSystem];
 const options=useRef({expanded,motion,selected,example,system:activeSystem,orbits});options.current={expanded,motion,selected,example,system:activeSystem,orbits};
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko;
 const name=(p:HologramPoint)=>locale==='ko'?localNames[p.name]||translated[p.name]||p.name:p.name;
 const systemName=locale==='ko'?theme.ko:theme.name;
 useEffect(()=>{let cancelled=false;const element=host.current!;setReady(false);setFailure(false);
  void import('./hologram-scene').then(({createHologram})=>{if(cancelled)return;try{view.current=createHologram(element,labels.current,id=>{setSelected(id);view.current?.focus(id);});view.current.setState(options.current);setReady(true);}catch{setFailure(true);}}).catch(()=>{if(!cancelled)setFailure(true);});
  return()=>{cancelled=true;view.current?.dispose();view.current=null;};
 },[]);
 useEffect(()=>{view.current?.setState({expanded,motion,selected,example,system:activeSystem,orbits});},[expanded,motion,selected,example,activeSystem,orbits]);
 const choose=(id:string)=>{setSelected(id);if(expanded)view.current?.focus(id);};
 const chosen=points.find(p=>p.id===selected),star=points.find(p=>p.type==='Star');
 const parents=points.filter(p=>p.type==='Planet'),stations=points.filter(p=>!isBody(p));
 const matches=stations.filter(p=>!query||[p.name,name(p)].some(n=>n.toLowerCase().includes(query.toLowerCase())));
 const groups=[['lagrange',t('라그랑주 정거장','Lagrange stations')],['station',t('정거장','Stations')],['gateway',t('게이트웨이','Gateways')],['relay',t('통신 시설','Comm arrays')]] as const;
 return <div className="hologram-layer" data-expanded={expanded} data-motion={motion} data-ready={ready} data-system={activeSystem}>
  <div ref={host} className="hologram-viewport" aria-label={t(`${systemName} 입체지도`,`${systemName} 3D star map`)}>
   {points.map(p=><button key={p.id} ref={el=>{if(el)labels.current.set(p.id,el);else labels.current.delete(p.id);}} hidden className="hologram-label" data-kind={isBody(p)?p.type:markerKind(p)} title={name(p)} data-full-name={name(p)} tabIndex={expanded?0:-1} aria-pressed={selected===p.id} onClick={()=>choose(p.id)}>{name(p)}</button>)}
  </div>
  {!ready&&!failure&&<p className="hologram-loading" role="status">{t('입체지도 준비 중…','Preparing star map…')}</p>}
  {failure&&<p className="hologram-failure" role="alert">{t('입체지도를 열지 못했습니다. 브라우저 하드웨어 가속을 확인해 주세요.','The star map could not start. Check browser hardware acceleration.')}</p>}
  <div className="hologram-interface" inert={!expanded} aria-hidden={!expanded}>
   <header className="hologram-heading"><div><small>STAM / NAVIGATION</small><h1>{t(`${systemName} 항로 지도`,`${systemName} star map`)}</h1></div><a href={'#/bridge?lang='+locale}>{t('관제센터로','Return to bridge')}</a></header>
   <div className="hologram-sector" aria-hidden="true"><span>STELLAR CARTOGRAPHY</span><strong>{theme.name.toUpperCase()}</strong></div>
   {expanded&&dockTarget?createPortal(<aside className="hologram-panel" aria-label={t('지도 탐색','Map navigation')}>
    <small>STAM / STAR SYSTEM</small>
    <div className="hologram-system-select" aria-label={t('항성계 선택','Select star system')}>{(Object.keys(systemThemes) as SystemId[]).map(id=><button key={id} aria-pressed={system===id} onClick={()=>{setSystem(id);setSelected('');setExample(false);setQuery('');}}>{locale==='ko'?systemThemes[id].ko:systemThemes[id].name}</button>)}</div>
    {star&&<button className="hologram-stellar-focus" aria-pressed={selected===star.id} onClick={()=>choose(star.id)}>{name(star)}<small>{t('항성','STAR')}</small></button>}
    <div className="hologram-destinations">{parents.map(p=><button key={p.id} aria-pressed={selected===p.id} onClick={()=>choose(p.id)}>{name(p)}</button>)}</div>
    {chosen&&<section className="hologram-selection" aria-live="polite"><small>{t('선택한 위치','SELECTED LOCATION')}</small><h2>{name(chosen)}</h2></section>}
    <div className="hologram-tools"><div className="hologram-zoom"><button onClick={()=>view.current?.zoomBy(1/1.3)}>{t('축소 −','Zoom out −')}</button><button onClick={()=>view.current?.zoomBy(1.3)}>{t('확대 +','Zoom in +')}</button></div><button onClick={()=>view.current?.home()}>{t('시점 초기화','Reset view')}</button><button aria-pressed={orbits} onClick={()=>setOrbits(!orbits)}>{t('궤도 표시','Orbit guides')} {orbits?'ON':'OFF'}</button>{system==='stanton'&&<button aria-pressed={example} onClick={()=>setExample(!example)}>{t('경로 표현 예시','Sample route styling')} {example?'ON':'OFF'}</button>}</div>
    <div className="hologram-stations">
     <label htmlFor="hologram-station-search">{t('정거장 · 라그랑주 탐색','Stations · Lagrange')}</label>
     <input id="hologram-station-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('이름 또는 HUR-L1 검색','Name or HUR-L1')} />
     {groups.map(([kind,title])=>{const items=matches.filter(p=>markerKind(p)===kind);return items.length?<details key={kind} open={query?true:undefined}><summary>{title} <span>{items.length}</span></summary>{items.map(p=><button key={p.id} aria-pressed={selected===p.id} onClick={()=>choose(p.id)}>{name(p)}</button>)}</details>:null;})}
     {query&&!matches.length&&<p role="status">{t('일치하는 거점이 없습니다.','No matching locations.')}</p>}
    </div>

    {example&&system==='stanton'&&<p className="hologram-example">{t('포트 트레슬러 → 바이니 포인트 표현 예시입니다.','Styling sample: Port Tressler → Baijini Point.')}</p>}
    <p className="hologram-scale-note">{t('천체 크기와 근접 간격은 식별을 위한 표시 축척입니다.','Body sizes and nearby spacing use a display scale for readability.')}</p>
   </aside>,dockTarget):null}
   <div className="hologram-instructions">{t('드래그로 회전 · 휠로 확대 · 천체 선택','Drag to orbit · Scroll to zoom · Select a body')}</div>
  </div>
 </div>;
}
