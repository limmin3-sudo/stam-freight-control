import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {CSSProperties} from 'react';
import './hologram-glass.css';
import './partner-conversation.css';

type Action={label:string;onSelect:()=>void};
type Props={id:string;name:string;line:string;image:string;background:string;focus:number;en:boolean;motion:boolean;origin:HTMLElement;onClose:()=>void;actions?:readonly Action[];note?:string};

// Shared presentation only. Caller owns existing room/scope/partner callbacks.
export function CrewEncounter({id,name,line,image,background,focus,en,motion,origin,onClose,actions=[],note}:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 const [ready,setReady]=useState(false),[closing,setClosing]=useState(false),[departing,setDeparting]=useState(false),[failed,setFailed]=useState(false);
 const closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null),closingRef=useRef(false);
 const callbacks=useRef({onClose,motion,ready});callbacks.current={onClose,motion,ready};

 useLayoutEffect(()=>{
  const node=dialog.current!,overview=origin.closest('.space-overview,.facility-lobby');
  const measure=()=>{
   const bounds=overview?.getBoundingClientRect();
   const x=Math.max(0,bounds?.left??0),y=Math.max(0,bounds?.top??80);
   const width=Math.max(1,Math.min(bounds?.width??innerWidth,innerWidth-x));
   const height=Math.max(1,Math.min(bounds?.height??innerHeight-y,innerHeight-y));
   Object.assign(node.style,{left:`${x}px`,top:`${y}px`,width:`${width}px`,height:`${height}px`});
   // Match the standing character's eye line and head size, then approach.
   const from=origin.getBoundingClientRect(),center=width<760?.5:.31,personHeight=width<760?height*.70:height*1.10;
   node.style.setProperty('--crew-start-x',`${from.left+from.width*.5-(x+width*center)}px`);
   node.style.setProperty('--crew-start-y',`${from.top+from.height*.09-(y+height*.025+personHeight*.17)}px`);
   node.style.setProperty('--crew-start-scale',String(Math.max(.08,Math.min(.6,from.height*.14/(personHeight*.25)))));
  };
  measure();node.show();
  const observer=new ResizeObserver(measure);if(overview)observer.observe(overview);
  window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
  return()=>{observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);node.close();};
 },[origin]);

 const finish=useCallback((next?:()=>void)=>{
  if(closingRef.current)return;closingRef.current=true;setClosing(true);setDeparting(!!next);
  const complete=()=>{
   closeTimer.current=null;
   const restore=dialog.current?.contains(document.activeElement)||document.activeElement===document.body;
   callbacks.current.onClose();
   if(next)next();
   else if(restore)requestAnimationFrame(()=>{if(origin.isConnected&&!origin.closest('[inert]'))origin.focus({preventScroll:true});});
  };
  if(callbacks.current.motion&&callbacks.current.ready)closeTimer.current=setTimeout(complete,420);else complete();
 },[origin]);

 useEffect(()=>{
  dialog.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
  const escape=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||event.defaultPrevented||document.querySelector('dialog:modal,.space-dock[data-mobile-open=true]'))return;
   event.preventDefault();event.stopPropagation();finish();
  };
  window.addEventListener('keydown',escape,true);
  return()=>{window.removeEventListener('keydown',escape,true);if(closeTimer.current!==null)clearTimeout(closeTimer.current);};
 },[finish]);

 return createPortal(<dialog ref={dialog} className="crew-encounter" data-partner={id} data-actions={actions.length>0} data-departing={departing} data-ready={ready} data-closing={closing} data-motion={motion} aria-labelledby="partner-conversation-title" aria-describedby="partner-conversation-line" onCancel={event=>{event.preventDefault();finish();}} style={{'--crew-focus-x':`${focus}%`} as CSSProperties}>
  <div className="crew-encounter-background" aria-hidden="true"><img src={background} alt=""/></div>
  <div className="crew-encounter-shade" aria-hidden="true"/>
  {!failed&&<div className="crew-encounter-person" aria-hidden="true"><img src={image} alt="" draggable={false} onLoad={()=>setReady(true)} onError={()=>{setFailed(true);setReady(true);}}/></div>}
  <section className="partner-conversation asset-hologram" data-glass-panel="crew">
   <p className="partner-conversation-channel">STAM / CREW</p>
   <h2 id="partner-conversation-title">{name}</h2>
   <p id="partner-conversation-line">{line}</p>
   <p className="partner-conversation-note">{failed?(en?'The portrait could not load. You can still read the greeting.':'인물 이미지를 불러오지 못했습니다. 인사말은 확인하실 수 있습니다.'):note}</p>
   {actions.length>0&&<div className="crew-encounter-actions">{actions.map(action=><button key={action.label} type="button" disabled={closing} onClick={()=>finish(action.onSelect)}>{action.label}<span aria-hidden="true">↗</span></button>)}</div>}
   <button className="crew-encounter-close" type="button" onClick={()=>finish()} disabled={closing}>{en?'End conversation':'대화 마치기'} <span aria-hidden="true">↗</span></button>
  </section>
  {!ready&&<p className="crew-loading" role="status">{en?'Preparing conversation…':'대화를 준비하고 있습니다…'} <button type="button" onClick={()=>finish()}>{en?'Cancel':'취소'}</button></p>}
 </dialog>,origin.closest('.space-experience')??document.body);
}
