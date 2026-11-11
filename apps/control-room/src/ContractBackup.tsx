import {useState} from 'react';
import type {Locale} from './navigation';
import type {useFlight} from './use-flight';

export function ContractBackup({flight,locale}:{flight:ReturnType<typeof useFlight>;locale:Locale}){
  const [message,setMessage]=useState(''),[reading,setReading]=useState(false);
  const en=locale==='en';
  const jobs=flight.session.draft.jobs;
  async function download(){
    try{
      const {exportContracts}=await import('./contract-backup.mjs');
      const url=URL.createObjectURL(new Blob([exportContracts(jobs)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='STAM-contracts.json';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){setMessage((error as Error).message);}
  }
  async function restore(file:File){
    setReading(true);setMessage('');
    try{
      const {importContracts}=await import('./contract-backup.mjs');
      const text=await file.text();
      const {jobs:added,skipped}=flight.appendContracts(current=>importContracts(text,current));
      setMessage(en?'Added '+added.length+' · Already present '+skipped:'계약 '+added.length+'건 추가 · 기존 계약 '+skipped+'건');
    }catch(error){setMessage((error as Error).message);}
    finally{setReading(false);}
  }
  return <details className="manifest-intake"><summary>{en?'Contract backup':'계약 백업 · 불러오기'}</summary>
    <button disabled={!jobs.length} onClick={()=>void download()}>{en?'Download contracts':'계약 백업 저장'}</button>
    <label>{en?'Add contracts from backup':'백업에서 계약 추가'}<input type="file" accept=".json,application/json" disabled={reading||flight.active||flight.busy||flight.blocked} onChange={e=>{
      const file=e.target.files?.[0];e.target.value='';if(file)void restore(file);
    }}/></label>{message&&<p role="status">{message}</p>}
  </details>;
}
