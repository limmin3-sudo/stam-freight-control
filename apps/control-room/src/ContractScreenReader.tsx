import {useEffect,useRef,useState} from 'react';
import {placeName,routeReady,type Job} from './mission-trial';
import type {Frame} from './contract-screen';
import {missingFields} from '../../../integration/log/read-assist.mjs';
import {pollScreenChoice,waitForReadButton} from './screen-relay';
import {pendingFrames,stageFrame,clearPending,type PendingFrame} from './screen-archive';
import {spokenScreenChoice,frameCandidates,retryFrame,withScreens} from './contract-screen';
import {captureContracts,type ReadOnce,type ReadOutcome} from './game-capture';

function OriginalFrame({frame}:{frame:Frame}){
 const [url,setUrl]=useState('');
 useEffect(()=>{const u=URL.createObjectURL(frame.image);setUrl(u);return ()=>URL.revokeObjectURL(u);},[frame.image]);
 return <>{frame.goals.map((g,i)=><p key={i}>{g.item} · {g.done}/{g.total} SCU · {g.pickups.join(' / ')} → {g.destination}</p>)}{url&&<a href={url} target="_blank" rel="noreferrer"><img src={url} alt={frame.title||'mobiGlas'} style={{maxWidth:'100%'}}/></a>}<pre style={{whiteSpace:'pre-wrap'}}>{frame.text}</pre></>;
}
export function ScreenOriginals({frames,en}:{frames:Frame[];en:boolean}){
 const [open,setOpen]=useState(false);
 if(!frames.length)return null;
 return <details onToggle={e=>setOpen(e.currentTarget.open)}><summary>{en?'Captured contract':'게임 계약 원본'} · {frames.length}</summary>
  {open&&frames.map(f=><OriginalFrame key={f.key} frame={f}/>)}</details>;
}
type Props={jobs:Job[];frames:Record<string,Frame[]>;en:boolean;locked:boolean;attach:(id:string,frame:Frame)=>Promise<void>};
export function ContractScreenReader(props:Props){
 const {en,locked,jobs}=props,latest=useRef(props);latest.current=props;
 const controller=useRef<AbortController|null>(null),alive=useRef(false),trigger=useRef<ReadOnce|null>(null);
 const [language,setLanguage]=useState<'eng'|'kor'>(en?'eng':'kor');
 const [running,setRunning]=useState(false),[armed,setArmed]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [pending,setPending]=useState<PendingFrame[]>([]),[saving,setSaving]=useState(false);
 const available=jobs.filter(j=>j.signature&&(j.state==='ready'||j.state==='incomplete'));
 const assigning=useRef(false),picker=useRef<{token:string;key:string}|null>(null);
 useEffect(()=>{alive.current=true;void pendingFrames().then(rows=>{if(alive.current)setPending(rows);}).catch(()=>{if(alive.current)setNotice(en?'Cannot open saved screens.':'보관한 계약 화면을 열 수 없습니다.');});return ()=>{alive.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{if(locked)controller.current?.abort();},[locked]);
 async function save(job:Job,frame:Frame):Promise<ReadOutcome>{
  const next=withScreens(job,[...(latest.current.frames[job.id]||[]),frame]);
  await latest.current.attach(job.id,frame);
  const ready=routeReady(next),complete=ready&&!missingFields(next).length;
  const targets=[...new Set(next.shipments.map(r=>r.to))];
  const destination=targets.length===1&&targets[0]?placeName(targets[0]!,en?1:0):'';
  const fields:Record<string,string>=en?{pickup:'pickup',destination:'destination',cargo:'commodity',quantity:'quantity'}:{pickup:'픽업지',destination:'배송지',cargo:'품목',quantity:'수량'};
  const remaining=missingFields(next).filter(f=>!ready||(f!=='pickup'&&f!=='destination')).map(f=>fields[f]);
  const details=[destination?(en?'Delivery to ':'배송지 ')+destination:'',ready?(en?'Route ready':'경로 계산 가능'):'',remaining.length?(en?'Still needed: ':'확인 필요 · ')+remaining.join(', '):''].filter(Boolean).join(' · ');
  if(alive.current)setNotice(details);
  return {code:complete?'complete':'partial',destination,details};
 }
 async function start(){
  if(controller.current||locked)return;
  const ctl=new AbortController();controller.current=ctl;setRunning(true);
  let capturedIds:string[]=[];
  setNotice(en?'Select the Star Citizen window.':'Star Citizen 게임 창을 선택하세요.');
  try{await captureContracts(language,ctl.signal,async frame=>{
   if(ctl.signal.aborted||latest.current.locked)return {code:'cancel'};
   const match=retryFrame(frame,capturedIds,latest.current.jobs);
   if(match)return save(match,frame);
   await stageFrame(frame,capturedIds);
   if(!ctl.signal.aborted){setPending(await pendingFrames());setNotice(en?'Screen saved. Waiting for matching log evidence.':'화면을 보관했어요. 새 수신 정보가 들어오면 다시 대조합니다.');}
   return {code:'choose'};
  },read=>{
   setArmed(true);
   setNotice(en?'Open the accepted contract objectives and tap the talk shortcut once.':'진행 중인 계약의 상세 목표를 열고 말하기 단축키를 짧게 누르세요.');
   let reading=false;
   const once:ReadOnce=async()=>{
    if(reading||ctl.signal.aborted)return {code:'cancel'};
    capturedIds=latest.current.jobs.filter(j=>j.state==='ready'||j.state==='incomplete').map(j=>j.id);
    reading=true;setBusy(true);
    try{
     const result=await read();
     if(result.code==='unreadable'&&alive.current)setNotice(en?'Show the objective rows and read again.':'계약의 목표 줄이 보이도록 화면을 옮기고 다시 눌러주세요.');
     return result;
    }catch{
     if(ctl.signal.aborted)return {code:'cancel'};
     setNotice(en?'Could not read the game window. Try again.':'게임 창을 읽지 못했어요. 목표 줄을 열고 다시 눌러주세요.');
     return {code:'error'};
    }finally{reading=false;if(alive.current)setBusy(false);}
   };
   trigger.current=once;
   void waitForReadButton(ctl.signal,once);
  });}
  catch(e){if(alive.current&&!ctl.signal.aborted)setNotice(e instanceof Error?e.message:String(e));}
  finally{ctl.abort();controller.current=null;trigger.current=null;if(alive.current){setRunning(false);setArmed(false);}}
 }
 async function finishPending(entry:PendingFrame,job?:Job){
  if(assigning.current||locked)return;
  assigning.current=true;setSaving(true);
  try{
   if(job){
    const live=latest.current.jobs.find(j=>j.id===job.id);
    if(!live||live.signature!==job.signature||live.state==='ended'||live.state==='conflict'||latest.current.locked)return;
    const owner=picker.current;
    const outcome=await save(live,entry.frame);
    if(owner?.key===entry.key)await pollScreenChoice(owner.token,[],undefined,'',outcome).catch(()=>{});
   }
   await clearPending(entry);
   if(picker.current?.key===entry.key){
    const token=picker.current.token;picker.current=null;
    if(!job)void pollScreenChoice(token,[]).catch(()=>{});
   }
   if(alive.current)setPending(q=>q.filter(f=>f.key!==entry.key));
  }catch(e){if(alive.current)setNotice(String(e));}
  finally{assigning.current=false;if(alive.current)setSaving(false);}
 }
 useEffect(()=>{
  if(locked||assigning.current)return;
  for(const entry of pending){
   const found=retryFrame(entry.frame,entry.ids,jobs);
   if(found){void finishPending(entry,found);break;}
  }
 },[jobs,pending,locked]);
 const entry=pending[0],frame=entry?.frame;
 const original=entry?available.filter(j=>frame?.missionId?j.id.toLowerCase()===frame.missionId.toLowerCase():entry.ids.includes(j.id)):[];
 const candidates=frame?frameCandidates(frame,original):[];
 const choices=candidates.length?candidates:original;
 const offered=choices.slice(0,100);
 const choiceStamp=JSON.stringify([entry?.key,offered.map(j=>[j.id,j.signature,j.shipments]),locked,en]);
 const currentChoice=useRef('');currentChoice.current=choiceStamp;
 useEffect(()=>{
  if(!entry||locked||saving||assigning.current||!offered.length)return;
  const token=crypto.randomUUID(),ctl=new AbortController(),lang=en?1:0;
  picker.current={token,key:entry.key};
  const labels=offered.map((j,i)=>{
   const stops=[...new Set(j.shipments.map(r=>(r.pickupFacility?.[lang]||(r.from?placeName(r.from,lang):'?'))+' → '+(r.deliveryFacility?.[lang]||(r.to?placeName(r.to,lang):'?'))))];
   return (String(i+1)+'. '+stops.join(' / ')+' · '+j.shipments.map(r=>[r.cargo[lang],r.scu?r.scu+' SCU':''].filter(Boolean).join(' ')).join(', ')+' · '+j.id.slice(-6)).slice(0,160);
  });
  let timer:ReturnType<typeof setTimeout>,retry='';
  async function poll(){
   try{
    const reply=await pollScreenChoice(token,labels,ctl.signal,retry);retry='';
    if(!ctl.signal.aborted&&currentChoice.current===choiceStamp&&reply){
     const selected=spokenScreenChoice(reply,offered,id=>placeName(id,lang));
     if(selected){await finishPending(entry!,selected);}
     else retry=en?'Say the option number or a unique pickup or delivery stop.':'후보 번호나 구별되는 픽업지·배송지를 다시 말해주세요.';
    }
   }catch{/* The original screen remains available while the connection recovers. */}
   if(!ctl.signal.aborted)timer=setTimeout(poll,1200);
  }
  void poll();return ()=>{
   ctl.abort();clearTimeout(timer);
   if(!assigning.current){picker.current=null;void pollScreenChoice(token,[]).catch(()=>{});}
  };
 },[choiceStamp,saving]);
 const labels:Record<string,string>=en?{pickup:'pickup',destination:'destination',quantity:'quantity',cargo:'goods'}:{pickup:'픽업지',destination:'배송지',quantity:'수량',cargo:'품목'};
 return <section aria-label={en?'Game contract capture':'게임 계약 읽기'}>
  <label>{en?'Game language':'게임 언어'} <select value={language} disabled={running||locked} onChange={e=>setLanguage(e.target.value==='eng'?'eng':'kor')}><option value="kor">한국어</option><option value="eng">English</option></select></label>{' '}
  <button type="button" disabled={locked||!navigator.mediaDevices?.getDisplayMedia} onClick={()=>running?controller.current?.abort():void start()}>
   {running?(en?'Stop reading':'게임 화면 읽기 중지'):(en?'Read game contracts':'게임 계약 화면 읽기')}</button>
  {armed&&<button type="button" disabled={busy||locked} onClick={()=>void trigger.current?.()}>{busy?(en?'Reading…':'읽는 중…'):(en?'Read this screen once':'현재 화면 한 번 읽기')}</button>}
  {notice&&<p role="status">{notice}</p>}
  {frame&&<div><p>{en?'Saved screens awaiting a match':'계약 일치 확인 대기'} · {pending.length}</p>
   <p>{frame.title} {frame.goals.length?'·':(en?' · Scroll to the objectives':' · 목표 줄까지 스크롤하세요')} {frame.goals.map(g=>g.item+' '+g.total+' SCU → '+g.destination).join(' / ')}</p>
   <ScreenOriginals frames={[frame]} en={en}/>
   {choices.length>0&&<p>{en?'Which contract was on screen?':'방금 읽은 화면은 어느 계약인가요?'}</p>}
   {choices.map(j=><button type="button" disabled={saving||locked} key={j.id} onClick={()=>void finishPending(entry!,j)}>
    {entry!.ids.includes(j.id)&&((en?'At capture #':'캡처 당시 ')+(entry!.ids.indexOf(j.id)+1)+(en?' · ':'번 · '))}{j.title[en?1:0]} · {j.id.slice(-8)}
    <small>{j.shipments.map(r=>[r.cargo[en?1:0],r.scu?r.scu+' SCU':'',r.from?placeName(r.from,en?1:0):'?', '→', r.to?placeName(r.to,en?1:0):'?'].filter(Boolean).join(' ')).join(' / ')}</small>
    {missingFields(j).length>0&&<small> · {en?'Missing':'미확인'} {missingFields(j).map(f=>labels[f]).join(', ')}</small>}</button>)}
   {!choices.length&&<p>{en?'No active contract matches this capture. Open the current contract and read again.':'이 화면을 연결할 진행 중 계약이 없습니다. 현재 계약을 열고 다시 읽어주세요.'}</p>}
   <button type="button" disabled={saving} onClick={()=>void finishPending(entry!)}>{en?'Skip screen':'이 화면 건너뛰기'}</button></div>}
 </section>;
}
