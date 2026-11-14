import {useEffect,useState,type MouseEvent} from 'react';
import {serviceControls} from './service-account.mjs';
import type {useLogReceipts} from './use-log-receipts';

export function PilotTopbar({receipts,en,onLog}:{receipts:ReturnType<typeof useLogReceipts>;en:boolean;onLog:(event:MouseEvent)=>void}){
 const [account,setAccount]=useState({name:'',status:''});
 useEffect(()=>{
  const button=serviceControls().accountButton;
  const sync=()=>setAccount({name:button.querySelector('b')?.textContent||'',status:button.querySelector('small')?.textContent||''});sync();
  const observer=new MutationObserver(sync);observer.observe(button,{childList:true,subtree:true,characterData:true});return()=>observer.disconnect();
 },[]);
 const t=(ko:string,english:string)=>en?english:ko;
 const state=receipts.phase==='error'||receipts.phase==='mixed'?'error':receipts.watching&&receipts.phase==='loaded'?'live':receipts.phase==='reading'||receipts.watching?'busy':receipts.phase==='loaded'?(receipts.cached?'cached':'file'):'off';
 const label=state==='live'?t('로그 자동 수신 중','Watching log'):state==='busy'?t('로그 확인 중','Reading log'):state==='cached'?t('저장 기록 · 로그 미연결','Saved receipts · Offline'):state==='file'?t('로그 파일 읽음','Log file read'):state==='error'?t('로그 확인 필요','Check log'):t('로그 미연결','Log not connected');
 const guest=!account.status||account.status==='계정';
 return <div className="pilot-topbar">
  <button type="button" className="pilot-account" onClick={()=>serviceControls().accountButton.click()} title={guest?t('계정 로그인','Sign in'):account.status}>
   <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3.5"/><path d="M4 21v-3a8 8 0 0 1 16 0v3Z"/></svg><span>{guest?t('로그인','Sign in'):account.name}</span>
  </button>
  <button type="button" className="pilot-log" data-log-state={state} onClick={onLog}><i aria-hidden="true"/><span>{label}</span></button>
 </div>;
}
