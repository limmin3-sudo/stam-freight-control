import {lazy,memo,Suspense,useEffect,useMemo,useState} from 'react';
import type {Locale} from './navigation';
import type {TradeRun,TradeSummary} from './trade-operations';
import {NavigationChart,type ChartCommand} from './NavigationChart';
import {useChartLook} from './use-chart-look';
import {ApprovedGlass} from './ApprovedGlass';
import {loadMarket} from './market-reference';
import type {MarketSnapshot} from './trade-data';
import {tradeAtlas,tradeNavigation} from './trade-navigation.mjs';
import type {TradeCargoPreview} from './trade-cargo-preview.mjs';
import './map-console.css';
import './trade-visuals.css';
const CargoViewport=lazy(()=>import('./CargoWorkspace').then(m=>({default:m.CargoViewport})));
export default memo(function TradeVisuals({run,summary,locale}:{run:TradeRun;summary:TradeSummary;locale:Locale}){
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko,{look,choose,saved}=useChartLook();
 const [market,setMarket]=useState<MarketSnapshot|null>(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setFailed(false);loadMarket().then(d=>{if(alive)setMarket(d);}).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;};},[retry]);
 const signature=JSON.stringify([run.plan.ship.id,run.plan.origin,run.plan.destination,run.plan.systemPath]);
 const nav=useMemo(()=>market?tradeNavigation(run.plan,market):null,[market,signature]);
 const [leg,setLeg]=useState(0),[command,setCommand]=useState<ChartCommand>(),[point,setPoint]=useState('');
 const send=(value:Omit<ChartCommand,'serial'>)=>setCommand({...value,serial:performance.now()});
 useEffect(()=>{setLeg(summary.stage==='sale'?Math.max(0,(nav?.route?.visits.length??1)-1):0);setPoint('');const target=summary.stage==='sale'?nav?.destination:nav?.origin;if(target)send({kind:'focus',id:target.point.id});},[nav,summary.stage]);
 const systems=[...new Set(run.plan.systemPath.map(s=>s.toLowerCase()))],names:Record<string,string>={stanton:'스탠턴',pyro:'파이로',nyx:'닉스'};
 const where=(id:string)=>tradeAtlas.locations.find(p=>p.id===id)?.name??id;
 const [cargoMode,setCargoMode]=useState<'plan'|'aboard'>(summary.bought?'aboard':'plan'),[selected,setSelected]=useState<string|null>(null);
 useEffect(()=>{setCargoMode(summary.bought?'aboard':'plan');},[summary.bought>0]);
 const quantity=cargoMode==='plan'?run.plan.quantity:summary.aboard;
 const [cargo,setCargo]=useState<TradeCargoPreview|null>(null),[cargoError,setCargoError]=useState(false),[cargoRetry,setCargoRetry]=useState(0);
 useEffect(()=>{
  let active=true;setSelected(null);setCargo(null);setCargoError(false);
  let worker:Worker;try{worker=new Worker(new URL('./trade-cargo.worker.mjs',import.meta.url),{type:'module'});}catch{setCargoError(true);return;}
  worker.onmessage=event=>{if(!active)return;if(event.data.error)setCargoError(true);else setCargo(event.data.result);worker.terminate();};worker.onerror=()=>{if(active)setCargoError(true);worker.terminate();};
  worker.postMessage({runId:run.id,shipId:run.plan.ship.id,quantity,boxSize:run.plan.boxSize,commodity:run.plan.commodity.name,destination:String(run.plan.destination.id),mode:cargoMode});
  return()=>{active=false;worker.terminate();};
 },[run.id,run.plan.ship.id,quantity,run.plan.boxSize,run.plan.commodity.name,run.plan.destination.id,cargoMode,cargoRetry]);
 const selectedBox=cargo?.packing?.boxes.find(b=>b.boxId===selected);
 const boxes=useMemo(()=>{const counts=new Map<number,number>();for(const b of cargo?.packing?.boxes??[])counts.set(b.size,(counts.get(b.size)??0)+1);return [...counts].sort((a,b)=>b[0]-a[0]);},[cargo]);
 return <section className="trade-visuals" aria-label={t('무역 지도와 예상 적재','Trade map and estimated cargo')}>
  <section className="trade-map-panel"><header><h3>{t('무역 항로','Trade route')}</h3><select aria-label={t('지도 표현','Map appearance')} value={look} onChange={e=>choose(e.target.value as 'physical'|'hologram')}><option value="physical">{t('실사','Physical')}</option><option value="hologram">{t('홀로그램','Hologram')}</option></select></header>
   <div className="trade-map-canvas"><NavigationChart locale={locale} plan={nav?.route??null} index={leg} command={command} data={tradeAtlas} look={look} onSelect={p=>setPoint(p.name)}/></div>
   <div className="trade-map-buttons">{systems.map(s=><button className="market-action" key={s} onClick={()=>send({kind:'system',id:s})}><ApprovedGlass/><span>{en?s.toUpperCase():names[s]??s}</span></button>)}<button className="market-action" onClick={()=>send({kind:'galaxy'})}><ApprovedGlass/><span>{t('행성계 연결','System links')}</span></button></div>
   {nav?.route&&<label className="trade-leg-label">{t('참고 항로 구간','Reference route leg')}<select aria-label={t('참고 항로 구간','Reference route leg')} value={leg} onChange={e=>{const index=Number(e.target.value);setLeg(index);send({kind:'leg',value:index});}}>{nav.route.visits.map((v,i)=><option key={i} value={i}>{i+1}. {where(v.leg.nodes[0]!)} → {where(v.locationId)}{v.jumps.length?t(' · 점프',' · Jump'):''}</option>)}</select></label>}
   <div className="trade-map-buttons">{nav?.origin&&<button className="market-action" onClick={()=>send({kind:'focus',id:nav.origin!.point.id})}><ApprovedGlass/><span>{t('매입지','Purchase location')}</span></button>}{nav?.destination&&<button className="market-action" onClick={()=>send({kind:'focus',id:nav.destination!.point.id})}><ApprovedGlass/><span>{t('판매지','Sale location')}</span></button>}<button className="market-action" onClick={()=>send({kind:'home'})}><ApprovedGlass/><span>{t('전체 보기','Reset view')}</span></button><button className="market-action" onClick={()=>send({kind:'top'})}><ApprovedGlass/><span>{t('위에서 보기','Top view')}</span></button></div>
   {failed&&<p role="alert">{t('거래소 위치 자료를 불러오지 못했습니다.','Terminal references could not be loaded.')} <button onClick={()=>setRetry(n=>n+1)}>{t('다시 확인','Retry')}</button></p>}
   {nav?.reason&&<p className="trade-warning" role="status">{t('거래소 위치 또는 점프 연결을 확정하지 못해 항로선을 표시하지 않습니다. 거래 기록은 그대로 사용할 수 있습니다.','The terminal or jump connection is unresolved, so no route line is drawn. Transaction records remain available.')}</p>}
   {point&&<p className="trade-map-selection">{t('지도 선택','Map selection')} · {point}</p>}
   <p className="market-note">{t('거래소가 있는 시설 기준의 참고 항로입니다. 실시간 위치·터미널 내부 위치·연료·도착시간은 확정하지 않습니다.','Reference route to the terminal’s facility, not live position, indoor directions, fuel or confirmed arrival times.')} Wiki {tradeAtlas.meta.version}{!saved&&' · '+t('지도 표현은 현재 화면에만 적용됩니다.','Map appearance applies to this session only.')}</p>
  </section>
  <section className="trade-cargo-panel"><header><h3>{t('예상 적재 배치','Estimated cargo layout')}</h3><strong data-trade-quantity={quantity}>{quantity} SCU</strong></header><div className="trade-cargo-modes"><button className="market-action" aria-pressed={cargoMode==='plan'} onClick={()=>setCargoMode('plan')}><ApprovedGlass kind={cargoMode==='plan'?'gold':'normal'}/><span>{t('계획 수량','Planned quantity')}</span></button><button className="market-action" aria-pressed={cargoMode==='aboard'} onClick={()=>setCargoMode('aboard')}><ApprovedGlass kind={cargoMode==='aboard'?'gold':'normal'}/><span>{t('기록상 선내 수량','Recorded cargo aboard')}</span></button></div>
   <div className="trade-cargo-view">{cargo?<Suspense fallback={<p role="status">3D…</p>}><CargoViewport ship={cargo.ship} packing={cargo.packing} locale={locale} selected={selected} onSelect={setSelected}/></Suspense>:<p role={cargoError?'alert':'status'}>{cargoError?t('적재 미리보기를 계산하지 못했습니다.','Cargo preview could not be calculated.'):t('적재 공간을 계산하고 있습니다…','Calculating cargo space…')}{cargoError&&<button onClick={()=>setCargoRetry(n=>n+1)}>{t('다시 확인','Retry')}</button>}</p>}</div>
   {cargo&&!cargo.packing&&<p className="trade-warning" role="status">{t('이 상자 구성은 현재 그리드에 모두 들어가지 않습니다. 수량 기록을 줄이거나 지우지 않았습니다.','This estimated container arrangement does not fit the current grids. Quantity records remain unchanged.')}</p>}
   {cargo&&cargo.ship.grids.reduce((n,g)=>n+g.w*g.h*g.l,0)!==run.plan.ship.capacity&&<p className="trade-warning">{t('현재 함선 프로필의 용량이 인계 당시와 다릅니다. 현재 그리드로 표시합니다.','Current ship capacity differs from the handover snapshot; current grids are shown.')}</p>}
   <p className="trade-box-summary">{boxes.map(([size,count])=>`${size} SCU × ${count}`).join(' · ')||t('표시할 상자 없음','No containers to show')}</p>
   <p className="trade-box-selection" aria-live="polite">{selectedBox?`${selectedBox.size} SCU · ${t('구역','Grid')} ${selectedBox.bin+1} · ${run.plan.destination.name}`:t('상자를 선택하면 크기와 배치 구역을 확인합니다.','Select a crate to inspect its size and grid.')}</p>
   <p className="market-note">{t('선내 수량은 매입·판매·손실 기록에서 가져옵니다. 상자 규격·개수·위치는 인계한 규격을 우선한 예상이며, 나머지는 작은 상자로 나눕니다. 실제 상자나 다른 운송 화물을 확인한 배치가 아닙니다.','Aboard quantity comes from recorded purchases, sales and losses. Container sizes, counts and positions are estimates using the planned size first, then smaller boxes for the remainder. Actual containers and other freight cargo are not tracked here.')}</p>
  </section>
 </section>;
});
