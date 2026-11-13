import {useEffect,useRef,useState} from 'react';
import {exportFlight,importFlight,persistRestoredFlight,previousFlightKey} from './flight-backup';
import {useLogReceipts} from './use-log-receipts';
import {updateFlightHistory} from './flight-history.mjs';
import {readCargoPreferences} from './cargo-plan.mjs';
import {readDraft,routeReady,shipIdFor} from './mission-trial';
import {missionFor} from './flight-engine.mjs';
import {quantityPlan} from './mission-quantities.mjs';
import type {Draft,Job} from './mission-trial';
import type {FlightPlan} from './flight-types';
import {adoptReplan,blankRun,completeStep,contextOf,decodeSession,fingerprint,pauseRun,sessionKey,startRun,undoStep} from './flight-session';
import type {Session} from './flight-session';
function savedFlight(){
 const json=(key:string,fallback:string)=>JSON.parse(localStorage.getItem(key)||fallback);
 return {missions:json('vh-missions','[]'),settings:json('vh-settings','{}'),customShips:json('vh-ships','[]'),run:json('sfc-run','null'),
   mode:localStorage.getItem('vh-mode'),start:localStorage.getItem('vh-start'),shipId:localStorage.getItem('vh-ship-id'),voice:localStorage.getItem('sfc-voice')};
}
function restore(){
 try{return {session:decodeSession(localStorage.getItem(sessionKey))??{version:1 as const,draft:readDraft(),plan:null,run:null},error:''};}
 catch{return {session:{version:1 as const,draft:readDraft(),plan:null,run:null},error:'저장된 운항을 읽지 못했습니다. 원본을 보존했으므로 새 계획으로 덮어쓰지 않습니다.'};}
}
export function useFlight(){
 const receipts=useLogReceipts();
 const [initial]=useState(restore),[session,setSession]=useState<Session>(initial.session);
 const [error,setError]=useState(initial.error),[storageError,setStorageError]=useState(''),[busy,setBusy]=useState(false);
 const worker=useRef<Worker|null>(null),current=useRef(session);current.current=session;
 useEffect(()=>()=>{worker.current?.terminate();},[]);
 const [hasSaved]=useState(()=>{try{return savedFlight().missions.length>0;}catch{return false;}});
 const [blocked,setBlocked]=useState(!!initial.error);
 const active=!!session.run?.started&&!session.run.finished;
 function commit(next:Session){
  if(blocked)return;current.current=next;setSession(next);
  try{localStorage.setItem(sessionKey,JSON.stringify(next));setStorageError('');}
  catch{setStorageError('브라우저에 저장하지 못했습니다. 현재 화면에서는 유지되지만 닫기 전에 운항 백업을 내려받으세요.');}
 }
 function change(draft:Draft){if(active||busy||blocked)return;setError('');commit({version:1,draft,plan:null,run:null});}
 function appendContracts(parse:(jobs:Job[])=>{jobs:Job[];skipped:number}){
  const s=current.current;
  if(blocked||worker.current||s.run?.started&&!s.run.finished)throw Error('운항 준비 중에 계약을 불러올 수 있습니다.');
  const additions=parse(s.draft.jobs);
  if(additions.jobs.length)commit({version:1,draft:{...s.draft,reviewed:false,jobs:[...s.draft.jobs,...additions.jobs]},plan:null,run:null});
  return additions;
 }
 function calculate(onReady?:()=>void,replan=false,source?:'saved'|'defer',manualStops?:string[],from?:string){
  if(worker.current||blocked||active&&!replan)return;
  const prior=current.current,stamp=fingerprint(prior.draft);
  if(!replan && source!=='saved' && prior.draft.jobs.some(j=>j.signature && receipts.cards.some(c=>c.id===j.id && ((c.state!=='ready' && !(prior.draft.partner==='operator' && routeReady(c)) && !(c.state==='incomplete' && (j.reviewedReceipt || quantityPlan(missionFor(j),prior.draft.allowUpperBounds!==false).ready)))||c.signature!==j.signature)))){
    setError('수신한 계약의 내용이 바뀌었습니다. 해당 카드를 빼고 수신함에서 다시 확인하세요.');return;
  }
  setBusy(true);setError('');
  try{
   const next=new Worker(new URL('./flight.worker.mjs',import.meta.url),{type:'module'});worker.current=next;
   const finish=()=>{next.terminate();if(worker.current===next)worker.current=null;setBusy(false);};
   next.onmessage=({data}:{data:{plan?:FlightPlan;session?:Session;error?:string}})=>{
    if(worker.current!==next)return;finish();if(fingerprint(current.current.draft)!==stamp)return;
    if(data.session){commit(data.session);onReady?.();return;}
    if(data.error||!data.plan){setError(data.error||'계산 결과를 읽지 못했습니다.');return;}
    commit({...prior,draft:{...prior.draft,reviewed:true},plan:data.plan,run:replan&&prior.run?adoptReplan({...prior.run,positionId:data.plan.startId}):blankRun(data.plan)});onReady?.();
   };
   next.onerror=()=>{finish();setError('계산을 완료하지 못했습니다. 기존 운항은 유지됩니다.');};
   const disabledGrids=replan?prior.plan?.ship.grids.filter(g=>g.disabled).map(g=>g.id):readCargoPreferences()?.disabled?.[shipIdFor(prior.draft.ship)];
   const context=replan&&prior.run?{...contextOf(prior.run),mode:prior.plan?.mode||'detail',disabledGrids,avoidFirst:source==='defer'?prior.plan?.visits[prior.run.index]?.locationId:undefined,showDeparture:prior.plan?.visits[prior.run.index]?.events.some(e=>e.type==='departure')}:{disabledGrids};
   next.postMessage(source==='saved'?{saved:savedFlight()}:{draft:prior.draft,context:{...context,...(from?{startId:from}:{}),manualStops}});
  }catch{worker.current?.terminate();worker.current=null;setBusy(false);setError('항로 계산기를 시작하지 못했습니다.');}
 }
 function progress(action:'start'|'complete'|'undo'|'pause'){
  const s=current.current;if(busy||blocked||!s.plan||!s.run)return;
  const run=action==='start'?startRun(s.run):action==='complete'?completeStep(s.plan,s.run):action==='undo'?undoStep(s.run):pauseRun(s.run);
  const next={...s,run};commit(next);
  try{updateFlightHistory(next,s.run);}catch{setStorageError('운항 기록을 저장하지 못했습니다. 운항 백업을 내려받으세요.');}
 }
 function backup(){
  const text=blocked?(localStorage.getItem(sessionKey)||exportFlight(current.current)):exportFlight(current.current);
  const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='stam-flight-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function prepareRestore(text:string){
  if(worker.current)throw Error('항로 계산이 끝난 뒤 복원하세요.');
  const next=importFlight(text),stamp=JSON.stringify(current.current),stored=localStorage.getItem(sessionKey);
  return {session:next,apply:()=>{
   if(worker.current||JSON.stringify(current.current)!==stamp||localStorage.getItem(sessionKey)!==stored)throw Error('현재 운항이 변경되었습니다. 백업 파일을 다시 선택해 확인하세요.');
   // Validate again: preview state must not bypass validation or mutate the candidate.
   const restored=importFlight(JSON.stringify(next));
   const previous=blocked?(localStorage.getItem(sessionKey)||exportFlight(current.current)):exportFlight(current.current);
   try{persistRestoredFlight(localStorage,restored,previous);}
   catch{throw Error('복원 전 운항과 복원 결과를 저장하지 못했습니다. 현재 운항을 유지합니다. 저장 공간을 확보한 뒤 다시 시도하세요.');}
   current.current=restored;setSession(restored);setBlocked(false);setError('');setStorageError('');
  }};
 }
 function previousBackup(){const text=localStorage.getItem(previousFlightKey);if(!text)throw Error('복원 전 운항 백업이 없습니다.');return text;}
 function nextFlight(){
  const s=current.current;
  if(!s.run?.finished||worker.current||blocked)return;
  commit({version:1,draft:{...s.draft,jobs:[],start:s.run.positionId,received:false,reviewed:false},plan:null,run:null});
 }
 function stop(){if(worker.current||blocked)return;const s=current.current;commit({...s,draft:{...s.draft,reviewed:false},plan:null,run:null});}
 return {session,receipts,change,appendContracts,calculate,progress,stop,nextFlight,hasSaved,busy,active,blocked,error,storageError,backup,prepareRestore,previousBackup};
}
