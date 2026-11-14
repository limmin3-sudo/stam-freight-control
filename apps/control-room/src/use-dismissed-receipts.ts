import {useEffect, useState} from 'react';

function read(storage:Storage,key:string):Set<string> {
  const value:unknown=JSON.parse(storage.getItem(key)||'[]');
  if(!Array.isArray(value))throw Error('Invalid inbox data');
  return new Set(value.filter((id):id is string=>typeof id==='string'));
}

export function useDismissedReceipts(samples:boolean) {
  const storage=samples?localStorage:sessionStorage;
  const key=samples?'stam-sample-inbox-dismissed':'stam-inbox-dismissed';
  const [dismissed,setDismissed]=useState<Set<string>>(new Set());
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    function refresh(){
      try { setDismissed(read(storage,key)); setFailed(false); }
      catch { setDismissed(new Set()); setFailed(true); }
    }
    refresh();
    const onStorage=(e:StorageEvent)=>{if(!e.key || e.key===key)refresh();};
    window.addEventListener('storage',onStorage);
    return ()=>window.removeEventListener('storage',onStorage);
  },[key,storage]);
  function update(ids:string[],restore=false){
    try {
      const next=read(storage,key);
      for(const id of ids){if(restore)next.delete(id);else next.add(id);}
      storage.setItem(key,JSON.stringify([...next]));
      setDismissed(next);setFailed(false);
    } catch { setFailed(true); }
  }
  return {dismissed,update,failed};
}
