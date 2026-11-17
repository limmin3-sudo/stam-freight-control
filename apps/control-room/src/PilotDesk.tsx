import {useEffect,useRef,useState,type MouseEvent} from 'react';
import type {Locale} from './navigation';
import type {useFlight} from './use-flight';
import {placeName,shipName} from './mission-trial';
import './pilot-desk.css';
export type PilotAction='ship'|'partner'|'missions'|'log';

export function PilotDesk({flight,locale,onAction}:{flight:ReturnType<typeof useFlight>;locale:Locale;onAction:(action:PilotAction,event:MouseEvent)=>void}){
 const [hover,setHover]=useState(false),[pinned,setPinned]=useState(false),[focused,setFocused]=useState(false);
 const closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko;
 const {draft,plan,run}=flight.session;
 const title=plan?.ship.name||(draft.customShip?.id===draft.ship?draft.customShip.name:shipName(draft.ship));
 const selected=!!(draft.partnerSelected||plan||run);
 const partner=selected?(plan?.mode==='simple'||draft.partner==='operator'?t('브리지 오퍼레이터','Bridge operator'):t('수석 항해사','Senior navigator')):t('파트너 선택 전','Choose a partner');
 const open=hover||pinned||focused;
 const visit=plan?.visits[run?.index??0];
 const phase=flight.busy?t('항로 계산 중','Planning route'):run?.finished?t('운송 완료','Haul complete'):flight.active?t('운항 중','In flight'):plan?t('출발 준비','Ready to depart'):t('운송 준비','Preparing');
 useEffect(()=>()=>{if(closeTimer.current!==null)clearTimeout(closeTimer.current);},[]);
 const enter=()=>{if(closeTimer.current!==null)clearTimeout(closeTimer.current);setHover(true);};
 const leave=()=>{closeTimer.current=setTimeout(()=>setHover(false),180);};
 const reset=()=>{
  if(window.confirm(t('현재 운항과 계산된 계획을 초기화할까요? 선택한 계약·함선·파트너는 유지됩니다.','Reset this run and its plan? Selected contracts, ship and partner will be kept.')))flight.stop();
 };
 return <section className="pilot-desk" data-open={open} aria-label="FLIGHT CONSOLE"
  onMouseEnter={enter} onMouseLeave={leave} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}
  onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();e.currentTarget.querySelector<HTMLButtonElement>('.pilot-summary')?.focus();setPinned(false);setHover(false);setFocused(false);}}}>
  <button type="button" className="pilot-summary" aria-expanded={open} aria-controls="pilot-desk-details" aria-pressed={pinned} title={pinned?t('클릭하여 접기','Click to collapse'):t('클릭하여 펼친 상태 고정','Click to keep open')}
   onClick={()=>{if(pinned){setPinned(false);setHover(false);setFocused(false);}else setPinned(true);}}>
   <span className="pilot-eyebrow">FLIGHT CONSOLE <span aria-hidden="true">{pinned?'◆':'⌄'}</span></span>
   <strong title={title}>{title}</strong>
   <span className="pilot-summary-line"><span>{partner}</span><b>{t('미션','Missions')} {draft.jobs.length}</b></span>
  </button>
  <div className="pilot-reveal" inert={!open} aria-hidden={!open} id="pilot-desk-details"><div className="pilot-details">
   <p className="pilot-phase"><i aria-hidden="true"/>{phase}</p>
   <dl><div><dt>{t('선택한 미션','Selected missions')}</dt><dd>{draft.jobs.length}</dd></div>
    <div><dt>{t('수신 계약','Log receipts')}</dt><dd>{flight.receipts.cards.length}</dd></div>
    <div><dt>{t('현재 목적지','Destination')}</dt><dd>{run?.finished?t('운송 완료','Complete'):visit?placeName(visit.locationId,en?1:0):t('항로 준비 전','No route yet')}</dd></div>
    {plan&&<div><dt>{t('이번 항로 방문','Route visits')}</dt><dd>{Math.min(run?.index??0,plan.visits.length)} / {plan.visits.length}</dd></div>}
    {selected&&draft.partner==='navigator'&&plan?.mode!=='simple'&&plan&&<div><dt>{t('적재 / 용량','Load / capacity')}</dt><dd>{Number.isFinite(run?.loadScu)?run!.loadScu:t('미확인','Unknown')} / {plan.capacity??t('미확인','Unknown')} SCU</dd></div>}
   </dl>
   <div className="pilot-actions">
    <button type="button" onClick={e=>onAction('ship',e)}>{t('함선 변경','Change ship')}</button>
    <button type="button" onClick={e=>onAction('partner',e)}>{t('파트너 변경','Change partner')}</button>
    <button type="button" className="pilot-wide" onClick={e=>onAction('missions',e)}>{t('미션 변경 · 취소','Manage missions')}</button>
    <button type="button" className="pilot-wide pilot-reset" disabled={flight.busy||flight.blocked||!plan&&!run} onClick={reset}>{t('운항·계획 초기화','Reset run & plan')}</button>
   </div>
   <p className="pilot-help">{flight.active?t('변경은 준비 화면에서 운항 상태에 따라 제한됩니다.','Changes follow the current run restrictions.'):t('변경·취소는 기존 미션 준비 화면에서 진행합니다.','Manage changes in the mission console.')}</p>
  </div></div>
 </section>;
}
