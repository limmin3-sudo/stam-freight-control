import {useEffect,useRef,useState} from 'react';
import type {Job} from './mission-trial';
import {correctReceipt,decodeReceiptCache,effectiveReceipts,receiptCacheKey,receiveReceipts} from './receipt-cache';
import type {ReceiptCache,ReceiptResult} from './receipt-cache';

type Result={phase:ReceiptResult['phase']|'error';cards:Job[]};
function restore(){
 try{return {cache:decodeReceiptCache(sessionStorage.getItem(receiptCacheKey)),failed:false};}
 catch{return {cache:null,failed:true};}
}
export function useLogReceipts(){
 const [initial]=useState(restore);
 const [cache,setCache]=useState(initial.cache),current=useRef(cache);current.current=cache;
 const [storageError,setStorageError]=useState(initial.failed?'restore':'');
 const [phase,setPhase]=useState<Result['phase']|'idle'|'reading'>(cache?.phase||'idle');
 const [cached,setCached]=useState(!!cache);
 const worker=useRef<Worker|null>(null),watch=useRef<ReturnType<typeof setInterval>|undefined>(undefined);
 const generation=useRef(0),readingLive=useRef(false);
 const [watching,setWatching]=useState(false);
 useEffect(()=>()=>{generation.current++;clearInterval(watch.current);worker.current?.terminate();worker.current=null;},[]);
 function persist(next:ReceiptCache){
  current.current=next;setCache(next);
  try{sessionStorage.setItem(receiptCacheKey,JSON.stringify(next));setStorageError('');}
  catch{setStorageError('save');}
 }
 function saveCorrection(card:Job){
  // Manual/sample/selected-only contracts belong to the existing flight store.
  if(!card.signature||!current.current?.cards.some(c=>c.id===card.id))return;
  persist(correctReceipt(current.current,card));
 }
 function stopWatching(){
  generation.current++;clearInterval(watch.current);watch.current=undefined;
  worker.current?.terminate();worker.current=null;readingLive.current=false;setWatching(false);
  setPhase(prior=>prior==='reading'?(current.current?.phase||'idle'):prior);
 }
 function failed(){setPhase('error');setCached(!!current.current);}
 function accept(value:Result){
  if(value.phase==='error'){failed();return false;}
  try{const next=receiveReceipts({phase:value.phase,cards:value.cards},current.current);persist(next);setPhase(value.phase);setCached(false);return true;}
  catch{failed();return false;}
 }
 function read(file:File){
  stopWatching();setPhase('reading');setCached(!!current.current);
  try{
   const next=new Worker(new URL('./receipt-log.worker.mjs',import.meta.url),{type:'module'});worker.current=next;
   next.onmessage=({data}:MessageEvent<Result>)=>{
    if(worker.current!==next)return;next.terminate();worker.current=null;accept(data);
   };
   next.onerror=()=>{if(worker.current!==next)return;next.terminate();worker.current=null;failed();};
   next.postMessage(file);
  }catch{worker.current?.terminate();worker.current=null;failed();}
 }
 const picker=(window as Window & {showOpenFilePicker?:(options:unknown)=>Promise<FileSystemFileHandle[]>}).showOpenFilePicker;
 async function follow(){
  if(!picker)return;
  stopWatching();const serial=generation.current;
  try{
   const [handle]=await picker.call(window,{multiple:false,types:[{description:'Game.log',accept:{'text/plain':['.log']}}]});
   if(!handle||serial!==generation.current)return;
   let stamp='',polling=false;
   const poll=async()=>{
    if(polling||readingLive.current||serial!==generation.current)return;
    polling=true;
    try{
     const file=await handle.getFile(),next=file.size+':'+file.lastModified;
     if(serial===generation.current&&next!==stamp){stamp=next;readingLive.current=true;worker.current?.postMessage({file,live:true});}
    }catch{if(serial===generation.current){stopWatching();failed();}}
    finally{polling=false;}
   };
   const next=new Worker(new URL('./receipt-log.worker.mjs',import.meta.url),{type:'module'});worker.current=next;
   next.onmessage=({data}:{data:Result})=>{if(serial!==generation.current)return;readingLive.current=false;if(!accept(data))stopWatching();};
   next.onerror=()=>{if(serial===generation.current){stopWatching();failed();}};
   setPhase('reading');setCached(!!current.current);setWatching(true);watch.current=setInterval(()=>void poll(),2000);await poll();
  }catch(error){if(serial===generation.current&&(error as Error).name!=='AbortError'){stopWatching();failed();}}
 }
 return {phase,rawCards:cache?.cards||[],cards:effectiveReceipts(cache),cached,storageError,saveCorrection,read,follow,watching,stopWatching,canWatch:!!picker};
}
