import {useEffect,useRef,useState} from 'react';
import boarding from './assets/travel/shuttle-boarding.mp4';
import './shuttle-boarding.css';

// Only the approved boarding segment. No takeoff/landing placeholder follows it.
export function ShuttleBoarding({en,sound,volume,onSound,onComplete,onCancel}:{
 en:boolean;sound:boolean;volume:number;onSound:(enabled:boolean)=>void;onComplete:()=>void;onCancel:()=>void;
}){
 const dialog=useRef<HTMLDialogElement>(null),video=useRef<HTMLVideoElement>(null);
 const [blocked,setBlocked]=useState(false),[failed,setFailed]=useState(false),[slow,setSlow]=useState(false);
 const done=useRef(false);
 const complete=()=>{if(!done.current){done.current=true;onComplete();}};
 const play=()=>{setBlocked(false);void video.current?.play().catch(()=>setBlocked(true));};
 useEffect(()=>{
  const opener=document.activeElement,element=video.current!,modal=dialog.current!;
  let active=true;
  element.src=boarding;
  modal.showModal();
  void element.play().catch(()=>{if(active)setBlocked(true);});
  const timeout=setTimeout(()=>{if(element.readyState<2)setSlow(true);},12000);
  return ()=>{
   active=false;clearTimeout(timeout);element.pause();element.removeAttribute('src');element.load();modal.close();
   if(opener instanceof HTMLElement&&opener.isConnected)opener.focus({preventScroll:true});
  };
 },[]);
 useEffect(()=>{if(video.current){video.current.muted=!sound;video.current.volume=Math.max(0,Math.min(1,volume/100));}},[sound,volume]);
 return <dialog ref={dialog} className="shuttle-boarding" aria-label={en?'Shuttle boarding':'셔틀 탑승'} onCancel={event=>{event.preventDefault();event.stopPropagation();onCancel();}}>
  <video ref={video} src={boarding} autoPlay playsInline muted={!sound} preload="auto"
   aria-label={en?'Approved shuttle boarding film':'셔틀 탑승 영상'}
   onEnded={complete} onError={()=>setFailed(true)} onPlaying={()=>{setBlocked(false);setSlow(false);}}/>
  <header><span>STAM / SHUTTLE BOARDING</span><h2>{en?'Boarding the shuttle':'셔틀에 탑승합니다'}</h2></header>
  {(blocked||failed||slow)&&<p className="shuttle-playback-message" role="status">{failed
   ?(en?'The video could not load. You can continue to the control centre.':'영상을 불러오지 못했습니다. 관제센터로 바로 이동할 수 있습니다.')
   :blocked?(en?'Press Play to start the video.':'재생 버튼을 눌러 영상을 시작하세요.')
   :(en?'The video is taking longer to load. You can continue now.':'영상 로딩이 지연되고 있습니다. 바로 이동할 수 있습니다.')}</p>}
  <nav aria-label={en?'Boarding controls':'탑승 영상 조작'}>
   {blocked&&!failed&&<button onClick={play}>{en?'Play video':'영상 재생'}</button>}
   <button aria-pressed={sound} onClick={()=>onSound(!sound)}>{en?`Sound ${sound?'on':'off'}`:`소리 ${sound?'켜짐':'꺼짐'}`}</button>
   <button onClick={complete}>{en?'Continue to control centre':'관제센터로 바로 이동'}</button>
   <button onClick={onCancel}>{en?'Cancel':'취소'}</button>
  </nav>
 </dialog>;
}
