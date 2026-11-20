import {useEffect,useState,type MouseEvent} from 'react';
import {ApprovedGlass} from './ApprovedGlass';
import './pilot-connections-topbar.css';
import {serviceControls} from './service-account.mjs';
import type {useLogReceipts} from './use-log-receipts';

export function PilotConnections({receipts,en,onLog}:{receipts:ReturnType<typeof useLogReceipts>;en:boolean;onLog:(event:MouseEvent)=>void}){
 const [account,setAccount]=useState({name:'',status:''});
 useEffect(()=>{
  const button=serviceControls().accountButton;
  const sync=()=>setAccount({name:button.querySelector('b')?.textContent||'',status:button.querySelector('small')?.textContent||''});sync();
  const observer=new MutationObserver(sync);observer.observe(button,{childList:true,subtree:true,characterData:true});return()=>observer.disconnect();
 },[]);
 const t=(ko:string,english:string)=>en?english:ko;
 const state=receipts.connection==='error'||receipts.phase==='error'||receipts.phase==='mixed'?'error':receipts.watching&&receipts.phase==='loaded'?'live':receipts.phase==='reading'||receipts.watching?'busy':receipts.phase==='loaded'?(receipts.cached?'cached':'file'):'off';
 const label=receipts.source==='companion'&&receipts.connection==='offline'?t('네비게이터 대기','Waiting for STAM Navigator'):receipts.source==='companion'&&receipts.connection==='waiting-file'?t('게임 로그 생성 대기','Waiting for Game.log'):state==='live'?t('로그 자동 수신 중','Watching log'):state==='busy'?t('로그 확인 중','Reading log'):state==='cached'?t('저장 기록 · 로그 미연결','Saved receipts · Offline'):state==='file'?t('로그 파일 읽음','Log file read'):state==='error'?t('로그 확인 필요','Check log'):t('로그 미연결','Log not connected');
 const guest=!account.status||account.status==='계정';
 return <div className="pilot-connections">
  <button type="button" className="pilot-account" onClick={()=>serviceControls().accountButton.click()} title={guest?t('계정 로그인','Sign in'):account.status}>
   <ApprovedGlass/><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3.5"/><path d="M4 21v-3a8 8 0 0 1 16 0v3Z"/></svg><span className="pilot-connection-copy"><small>{t('계정','Account')}</small><strong>{guest?t('로그인','Sign in'):account.name}</strong></span><span className="pilot-connection-arrow" aria-hidden="true">›</span>
  </button>
  <button type="button" className="pilot-log" data-log-state={state} onClick={onLog} title={label}><ApprovedGlass kind={state==='live'?'gold':'normal'}/><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h11v16H5V7Z"/><path d="M8 4v4H5m4 4h6m-6 4h4"/></svg><span className="pilot-connection-copy"><small>{t('게임 로그','Game log')}</small><strong><i aria-hidden="true"/>{label}</strong></span><span className="pilot-connection-arrow" aria-hidden="true">›</span></button>
 </div>;
}
