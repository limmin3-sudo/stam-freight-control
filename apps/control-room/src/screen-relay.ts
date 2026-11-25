import {readFrame,type Frame} from './contract-screen';
import {saveFrame} from './screen-archive';
const local=()=>location.protocol==='http:'&&location.hostname==='127.0.0.1';
function endpoint(){
 if(!local()&&location.origin!=='https://limmin3-sudo.github.io')return null;
 const token=sessionStorage.getItem('stam-local-log-pairing');
 if(!token)return null;
 return {url:(local()?location.origin:'http://127.0.0.1:23458')+'/api/screens',
  headers:{Authorization:'Bearer '+token},credentials:'omit' as const};
}
export async function pollScreenChoice(picker:string,labels:string[],signal?:AbortSignal,retry='',outcome?:import('./game-capture').ReadOutcome){
 const ep=endpoint();if(!ep)return '';
 const response=await fetch(ep.url,{method:'POST',headers:{...ep.headers,'Content-Type':'application/json'},
  credentials:ep.credentials,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(3000)]):AbortSignal.timeout(3000),
  body:JSON.stringify({picker,labels,retry,outcome})});
 if(!response.ok)return '';
 const result=await response.json();return typeof result.reply==='string'?result.reply:'';
}
export async function relayFrame(id:string,frame:Frame,preview=false){
 const ep=endpoint();if(!ep)return;
 const image=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(frame.image);});
 const res=await fetch(ep.url,{method:'POST',headers:{...ep.headers,'Content-Type':'application/json'},credentials:ep.credentials,
  signal:AbortSignal.timeout(4000),body:JSON.stringify({id,preview,header:frame.header,text:frame.text,image})});
 if(!res.ok)throw Error('relay');
}
export function followScreens(changed:()=>void){
 let after=0,identity='',stopped=false,timer:ReturnType<typeof setTimeout>;
 async function poll(){
  let delay=3000;
  try{
   const ep=endpoint();if(!ep)return;
   if(identity!==ep.headers.Authorization){identity=ep.headers.Authorization;after=0;}
   const res=await fetch(ep.url+'?after='+after,{headers:ep.headers,credentials:ep.credentials,signal:AbortSignal.timeout(4000)});
   if(!res.ok){delay=15000;return;}
   const data=await res.json();
   for(const v of data.frames){
    if(stopped)return;
    const bytes=Uint8Array.from(atob(v.image.split(',')[1]),s=>s.charCodeAt(0));
    const frame=readFrame(v.header,new Blob([bytes],{type:'image/jpeg'}),v.text);
    if(frame)await saveFrame(v.id,frame);
   }
   if(!stopped&&data.frames.length){changed();delay=300;}
   after=data.revision;
  }catch{delay=10000;}finally{if(!stopped)timer=setTimeout(poll,delay);}
 }
 void poll();return ()=>{stopped=true;clearTimeout(timer);};
}

// Listen only while the user has selected a game window. Closing the reader
// aborts the pending request, so reopening never replays a stale tap.
export async function waitForReadButton(signal:AbortSignal,read:()=>Promise<import('./game-capture').ReadOutcome>){
 while(!signal.aborted){
  try{
   const ep=endpoint();
   if(ep){
    const res=await fetch(ep.url+'?wait=read',{headers:ep.headers,credentials:ep.credentials,signal:AbortSignal.any([signal,AbortSignal.timeout(16000)])});
    if(!res.ok)throw Error('offline');
    const packet=await res.json();
    if(Number.isSafeInteger(packet.read)){
     if(packet.read>0&&!signal.aborted){
      let result;
      try{result=await read();}catch{result={code:'error'};}
      await fetch(ep.url,{method:'POST',headers:{...ep.headers,'Content-Type':'application/json'},credentials:ep.credentials,
       signal:AbortSignal.timeout(4000),body:JSON.stringify({read:packet.read,...result})});
     }
     continue;
    }
   }
  }catch{if(signal.aborted)return;}
  await new Promise(resolve=>setTimeout(resolve,2500));
 }
}
