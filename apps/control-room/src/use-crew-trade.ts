import {useEffect,useRef,useState} from 'react';
import {serviceControls} from './service-account.mjs';
import {accountBoundary} from '../../../flight-ownership.mjs';
import type {CrewOperation} from '../../../crew-trade.mjs';
import type {CrewCloudClient,CrewRow} from '../../../crew-cloud.mjs';
export function useCrewTrade(){
 const [client,setClient]=useState<CrewCloudClient|null>(null),[operations,setOperations]=useState<CrewOperation[]>([]),[selected,setSelected]=useState(''),[operation,setOperation]=useState<CrewOperation|null>(null),[rows,setRows]=useState<Record<string,CrewRow[]>>({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const epoch=useRef(0),running=useRef(false),selection=useRef('');selection.current=selected;
 useEffect(()=>{serviceControls();const changed=()=>{epoch.current++;running.current=false;setBusy(false);setClient(null);setOperations([]);setSelected('');setOperation(null);setRows({});setError('');setMessage('');const b=accountBoundary();if(b.phase==='ready'&&b.uid){try{setClient(serviceControls().crewCloud());}catch{setError('account');}}};changed();window.addEventListener('stam-account-boundary',changed);return()=>{epoch.current++;window.removeEventListener('stam-account-boundary',changed);};},[]);
 const act=async(fn:(c:CrewCloudClient,check:()=>void)=>Promise<unknown>)=>{if(!client||running.current)return;const stamp=epoch.current,key=selection.current;const check=()=>{if(stamp!==epoch.current||key!==selection.current)throw Error('stam/stale');};running.current=true;setBusy(true);setError('');setMessage('');try{await fn(client,check);}catch(e){if(stamp===epoch.current&&key===selection.current)setError(e instanceof Error?String((e as Error&{code?:string}).code||e.message):'cloud');}finally{if(stamp===epoch.current){running.current=false;setBusy(false);}}};
 const reload=()=>act(async(c,check)=>{const list=await c.list();check();setOperations(list);});
 useEffect(()=>{if(client)void reload();},[client]);
 useEffect(()=>{setOperation(null);setRows({});setError('');if(!client||!selected)return;let live=true;const fail=(e:unknown)=>{if(live){setOperation(null);setRows({});setError(e instanceof Error?String((e as Error&{code?:string}).code||e.message):'cloud');}};const listeners:(()=>void)[]=[];let requestStop:(()=>void)|undefined;
  listeners.push(client.watch(selected,op=>{if(!live)return;setOperation(op);setOperations(old=>[op,...old.filter(x=>x.id!==op.id)]);const manager=op.ownerUid===client.uid;if(manager&&!requestStop)requestStop=client.watchRows(selected,'requests',r=>{if(live)setRows(old=>({...old,requests:r}));},fail);if(!manager&&requestStop){requestStop();requestStop=undefined;setRows(old=>({...old,requests:[]}));}},fail));
  for(const kind of ['reports','presence','payments','receipts'])listeners.push(client.watchRows(selected,kind,r=>{if(live)setRows(old=>({...old,[kind]:r}));},fail));
  return()=>{live=false;requestStop?.();listeners.forEach(stop=>stop());};
 },[client,selected]);
 return {client,operations,setOperations,operation,rows,error,busy,message,selected,setSelected,setMessage,act,reload};
}
