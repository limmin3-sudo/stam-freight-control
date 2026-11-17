import {useEffect,useRef,useState} from 'react';
import {serviceControls} from './service-account.mjs';
import {accountBoundary} from '../../../flight-ownership.mjs';
import type {FreightClient} from '../../../freight-cloud.mjs';
export function useFreightCloud(){
 const [client,setClient]=useState<FreightClient|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const epoch=useRef(0),running=useRef(false);
 useEffect(()=>{serviceControls();const change=()=>{epoch.current++;running.current=false;setBusy(false);setError('');setMessage('');const b=accountBoundary();try{setClient(b.phase==='ready'&&b.uid?serviceControls().freightCloud():null);}catch{setClient(null);}};change();window.addEventListener('stam-account-boundary',change);return()=>{epoch.current++;window.removeEventListener('stam-account-boundary',change);};},[]);
 async function act<T>(fn:(client:FreightClient,check:()=>void)=>Promise<T>){if(!client||running.current)return;const e=epoch.current;const check=()=>{if(e!==epoch.current)throw Error('stam/stale');};running.current=true;setBusy(true);setError('');setMessage('');try{return await fn(client,check);}catch(err){if(e===epoch.current)setError(err instanceof Error?err.message:'request-failed');}finally{if(e===epoch.current){running.current=false;setBusy(false);}}}
 return {client,error,busy,message,setMessage,act};
}
