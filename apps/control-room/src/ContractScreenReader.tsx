import {useEffect,useRef,useState} from 'react';
import type {Job} from './mission-trial';
import type {Frame} from './contract-screen';
import {matchFrame} from './contract-screen';
import {captureContracts} from './game-capture';

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
type Props={jobs:Job[];en:boolean;locked:boolean;attach:(id:string,frame:Frame)=>Promise<void>};
export function ContractScreenReader(props:Props){
 const {en,locked,jobs}=props,latest=useRef(props);latest.current=props;
 const controller=useRef<AbortController|null>(null),alive=useRef(false);
 const [language,setLanguage]=useState<'eng'|'kor'>(en?'eng':'kor');
 const [running,setRunning]=useState(false),[notice,setNotice]=useState('');
 const [pending,setPending]=useState<Frame[]>([]),[saving,setSaving]=useState(false);
 const available=jobs.filter(j=>j.signature&&(j.state==='ready'||j.state==='incomplete'));
 useEffect(()=>{alive.current=true;return ()=>{alive.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{if(locked)controller.current?.abort();},[locked]);
 async function start(){
  if(controller.current||locked)return;
  const ctl=new AbortController();controller.current=ctl;setRunning(true);
  setNotice(en?'Select the Star Citizen window, then open an accepted contract.':'Star Citizen 창을 선택하고 게임에서 진행 중인 계약을 여세요.');
  try{await captureContracts(language,ctl.signal,async frame=>{
   if(ctl.signal.aborted||latest.current.locked)return;
   const candidates=matchFrame(frame,latest.current.jobs);
   if(candidates.length===1){await latest.current.attach(candidates[0]!.id,frame);
    if(alive.current)setNotice((en?'Saved · ':'원본 반영 · ')+frame.title);}
   else if(alive.current)setPending(q=>q.some(f=>f.key===frame.key)?q:[...q,frame]);
  },()=>{if(alive.current)setRunning(false);});}
  catch(e){if(alive.current&&!ctl.signal.aborted)setNotice(e instanceof Error?e.message:String(e));}
  finally{controller.current=null;if(alive.current)setRunning(false);}
 }
 async function bind(job:Job){
  const frame=pending[0];if(!frame||saving||locked||(frame.missionId&&frame.missionId!==job.id))return;
  setSaving(true);
  try{await props.attach(job.id,frame);setPending(q=>q.filter(f=>f.key!==frame.key));setNotice((en?'Saved · ':'원본 반영 · ')+job.title[en?1:0]);}
  catch(e){setNotice(String(e));}finally{setSaving(false);}
 }
 const frame=pending[0];
 return <section aria-label={en?'Game contract capture':'게임 계약 읽기'}>
  <label>{en?'Game language':'게임 언어'} <select value={language} disabled={running||locked} onChange={e=>setLanguage(e.target.value==='eng'?'eng':'kor')}><option value="kor">한국어</option><option value="eng">English</option></select></label>{' '}
  <button type="button" disabled={locked||!navigator.mediaDevices?.getDisplayMedia} onClick={()=>running?controller.current?.abort():void start()}>
   {running?(en?'Stop reading':'게임 화면 읽기 중지'):(en?'Read game contracts':'게임 계약 화면 읽기')}</button>
  {notice&&<p role="status">{notice}</p>}
  {frame&&<div><p>{en?'Choose the receipt for this screen':'이 화면을 연결할 수신 카드를 선택하세요'} · {pending.length}</p>
   <p>{frame.title} {frame.goals.length?'·':(en?' · Scroll to the objectives':' · 목표 줄까지 스크롤하세요')} {frame.goals.map(g=>g.item+' '+g.total+' SCU → '+g.destination).join(' / ')}</p>
   <ScreenOriginals frames={[frame]} en={en}/>
   {available.filter(j=>!frame.missionId||j.id===frame.missionId).map(j=><button type="button" disabled={saving||locked} key={j.id} onClick={()=>void bind(j)}>
    {j.title[en?1:0]} · {j.shipments.map(r=>r.cargo[en?1:0]+' '+(r.scu||'?')).join(', ')} · {j.id.slice(-8)}</button>)}
   {!available.length&&<p>{en?'Waiting for an accepted contract in Game.log.':'Game.log에서 수락한 계약을 기다립니다.'}</p>}
   <button type="button" disabled={saving} onClick={()=>setPending(q=>q.slice(1))}>{en?'Skip screen':'이 화면 건너뛰기'}</button></div>}
 </section>;
}
