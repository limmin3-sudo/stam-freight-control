import { useEffect, useRef, useState } from 'react';
import type { Job } from './mission-trial';

type Result = {phase:'loaded'|'mixed'|'error';cards:Job[]};
export function useLogReceipts() {
  const worker=useRef<Worker|null>(null);
  const [result,setResult]=useState<{phase:Result['phase']|'idle'|'reading';cards:Job[]}>({phase:'idle',cards:[]});
  useEffect(()=>()=>{worker.current?.terminate();worker.current=null;},[]);
  function read(file:File) {
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
  return {...result,read};
}
