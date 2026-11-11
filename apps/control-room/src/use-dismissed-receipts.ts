import {useEffect, useState} from 'react';

function read(key:string):Set<string> {
  const value:unknown=JSON.parse(localStorage.getItem(key)||'[]');
  if(!Array.isArray(value))throw Error('Invalid inbox data');
  return new Set(value.filter((id):id is string=>typeof id==='string'));
}

export function useDismissedReceipts(samples:boolean) {
  const key=samples?'stam-sample-inbox-dismissed':'stam-inbox-dismissed';
  const [dismissed,setDismissed]=useState<Set<string>>(new Set());
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    function refresh(){
      try { setDismissed(read(key)); setFailed(false); }
      catch { setDismissed(new Set()); setFailed(true); }
    }
    refresh();
    const storage=(e:StorageEvent)=>{if(!e.key || e.key===key)refresh();};
    window.addEventListener('storage',storage);
    return ()=>window.removeEventListener('storage',storage);
  },[key]);
  function update(ids:string[],restore=false){
    try {
      const next=read(key);
      for(const id of ids){if(restore)next.delete(id);else next.add(id);}
      localStorage.setItem(key,JSON.stringify([...next]));
      setDismissed(next);setFailed(false);
    } catch { setFailed(true); }
  }
  return {dismissed,update,failed};
}
