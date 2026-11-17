import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import type {PartnerId} from './partner-dialogue';
import {partnerDialogue} from './partner-dialogue';
import operator from './assets/partner-close/operator.png';
import navigator from './assets/partner-close/navigator.png';
import director from './assets/partner-close/director.png';
import bridge from './assets/control-room-clean-plate.png';
import lounge from './assets/lounge-original-composite.png';
import './hologram-glass.css';
import './partner-conversation.css';

const portraits={operator,navigator,director};
type Props={partner:PartnerId;variant:number;en:boolean;motion:boolean;origin:HTMLElement;onClose:()=>void};

// Non-modal dialogue bounded to the scenery. The overview is inert while
// talking, but the real topbar/sidebar retain their navigation callbacks.
export function PartnerConversation({partner,variant,en,motion,origin,onClose}:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 const [ready,setReady]=useState(false),[closing,setClosing]=useState(false),[failed,setFailed]=useState(false);
 const closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null),closingRef=useRef(false);
 const profile=partnerDialogue[partner],greeting=profile.greetings[variant%profile.greetings.length]!;
 const callbacks=useRef({onClose,motion,ready});callbacks.current={onClose,motion,ready};

 useLayoutEffect(()=>{
  const node=dialog.current!,overview=origin.closest('.space-overview');
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

 const finish=useCallback(()=>{
  if(closingRef.current)return;closingRef.current=true;setClosing(true);
  const complete=()=>{
   closeTimer.current=null;
   const restore=dialog.current?.contains(document.activeElement)||document.activeElement===document.body;
   callbacks.current.onClose();
   if(restore)requestAnimationFrame(()=>{if(origin.isConnected&&!origin.closest('[inert]'))origin.focus({preventScroll:true});});
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

 return <dialog ref={dialog} className="crew-encounter" data-partner={partner} data-ready={ready} data-closing={closing} data-motion={motion} aria-labelledby="partner-conversation-title" aria-describedby="partner-conversation-line" onCancel={event=>{event.preventDefault();finish();}} style={{'--crew-focus-x':partner==='operator'?'32%':partner==='navigator'?'68%':'33%'} as CSSProperties}>
  <div className="crew-encounter-background" aria-hidden="true"><img src={partner==='director'?lounge:bridge} alt=""/></div>
  <div className="crew-encounter-shade" aria-hidden="true"/>
  {!failed&&<div className="crew-encounter-person" aria-hidden="true"><img src={portraits[partner]} alt="" draggable={false} onLoad={()=>setReady(true)} onError={()=>{setFailed(true);setReady(true);}}/></div>}
  <section className="partner-conversation asset-hologram" data-glass-panel="crew">
   <p className="partner-conversation-channel">STAM / CREW</p>
   <h2 id="partner-conversation-title">{profile.name[en?1:0]}</h2>
   <p id="partner-conversation-line">{greeting[en?1:0]}</p>
   <p className="partner-conversation-note">{failed?(en?'The portrait could not load. You can still read the greeting.':'인물 이미지를 불러오지 못했습니다. 인사말은 확인하실 수 있습니다.'):(en?'More conversation topics are being prepared.':'더 다양한 대화 주제를 준비하고 있습니다.')}</p>
   <button type="button" onClick={finish} disabled={closing}>{en?'End conversation':'대화 마치기'} <span aria-hidden="true">↗</span></button>
  </section>
  {!ready&&<p className="crew-loading" role="status">{en?'Preparing conversation…':'대화를 준비하고 있습니다…'} <button type="button" onClick={finish}>{en?'Cancel':'취소'}</button></p>}
 </dialog>;
}
