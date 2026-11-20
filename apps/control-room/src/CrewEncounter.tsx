import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {drawFromPoses} from './dialogue-poses';
import {partnerEndpoint} from './partner-endpoint';
import {PartnerQuestion,type GuideDestination} from './PartnerQuestion';
import {createPortal} from 'react-dom';
import directorStill from '../../../docs/cinematics/lounge-guide-dialogue-20261119/02-approach-end.png';
import {loadPartnerPlayback} from './partner-playback';
import './hologram-glass.css';
import './partner-conversation.css';

const scenesByPartner=new Map<string,string[]>();
const sceneFiles=import.meta.glob<string>('./assets/dialogue-scenes/*/*.webp', {
 eager:true,import:'default',query:'?url',
});
for(const [path,url] of Object.entries(sceneFiles)){
 const partner=path.split('/').at(-2)!;
 const scenes=scenesByPartner.get(partner)??[];
 scenes.push(url);
 scenesByPartner.set(partner,scenes);
}

type Props={id:string;name:string;line:string;image:string;background:string;en:boolean;motion:boolean;sound:boolean;volume:number;origin:HTMLElement;onClose:(continuing:boolean)=>void;questions?:boolean;destinations:GuideDestination[]};

// Shared presentation only. Caller owns existing room/scope/partner callbacks.
export function CrewEncounter({id,name,line,image,background,en,motion,sound,volume,origin,onClose,questions=true,destinations}:Props){
 const endpoint=partnerEndpoint(location,import.meta.env.VITE_PARTNER_API_ORIGIN);
 const dialog=useRef<HTMLDialogElement>(null);
 const [media,setMedia]=useState<Awaited<ReturnType<typeof loadPartnerPlayback>>>();
 const [phase,setPhase]=useState<'loading'|'approach'|'idle'|'return'>('loading');
 const [idleReady,setIdleReady]=useState(false),[idleFailed,setIdleFailed]=useState(false);
 const transition=useRef<HTMLVideoElement>(null),idleVideo=useRef<HTMLVideoElement>(null);
 const [introduction,setIntroduction]=useState<GuideDestination>();
 const nextButton=useRef<HTMLButtonElement>(null);
 useLayoutEffect(()=>{if(introduction)nextButton.current?.focus({preventScroll:true});},[introduction]);
 const nextAction=useRef<(()=>void)|undefined>(undefined),completed=useRef(false);
 const useDirectorStill=id==='director'&&!motion;
 const ready=phase==='idle'&&(idleReady||idleFailed);
 const [pose,setPose]=useState<ReturnType<typeof drawFromPoses>>();
 const reactionScenes=scenesByPartner.get(id);
 const idleScene=media&&!idleFailed&&media.idle.type==='image'?media.idle.src:reactionScenes?.[0];
 const reactToQuestion=()=>{
  if(id==='director'||!reactionScenes||!idleScene)return;
  const scenes=idleScene===reactionScenes[0]?reactionScenes:[idleScene,...reactionScenes];
  setPose(previous=>drawFromPoses(scenes,previous??{portrait:idleScene,remaining:[]}));
 };
 const [shownPose,setShownPose]=useState('');
 useEffect(()=>{
  if(!pose)return;
  let active=true;
  const next=new Image();next.src=pose.portrait;
  next.decode().then(()=>{if(active)setShownPose(pose.portrait);}).catch(()=>{});
  return ()=>{active=false;};
 },[pose]);
 const showingPose=phase==='idle' && !!shownPose;
 const restoreFocus=useRef(false);
 // Hold the approach's last frame until the preloaded idle media can be shown.
 const clip=phase==='return'?'return':phase==='approach'||(phase==='idle'&&!ready)?'approach':null;
 const closeCallback=useRef(onClose);
 closeCallback.current=onClose;

 useEffect(()=>{
  let active=true;
  loadPartnerPlayback(id).then(entry=>{
   if(active){setMedia(entry);setPhase('approach');}
  }).catch(()=>{if(active){setIdleFailed(true);setPhase('idle');}});
  return ()=>{active=false;};
 },[id]);

 useLayoutEffect(()=>{
  const node=dialog.current!,overview=origin.closest('.space-overview,.facility-lobby');
  const measure=()=>{
   const bounds=overview?.getBoundingClientRect();
   const x=Math.max(0,bounds?.left??0),y=Math.max(0,bounds?.top??80);
   const width=Math.max(1,Math.min(bounds?.width??innerWidth,innerWidth-x));
   const height=Math.max(1,Math.min(bounds?.height??innerHeight-y,innerHeight-y));
   Object.assign(node.style,{left:`${x}px`,top:`${y}px`,width:`${width}px`,height:`${height}px`});
  };
  measure();node.show();
  const observer=new ResizeObserver(measure);if(overview)observer.observe(overview);
  window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
  return()=>{observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);node.close();
   if(restoreFocus.current)requestAnimationFrame(()=>{if(origin.isConnected&&!origin.closest('[inert]'))origin.focus({preventScroll:true});});
  };
 },[origin]);

 const complete=useCallback(()=>{
  if(completed.current)return;
  completed.current=true;
  restoreFocus.current=!nextAction.current && (!!dialog.current?.contains(document.activeElement)||document.activeElement===document.body);
  closeCallback.current(!!nextAction.current);
  if(nextAction.current)nextAction.current();
 },[]);

 const finish=(next?:GuideDestination)=>{
  if(phase==='return'||completed.current)return;
  nextAction.current=next?.open;
  if(phase==='idle'&&media&&motion&&!next?.skipReturn)setPhase('return');
  else complete();
 };
 const finishRef=useRef(finish);
 finishRef.current=finish;

 useEffect(()=>{
  if(phase!=='approach'&&phase!=='return')return;
  const advance=phase==='return'?complete:()=>setPhase('idle');
  if(!motion){advance();return;}
  const video=transition.current;
  if(!video)return;
  let active=true;
  const done=()=>{if(active)advance();};
  // A stalled network or unsupported codec must not trap the conversation.
  let timer=setTimeout(done,12000);
  const progress=()=>{clearTimeout(timer);timer=setTimeout(done,12000);};
  video.addEventListener('timeupdate',progress);
  video.addEventListener('ended',done);
  video.addEventListener('error',done);
  video.play().catch(done);
  return ()=>{active=false;clearTimeout(timer);video.removeEventListener('timeupdate',progress);video.removeEventListener('ended',done);video.removeEventListener('error',done);video.pause();};
 },[phase,motion,complete]);

 useLayoutEffect(()=>{
  if(transition.current){transition.current.muted=!sound;transition.current.volume=volume/100;}
 },[phase,sound,volume]);
 useEffect(()=>{
  const video=idleVideo.current;
  if(!video)return;
  if(phase==='idle'&&motion&&!showingPose)video.play().catch(()=>{if(video.readyState<2)setIdleFailed(true);});
  else video.pause();
 },[phase,motion,media,showingPose]);
 useEffect(()=>{
  if(phase!=='idle'||idleReady||idleFailed)return;
  const timer=setTimeout(()=>setIdleFailed(true),10000);
  return ()=>clearTimeout(timer);
 },[phase,idleReady,idleFailed]);

 useEffect(()=>{
  if(phase==='return'||!ready)dialog.current?.focus({preventScroll:true});
  else dialog.current?.querySelector<HTMLElement>('.partner-conversation input,.partner-conversation button')?.focus({preventScroll:true});
 },[ready,phase]);
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||event.defaultPrevented||document.querySelector('dialog:modal,.space-dock[data-mobile-open=true]'))return;
   event.preventDefault();event.stopPropagation();if(phase==='return')complete();else finishRef.current();
  };
  window.addEventListener('keydown',escape,true);
  return()=>{window.removeEventListener('keydown',escape,true);};
 },[phase,complete]);

 const choose=(destination:GuideDestination)=>{
  if(destination.introduction)setIntroduction(destination);else finish(destination);
 };
 const shortcut=(destination:GuideDestination)=><button key={destination.id} type="button" onClick={()=>choose(destination)}>{destination.label}<span aria-hidden="true">↗</span></button>;
 return createPortal(<dialog ref={dialog} className="crew-encounter" data-partner={id} data-actions={destinations.length>0} data-phase={phase} data-ready={ready} data-motion={motion} tabIndex={-1} aria-label={name} onCancel={event=>{event.preventDefault();finish();}}>
  <div className="crew-playback" aria-hidden="true">
   {idleFailed&&phase==='idle'&&reactionScenes&&<img className="crew-idle" src={reactionScenes[0]} alt=""/>}
   {idleFailed&&phase==='idle'&&!reactionScenes&&<div className="crew-playback-fallback" style={{backgroundImage:`url(${background})`}}><img src={image} alt=""/></div>}
   {media&&!idleFailed&&(media.idle.type==='video'&&!useDirectorStill
    ? <video className="crew-idle" ref={idleVideo} src={media.idle.src} preload="auto" muted={media.idle.muted} loop={media.idle.loop} playsInline onLoadedData={()=>setIdleReady(true)} onError={()=>setIdleFailed(true)}/>
    : <img className="crew-idle" src={useDirectorStill?directorStill:media.idle.src} alt="" onLoad={event=>event.currentTarget.decode().then(()=>setIdleReady(true),()=>setIdleFailed(true))} onError={()=>setIdleFailed(true)}/>)}
   {showingPose&&<img className="crew-reaction" src={shownPose} alt=""/>}
   {media&&motion&&clip&&<video key={clip} ref={transition} className="crew-transition" src={media[clip]} preload="auto" muted={!sound} playsInline/>}
  </div>
  {ready&&<section className="partner-conversation crew-dialogue" aria-labelledby="partner-conversation-title">
   <h2 id="partner-conversation-title">{name}</h2>
   <p id="partner-conversation-line" aria-live="polite">{introduction?.introduction??line}</p>
   {introduction&&<div className="crew-encounter-actions"><button type="button" ref={nextButton} onClick={()=>finish(introduction)}>{en?'Meet the professor':'교수 만나기'} <span aria-hidden="true">↗</span></button></div>}
   {!introduction&&destinations.length>0&&<div className="crew-encounter-actions">{destinations.map(shortcut)}</div>}
   {!introduction&&questions&&endpoint&&<PartnerQuestion endpoint={endpoint} key={id+':'+en} partner={id} en={en} disabled={false} onQuestion={reactToQuestion} destinations={destinations.map(d=>({...d,open:()=>choose(d)}))}/>}
   <button className="crew-encounter-close" type="button" onClick={()=>finish()}>{en?'End conversation':'대화 마치기'} <span aria-hidden="true">↗</span></button>
  </section>}
  {!ready&&<div className="crew-loading"><button type="button" onClick={()=>phase==='return'?complete():phase==='approach'?setPhase('idle'):complete()}>{phase==='approach'||phase==='return'?(en?'Skip transition':'연출 건너뛰기'):(en?'Cancel':'취소')}</button></div>}
 </dialog>,origin.closest('.space-experience')??document.body);
}
