import {initializeOwner,readOwner,accountBoundary,archivedFlight,FLIGHT_KEYS} from '../../../flight-ownership.mjs';
import {activateLocations,readPersonalLocations,locationDataFor} from './personal-locations.mjs';
import {useEffect,useMemo,useRef,useState} from 'react';
import {validateFlight,exportFlight,importFlight,persistRestoredFlight,previousFlightKey} from './flight-backup';
import {observeReceipts,pendingReceiptChanges,prepareReceiptUpdate,receiptBaseline} from './flight-receipts';
import {receiptEvidence} from './receipt-cache';
import type {ReceiptAction} from './flight-receipts';
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
 return {locationEdits:readPersonalLocations(),missions:json('vh-missions','[]'),settings:json('vh-settings','{}'),customShips:json('vh-ships','[]'),run:json('sfc-run','null'),
   mode:localStorage.getItem('vh-mode'),start:localStorage.getItem('vh-start'),shipId:localStorage.getItem('vh-ship-id'),voice:localStorage.getItem('sfc-voice')};
}
function restore(){
 try{
  initializeOwner(localStorage);
  const saved=decodeSession(localStorage.getItem(sessionKey));
  // Existing plans used public coordinates; never retrofit personal edits into them.
  const edits=saved?.draft.locationEdits??(saved?.plan?[]:readPersonalLocations());
  activateLocations(edits);
  const session=saved??{version:1 as const,draft:readDraft(),plan:null,run:null};
  return {session:{...session,draft:{...session.draft,locationEdits:edits}},error:''};
 }
 catch{return {session:{version:1 as const,draft:readDraft(),plan:null,run:null},error:'저장된 운항 또는 개인 장소를 읽지 못했습니다. 원본은 유지됩니다. 기존 장소 관리의 좌표·소속 천체 또는 운항 백업을 확인하세요.'};}
}
export function useFlight(){
 const receipts=useLogReceipts();
 const [initial]=useState(restore),[session,setSession]=useState<Session>(initial.session);
 const [error,setError]=useState(initial.error),[storageError,setStorageError]=useState(''),[busy,setBusy]=useState(false);
 const worker=useRef<Worker|null>(null),current=useRef(session);current.current=session;
 useEffect(()=>()=>{worker.current?.terminate();},[]);
 const [hasSaved]=useState(()=>{try{return savedFlight().missions.length>0;}catch{return false;}});
 const [restoreBlocked,setBlocked]=useState(!!initial.error);
 const [owner]=useState(()=>{try{return readOwner(localStorage);}catch{return 'invalid';}});
 const [accountLocked,setAccountLocked]=useState(()=>['checking','error'].includes(accountBoundary().phase));
 const [initialRaw]=useState(()=>{try{return localStorage.getItem(sessionKey);}catch{return null;}});
 const locked=useRef(false),savedRaw=useRef(initialRaw);
 const accountMessage='계정 자료가 변경되었거나 확인 중입니다. 확인을 마친 뒤 새로고침하세요. 현재 화면의 운항은 백업할 수 있습니다.';
 function ownerReady(){
  try{return !locked.current&&!['checking','error'].includes(accountBoundary().phase)&&readOwner(localStorage)===owner&&localStorage.getItem(sessionKey)===savedRaw.current&&!localStorage.getItem('stam.account-storage-journal.v1');}catch{return false;}
 }
 const blocked=restoreBlocked||accountLocked;
 function writable(){if(!ownerReady()){setAccountLocked(true);setError(accountMessage);return false;}return !restoreBlocked;}
 useEffect(()=>{
  const check=()=>{const disabled=!ownerReady();setAccountLocked(disabled);if(disabled){worker.current?.terminate();worker.current=null;setBusy(false);setError(accountMessage);}else setError(e=>e===accountMessage?'':e);};
  const changed=(e:StorageEvent)=>{if(!e.key||[sessionKey,previousFlightKey,'stam.flight-owner.v1','stam.account-storage-journal.v1','vh-account-meta'].includes(e.key)){locked.current=true;check();}};
  check();window.addEventListener('stam-account-boundary',check);window.addEventListener('storage',changed);
  return()=>{window.removeEventListener('stam-account-boundary',check);window.removeEventListener('storage',changed);};
 },[owner]);
 const [locationUpdate,setLocationUpdate]=useState('');
 useEffect(()=>{
  const check=()=>{try{setLocationUpdate(JSON.stringify(readPersonalLocations())===JSON.stringify(current.current.draft.locationEdits||[])?'':'changed');}catch{setLocationUpdate('invalid');}};
  check();window.addEventListener('storage',check);window.addEventListener('focus',check);
  return()=>{window.removeEventListener('storage',check);window.removeEventListener('focus',check);};
 },[session.draft.locationEdits]);
 function refreshLocations(){
  if(current.current.run?.started||worker.current||blocked)return;
  try{const locationEdits=readPersonalLocations();commit({...current.current,draft:{...current.current.draft,locationEdits,reviewed:false},plan:null,run:null});setError('');setLocationUpdate('');}
  catch{setError('개인 장소의 좌표·소속 천체를 확인하세요. 기존 계약과 장소 정보는 유지됩니다.');}
 }

 const active=!!session.run?.started&&!session.run.finished;
 const receiptSource=useRef(receipts);receiptSource.current=receipts;
 const receiptChanges=useMemo(()=>pendingReceiptChanges(session),[session]);
 useEffect(()=>{
  if(blocked||receipts.cached||receipts.phase!=='loaded')return;
  const next=observeReceipts(current.current,receipts.rawCards);
  if(next!==current.current)commit(next);
 },[receipts.rawCards,receipts.phase,receipts.cached,active,blocked]);
 function commit(next:Session){
  if(!writable())return;activateLocations(next.draft.locationEdits);current.current=next;setSession(next);
  try{const raw=JSON.stringify(next);localStorage.setItem(sessionKey,raw);savedRaw.current=raw;setStorageError('');}
  catch{setStorageError('브라우저에 저장하지 못했습니다. 현재 화면에서는 유지되지만 닫기 전에 운항 백업을 내려받으세요.');}
 }
 function change(draft:Draft){if(active||busy||!writable())return;setError('');commit({version:1,draft,plan:null,run:null});}
 function appendContracts(parse:(jobs:Job[])=>{jobs:Job[];skipped:number}){
  const s=current.current;
  if(!writable()||worker.current||s.run?.started&&!s.run.finished)throw Error('운항 준비 중에 계약을 불러올 수 있습니다.');
  const additions=parse(s.draft.jobs);
  if(additions.jobs.length)commit({version:1,draft:{...s.draft,reviewed:false,jobs:[...s.draft.jobs,...additions.jobs]},plan:null,run:null});
  return additions;
 }
 function calculate(onReady?:()=>void,replan=false,source?:'saved'|'defer',manualStops?:string[],from?:string){
  if(worker.current||!writable()||active&&!replan)return;
  const prior=current.current,stamp=fingerprint(prior.draft),revision=JSON.stringify(prior);
  const receiptVersion=()=>JSON.stringify(receiptSource.current.rawCards.filter(r=>prior.draft.jobs.some(j=>j.id===r.id)).map(r=>[r.id,receiptEvidence(r)]));
  const sourceRevision=receiptVersion();
  if(replan&&pendingReceiptChanges(prior).length){setError('계약 변경 내용을 먼저 확인하세요. 기존 경로는 유지됩니다.');return;}
  if(!replan && source!=='saved' && prior.draft.jobs.some(j=>j.signature && receipts.cards.some(c=>c.id===j.id && ((c.state!=='ready' && !(prior.draft.partner==='operator' && routeReady(c)) && !(c.state==='incomplete' && (j.reviewedReceipt || quantityPlan(missionFor(j),prior.draft.allowUpperBounds!==false).ready)))||c.signature!==j.signature)))){
    setError('수신한 계약의 내용이 바뀌었습니다. 해당 카드를 빼고 수신함에서 다시 확인하세요.');return;
  }
  setBusy(true);setError('');
  try{
   const next=new Worker(new URL('./flight.worker.mjs',import.meta.url),{type:'module'});worker.current=next;
   const finish=()=>{next.terminate();if(worker.current===next)worker.current=null;setBusy(false);};
   next.onmessage=({data}:{data:{plan?:FlightPlan;session?:Session;error?:string}})=>{
    if(worker.current!==next)return;finish();if(!writable())return;if(fingerprint(current.current.draft)!==stamp||JSON.stringify(current.current)!==revision||receiptVersion()!==sourceRevision){setError('계산 중 운항이나 수신 내용이 바뀌었습니다. 기존 운항을 유지합니다. 다시 확인하세요.');return;}
    if(data.session){commit(data.session);onReady?.();return;}
    if(data.error||!data.plan){setError(data.error||'계산 결과를 읽지 못했습니다.');return;}
    commit({...prior,...(!replan?{receiptReview:receiptBaseline(prior.draft,receiptSource.current.rawCards)}:{}),draft:{...prior.draft,reviewed:true},plan:data.plan,run:replan&&prior.run?adoptReplan({...prior.run,positionId:data.plan.startId},data.plan):blankRun(data.plan)});onReady?.();
   };
   next.onerror=()=>{finish();setError('계산을 완료하지 못했습니다. 기존 운항은 유지됩니다.');};
   const disabledGrids=replan?prior.plan?.ship.grids.filter(g=>g.disabled).map(g=>g.id):readCargoPreferences()?.disabled?.[shipIdFor(prior.draft.ship)];
   const context=replan&&prior.run?{...contextOf(prior.run),excludedMissionIds:prior.receiptReview?.excluded,mode:prior.plan?.mode||'detail',disabledGrids,avoidFirst:source==='defer'?prior.plan?.visits[prior.run.index]?.locationId:undefined,showDeparture:prior.plan?.visits[prior.run.index]?.events.some(e=>e.type==='departure')}:{disabledGrids};
   next.postMessage(source==='saved'?{saved:savedFlight()}:{draft:prior.draft,context:{...context,...(from?{startId:from}:{}),manualStops}});
  }catch{worker.current?.terminate();worker.current=null;setBusy(false);setError('항로 계산기를 시작하지 못했습니다.');}
 }
 function progress(action:'start'|'complete'|'undo'|'pause'){
  const s=current.current;if(busy||!writable()||!s.plan||!s.run)return;
  if((action==='complete'||action==='start')&&pendingReceiptChanges(s).length){setError('계약 변경 내용을 먼저 확인하세요. 기존 운항은 유지됩니다.');return;}
  const run=action==='start'?startRun(s.run):action==='complete'?completeStep(s.plan,s.run):action==='undo'?undoStep(s.run):pauseRun(s.run);
  const next={...s,run};commit(next);
  try{if(ownerReady())updateFlightHistory(next,s.run);}catch{setStorageError('운항 기록을 저장하지 못했습니다. 운항 백업을 내려받으세요.');}
 }
 function confirmReceiptChanges(actions:Record<string,ReceiptAction>,token:string,expected:string){
  if(worker.current||!writable())return;
  const prior=current.current;
  try{
   if(JSON.stringify(prior)!==expected)throw Error('운항이나 수신 내용이 바뀌었습니다. 변경 내용을 다시 열어 확인하세요.');
   prepareReceiptUpdate(prior,actions,token);
   const stored=localStorage.getItem(sessionKey);
   setBusy(true);setError('');
   const next=new Worker(new URL('./flight.worker.mjs',import.meta.url),{type:'module'});worker.current=next;
   const finish=()=>{next.terminate();if(worker.current===next)worker.current=null;setBusy(false);};
   next.onmessage=({data}:{data:{session?:Session;error?:string}})=>{
    if(worker.current!==next)return;finish();if(!writable())return;
    try{
     const latest=receiptSource.current;
     const observed=latest.phase==='loaded'&&!latest.cached?observeReceipts(current.current,latest.rawCards):current.current;
     if(JSON.stringify(observed)!==expected||localStorage.getItem(sessionKey)!==stored)throw Error('계산 중 운항이나 수신 내용이 바뀌었습니다. 기존 운항을 유지합니다. 다시 확인하세요.');
     if(data.error||!data.session)throw Error(data.error||'재계산 결과를 읽지 못했습니다.');
     validateFlight(data.session);
     try{persistRestoredFlight(localStorage,data.session,exportFlight(prior));}catch{throw Error('변경을 저장하지 못해 기존 운항을 유지합니다. 저장 공간을 확인하고 다시 시도하세요.');}
     savedRaw.current=JSON.stringify(data.session);current.current=data.session;setSession(data.session);setStorageError('');
     try{updateFlightHistory(data.session,prior.run!);}catch{setStorageError('운항 기록을 저장하지 못했습니다. 운항 백업을 내려받으세요.');}
    }catch(e){setError((e as Error).message);}
   };
   next.onerror=()=>{finish();setError('재계산하지 못했습니다. 기존 경로·선적·완료 기록을 유지합니다.');};
   next.postMessage({receiptUpdate:{session:prior,actions,token}});
  }catch(e){worker.current?.terminate();worker.current=null;setBusy(false);setError((e as Error).message);}
 }
 function dischargeHeld(ids:string[],expected:string){
  if(worker.current||!writable())return;
  const prior=current.current,stored=localStorage.getItem(sessionKey);
  if(JSON.stringify(prior)!==expected){setError('운항 내용이 바뀌었습니다. 보류 화물을 다시 확인하세요.');return;}
  setBusy(true);setError('');
  try{
   const next=new Worker(new URL('./flight.worker.mjs',import.meta.url),{type:'module'});worker.current=next;
   const finish=()=>{next.terminate();if(worker.current===next)worker.current=null;setBusy(false);};
   next.onmessage=({data}:{data:{session?:Session;error?:string}})=>{
    if(worker.current!==next)return;finish();
    try{
     if(!writable()||JSON.stringify(current.current)!==expected||localStorage.getItem(sessionKey)!==stored)throw Error('운항이나 계정이 바뀌었습니다. 보류 화물을 다시 확인하세요.');
     if(data.error||!data.session)throw Error(data.error||'보류 화물 정리 결과를 읽지 못했습니다.');
     validateFlight(data.session);
     try{persistRestoredFlight(localStorage,data.session,exportFlight(prior));}catch{throw Error('저장하지 못해 보류 화물을 그대로 유지합니다. 다시 시도하세요.');}
     savedRaw.current=JSON.stringify(data.session);current.current=data.session;setSession(data.session);setStorageError('');
     try{updateFlightHistory(data.session,prior.run!);}catch{setStorageError('운송기록 저장에 실패했습니다. 운항 백업을 내려받으세요.');}
    }catch(e){setError((e as Error).message);}
   };
   next.onerror=()=>{finish();setError('보류 화물을 정리하지 못했습니다. 기존 선적은 유지됩니다.');};
   next.postMessage({heldUnload:{session:prior,ids}});
  }catch(e){worker.current?.terminate();worker.current=null;setBusy(false);setError((e as Error).message);}
 }
 function backup(){
  const text=restoreBlocked?(initialRaw||exportFlight(current.current)):exportFlight(current.current);
  const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='stam-flight-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function prepareRestore(text:string){
  if(!ownerReady())throw Error(accountMessage);
  if(worker.current)throw Error('항로 계산이 끝난 뒤 복원하세요.');
  const next=importFlight(text),stamp=JSON.stringify(current.current),stored=localStorage.getItem(sessionKey);
  return {session:next,apply:()=>{
   if(!ownerReady())throw Error(accountMessage);
   if(worker.current||JSON.stringify(current.current)!==stamp||localStorage.getItem(sessionKey)!==stored)throw Error('현재 운항이 변경되었습니다. 백업 파일을 다시 선택해 확인하세요.');
   // Validate again: preview state must not bypass validation or mutate the candidate.
   const restored=importFlight(JSON.stringify(next));
   const previous=blocked?(localStorage.getItem(sessionKey)||exportFlight(current.current)):exportFlight(current.current);
   try{persistRestoredFlight(localStorage,restored,previous);}
   catch{throw Error('복원 전 운항과 복원 결과를 저장하지 못했습니다. 현재 운항을 유지합니다. 저장 공간을 확보한 뒤 다시 시도하세요.');}
   savedRaw.current=JSON.stringify(restored);activateLocations(restored.draft.locationEdits);current.current=restored;setSession(restored);setBlocked(false);setError('');setStorageError('');
  }};
 }
 function previousBackup(){if(!ownerReady())throw Error(accountMessage);const text=localStorage.getItem(previousFlightKey);if(!text)throw Error('복원 전 운항 백업이 없습니다.');return text;}
 function loginBackup(){if(!ownerReady())throw Error(accountMessage);const text=archivedFlight(localStorage,'unassigned')[FLIGHT_KEYS[0]]||archivedFlight(localStorage,'guest')[FLIGHT_KEYS[0]];if(!text)throw Error('로그인 전 운항 백업이 없습니다.');return text;}
 function nextFlight(){
  const s=current.current;
  if(!s.run?.finished||worker.current||!writable())return;
  try{const locationEdits=readPersonalLocations();if(!locationDataFor(locationEdits).locations.some(p=>p.id===s.run!.positionId))throw Error('Current stop missing');commit({version:1,draft:{...s.draft,locationEdits,jobs:[],start:s.run.positionId,received:false,reviewed:false},plan:null,run:null});}
  catch{setError('개인 장소 또는 현재 위치의 좌표를 확인할 수 없습니다. 기존 운항을 유지합니다. 장소 관리에서 확인하세요.');}
 }
 function stop(){if(worker.current||!writable())return;const s=current.current;commit({...s,draft:{...s.draft,reviewed:false},plan:null,run:null});}
 return {session,receipts,locationUpdate,refreshLocations,receiptChanges,confirmReceiptChanges,dischargeHeld,change,appendContracts,calculate,progress,stop,nextFlight,hasSaved,busy,active,blocked,error,storageError,backup,prepareRestore,previousBackup,loginBackup};
}
