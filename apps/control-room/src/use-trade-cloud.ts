import {useEffect,useRef,useState} from 'react';
import {serviceControls,type CloudSnapshot,type FlightCloudClient} from './service-account.mjs';
import {accountBoundary} from '../../../flight-ownership.mjs';
import {readyTradeOwner,tradeOwnerLock} from './trade-storage';
import {applyTradeSnapshot,decodeTradeSnapshot,emptyTradeSnapshot,encodeTradeSnapshot,readTradeSnapshot,tradeDigest,tradePreviousKey,validateTradeSnapshot,type TradeSnapshot} from './trade-cloud-codec';
type Remote={snapshot:CloudSnapshot;value:TradeSnapshot};
type Baseline={revision:number;digest:string};
const key=(uid:string)=>'stam.trade-cloud-baseline.v1:'+encodeURIComponent(uid);
function baseline(uid:string):Baseline|null{try{const b=JSON.parse(localStorage.getItem(key(uid))||'null');return b&&Number.isSafeInteger(b.revision)&&b.revision>0&&/^[a-f0-9]{64}$/.test(b.digest)?b:null;}catch{return null;}}
export function useTradeCloud(){
 const [uid,setUid]=useState<string|null>(null),[local,setLocal]=useState<TradeSnapshot|null>(null),[previous,setPrevious]=useState<TradeSnapshot|null>(null),[remote,setRemote]=useState<Remote|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState('login'),[error,setError]=useState(''),[automatic,setAutomatic]=useState(false);
 const client=useRef<FlightCloudClient|null>(null),epoch=useRef(0),running=useRef(false),mounted=useRef(true),remoteRef=useRef(remote);remoteRef.current=remote;
 const current=(stamp:number,c:FlightCloudClient)=>{if(!mounted.current||stamp!==epoch.current||readyTradeOwner()!=='account:'+c.uid)throw Error('account');};
 function remember(c:FlightCloudClient,revision:number,digest:string){localStorage.setItem(key(c.uid),JSON.stringify({revision,digest}));setAutomatic(localStorage.getItem(key(c.uid)+':auto')!=='false');}
 function reload(){try{const owner=readyTradeOwner();setLocal(readTradeSnapshot(localStorage,owner));const raw=localStorage.getItem(tradePreviousKey(owner));try{setPrevious(raw?validateTradeSnapshot(JSON.parse(raw),owner):null);}catch{setPrevious(null);}}catch{setLocal(null);setPrevious(null);}}
 async function adopt(c:FlightCloudClient,r:Remote,expected:string,stamp:number){
  const check=await c.read(r.snapshot.header.revision);current(stamp,c);if(!check?.unchanged)throw Error('remoteChanged');
  if(!navigator.locks)throw Error('storage');const text=JSON.stringify(r.value),digest=await tradeDigest(text);current(stamp,c);
  await navigator.locks.request(tradeOwnerLock(r.value.owner),()=>{current(stamp,c);applyTradeSnapshot(localStorage,r.value.owner,expected,r.value,readyTradeOwner);});current(stamp,c);
  window.dispatchEvent(new Event('stam-trade-updated'));remember(c,r.snapshot.header.revision,digest);setStatus('restored');
 }
 async function upload(c:FlightCloudClient,revision:number,stamp:number){
  current(stamp,c);const value=readTradeSnapshot(localStorage,'account:'+c.uid),text=JSON.stringify(value),encoded=await encodeTradeSnapshot(value);current(stamp,c);
  const header=await c.save(revision,encoded);current(stamp,c);const digest=await tradeDigest(text);current(stamp,c);remember(c,header.revision,digest);
  const next={snapshot:{header,payload:encoded.payload},value};remoteRef.current=next;setRemote(next);setStatus('saved');
 }
 async function task(fn:(c:FlightCloudClient,stamp:number)=>Promise<void>){
  if(running.current||!client.current)return;const c=client.current,stamp=epoch.current;running.current=true;setBusy(true);setError('');
  try{await fn(c,stamp);}catch(e){if(mounted.current&&stamp===epoch.current){setStatus('error');setError(e instanceof Error?String((e as Error&{code?:string}).code||e.message):'cloud');setAutomatic(false);}}
  finally{if(mounted.current&&stamp===epoch.current){running.current=false;setBusy(false);reload();}}
 }
 async function inspect(auto=false){await task(async(c,stamp)=>{
  current(stamp,c);const localValue=readTradeSnapshot(localStorage,'account:'+c.uid),text=JSON.stringify(localValue),digest=await tradeDigest(text),b=baseline(c.uid);current(stamp,c);
  const snapshot=await c.read(auto?b?.revision:undefined);current(stamp,c);
  if(JSON.stringify(readTradeSnapshot(localStorage,localValue.owner))!==text){setStatus('review');return;}
  if(snapshot?.unchanged){if(auto&&b&&b.digest!==digest)await upload(c,b.revision,stamp);return;}
  if(!snapshot){remoteRef.current=null;setRemote(null);setStatus('empty');setAutomatic(false);return;}
  const value=await decodeTradeSnapshot(snapshot,localValue.owner);current(stamp,c);const next={snapshot,value};remoteRef.current=next;setRemote(next);
  if(await tradeDigest(JSON.stringify(value))===digest){current(stamp,c);remember(c,snapshot.header.revision,digest);setStatus('saved');}
  else if(emptyTradeSnapshot(localValue)||auto&&b?.digest===digest)await adopt(c,next,text,stamp);
  else setStatus('review');
 });}
 const save=()=>task((c,stamp)=>upload(c,remoteRef.current?.snapshot.header.revision??0,stamp));
 const restore=()=>task(async(c,stamp)=>{const r=remoteRef.current;if(!r)throw Error('missing');await adopt(c,r,JSON.stringify(readTradeSnapshot(localStorage,'account:'+c.uid)),stamp);});
 const revertPrevious=()=>task(async(c,stamp)=>{current(stamp,c);const owner='account:'+c.uid,raw=localStorage.getItem(tradePreviousKey(owner));if(!raw)throw Error('missing');const value=validateTradeSnapshot(JSON.parse(raw),owner),expected=JSON.stringify(readTradeSnapshot(localStorage,owner));await navigator.locks.request(tradeOwnerLock(owner),()=>{current(stamp,c);applyTradeSnapshot(localStorage,owner,expected,value,readyTradeOwner);});setAutomatic(false);localStorage.setItem(key(c.uid)+':auto','false');setStatus('review');window.dispatchEvent(new Event('stam-trade-updated'));});
 function toggleAutomatic(value:boolean){if(!uid)return;try{localStorage.setItem(key(uid)+':auto',String(value));setAutomatic(value);}catch{setError('storage');}}
 useEffect(()=>{
  mounted.current=true;serviceControls();
  const changed=()=>{epoch.current++;client.current=null;running.current=false;setBusy(false);setRemote(null);remoteRef.current=null;setUid(null);setError('');setAutomatic(false);reload();
   const b=accountBoundary();if(b.phase!=='ready'||!b.uid){setStatus('login');return;}
   try{const c=serviceControls().tradeCloud();client.current=c;setUid(c.uid);setStatus('checking');setAutomatic(!!baseline(c.uid)&&localStorage.getItem(key(c.uid)+':auto')!=='false');void inspect();}catch{setStatus('login');}
  };
  const storage=(e:StorageEvent)=>{if(!e.key||e.key.startsWith('stam.trade-'))reload();};changed();window.addEventListener('stam-account-boundary',changed);window.addEventListener('stam-trade-updated',reload);window.addEventListener('storage',storage);
  return()=>{mounted.current=false;epoch.current++;window.removeEventListener('stam-account-boundary',changed);window.removeEventListener('stam-trade-updated',reload);window.removeEventListener('storage',storage);};
 },[]);
 useEffect(()=>{if(!uid||!automatic||['review','error','checking'].includes(status))return;const timer=setInterval(()=>{if(document.visibilityState==='visible')void inspect(true);},15000);return()=>clearInterval(timer);},[uid,automatic,status]);
 return {uid,local,previous,revertPrevious,remote,busy,status,error,automatic,inspect:()=>inspect(),save,restore,toggleAutomatic};
}
