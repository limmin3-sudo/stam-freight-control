import {useEffect,useRef,useState} from 'react';
import {accountBoundary} from '../../../flight-ownership.mjs';
import {serviceControls,type CloudSnapshot,type FlightCloudClient} from './service-account.mjs';
import {decodeCloudFlight,encodeCloudFlight,flightDigest} from './flight-cloud-codec';
import {exportFlight} from './flight-backup';
import type {Session} from './flight-session';
import type {useFlight} from './use-flight';
type Baseline={revision:number;local:string};
const key=(uid:string)=>'stam.cloud-flight-baseline.v1:'+encodeURIComponent(uid);
function baseline(uid:string):Baseline|null{try{const d=JSON.parse(localStorage.getItem(key(uid))||'null');return d&&Number.isSafeInteger(d.revision)&&typeof d.local==='string'?d:null;}catch{return null;}}
export function useFlightCloud(flight:ReturnType<typeof useFlight>){
 const live=useRef(flight);live.current=flight;
 const epoch=useRef(0),running=useRef(false),mounted=useRef(true),client=useRef<FlightCloudClient|null>(null);
 const [uid,setUid]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[remote,setRemote]=useState<{snapshot:CloudSnapshot;session:Session}|null>(null),[status,setStatus]=useState('login'),[automatic,setAutomatic]=useState(false);
 const remoteRef=useRef(remote);remoteRef.current=remote;
 function current(stamp:number){if(!mounted.current||stamp!==epoch.current)throw Error('계정이 변경되었습니다. 다시 확인하세요.');}
 function remember(id:string,revision:number,local:string){try{localStorage.setItem(key(id),JSON.stringify({revision,local}));return localStorage.getItem(key(id)+':auto')!=='false';}catch{setError('운항 처리는 완료했지만 자동 저장 연결을 이 기기에 기록하지 못했습니다. 자동 저장은 멈췄습니다.');return false;}}
 async function inspect(auto=false){
  if(running.current||!client.current)return;running.current=true;const stamp=epoch.current,c=client.current;setBusy(true);
  try{
   const b=baseline(c.uid),snapshot=await c.read(auto?b?.revision:undefined);current(stamp);
   if(snapshot?.unchanged){if(auto&&b&&await flightDigest(JSON.stringify(live.current.session))!==b.local&&!live.current.busy&&!live.current.blocked){await upload(c,b.revision,stamp);}return;}
   if(snapshot){const session=await decodeCloudFlight(snapshot);current(stamp);setRemote({snapshot,session});setStatus(b?.revision===snapshot.header.revision?'saved':'review');}
   else{setRemote(null);setStatus('empty');}
   setError('');
  }catch(e){if(stamp===epoch.current){setError((e as Error).message);setStatus('error');}}
  finally{if(stamp===epoch.current){running.current=false;setBusy(false);}}
 }
 async function upload(c:FlightCloudClient,revision:number,stamp:number){
  const original=live.current.session;if(live.current.busy||live.current.blocked)throw Error('진행 중인 계산이나 계정 확인을 먼저 마쳐 주세요.');
  const fingerprint=await flightDigest(JSON.stringify(original)),value=await encodeCloudFlight(original);current(stamp);
  const header=await c.save(revision,value);current(stamp);setError('');const auto=remember(c.uid,header.revision,fingerprint);
  const decoded=await decodeCloudFlight({header,payload:value.payload});current(stamp);setRemote({snapshot:{header,payload:value.payload},session:decoded});setAutomatic(auto);setStatus('saved');
 }
 async function save(){
  if(running.current||!client.current)return;running.current=true;setBusy(true);const stamp=epoch.current,c=client.current;
  try{await upload(c,remoteRef.current?.snapshot.header.revision||0,stamp);}catch(e){if(stamp===epoch.current){setError((e as Error).message);setStatus('error');}}finally{if(stamp===epoch.current){running.current=false;setBusy(false);}}
 }
 async function restore(){
  const candidate=remoteRef.current,c=client.current;if(running.current||!c||!candidate)return;running.current=true;setBusy(true);const stamp=epoch.current;
  try{
   const prepared=live.current.prepareRestore(exportFlight(candidate.session)),check=await c.read(candidate.snapshot.header.revision);current(stamp);
   if(!check?.unchanged)throw Error('계정 운항이 변경되었습니다. 다시 비교하세요.');
   const fingerprint=await flightDigest(JSON.stringify(prepared.session));current(stamp);prepared.apply();setError('');const auto=remember(c.uid,candidate.snapshot.header.revision,fingerprint);setAutomatic(auto);setStatus('restored');
  }catch(e){if(stamp===epoch.current){setError((e as Error).message);setStatus('error');}}finally{if(stamp===epoch.current){running.current=false;setBusy(false);}}
 }
 function toggleAutomatic(value:boolean){if(!uid)return;try{localStorage.setItem(key(uid)+':auto',String(value));setAutomatic(value);}catch{setError('자동 저장 설정을 저장하지 못했습니다.');}}
 useEffect(()=>{
  mounted.current=true;serviceControls();
  const changed=()=>{epoch.current++;running.current=false;client.current=null;setRemote(null);setBusy(false);setError('');setUid(null);setAutomatic(false);
   const boundary=accountBoundary();if(boundary.phase!=='ready'||!boundary.uid){setStatus('login');return;}
   try{const c=serviceControls().flightCloud();client.current=c;setUid(c.uid);setStatus('checking');setAutomatic(localStorage.getItem(key(c.uid)+':auto')!=='false'&&!!baseline(c.uid));void inspect();}catch{setStatus('login');}
  };
  changed();window.addEventListener('stam-account-boundary',changed);
  return()=>{mounted.current=false;epoch.current++;window.removeEventListener('stam-account-boundary',changed);};
 },[]);
 useEffect(()=>{if(!automatic||!uid||status==='review'||status==='error')return;const timer=setInterval(()=>void inspect(true),15000);return()=>clearInterval(timer);},[automatic,uid,status]);
 return {uid,busy,error,remote,status,automatic,inspect:()=>inspect(),save,restore,toggleAutomatic};
}
