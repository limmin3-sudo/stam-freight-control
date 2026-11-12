import {quantityBasis} from './quantity-basis';
import {lazy,Suspense,useState} from 'react';
import type {useFlight} from './use-flight';
import type {Locale} from './navigation';
import {NavigationChart} from './NavigationChart';
import type {ChartCommand} from './NavigationChart';
import {PortSearch} from './PortSearch';
import {placeName} from './mission-trial';
const CargoViewport=lazy(()=>import('./CargoWorkspace').then(m=>({default:m.CargoViewport})));
import type {CargoShip,Packing} from './cargo-plan.mjs';
import './map-console.css';

export function MapConsole({flight,locale}:{flight:ReturnType<typeof useFlight>;locale:Locale}){
 const {plan,run}=flight.session;
 const [selected,setSelected]=useState(Math.min(run?.index||0,Math.max(0,(plan?.visits.length||1)-1)));
 const [command,setCommand]=useState<ChartCommand>();
 const [orbits,setOrbits]=useState(true),[explore,setExplore]=useState(!plan),[cargo,setCargo]=useState(false),[box,setBox]=useState<string|null>(null),[location,setLocation]=useState('');
 const [quality,setQuality]=useState(()=>{try{return localStorage.getItem('vh-map-quality')||'high';}catch{return 'high';}});
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko,where=(id:string)=>placeName(id,locale==='ko'?0:1);
 const send=(next:Omit<ChartCommand,'serial'>)=>{if(['system','galaxy','home'].includes(next.kind))setLocation('');setCommand({...next,serial:performance.now()});};
 const visit=plan?.visits[selected];
 const go=(index:number)=>{setSelected(index);setLocation(plan?.visits[index]?.locationId||'');setBox(null);send({kind:'leg',value:index});};
 const href=(screen:string)=>`#/${screen}?lang=${locale}`;
 const selection=visit?.packing.boxes.find(b=>b.boxId===box);
 const cargoName=(name:string)=>locale==='ko'?flight.session.draft.jobs.flatMap(j=>j.shipments).find(s=>s.cargo[1]===name)?.cargo[0]||name:name;
 return <main className="map-monitor">
  <nav inert={cargo} className="chart-navigation" aria-label={t('콘솔 이동','Console navigation')}><a href={href('mission')}>{t('미션 콘솔','Mission console')}</a><a href={href('map')} aria-current="page">{t('입체 항로지도','3D navigation')}</a><a href={href('operations')}>{t('관제 콘솔','Control console')}</a><a className="chart-return" href={href('bridge')}>↖ {t('관제실로','Bridge')}</a><select aria-label={t('표시 언어','Display language')} value={locale} onChange={e=>{window.location.hash=`#/map?lang=${e.target.value}`;}}><option value="ko">한국어</option><option value="mix">한/영</option><option value="en">English</option></select></nav>
  <div className="chart-layout" inert={cargo}>
   <section className="chart-space" aria-labelledby="chart-title">
    <header className="chart-title"><div><small>STAM / STELLAR CARTOGRAPHY</small><h1 id="chart-title" tabIndex={-1}>{t('입체 항로지도','3D navigation')}</h1></div><span><i/>{t('항법 홀로그램','NAVIGATION HOLOGRAM')}</span></header>
    <NavigationChart locale={locale} plan={plan} index={selected} command={command} orbits={orbits} quality={quality} onSelect={p=>setLocation(p.id)}/>
    <div className="chart-view-tools" aria-label={t('지도 시점','Map camera')}>
     <button onClick={()=>send({kind:'home'})}>{t('전체 보기','Reset view')}</button><button onClick={()=>send({kind:'top'})}>{t('위에서','Top view')}</button><button onClick={()=>send({kind:'zoom',value:1.3})} aria-label={t('확대','Zoom in')}>＋</button><button onClick={()=>send({kind:'zoom',value:1/1.3})} aria-label={t('축소','Zoom out')}>−</button><button aria-pressed={orbits} onClick={()=>setOrbits(!orbits)}>{t('궤도','Orbits')}</button>
    </div>
    {location&&<div className="chart-selected"><small>{t('선택한 거점','SELECTED LOCATION')}</small><strong>{where(location)}</strong><button onClick={()=>send({kind:'focus',id:location})}>{t('가까이 보기','Focus')} ↗</button></div>}
    <p className="chart-help">{t('드래그 회전 · 우클릭/Shift 이동 · 휠 확대 · 더블클릭 진입 · Esc 상위 보기','Drag to orbit · Right/Shift-drag to pan · Scroll to zoom · Double-click to enter · Esc to go up')}</p>
   </section>
   <aside className="chart-itinerary" aria-label={t('운항 순서','Flight itinerary')}>
    <header><small>FLIGHT / ITINERARY</small><h2>{t('방문 순서','Stop order')} <span>{plan?.visits.length||0}</span></h2><p>{plan?t('거점을 누르면 해당 구간을 지도에서 봅니다.','Select a stop to frame its leg on the map.'):t('미션을 선택하면 계산한 항로가 여기에 표시됩니다.','Your calculated route appears here after selecting contracts.')}</p></header>
    <button className="chart-explore-toggle" aria-expanded={explore} onClick={()=>setExplore(!explore)}>{t('거점 검색 · 항성계 탐색','Search · Explore systems')} <span>{explore?'−':'＋'}</span></button>
    {explore&&<section className="chart-explore"><PortSearch locale={locale} label={t('거점 검색','Search locations')} onSelect={id=>{setLocation(id);send({kind:'focus',id});}}/>
     <div className="chart-systems">{['stanton','pyro','nyx'].map((id,i)=><button key={id} onClick={()=>send({kind:'system',id})}>{locale==='ko'?['스탠턴','파이로','닉스'][i]:id.toUpperCase()}</button>)}<button onClick={()=>send({kind:'galaxy'})}>{t('항성계 전체','All systems')}</button></div>
     <label>{t('화질','Quality')}<select value={quality} onChange={e=>setQuality(e.target.value)}><option value="normal">{t('보통','Normal')}</option><option value="high">{t('높음','High')}</option><option value="ultra">{t('최고','Ultra')}</option></select></label><small>{t('천체 크기와 근접 간격은 식별을 위한 표시 축척입니다.','Body sizes and nearby spacing use a readable display scale.')}</small>
    </section>}
    <ol className="chart-stops">{plan?.visits.map((v,index)=><li key={index} data-active={selected===index}>
     <button className="chart-stop-select" aria-pressed={selected===index} onClick={()=>go(index)}><span className="chart-stop-number">{String(index+1).padStart(2,'0')}</span><span><strong>{where(v.locationId)}</strong><small>{index===0?t('출발','Departure'):v.leg.meters>=1e9?`${(v.leg.meters/1e9).toFixed(1)} Gm`:`${Math.round(v.leg.meters/1000).toLocaleString()} km`}{run?.started&&index<run.index?' · '+t('완료','Complete'):''}</small></span></button>
     <ul className="chart-stop-events">{v.events.filter(e=>e.type!=='departure').map((event,i)=><li key={i} data-kind={event.type}><span>{event.type==='pickup'?'↑':'↓'}</span><div>{event.type==='pickup'?t('픽업','Pickup'):t('배송','Delivery')} · {cargoName(event.commodity)}<small>{event.reservationContinuation||event.reservationScu?t('배송 총량으로 공간 예약','Space reserved by delivery total'):event.pickupQuantityUnknown||plan.mode==='simple'&&!event.scu?t('수량 미확인','Quantity unknown'):`${event.scu} SCU`}{event.estimatedBoxes?' · '+t('상자 예상','Estimated boxes'):''}</small><small>{t('계약','Contract')} · {quantityBasis(flight.session.draft.jobs.find(job=>job.id===event.missionId),locale)}</small>{event.type==='pickup'&&event.deliveryId&&<small>→ {where(event.deliveryId)}</small>}</div></li>)}</ul>
     {!!v.jumps.length&&<p className="chart-jumps">{v.jumps.map(j=>`${where(j.entryId)} → ${where(j.exitId)}`).join(' / ')}</p>}
     {plan.mode!=='simple'&&<div className="chart-load"><span>{t('작업 후','After stop')} <b>{v.load} SCU</b></span><meter min={0} max={Math.max(1,plan.capacity||0)} value={v.load}/>{selected===index&&<button onClick={()=>{setCargo(true);setBox(null);}}>{t('적재 3D 보기','Inspect cargo 3D')} ↗</button>}</div>}
    </li>)}</ol>
    <footer>{plan?.mode==='simple'&&<p>{t('오퍼레이터는 경로만 안내합니다. 적재는 직접 진행하세요.','The operator guides your route. Loading is up to you.')}</p>}<a className="chart-primary" href={href(plan?'operations':'mission')}>{plan?t('관제에서 운항 진행','Continue in control console'):t('계약 선택하러 가기','Select contracts')} ↗</a></footer>
   </aside>
  </div>
  {cargo&&plan&&visit&&plan.mode!=='simple'&&<dialog ref={node=>{if(node&&!node.open)node.showModal();}} className="chart-cargo-overlay" role="dialog" aria-modal="true" aria-label={t('거점 작업 후 적재','Cargo after this stop')} onCancel={e=>{e.preventDefault();setCargo(false);}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setCargo(false);}}}>
   <header><div><small>CARGO / HOLOGRAPHIC INSPECTION</small><h2>{where(visit.locationId)} · {t('작업 후 예상 배치','Planned load after stop')}</h2></div><button autoFocus onClick={()=>setCargo(false)}>{t('닫기','Close')} ×</button></header>
   <Suspense fallback={<p>3D…</p>}><CargoViewport ship={plan.ship as CargoShip} packing={{...visit.packing,capacity:plan.capacity||0,used:visit.load} as Packing} locale={locale} selected={box} onSelect={setBox}/></Suspense>
   <p className="chart-cargo-caption">{selection?`${selection.size} SCU · ${where(selection.dropoffId)} · ${cargoName(selection.commodity)} · ${selection.missionId} · ${quantityBasis(flight.session.draft.jobs.find(job=>job.id===selection.missionId),locale)}`:t('상자를 선택하면 배송지와 소속 계약을 확인합니다. 운항 진행을 바꾸지 않는 계획 미리보기입니다.','Select a crate for destination and contract. This planned preview does not change flight progress.')}</p>
  </dialog>}
 </main>;
}
