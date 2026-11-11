// A separate, disposable read-only client; pairing tokens stay in memory.
export function connectCompanion(callbacks:{status:(phase:string)=>void;snapshot:(data:unknown)=>void}) {
 const local=location.protocol==='http:'&&['127.0.0.1','localhost'].includes(location.hostname)&&['5173','5174'].includes(location.port);
 const publicSite=location.origin==='https://limmin3-sudo.github.io'&&location.pathname.startsWith('/stam-freight-control/');
 if(!local&&!publicSite){callbacks.status('unsupported');return ()=>{};}
 const base=local?'/__stam_bridge':'http://127.0.0.1:23458';
 let closed=false,token='',revision=-1,failures=0,timer:ReturnType<typeof setTimeout>|undefined;
 let controller:AbortController|undefined;
 async function read(path:string,pair=false){
  controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),5000);
  const headers:Record<string,string>=pair?{'X-STAM-Client':'flight-deck'}:{Authorization:'Bearer '+token};
  if(local)headers['X-STAM-Preview']='1';
  try{
   const r=await fetch(base+path,{headers,cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
   if(r.status===401||r.status===403){token='';revision=-1;throw Error('offline');}
   if(!r.ok)throw Error('offline');return await r.json();
  }finally{clearTimeout(timeout);}
 }
 async function poll(){
  try{
   if(!token){const p=await read('/api/pair',true);if(closed)return;if(p.protocol!==1||!/^[a-f\d]{64}$/.test(p.token))throw Error('protocol');token=p.token;revision=-1;}
   const status=await read('/api/status');if(closed)return;
   if(status.protocol!==1||!Number.isSafeInteger(status.revision))throw Error('protocol');
   if(status.revision!==revision){
    const result=await read('/api/snapshot');if(closed)return;
    if(result.snapshot?.schemaVersion!==1||!Array.isArray(result.snapshot.contracts)||!Array.isArray(result.snapshot.candidates)||!Number.isSafeInteger(result.revision))throw Error('protocol');
    callbacks.snapshot(result.snapshot);revision=result.revision;
   }
   callbacks.status(status.phase||'watching');failures=0;
  }catch(error){if(!closed){callbacks.status(error instanceof Error&&error.message==='protocol'?'error':'offline');failures++;}}
  finally{if(!closed)timer=setTimeout(poll,failures?Math.min(5000,500*2**Math.min(failures,4)):document.hidden?2500:750);}
 }
 callbacks.status('connecting');void poll();
 return ()=>{closed=true;clearTimeout(timer);controller?.abort();token='';};
}
