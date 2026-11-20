import {useEffect, useReducer, useRef, useState, type CSSProperties} from 'react';
import greetingGuide from './assets/dialogue-poses/director/02.webp';
import gateGuide from './assets/dialogue-poses/director/04.webp';
import {boardingGate, visitChapters, speakers} from './guided-visit-content';
import {ShuttleBoarding} from './ShuttleBoarding';
import {ConsoleArrival} from './ConsoleArrival';
import directory from './assets/division/overview-approved.png';
import './guided-visit.css';

type Position = {chapter:number; line:number; traveling:boolean; boarding?:boolean};
type Move = {from:Position; kind:'line'|'skip'|'arrive'|'stay'};

function move(current:Position, action:Move):Position {
  if (action.from!==current) return current;
  if (current.traveling) {
    if(action.kind==='stay')return {...current,traveling:false,boarding:false};
    return action.kind==='arrive' ? {chapter:current.chapter+1,line:0,traveling:false} : current;
  }
  if (action.kind==='line' && current.line+1 < visitChapters[current.chapter]!.lines.length) {
    return {...current,line:current.line+1};
  }
  return {...current,traveling:true,boarding:current.chapter===0 && action.kind==='line'};
}

type Props={fromDesk:boolean; en:boolean; motion:boolean; sound:boolean; volume:number; onSound:(on:boolean)=>void; onComplete:()=>void};
export default function GuidedVisit({fromDesk,en,motion,sound,volume,onSound,onComplete}:Props) {
  const [position,dispatch]=useReducer(move,{chapter:0,line:fromDesk ? visitChapters[0]!.lines.findIndex(cue=>cue.entry) : 0,traveling:false});
  const [visible,setVisible]=useState(!document.hidden);
  const nextButton=useRef<HTMLButtonElement>(null);
  const boarding=motion && position.boarding;
  const section=visitChapters[position.chapter]!;
  const nextSection=visitChapters[position.chapter+1];
  const cue=section.lines[position.line]!;
  const {plate,entry}=cue;
  const previousEntry=section.lines[position.line-1]?.entry;
  const pullbackMs=previousEntry ? 333 : 0;
  const [entered,setEntered]=useState<typeof cue>();
  const entering=!!entry && motion && entered!==cue && !position.traveling;
  useEffect(()=>{
    if(!entering || !visible)return;
    const timer=window.setTimeout(()=>setEntered(cue),1030+pullbackMs);
    return ()=>clearTimeout(timer);
  },[entering,visible,cue,pullbackMs]);
  const [readyPlate,setReadyPlate]=useState('');
  const [missingPlate,setMissingPlate]=useState('');
  const ready=readyPlate===plate || missingPlate===plate;
  const language=en?1:0;
  const text=cue.text[language];
  const duration=Math.max(3300,en?text.split(/\s+/).length*345+850:Array.from(text).length*94+900);
  const travelMs=motion?(nextSection?1350:850):220;

  useEffect(()=>{
    const sync=()=>setVisible(!document.hidden);
    document.addEventListener('visibilitychange',sync);
    return ()=>document.removeEventListener('visibilitychange',sync);
  },[]);

  useEffect(()=>{
    const next=section.lines[position.line+1]??nextSection?.lines[0];
    if (next && next.plate!==plate) new Image().src=next.plate;
    if(next?.entry)new Image().src=next.entry.image;
    new Image().src=directory;
  },[section,nextSection,position.line,plate]);

  useEffect(()=>{
    if (!visible) return;
    if (boarding) return;
    if (position.traveling) {
      const timer=window.setTimeout(()=>{
        if(nextSection) dispatch({from:position,kind:'arrive'});
        else onComplete();
      },travelMs);
      return ()=>clearTimeout(timer);
    }
    if (!ready || entering) return;
    const advance=()=>dispatch({from:position,kind:'line'});
    let timer=window.setTimeout(advance,duration);
    const synth=window.speechSynthesis;
    const voice=sound && synth?.getVoices().find(v=>v.localService && v.lang.toLowerCase().startsWith(en?'en':'ko'));
    let speech:SpeechSynthesisUtterance|undefined;
    if (voice && synth) {
      speech=new SpeechSynthesisUtterance(text);
      speech.voice=voice;
      speech.lang=voice.lang;
      speech.volume=volume/50;
      speech.rate=cue.speaker==='operator'?1.09:1;
      speech.onstart=()=>{clearTimeout(timer);timer=window.setTimeout(advance,duration*3);};
      speech.onend=advance;
      synth.speak(speech);
    }
    return ()=>{
      clearTimeout(timer);
      if(speech){speech.onstart=null;speech.onend=null;synth.cancel();}
    };
  },[position,boarding,ready,entering,visible,en,text,duration,sound,volume,cue.speaker,travelMs,nextSection,onComplete]);

  const controlsLocked=position.traveling || entering;
  useEffect(()=>{
    if(!controlsLocked && (document.activeElement===document.body || !document.activeElement))
      nextButton.current?.focus({preventScroll:true});
  },[controlsLocked]);
  const vars={
    '--visit-duration':duration+'ms',
    '--visit-from':section.marker.join('% ')+'%', '--visit-to':(nextSection?.marker??section.marker).join('% ')+'%',
    '--visit-travel':travelMs+'ms',
  } as CSSProperties;
  return <section className="guided-visit" aria-label={en?'Guided facility tour':'가이드와 둘러보기'} style={vars} data-motion={motion} data-visible={visible}>
    <div className="visit-frame">
      <div className="visit-picture" data-lounge-view={cue.loungeView} key={cue.loungeView ?? plate}>
        <div className="visit-camera">
          <img className="visit-plate" src={missingPlate===plate?directory:plate} alt="" onLoad={()=>setReadyPlate(plate)} onError={()=>setMissingPlate(plate)}/>
          {cue.loungeView==='guide' && <img className="visit-greeting-guide" src={greetingGuide} alt=""/>}
          {cue.loungeView==='gate' && missingPlate!==plate && <>
            <img className="visit-gate-guide" src={gateGuide} alt=""/>
            <span className="visit-gate-label" style={{left:boardingGate.anchor[0]+'%',top:boardingGate.anchor[1]+'%'}}>{boardingGate.label[language]}</span>
          </>}
        </div>
      </div>
      {entering && entry && <div className="visit-room-entry" key={entry.id} data-room={entry.id} aria-hidden="true" style={{'--visit-pullback':pullbackMs+'ms',transformOrigin:entry.point.join('% ')+'%'} as CSSProperties}>
        <img className="visit-entry-door" src={entry.image} alt=""/>
        {previousEntry && <img className="visit-previous-door" src={previousEntry.image} alt="" style={{transformOrigin:previousEntry.point.join('% ')+'%'}}/>}
        <div className="visit-room-ignition"><ConsoleArrival departing={false} powerOn returning={false} departureMs={697} ignitionMs={333}/></div>
      </div>}
      <div className="visit-marker"><span>{String(position.chapter+1).padStart(2,'0')} / 04</span>{section.name[language]}</div>
      {boarding && <ShuttleBoarding en={en} sound={sound} volume={volume} onSound={onSound}
        onComplete={()=>dispatch({from:position,kind:'arrive'})} onCancel={()=>dispatch({from:position,kind:'stay'})}/>}
      {position.traveling && !boarding && <div className="visit-travel" data-final={!nextSection} aria-hidden="true"><img src={directory} alt=""/><i/></div>}
      <div className="visit-panel" data-travel={position.traveling || entering}>
        <div className="visit-speech" aria-live="polite" aria-atomic="true">
          <strong><span aria-hidden="true">╵╿╵</span> {speakers[cue.speaker][language]}</strong><p>{text}</p>
        </div>
        <button type="button" className="visit-skip" disabled={controlsLocked} onClick={()=>dispatch({from:position,kind:'skip'})}>{en?'Skip this stop':'이 구간 건너뛰기'}　»</button>
        <div className="visit-controls">
          <small>{en?'Auto play':'자동 재생'}<i key={position.chapter+'-'+position.line+'-'+ready+'-'+visible} data-ready={ready && !entering}/></small>
          <button ref={nextButton} type="button" className="visit-next" disabled={controlsLocked} onClick={()=>dispatch({from:position,kind:'line'})}>{en?'Next line':'다음 대사'}　›</button>
        </div>
      </div>
    </div>
  </section>;
}
