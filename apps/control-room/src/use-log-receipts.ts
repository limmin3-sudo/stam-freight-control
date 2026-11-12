import { useEffect, useRef, useState } from 'react';
import type { Job } from './mission-trial';

type Result = {phase:'loaded'|'mixed'|'error';cards:Job[]};
export function useLogReceipts() {
  const [corrections,setCorrections]=useState<Record<string,Job>>({});
  function saveCorrection(card:Job){setCorrections(previous=>({...previous,[card.id]:card}));}
  const worker=useRef<Worker|null>(null);
  const watch=useRef<ReturnType<typeof setInterval>|undefined>(undefined);
  const generation=useRef(0),readingLive=useRef(false);
  const [watching,setWatching]=useState(false);
  const [result,setResult]=useState<{phase:Result['phase']|'idle'|'reading';cards:Job[]}>({phase:'idle',cards:[]});
  useEffect(()=>()=>{generation.current++;clearInterval(watch.current);worker.current?.terminate();worker.current=null;},[]);
  function stopWatching(){generation.current++;clearInterval(watch.current);watch.current=undefined;worker.current?.terminate();worker.current=null;readingLive.current=false;setWatching(false);}
  function read(file:File) {
    stopWatching();
    worker.current?.terminate();
    setResult({phase:'reading',cards:[]});
    try {
      const next=new Worker(new URL('./receipt-log.worker.mjs',import.meta.url),{type:'module'});
      worker.current=next;
      const finish=(value:Result)=>{
        if(worker.current!==next)return;
        next.terminate();worker.current=null;setResult(value);
      };
      next.onmessage=(event:MessageEvent<Result>)=>finish(event.data);
      next.onerror=()=>finish({phase:'error',cards:[]});
      next.postMessage(file);
    } catch { setResult({phase:'error',cards:[]}); }
  }
  const picker=(window as Window & {showOpenFilePicker?:(options:unknown)=>Promise<FileSystemFileHandle[]>}).showOpenFilePicker;
  async function follow(){
    if(!picker)return;
    stopWatching();
    const serial=generation.current;
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
        }catch{if(serial===generation.current){stopWatching();setResult({phase:'error',cards:[]});}}
        finally{polling=false;}
      };
      const next=new Worker(new URL('./receipt-log.worker.mjs',import.meta.url),{type:'module'});worker.current=next;
      next.onmessage=({data}:{data:Result})=>{if(serial!==generation.current)return;readingLive.current=false;setResult(data);if(data.phase==='error')stopWatching();};
      next.onerror=()=>{if(serial===generation.current){stopWatching();setResult({phase:'error',cards:[]});}};
      setWatching(true);watch.current=setInterval(()=>void poll(),2000);await poll();
    }catch(error){if(serial===generation.current&&(error as Error).name!=='AbortError')setResult({phase:'error',cards:[]});}
  }
  const cards=result.cards.map(raw=>{
    const corrected=corrections[raw.id];
    return (raw.state==='incomplete'||raw.state==='ready') && corrected?.signature && corrected.signature===raw.signature ? corrected : raw;
  });
  return {...result,cards,saveCorrection,read,follow,watching,stopWatching,canWatch:!!picker};
}
