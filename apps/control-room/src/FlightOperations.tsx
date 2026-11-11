import {ConsoleDial} from './ConsoleDial';
import {lazy, Suspense, useEffect, useState, type MouseEvent, type PointerEvent} from 'react';
const CargoViewport=lazy(()=>import('./CargoWorkspace').then(m=>({default:m.CargoViewport})));
import {cargoShip} from './cargo-plan.mjs';
const OperationsMap=lazy(()=>import('./OperationsMap').then(module=>({default:module.OperationsMap})));
import {flightVoice} from '../../../voice.mjs';
import operatorPortrait from '../../../assets/partners/aide-portrait.webp';
import navigatorPortrait from '../../../assets/partners/navigator.jpg';
import crest from '../../../assets/stam-logo-transparent.png';
import {InterfaceGlyph} from './InterfaceGlyph';
import './operations-desk.css';
import './operations-glass.css';
import {FlightRouteEditor} from './FlightRouteEditor';
import {RunDetails, nextStepName} from './RunDetails';
import {placeName, shipIdFor} from './mission-trial';
import type {Locale} from './navigation';
import type {useFlight} from './use-flight';

function selectDeskControl(event: MouseEvent<HTMLElement>) {
  if (!(event.target instanceof Element)) return;
  const control = event.target.closest<HTMLElement>('button:not(.hologram-label):enabled, a[href], summary');
  if (!control || !event.currentTarget.contains(control)) return;
  event.currentTarget.querySelector('[data-desk-selected]')?.removeAttribute('data-desk-selected');
  control.setAttribute('data-desk-selected', '');
}

// Move the short reflection across the front optic without rerendering the map.
function moveKeyReflection(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) return;
  const key = event.target.closest<HTMLElement>('button:not(.hologram-label), summary, a');
  if (!key || !event.currentTarget.contains(key)) return;
  const bounds = key.getBoundingClientRect();
  if (!bounds.width) return;
  const fraction = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  key.style.setProperty('--reflection-x', (15 + fraction * 70) + '%');
}

export function FlightOperations({flight, locale, controlMode}:{
  flight:ReturnType<typeof useFlight>; locale:Locale; controlMode:boolean;
}) {
  const {plan,run,draft} = flight.session;
  const en = locale==='en';
  const t = (ko:string,eng:string)=>en?eng:ko;
  const [selected,select] = useState<string|null>(null);
  const visit=plan && run ? plan.visits[run.index] : undefined;
  const jump=visit && run ? visit.jumps[run.jump] : undefined;
  const ship=plan?.ship || (draft.customShip?.id===draft.ship?draft.customShip:cargoShip(shipIdFor(draft.ship)));
  const boxes=run?.aboard || [];
  const [override,setOverride]=useState<{visit:typeof visit;before:boolean}|null>(null);
  const before=override?.visit===visit && override ? override.before : !visit?.events.some(e=>e.type==='pickup');
  const projected=plan&&run&&visit ? (before ? plan.visits[run.index-1]?.packing || plan.initialPacking : visit.packing) : null;
  const selectedBox=(projected?.boxes || boxes).find(box=>box.boxId===selected);
  const selectedContract=draft.jobs.find(job=>job.id===selectedBox?.missionId);
  const simple=plan ? plan.mode==='simple' : draft.partner==='operator';
  const voice=flightVoice(simple?'aide':'standard',en);
  const used=simple?(run?.loadScu??0):boxes.reduce((n,b)=>n+b.size,0);
  const packing={boxes,used,capacity:plan?.capacity||0,bins:ship.grids.map((_,i)=>({used:boxes.reduce((n,b)=>n+(b.bin===i?b.size:0),0)}))};
  const where=(id:string)=>placeName(id,locale==='ko'?0:1);
  const actionLabel=jump?t('점프 완료','Complete jump'):visit?.events.some(e=>e.type==='departure')?t('출발 완료','Departed'):
    visit?.events.every(e=>e.type==='pickup')?t('접수 완료','Confirm pickup'):visit?.events.every(e=>e.type==='delivery')?t('배송 완료','Confirm delivery'):t('거점 작업 완료','Complete stop');
  useEffect(()=>{
    if(!controlMode||!run?.started||run.finished||flight.busy)return;
    const key=(e:KeyboardEvent)=>{
      if(e.repeat||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||!['Space','Enter'].includes(e.code))return;
      if(e.target instanceof Element && e.target.closest('button,a,input,textarea,select,summary,[contenteditable]'))return;
      e.preventDefault();flight.progress('complete');
    };
    window.addEventListener('keydown',key);
    return ()=>window.removeEventListener('keydown',key);
  },[controlMode,run,flight]);
  const cargoLines=<>
      {visit && run && plan && !jump && <ol><li><b>{t('거점','Stop')} {run.index+1} / {plan.visits.length}</b>{visit.events.filter(e=>(e.type==='pickup'||e.type==='delivery')&&!e.reservationContinuation).map((e,i)=><span key={i} className="trial-task">{e.type==='pickup'?t('픽업','Pickup'):t('배송','Delivery')} · {e.commodity} · {e.pickupQuantityUnknown || simple && !e.scu && !e.reservationContinuation?t('수량 미확인','Quantity unknown'):e.scu+' SCU'}{e.type==='pickup'&&e.deliveryId&&' → '+where(e.deliveryId)}
        {e.containers&&<small>{e.estimatedBoxes?t('예상 상자','Estimated crates'):t('상자','Crates')} · {e.containers}</small>}</span>)}</li></ol>}
      {!simple && !jump && !!visit?.blocked?.length && <details><summary>{t('하역 전에 옮길 상자','Crates to move before unloading')} · {visit.blocked.length}</summary>
        <ul>{visit.blocked.map(block=><li key={block.boxId}>{block.boxId} ← {block.blockers.map(b=>b.boxId).join(', ')}</li>)}</ul></details>}

  </>;
  const mapIndex=plan&&run?Math.min(run.index,plan.visits.length-1):-1;
  const instruction=run?.finished?voice.done:jump?voice.jumpWork(jump.entryName,jump.exitName):
    !visit?voice.welcomeSub:!run?.started?voice.ready:visit.events.some(e=>e.type==='departure')?
      voice.departure(where(visit.locationId)):voice.atStop(where(visit.locationId));
  const totalSteps=plan?.visits.reduce((sum,v)=>sum+1+v.jumps.length,0)||0;
  const completedSteps=plan&&run?plan.visits.slice(0,run.index).reduce((sum,v)=>sum+1+v.jumps.length,0)+run.jump:0;
  return <section onPointerMove={controlMode ? moveKeyReflection : undefined} onClickCapture={controlMode ? selectDeskControl : undefined} className={controlMode?'flight-operations operations-desk':'flight-operations'}>
    {controlMode ? <>
      <header className="ops-mast">
        <div className="ops-brand"><img src={crest} alt="STAM"/><b>STAM</b></div>
        <h1>{t('관제 콘솔','Control console')}</h1>
        <span className="ops-status" data-active={flight.active}>{run?.finished?t('운송 완료','Haul complete'):flight.active?(run?.since===null?t('타이머 일시정지','Timer paused'):t('운항 중','In flight')):plan?t('출항 준비','Ready for departure'):t('계약 대기','Awaiting contract')}</span>
        <a className="ops-return" href={'#/operations?lang='+locale+'&mode=workspace'}>↗ {t('메인 화면','Workspace')}</a>
      </header>
      <Suspense fallback={<p className="ops-map" role="status">{t('지도 준비 중…','Preparing map…')}</p>}><OperationsMap locale={locale} plan={plan} index={mapIndex} position={jump?.entryId??visit?.locationId??run?.positionId}/></Suspense>
      <section className="ops-hold" aria-label={t('화물 적재','Cargo hold')}>
        <header className="ops-panel-head"><InterfaceGlyph kind="operations"/><h2>{t('화물 적재','Cargo hold')}</h2>
          <span>{ship.name}{!simple && plan && <b className="ops-load">{projected?.used ?? packing.used} / {plan.capacity} SCU</b>}</span>
        </header>

        <Suspense fallback={<p role="status">{t('적재 화면 준비 중…','Preparing cargo view…')}</p>}>
          <CargoViewport ship={ship} packing={simple?null:projected?{...projected,capacity:plan?.capacity??0}:packing} locale={locale} selected={selected} onSelect={select}/>
        </Suspense>
        {!simple && visit && <div className="ops-phase" role="group" aria-label={t('거점 작업 시점','Stop operations')}>
          <button aria-pressed={before} onClick={()=>{setOverride({visit,before:true});select(null);}}>{t('작업 전','Before')}</button>
          <button aria-pressed={!before} onClick={()=>{setOverride({visit,before:false});select(null);}}>{t('작업 후','After')}</button>
        </div>}
        {selectedBox && <output className="ops-box">{selectedBox.commodity} · {selectedBox.size} SCU · {selectedContract?.title[locale==='ko'?0:1]||selectedBox.missionId} → {where(selectedBox.dropoffId)} · {ship.grids[selectedBox.bin]?.name}</output>}
        {simple && <small className="ops-box">{t('간편 경로 · 상자 배치 미계산','Route only · no crate layout')}</small>}
      </section>
    </> : <a className="return-link" href={'#/operations?lang='+locale}>{t('관제 콘솔 열기','Open control console')}</a>}
    {simple && plan && run && !controlMode && <details className="flight-route-editor" open><summary>{t('픽업·배송 순서','Pickup and delivery order')}</summary>
      <ol>{plan.visits.map((stop,i)=><li key={i} aria-current={i===run.index?'step':undefined}>
        <b>{where(stop.locationId)}</b> <span>{i<run.index?t('완료','Done'):i===run.index?t('현재 거점','Current stop'):''}</span>
      </li>)}</ol></details>}
    <div className={controlMode?'ops-progress':undefined}>
    {controlMode && <header className="ops-panel-head"><InterfaceGlyph kind="bridge"/><h2>{t('운항 진행','Flight progress')}</h2>
      {totalSteps>0 && <ConsoleDial value={Math.min(completedSteps,totalSteps)} maximum={totalSteps} label={t('완료','Done')+' / '+totalSteps}/>}</header>}
    {(!plan||!run)?<div className="trial-brief ops-empty"><h2>{t('계약을 선택해 주세요','Choose a contract')}</h2><a href={'#/mission?lang='+locale}>{t('미션 콘솔에서 계약 선택','Select contracts in the mission console')} →</a></div>:
    <div className="trial-brief"><small>{simple?t('간편 경로','Route only'):t('상세 적재','Cargo planning')} · {used} SCU{simple && draft.jobs.some(j=>j.shipments.some(r=>!r.scu&&!j.reservations?.[r.to])) && t(' 확인분',' confirmed')}</small>
      <h2>{run.finished?t('운송 완료','Haul complete'):jump?jump.entryName+' → '+jump.exitName:visit?where(visit.locationId):''}</h2>
      {!controlMode && cargoLines}
      {controlMode && totalSteps>0 && <progress value={completedSteps} max={totalSteps} aria-label={t('운항 진행','Flight progress')}/>}
      {visit&&<p className="flight-next">{t('다음','Next')} · {nextStepName(plan,run,where)??t('이 단계에서 운송 완료','Haul complete after this step')}</p>}
      <div className="flight-actions">
        {!run.started && <button className="manifest-primary" onClick={()=>flight.progress('start')}>{t('운항 시작','Start run')}</button>}
        {run.started && !run.finished && <><button key={actionLabel} className="manifest-primary" disabled={flight.busy} onClick={()=>flight.progress('complete')}>{actionLabel}{controlMode && <kbd>Space</kbd>}</button>
          <details className="ops-run-menu"><summary>{t('운항 관리','Run options')}</summary><div>
          <button disabled={flight.busy} onClick={()=>flight.progress('pause')}>{run.since===null?t('타이머 재개','Resume timer'):t('타이머 일시정지','Pause timer')}</button>
          <button disabled={flight.busy} onClick={()=>flight.calculate(undefined,true)}>{t('현재 위치에서 재계산','Replan from here')}</button>
          <button disabled={flight.busy} onClick={()=>flight.calculate(undefined,true,'defer')}>{t('이 거점 나중에','Defer this stop')}</button>
          <button disabled={flight.busy} onClick={()=>{if(window.confirm(t('현재 운항을 종료하고 계약을 다시 준비할까요?','End this run and return to planning?')))flight.stop();}}>{t('운항 종료','End run')}</button></div></details></>}
        {run.history.length>0 && <button disabled={flight.busy} onClick={()=>flight.progress('undo')}>{t('직전 작업 되돌리기','Undo last action')}</button>}
        {run.finished && <button onClick={()=>{
          if(window.confirm(t('완료한 계약을 목록에서 비우고 마지막 거점에서 다음 운송을 준비할까요?','Clear finished contracts and prepare the next haul from this stop?'))){
            flight.nextFlight();location.hash='#/mission?lang='+locale;
          }
        }}>{t('다음 운송 준비','Prepare next haul')}</button>}
      </div>
    </div>}
    {plan&&run&&<RunDetails session={flight.session} locale={locale}/>}
    {plan && <FlightRouteEditor key={plan.startId+String(run?.index)} flight={flight} locale={locale}/>}
    </div>
    {controlMode && <aside className="ops-partner"><div className="ops-portrait"><img src={simple?operatorPortrait:navigatorPortrait} alt=""/></div><div className="ops-transmission"><small>{t('파트너 통신','Partner comms')}</small><h2>{voice.role}</h2><p aria-live="polite">{instruction}</p>{cargoLines}</div></aside>}
  </section>;
}
