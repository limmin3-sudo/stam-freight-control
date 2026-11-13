import {useEffect,useMemo,useRef,useState} from 'react';
import type {Locale} from './navigation';
import type {Draft} from './mission-trial';
import {placeName,shipIdFor} from './mission-trial';
import {cargoShips,cargoShip,cargoPacking,demoCargo,manifestCargo,capacity,readCargoPreferences,saveCargoPreferences} from './cargo-plan.mjs';
import type {CargoShip,Packing} from './cargo-plan.mjs';
import type {CargoCamera,createCargoScene} from './cargo-scene';
import './cargo-workspace.css';
import './cargo-optics.css';

type Scene=ReturnType<typeof createCargoScene>;
// Shared by departure review and operations. No app bootstrap, progress writes,
// fabricated ship shell or cargo-position changes inside this presentation view.
export function CargoViewport({ship,packing,locale,selected,onSelect}:{ship:CargoShip;packing:Packing|null;locale:Locale;selected:string|null;onSelect:(id:string|null)=>void}){
 const host=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),scene=useRef<Scene|null>(null);
 const current=useRef({ship,packing,locale,selected,onSelect});current.current={ship,packing,locale,selected,onSelect};
 const [camera,setCamera]=useState<CargoCamera|null>('orbit');
 const [failed,setFailed]=useState(false),[ready,setReady]=useState(false),[full,setFull]=useState(false),[fullError,setFullError]=useState(false);
 const en=locale==='en';const t=(ko:string,eng:string)=>en?eng:ko;
 useEffect(()=>{
  let stopped=false;
  void Promise.all([import('./cargo-scene'),Promise.all([document.fonts.load('500 14px BarlowAirReview'),document.fonts.load('500 14px SUIT')])]).then(([{createCargoScene}])=>{
   if(stopped||!host.current)return;
   try{const s=createCargoScene(host.current,id=>current.current.onSelect(id),()=>setFailed(true),setCamera);scene.current=s;const p=current.current;s.update(p.ship,p.packing,p.locale==='en');s.select(p.selected);setReady(true);}
   catch{setFailed(true);}
  }).catch(()=>{if(!stopped)setFailed(true);});
  return ()=>{stopped=true;scene.current?.dispose();scene.current=null;};
 },[]);
 useEffect(()=>{scene.current?.update(ship,packing,en);},[ship,packing,en]);
 useEffect(()=>{scene.current?.select(selected);},[selected]);
 useEffect(()=>{const sync=()=>setFull(document.fullscreenElement===stage.current);document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[]);
 const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.current?.requestFullscreen();setFullError(false);}catch{setFullError(true);}};
 return <div className="cargo-stage" ref={stage}>
  <div className="cargo-stage-heading"><div><small>CARGO / SPATIAL VIEW</small><h3>{ship.name}</h3></div><span>01 <i/> {t('적재 공간','CARGO VOLUME')}</span></div>
  <div ref={host} className="cargo-render-surface"/>
  {!ready&&!failed&&<p className="cargo-render-message" role="status">{t('적재 공간을 준비하고 있습니다.','Preparing cargo view…')}</p>}
  {failed&&<p className="cargo-render-message" role="alert">{t('3D 화면을 표시할 수 없습니다. 화물 목록은 계속 확인할 수 있습니다.','3D view is unavailable. The cargo list remains accessible.')}</p>}
  <div className="cargo-stage-scale">1 CELL / 1.25 m<span>{t('그리드 치수 기준 · 함선 외형 생략','Grid dimensions · Ship exterior omitted')}</span></div>
  <div className="cargo-view-controls" aria-label={t('적재 시점','Cargo camera')}>
   {(['orbit','top','port','starboard'] as CargoCamera[]).map((mode,i)=><button key={mode} aria-pressed={camera===mode} disabled={!ready||failed} onClick={()=>scene.current?.home(mode)}>{[t('전체','Reset'),t('위','Top'),t('좌현','Port'),t('우현','Starboard')][i]}</button>)}
   <span/><button disabled={!ready||failed} aria-label={t('확대','Zoom in')} onClick={()=>scene.current?.zoom(.8)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg></button><button disabled={!ready||failed} aria-label={t('축소','Zoom out')} onClick={()=>scene.current?.zoom(1.25)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg></button>
   <button onClick={()=>void fullscreen()}>{full?t('접기','Exit fullscreen'):t('크게 보기','Fullscreen')}</button>
  </div>
  <p className="cargo-gesture">{fullError?t('이 브라우저에서는 전체 화면을 지원하지 않습니다.','Fullscreen is unavailable in this browser.'):t('드래그 회전 · 휠 확대 · 두 손가락 이동 · 상자 선택','Drag to orbit · Scroll to zoom · Two fingers to pan · Select a crate')}</p>
 </div>;
}
export function CargoWorkspace({draft,locale,session}:{draft:Draft;locale:Locale;session?:import('./flight-session').Session}){
 const en=locale==='en',n=locale==='ko'?0:1,t=(ko:string,eng:string)=>en?eng:ko;
 const [mode,setMode]=useState<'empty'|'demo'|'manifest'|'aboard'>(session?.plan && session.plan.mode!=='simple'?'aboard':'empty');
 const draftShip=shipIdFor(draft.ship);
 const aboard=mode==='aboard' && session?.plan && session.plan.mode!=='simple' && session?.run ? session.run.aboard : null;
 const [preferences]=useState(readCargoPreferences);
 const [shipId,setShipId]=useState(preferences?.shipId||draftShip),[disabled,setDisabled]=useState<Record<string,string[]>>(preferences?.disabled||{});
 useEffect(()=>saveCargoPreferences({shipId,disabled}),[shipId,disabled]);
 const [gridMode,setGridMode]=useState(false),[selected,setSelected]=useState<string|null>(null),[filter,setFilter]=useState('all');
 const pickups=[...new Set(draft.jobs.flatMap(j=>j.shipments.map(s=>s.from)))];
 const [pickup,setPickup]=useState(pickups[0]||'');const actualPickup=pickups.includes(pickup)?pickup:pickups[0]||'';
 const configured=useMemo(()=>draft.customShip?.id===shipId?draft.customShip:cargoShip(shipId,disabled[shipId]),[shipId,disabled,draft.customShip]);
 const ship=aboard && session?.plan?session.plan.ship:configured;
 const result=useMemo(()=>mode==='manifest'?manifestCargo(draft,actualPickup):{boxes:mode==='demo'?demoCargo():[],unresolved:[]},[mode,draft,actualPickup]);
 const packingResult=useMemo(()=>{try{return {packing:cargoPacking(ship,result.boxes),invalid:false};}catch{return {packing:null,invalid:true};}},[ship,result]);
 const packing=aboard?{boxes:aboard,used:aboard.reduce((s,b)=>s+b.size,0),capacity:capacity(ship),bins:ship.grids.map((_,i)=>({used:aboard.reduce((s,b)=>s+(b.bin===i?b.size:0),0)}))}:packingResult.packing;
 const selectedBox=packing?.boxes.find(b=>b.boxId===selected);
 const destinations=[...new Set((packing?.boxes||[]).map(b=>b.dropoffId))];
 const list=(packing?.boxes||[]).filter(b=>filter==='all'||b.dropoffId===filter);
 const requested=result.boxes.reduce((sum,b)=>sum+b.size,0);
 const reset=()=>{setSelected(null);setFilter('all');};
 const chooseMode=(next:typeof mode)=>{reset();setMode(next);};
 return <section className="cargo-workspace" aria-labelledby="cargo-title">
  <header className="cargo-workspace-heading"><div><small>STAM / CARGO ENGINEERING</small><h2 id="cargo-title">{t('적재 계획','Cargo plan')}</h2><p>{t('화물칸을 돌려 보고, 상자별 목적지와 배치를 확인하세요.','Inspect your hold and each crate’s destination and placement.')}</p></div><span className="cargo-source-badge">{aboard?t('현재 선적 화물','ABOARD'):mode==='demo'?t('예시 화물','SAMPLE CARGO'):mode==='manifest'?t('픽업 화물 예상 구성','PICKUP ESTIMATE'):t('빈 화물칸','EMPTY HOLD')}</span></header>
  <div className="cargo-layout">
   <aside className="cargo-inspector">
    <label>{t('함선 그리드','Ship grid')}<select aria-label={t('함선 그리드','Ship grid')} disabled={!!aboard} value={ship.id} onChange={e=>{setShipId(e.target.value);reset();}}>{cargoShips.map(s=><option key={s.id} value={s.id}>{s.name} · {capacity(s)} SCU</option>)}</select></label>
    <p className="cargo-profile-note">{ship.grids.some(g=>g._stack==='out')?t('중심축에서 바깥쪽으로 부착','Attaches outward from the spine'):ship.grids.some(g=>g._stack==='down')?t('위쪽 부착면에서 아래로 적재','Hangs downward from the upper attachment'):t('바닥에서 위로 적재','Stacks upward from the deck')}</p>
    <div className="cargo-capacity"><strong>{packing?.used||0}<small> / {capacity(ship)} SCU</small></strong><meter min="0" max={Math.max(1,capacity(ship))} value={packing?.used||0}/><span>{packing?`${packing.boxes.length} ${t('상자','crates')}`:t('이 구성은 적재할 수 없습니다.','This load does not fit.')}</span></div>
    <div className="cargo-source-actions">{session?.plan && session.plan.mode!=='simple' && <button aria-pressed={!!aboard} onClick={()=>chooseMode('aboard')}>{t('현재 선적 화물','Cargo aboard')}</button>}<button aria-pressed={mode==='demo'} onClick={()=>chooseMode(mode==='demo'?'empty':'demo')}>{t('예시 화물 보기','Show sample cargo')}</button>{mode!=='empty'&&<button onClick={()=>chooseMode('empty')}>{t('미리보기 비우기','Clear preview')}</button>}</div>
    {pickups.length>0&&<div className="cargo-manifest-source"><label>{t('이번 운송의 픽업지','Manifest pickup')}<select aria-label={t('이번 운송의 픽업지','Manifest pickup')} value={actualPickup} onChange={e=>{setPickup(e.target.value);reset();}}>{pickups.map(p=><option key={p} value={p}>{placeName(p,n)}</option>)}</select></label><button onClick={()=>{setShipId(draftShip);chooseMode('manifest');}}>{t('이 픽업 화물로 예상 적재','Estimate this pickup load')}</button><p>{t('규격 미확정 화물은 확인된 상한 내 최대 8 SCU로 나눠 예상합니다. 현재 실린 화물과 운항 진행은 포함하지 않습니다.','Unconfirmed boxes use up to 8 SCU within known size limits. Current aboard cargo and run progress are not included.')}</p></div>}
    <button className="cargo-grid-switch" disabled={!!aboard} aria-expanded={gridMode} onClick={()=>setGridMode(!gridMode)}>{t('사용할 그리드 선택','Choose active grids')} <span>{ship.grids.filter(g=>!g.disabled).length}/{ship.grids.length}</span></button>
    {gridMode&&!aboard&&<div className="cargo-grid-options">{ship.grids.map((g,i)=><label key={g.id}><input type="checkbox" checked={!g.disabled} onChange={()=>{reset();setDisabled(old=>({...old,[shipId]:g.disabled?(old[shipId]||[]).filter(id=>id!==g.id):[...(old[shipId]||[]),g.id]}));}}/><span>{String(i+1).padStart(2,'0')} · {g.w*g.h*g.l} SCU</span></label>)}</div>}
    <div className="cargo-selection" aria-live="polite"><small>{t('선택한 화물','SELECTED CARGO')}</small>{selectedBox?<><h3>{selectedBox.size} SCU <span style={{background:selectedBox.color}}/></h3><b>{placeName(selectedBox.dropoffId,n)}</b><dl><dt>{t('계약','Contract')}</dt><dd>{draft.jobs.find(j=>j.id===selectedBox.missionId)?.title[n]||selectedBox.missionId}</dd><dt>{t('운송 항목','Shipment')}</dt><dd>{selectedBox.shipmentId}</dd><dt>{t('그리드 / 셀','Grid / cell')}</dt><dd>{selectedBox.bin+1} / {selectedBox.cell.join(' · ')}</dd></dl></>:<p>{t('상자 또는 아래 화물 목록을 선택하세요.','Select a crate or an entry in the manifest below.')}</p>}</div>
   </aside>
   <div className="cargo-visual-column">
    <CargoViewport ship={ship} packing={packing} locale={locale} selected={selected} onSelect={setSelected}/>
    <div className="cargo-feedback" role="status">{aboard?t('현재 운항의 실제 선적 배치입니다.','Current onboard cargo layout.'):packingResult.invalid?t('화물 식별 정보가 중복되었습니다. 계약 내용을 확인하세요.','Duplicate cargo identity. Review the manifest.'):!packing?t(`요청 화물 ${requested} SCU를 이 그리드에 배치할 수 없습니다. 함선·그리드·상자 구성을 확인하세요.`,`The requested ${requested} SCU cannot fit. Check ship, active grids and box sizes.`):result.unresolved.length?t(`분배 또는 수량이 미확인된 ${result.unresolved.length}개 항목은 제외했습니다.`,`${result.unresolved.length} unresolved shipments excluded.`):mode==='empty'?t('예시 화물 또는 이번 운송의 픽업 화물을 선택하세요.','Choose sample cargo or a pickup from your manifest.'):t('배치 검토용 미리보기입니다. 출항·적재 완료 상태를 변경하지 않습니다.','Preview for reviewing placement. Departure and loading progress remain unchanged.')}</div>
   </div>
  </div>
  {packing&&packing.boxes.length>0&&<div className="cargo-manifest"><div className="cargo-manifest-heading"><h3>{t('화물 명세','Cargo manifest')}</h3><label>{t('목적지','Destination')}<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{t('전체','All')}</option>{destinations.map(id=><option key={id} value={id}>{placeName(id,n)}</option>)}</select></label></div><div className="cargo-crate-list">{list.map((b,i)=><button key={b.boxId} aria-pressed={selected===b.boxId} onClick={()=>setSelected(selected===b.boxId?null:b.boxId)}><span className="cargo-destination-stripe" style={{background:b.color}}/><small>{String(i+1).padStart(2,'0')}</small><strong>{b.size} SCU</strong><span>{placeName(b.dropoffId,n)}</span><small>{t('구역','Grid')} {b.bin+1}</small></button>)}</div></div>}
 </section>;
}
