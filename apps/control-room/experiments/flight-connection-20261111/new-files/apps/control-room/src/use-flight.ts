import {useEffect,useRef,useState} from 'react';
import {readDraft} from './mission-trial';
import type {Draft} from './mission-trial';
import type {FlightPlan} from './flight-types';
import {adoptReplan,blankRun,completeStep,contextOf,decodeSession,fingerprint,pauseRun,sessionKey,startRun,undoStep} from './flight-session';
import type {Session} from './flight-session';
let memory:Session|null=null;
function restore(){
 try{return {session:memory??decodeSession(localStorage.getItem(sessionKey))??{version:1 as const,draft:readDraft(),plan:null,run:null},error:''};}
 catch{return {session:{version:1 as const,draft:readDraft(),plan:null,run:null},error:'저장된 운항을 읽지 못했습니다. 원본을 보존했으므로 새 계획으로 덮어쓰지 않습니다.'};}
}
export function useFlight(){
 const [initial]=useState(restore),[session,setSession]=useState<Session>(initial.session);
 const [error,setError]=useState(initial.error),[storageError,setStorageError]=useState(''),[busy,setBusy]=useState(false);
 const worker=useRef<Worker|null>(null),current=useRef(session);current.current=session;
 useEffect(()=>()=>{worker.current?.terminate();},[]);
 const blocked=!!initial.error,active=!!session.run?.started&&!session.run.finished;
 function commit(next:Session){
  if(blocked)return;memory=next;current.current=next;setSession(next);
  try{localStorage.setItem(sessionKey,JSON.stringify(next));setStorageError('');}
  catch{setStorageError('브라우저에 저장하지 못했습니다. 현재 화면에서는 유지되지만 닫기 전에 운항 백업을 내려받으세요.');}
 }
 function change(draft:Draft){if(active||busy||blocked)return;setError('');commit({version:1,draft,plan:null,run:null});}
 function calculate(onReady?:()=>void,replan=false){
  if(busy||blocked||active&&!replan)return;
  const prior=current.current,stamp=fingerprint(prior.draft);setBusy(true);setError('');
  try{
   const next=new Worker(new URL('./flight.worker.mjs',import.meta.url),{type:'module'});worker.current=next;
   const finish=()=>{next.terminate();if(worker.current===next)worker.current=null;setBusy(false);};
   next.onmessage=({data}:{data:{plan?:FlightPlan;error?:string}})=>{
    if(worker.current!==next)return;finish();if(fingerprint(current.current.draft)!==stamp)return;
    if(data.error||!data.plan){setError(data.error||'계산 결과를 읽지 못했습니다.');return;}
    commit({...prior,draft:{...prior.draft,reviewed:true},plan:data.plan,run:replan&&prior.run?adoptReplan(prior.run):blankRun(data.plan)});onReady?.();
   };
   next.onerror=()=>{finish();setError('계산을 완료하지 못했습니다. 기존 운항은 유지됩니다.');};
   next.postMessage({draft:prior.draft,context:replan&&prior.run?contextOf(prior.run):undefined});
  }catch{setBusy(false);setError('항로 계산기를 시작하지 못했습니다.');}
 }
 function progress(action:'start'|'complete'|'undo'|'pause'){
  const s=current.current;if(busy||blocked||!s.plan||!s.run)return;
  const run=action==='start'?startRun(s.run):action==='complete'?completeStep(s.plan,s.run):action==='undo'?undoStep(s.run):pauseRun(s.run);
  commit({...s,run});
 }
 function backup(){
  const blob=new Blob([JSON.stringify(current.current,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='stam-flight-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return {session,change,calculate,progress,busy,active,blocked,error,storageError,backup};
}
