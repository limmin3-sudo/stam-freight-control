import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import film from './assets/director-cleaning-intro.mp4';
import poster from './assets/director-cleaning-poster.jpg';
import captionsKo from './assets/director-cleaning-ko.vtt?url';
import captionsEn from './assets/director-cleaning-en.vtt?url';
import logo from '../../../assets/stam-logo-transparent.png';
import {openingEligible,openingSeenKey} from './opening-policy';
import './opening-film.css';

export function OpeningFilm({children}:{children:ReactNode}){
 const [visible,setVisible]=useState(()=>{try{return openingEligible(location.hash,sessionStorage.getItem(openingSeenKey));}catch{return openingEligible(location.hash,null);}});
 const [leaving,setLeaving]=useState(false),[muted,setMuted]=useState(true),[blocked,setBlocked]=useState(false),[failed,setFailed]=useState(false);
 const video=useRef<HTMLVideoElement>(null),skip=useRef<HTMLButtonElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const en=new URLSearchParams(location.hash.split('?')[1]||location.search).get('lang')==='en';
 const finish=useCallback(()=>{if(timer.current)return;try{sessionStorage.setItem(openingSeenKey,'1');}catch{}video.current?.pause();setLeaving(true);
  timer.current=setTimeout(()=>{setVisible(false);setLeaving(false);timer.current=null;requestAnimationFrame(()=>document.querySelector<HTMLElement>('.space-switch a[aria-current]')?.focus({preventScroll:true}));},matchMedia('(prefers-reduced-motion: reduce)').matches?0:650);
 },[]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 useEffect(()=>{if(!visible)return;skip.current?.focus({preventScroll:true});void video.current?.play().catch(()=>setBlocked(true));const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')finish();};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[visible,finish]);
 const play=()=>{setBlocked(false);void video.current?.play().catch(()=>setBlocked(true));};
 return <>
  <div className="opening-content" inert={visible} aria-hidden={visible||undefined}>{children}</div>
  {visible&&<section className="opening-film" data-leaving={leaving} aria-label={en?'Welcome to STAM':'STAM에 오신 것을 환영합니다'}>
   <video ref={video} src={film} poster={poster} autoPlay muted={muted} playsInline preload="auto" onEnded={finish} onError={()=>setFailed(true)} aria-label={en?'The flight guide prepares the lounge':'라운지를 준비하는 플라이트 가이드'}><track kind="captions" src={en?captionsEn:captionsKo} srcLang={en?'en':'ko'} label={en?'English':'한국어'} default /></video>
   <div className="opening-brand"><img src={logo} alt="STAM"/><span>STAM <small>WELCOME ABOARD</small></span></div>
   <div className="opening-caption"><small>BEFORE THE JOURNEY</small><p>{en?'The lounge is almost ready.':'라운지를 준비하고 있습니다.'}</p></div>
   <div className="opening-actions">
    {blocked&&!failed&&<button onClick={play}>{en?'Play video':'영상 재생'}</button>}
    {!failed&&<button aria-pressed={!muted} onClick={()=>{setMuted(!muted);if(video.current)video.current.muted=!muted;play();}}>{muted?(en?'Sound on':'소리 켜기'):(en?'Mute':'소리 끄기')}</button>}
    <button ref={skip} onClick={finish}>{en?'Enter lounge':'라운지로 건너뛰기'} <span aria-hidden="true">→</span></button>
   </div>
   {failed&&<p className="opening-error" role="status">{en?'The video could not load. You can enter the lounge now.':'영상을 불러오지 못했습니다. 바로 라운지로 입장할 수 있습니다.'}</p>}
  </section>}
 </>;
}
