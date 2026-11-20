import {useEffect,useRef,useState} from 'react';
import type {CompanionSummary} from './CompanionDisplay';
type Feed={awaitingDetails:()=>boolean;display:()=>CompanionSummary;proposal?:string;proposalText?:string;execute:(s:string)=>Promise<string|void>;clear:()=>void};
export function useCompanionLink(enabled:boolean,feed:Feed){
 const ref=useRef(feed);ref.current=feed;
 const [status,setStatus]=useState('connecting');
 useEffect(()=>{
  if(!enabled)return;
  let stopped=false,token='',last=0,sequence=0,timer:ReturnType<typeof setTimeout>,active:AbortController|undefined;
  let answer:{id:number;text:string}|undefined,newest=0,paired=false;
  let session=crypto.randomUUID();const base='http://127.0.0.1:23458';
  async function request(path:string,body?:unknown){
   active=new AbortController();const timeout=setTimeout(()=>active?.abort(),4500);
   try{const r=await fetch(base+path,{method:body?'POST':'GET',headers:path==='/api/pair'?{'X-STAM-Client':'flight-deck'}:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:active.signal,credentials:'omit',redirect:'error'});
    const value=await r.json();if(!r.ok)throw Error(value.error||'offline');return value;
   }finally{clearTimeout(timeout);}
  }
  async function poll(){
   let delay=1000;
   try{
    if(!token){const p=await request('/api/pair');if(stopped)return;if(!/^[a-f0-9]{64}$/.test(p.token))throw Error('offline');token=p.token;
     const v=await request('/api/status');if(v.capabilities?.display!==2)throw Error('upgrade');paired=v.capabilities?.copilot===1;
    }
    if(stopped)return;const {proposal}=ref.current;const display=ref.current.display();
    const packet={session,sequence:++sequence,display:{...display,lines:display.lines.slice(0,6).map(l=>l.slice(0,180)),title:display.title.slice(0,100),guidance:{...display.guidance},copilot:paired,awaitingDetails:paired&&ref.current.awaitingDetails(),proposal,proposalText:ref.current.proposalText?.slice(0,210),answer}};
    const bytes=()=>new TextEncoder().encode(JSON.stringify(packet)).length;
    while(packet.display.lines.length>1&&bytes()>4096)packet.display.lines.pop();
    for(const key of ['profit','cash','afterLoad','load','destination'] as const){if(bytes()<=4096)break;delete packet.display.guidance[key];}
    await request('/api/display',packet);
    if(stopped)return;const result=await request('/api/commands?session='+session+'&after='+last+'&wait=1');if(stopped)return;
    for(const row of result.commands??[]){
     if(!Number.isSafeInteger(row.id)||row.id<=last)continue;last=row.id;
     if(typeof row.command!=='string'||Date.now()-row.at>10000||row.at>Date.now())continue;
     newest=row.id;
     const reply=(text:string|void)=>{if(!stopped&&text&&newest===row.id)answer={id:row.id,text:text.slice(0,240)};};
     void ref.current.execute(row.command).then(reply,()=>reply('요청을 처리하지 못했습니다. 다시 확인하세요.'));
    }
    setStatus(paired?'connected':'older');delay=100;
   }catch(e){if(stopped)return;const code=e instanceof Error?e.message:'offline';setStatus(code==='display-in-use'?'busy':code==='upgrade'?'upgrade':'offline');
    if(token){ref.current.clear();newest=0;answer=undefined;session=crypto.randomUUID();last=0;sequence=0;}token='';delay=2000;
   }finally{if(!stopped){if(delay===100)void poll();else timer=setTimeout(poll,delay);}}
  }
  setStatus('connecting');void poll();
  return ()=>{stopped=true;clearTimeout(timer);active?.abort();if(token)void fetch(base+'/api/display',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({session,sequence:++sequence,clear:true}),credentials:'omit',keepalive:true}).catch(()=>{});};
 },[enabled]);
 return status;
}
