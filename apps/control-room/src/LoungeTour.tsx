import {useEffect,useRef,useState} from 'react';
import type {Locale} from './navigation';
import type {SpaceScreen} from './space-navigation';
import {loungeTourStops} from './lounge-tour-content';
import {createLoungeTourRenderer,tourGuideImages} from './lounge-tour-renderer';
import logo from '../../../assets/stam-logo-transparent.png';
import fallbackLounge from './assets/lounge-original-composite.png';

type Props={locale:Locale;motion:boolean;screen:SpaceScreen;onNavigate:(screen:SpaceScreen)=>void;onClose:()=>void;onTravelChange:(busy:boolean)=>void};
type Phase='travel'|'logo'|'ignition'|'intro';
type Renderer=Awaited<ReturnType<typeof createLoungeTourRenderer>>;
const smooth=(a:number,b:number,t:number)=>{const n=Math.max(0,Math.min(1,(t-a)/(b-a)));return n*n*(3-2*n);};

export function LoungeTour(props:Props){
 const [step,setStep]=useState(0),[phase,setPhase]=useState<Phase>('travel'),[paused,setPaused]=useState(false),[ready,setReady]=useState(false),[fallback,setFallback]=useState(false);
 const host=useRef<HTMLDivElement>(null),label=useRef<HTMLDivElement>(null),shade=useRef<HTMLDivElement>(null),plasma=useRef<HTMLDivElement>(null),api=useRef<Renderer|null>(null);
 const time=useRef(0),requested=useRef<SpaceScreen|null>(null),callbacks=useRef(props),stepRef=useRef(step),nextButton=useRef<HTMLButtonElement>(null),closeButton=useRef<HTMLButtonElement>(null),phaseRef=useRef<Phase>('travel');
 callbacks.current=props;
 stepRef.current=step;
 const en=props.locale==='en',word=(text:readonly[string,string])=>text[en?1:0],stop=loungeTourStops[step]!,gate=stop.id==='gate';
 const arrived=phase==='intro',menuReady=props.screen===stop.screen,showMenu=arrived&&!gate&&menuReady;
 const setCurrentPhase=(value:Phase)=>{if(phaseRef.current!==value){phaseRef.current=value;setPhase(value);}};

 useEffect(()=>{
  let cancelled=false,observer:ResizeObserver|undefined,contextLost:(()=>void)|undefined,instance:Renderer|undefined;
  closeButton.current?.focus({preventScroll:true});
  void createLoungeTourRenderer(host.current!).then(renderer=>{
   if(cancelled){renderer.dispose();return;}
   instance=renderer;api.current=renderer;renderer.render(stepRef.current,time.current);setFallback(false);setReady(true);
   observer=new ResizeObserver(()=>{renderer.resize();renderer.render(stepRef.current,time.current);});observer.observe(host.current!);
   contextLost=()=>{setFallback(true);api.current=null;};
   renderer.canvas.addEventListener('webglcontextlost',contextLost);
  }).catch(()=>{if(!cancelled){setFallback(true);setReady(true);}});
  return()=>{cancelled=true;observer?.disconnect();if(instance&&contextLost)instance.canvas.removeEventListener('webglcontextlost',contextLost);instance?.dispose();api.current=null;};
 // The scene is loaded once and reused between stops. Callbacks are refs so
 // real menu commits do not restart travel or recreate GPU resources.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 useEffect(()=>{
  if(!ready)return;
  let raf=0,last=performance.now(),slow=0;
  const render=(now:number)=>{
   const delta=now-last;last=now;
   if(!paused){time.current=props.motion?Math.min(9.3,time.current+Math.min(delta/1000,.1)):9.3;}
   const t=time.current;
   if(!paused&&t>=7.3&&requested.current!==stop.screen){requested.current=stop.screen;callbacks.current.onNavigate(stop.screen);}
   const nextPhase:Phase=t>=9.2?'intro':t>=8.95?'ignition':t>=8.1?'logo':'travel';setCurrentPhase(nextPhase);
   if((t<9.2||gate)&&api.current){const anchor=api.current.render(step,t);if(label.current){label.current.style.left=anchor.left+'%';label.current.style.top=anchor.top+'%';}}
   if(shade.current)shade.current.style.opacity=gate?'0':String(smooth(8.1,8.65,t)*(1-smooth(8.95,9.2,t)));
   if(plasma.current)plasma.current.style.opacity=props.motion&&t>=8.95&&t<=9.2?String(Math.sin((t-8.95)/.25*Math.PI)*.8):'0';
   if(delta>65&&t<8.1){if(++slow===4)api.current?.resize(.65);}else slow=0;
   if(t>=9.2||paused){api.current?.resize(1);if(t<9.2||gate)api.current?.render(step,t);return;}
   raf=requestAnimationFrame(render);
  };
  render(last);return()=>cancelAnimationFrame(raf);
 },[ready,step,paused,props.motion,stop.screen,gate]);

 useEffect(()=>{props.onTravelChange(!showMenu);return()=>props.onTravelChange(false);},[showMenu,props.onTravelChange]);

 useEffect(()=>{if(arrived&&menuReady)nextButton.current?.focus({preventScroll:true});},[arrived,menuReady,step]);
 useEffect(()=>{
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('dialog[open]')){event.preventDefault();callbacks.current.onClose();}};
  const visibility=()=>{if(document.hidden)setPaused(true);};
  window.addEventListener('keydown',onKey);document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('keydown',onKey);document.removeEventListener('visibilitychange',visibility);};
 },[]);

 const advance=()=>{if(gate){props.onClose();return;}time.current=0;requested.current=null;phaseRef.current='travel';setPhase('travel');setPaused(false);setStep(step+1);};
 const skip=()=>{time.current=9.3;requested.current=stop.screen;callbacks.current.onNavigate(stop.screen);phaseRef.current='intro';setPhase('intro');setPaused(false);if(!ready){setFallback(true);setReady(true);}api.current?.render(step,9.3);if(shade.current)shade.current.style.opacity='0';if(plasma.current)plasma.current.style.opacity='0';};
 return <section className="lounge-tour" aria-label={en?'Guided lounge tour':'가이드와 라운지 투어'} data-stop={stop.id} data-phase={phase} data-ready={ready} data-paused={paused}>
  <div className="lounge-tour-stage" hidden={showMenu}>
   <div className="lounge-tour-photo">
    <div className="lounge-tour-world" ref={host}/>
    {fallback&&<div className="lounge-tour-fallback" style={{backgroundImage:`url(${fallbackLounge})`}}><img src={tourGuideImages[stop.guide]} alt=""/></div>}
    <div className="lounge-tour-destination" ref={label} hidden={phase!=='travel'&&!gate}><small>LOUNGE TOUR / 0{step+2}</small><strong>{word(stop.name)}</strong><span>{word(stop.detail)}</span></div>
   </div>
  </div>
  <div className="lounge-tour-blackout" ref={shade} aria-hidden="true"/>
  <div className="lounge-tour-standby" hidden={gate||phase==='travel'||showMenu} aria-hidden="true"><img src={logo} alt=""/><span>STAM / {stop.code}</span></div>
  <div className="lounge-tour-plasma" ref={plasma} aria-hidden="true"/>
  {!ready&&<div className="lounge-tour-loading" role="status">{en?'Your guide is getting ready…':'안내 장면을 준비하고 있어요…'}</div>}
  <nav className="lounge-tour-controls" aria-label={en?'Tour controls':'투어 조작'}>
   {!arrived&&<><button type="button" onClick={()=>setPaused(!paused)} disabled={!ready}>{paused?(en?'Continue':'계속 보기'):(en?'Pause':'일시정지')}</button><button type="button" onClick={skip}>{en?'Skip travel':'이동 건너뛰기'}</button></>}
   <button type="button" onClick={props.onClose} ref={closeButton}>{en?'End tour':'투어 종료'}</button>
  </nav>
  {showMenu&&<div className="lounge-tour-portrait" aria-hidden="true"><img src={tourGuideImages[stop.guide]} alt=""/></div>}
  <section className="lounge-tour-caption" aria-label={en?'Guide introduction':'가이드 안내'}>
   <header><span>FLIGHT DIRECTOR</span><small>{word(stop.name)} · {step+1} / 4</small></header>
   <p aria-live="polite">{word(arrived?stop.intro:stop.travel)}</p>
   {arrived&&menuReady&&<button type="button" onClick={advance} ref={nextButton}>{gate?(en?'Finish lounge tour':'라운지 투어 마치기'):(en?`Continue to ${word(loungeTourStops[step+1]!.name)}`:`${word(loungeTourStops[step+1]!.name)}로 가시죠`)} <span aria-hidden="true">→</span></button>}
   {arrived&&!menuReady&&<span role="status">{en?'Opening the screen…':'화면을 열고 있어요…'}</span>}
  </section>
 </section>;
}
