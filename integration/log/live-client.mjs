// Existing public tabs discover the companion after the user selects Game.log.
// Discovery is restricted by the bridge to the public origin and a preflighted
// client header. Snapshot/status reads still require the per-process bearer.
export function connectLive({ onSnapshot, onStatus, onError, onDisconnect }) {
  const local=location.hostname==='127.0.0.1'&&location.protocol==='http:',publicSite=location.origin==='https://limmin3-sudo.github.io'&&location.pathname.startsWith('/stam-freight-control/');
  if(!local&&!publicSite)return null;
  const endpoint=local?location.origin:'http://127.0.0.1:23458',key='stam-local-log-pairing';
  const fragment=new URLSearchParams(location.hash.slice(1));
  let token=fragment.get('token');
  if(!/^[a-f\d]{64}$/.test(token||''))token=null;
  try { token ||= sessionStorage.getItem(key); } catch {}
  if(!/^[a-f\d]{64}$/.test(token||''))token=null;
  if(fragment.has('token')){fragment.delete('token');const rest=fragment.toString();history.replaceState(null,'',location.pathname+location.search+(rest?'#'+rest:''));}
  if(local&&!token)return null;
  const remember=()=>{try{if(token)sessionStorage.setItem(key,token);else sessionStorage.removeItem(key);}catch{}};
  remember();
  let timer,closed=false,polling=false,revision=-1,failures=0;
  const pending=new Set();
  async function request(path,{pairing=false,method='GET',timeoutMs=4000}={}) {
    const controller=new AbortController();pending.add(controller);
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const response=await fetch(new URL(path,endpoint),{method,headers:pairing?{'X-STAM-Client':'flight-deck'}:{Authorization:`Bearer ${token}`},credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
      if(response.status===401||response.status===403)throw new Error('pairing-expired');
      if(!response.ok)throw new Error('local-service-error');
      return await response.json();
    }finally{clearTimeout(timeout);pending.delete(controller);}
  }
  function disconnect(){
    closed=true;clearTimeout(timer);document.removeEventListener('visibilitychange',wake);
    for(const controller of pending)controller.abort();token=null;remember();onDisconnect();
  }
  async function poll(){
    if(closed||polling)return;polling=true;
    try{
      if(!token){
        const pairing=await request('/api/pair',{pairing:true});
        if(closed)return;
        if(pairing.protocol!==1||!/^[a-f\d]{64}$/.test(pairing.token||''))throw new Error('unsupported-service');
        token=pairing.token;revision=-1;remember();
      }
      const status=await request('/api/status');if(closed)return;
      if(status.protocol!==1||!Number.isSafeInteger(status.revision))throw new Error('unsupported-service');
      onStatus(status);
      if(status.revision!==revision){
        const data=await request('/api/snapshot');if(closed)return;
        if(data.snapshot?.schemaVersion!==1||!Number.isSafeInteger(data.revision)||!Array.isArray(data.snapshot.contracts)||!Array.isArray(data.snapshot.candidates))throw new Error('unsupported-service');
        onSnapshot(data.snapshot);revision=data.revision;
      }
      failures=0;
    }catch(error){
      if(closed)return;
      if(error.message==='pairing-expired'){token=null;revision=-1;remember();}
      // Waiting for a companion that has not started is a normal offline state.
      if(error.message==='pairing-expired'||error instanceof TypeError||error.name==='AbortError')onStatus({protocol:1,phase:'offline'});
      else onError(error.message);
      failures++;
    }finally{
      polling=false;
      if(!closed)timer=setTimeout(poll,failures?Math.min(5000,500*2**Math.min(failures,4)):document.hidden?2000:500);
    }
  }
  async function control(action){if(closed||!token)return;try{const status=await request('/api/'+action,{method:'POST'});if(!closed)onStatus(status);}catch(error){if(!closed)onError(error.message);}}
  function wake(){if(!closed&&!polling&&!document.hidden){clearTimeout(timer);timer=setTimeout(poll,0);}}
  document.addEventListener('visibilitychange',wake);timer=setTimeout(poll,0);
  return {connect(){clearTimeout(timer);void poll();},disconnect,pause:()=>control('pause'),resume:()=>control('resume')};
}
