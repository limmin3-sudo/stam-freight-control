import {useEffect,useRef,useState} from 'react';
import {followScreens,relayFrame} from './screen-relay';
import {loadFrames,saveFrame} from './screen-archive';
import type {Frame} from './contract-screen';
import type {Job} from './mission-trial';

export function useContractScreens(jobs:Job[]){
 const ids=JSON.stringify(jobs.map(j=>j.id).sort());
 const [revision,refresh]=useState(0),[frames,setFrames]=useState<Record<string,Frame[]>>({});
 const sent=useRef(new Set<string>());
 const [syncPending,setSyncPending]=useState(false);
 const [error,setError]=useState(false);
 useEffect(()=>followScreens(()=>refresh(n=>n+1)),[]);
 useEffect(()=>{
  const change=(event:StorageEvent)=>{if(event.key==='stam.contract-screen.updated')refresh(n=>n+1);};
  window.addEventListener('storage',change);return ()=>window.removeEventListener('storage',change);
 },[]);
 useEffect(()=>{
  let current=true;
  Promise.all((JSON.parse(ids) as string[]).map(async id=>[id,await loadFrames(id)] as const))
   .then(pairs=>{if(current){setFrames(Object.fromEntries(pairs));setError(false);}})
   .catch(()=>{if(current)setError(true);});
  return ()=>{current=false;};
 },[ids,revision]);
 useEffect(()=>{
  let cancelled=false,timer:ReturnType<typeof setTimeout>;
  async function flush(){
   const token=sessionStorage.getItem('stam-local-log-pairing');
   if(!token){if(!cancelled)timer=setTimeout(flush,5000);return;}
   try{
    for(const [id,items] of Object.entries(frames))for(const f of items){
     const key=JSON.stringify([token,id,f.key]);if(cancelled)return;
     if(sent.current.has(key))continue;
     await relayFrame(id,f);sent.current.add(key);
    }
    if(!cancelled)setSyncPending(false);
   }catch{if(!cancelled)setSyncPending(true);}
   if(!cancelled)timer=setTimeout(flush,8000);
  }
  void flush();return ()=>{cancelled=true;clearTimeout(timer);};
 },[frames]);
 async function attach(id:string,frame:Frame){
  await saveFrame(id,frame);refresh(n=>n+1);
  try{await relayFrame(id,frame,true);}catch{setSyncPending(true);}
  try{localStorage.setItem('stam.contract-screen.updated',crypto.randomUUID());}catch{/* Current tab updates directly. */}

 }
 return {frames,attach,error,syncPending};
}
