import {useEffect, useReducer, useRef, useState, type CSSProperties} from 'react';
import {visitChapters, speakers} from './guided-visit-content';
import directory from './assets/division/overview-approved.png';
import './guided-visit.css';

type Position = {chapter:number; line:number; traveling:boolean};
type Move = {from:Position; kind:'line'|'skip'|'arrive'};

function move(current:Position, action:Move):Position {
  if (action.from!==current) return current;
  if (current.traveling) {
    return action.kind==='arrive' ? {chapter:current.chapter+1,line:0,traveling:false} : current;
  }
  if (action.kind==='line' && current.line+1 < visitChapters[current.chapter]!.lines.length) {
    return {...current,line:current.line+1};
  }
  return {...current,traveling:true};
}

type Props={en:boolean; motion:boolean; sound:boolean; volume:number; onComplete:()=>void};
export default function GuidedVisit({en,motion,sound,volume,onComplete}:Props) {
  const [position,dispatch]=useReducer(move,{chapter:0,line:0,traveling:false});
  const [visible,setVisible]=useState(!document.hidden);
  const nextButton=useRef<HTMLButtonElement>(null);
  const section=visitChapters[position.chapter]!;
  const nextSection=visitChapters[position.chapter+1];
  const cue=section.lines[position.line]!;
  const {plate,person,x,y,scale}=cue.shot;
  const [readyPlate,setReadyPlate]=useState('');
  const [missingPlate,setMissingPlate]=useState('');
  const fallbackPlate=section.lines[0]!.shot.plate===plate ? section.lines[1]!.shot.plate : section.lines[0]!.shot.plate;
  const ready=readyPlate===plate || missingPlate===plate;
  const language=en?1:0;
  const text=cue.text[language];
  const duration=Math.max(3300,en?text.split(/\s+/).length*345+850:Array.from(text).length*94+900);
  const travelMs=motion?(nextSection?1350:850):220;

  useEffect(()=>{
    nextButton.current?.focus({preventScroll:true});
    const sync=()=>setVisible(!document.hidden);
    document.addEventListener('visibilitychange',sync);
    return ()=>document.removeEventListener('visibilitychange',sync);
  },[]);

  useEffect(()=>{
    const next=section.lines[position.line+1]??nextSection?.lines[0];
    if (next) for (const src of [next.shot.plate,next.shot.person]) if(src) new Image().src=src;
    new Image().src=directory;
  },[section,nextSection,position.line]);

  useEffect(()=>{
    if (!visible) return;
    if (position.traveling) {
      const timer=window.setTimeout(()=>{
        if(nextSection) dispatch({from:position,kind:'arrive'});
        else onComplete();
      },travelMs);
      return ()=>clearTimeout(timer);
    }
    if (!ready) return;
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
  },[position,ready,visible,en,text,duration,sound,volume,cue.speaker,travelMs,nextSection,onComplete]);

  const vars={
    '--visit-origin':x+'% '+y+'%', '--visit-scale':scale, '--visit-duration':duration+'ms',
    '--visit-from':section.marker.join('% ')+'%', '--visit-to':(nextSection?.marker??section.marker).join('% ')+'%',
    '--visit-travel':travelMs+'ms',
  } as CSSProperties;
  return <section className="guided-visit" aria-label={en?'Guided facility tour':'가이드와 둘러보기'} style={vars} data-motion={motion} data-visible={visible}>
    <div className="visit-frame">
      <div className="visit-picture" key={position.chapter+'-'+position.line}>
        <div className="visit-camera">
          <img className="visit-plate" src={missingPlate===plate?fallbackPlate:plate} alt="" onLoad={()=>setReadyPlate(plate)} onError={()=>setMissingPlate(plate)}/>
        </div>
        {person && <img className="visit-speaker-portrait" src={person} alt=""/>}
      </div>
      <div className="visit-marker"><span>{String(position.chapter+1).padStart(2,'0')} / 04</span>{section.name[language]}</div>
      {position.traveling && <div className="visit-travel" data-final={!nextSection} aria-hidden="true"><img src={directory} alt=""/><i/></div>}
      <div className="visit-panel" data-clear-hand={cue.shot.clearLeftHand} data-travel={position.traveling}>
        <div className="visit-speech" aria-live="polite" aria-atomic="true">
          <strong><span aria-hidden="true">╵╿╵</span> {speakers[cue.speaker][language]}</strong><p>{text}</p>
        </div>
        <button type="button" className="visit-skip" aria-disabled={position.traveling} onClick={()=>dispatch({from:position,kind:'skip'})}>{en?'Skip this stop':'이 구간 건너뛰기'}　»</button>
        <div className="visit-controls">
          <small>{en?'Auto play':'자동 재생'}<i key={position.chapter+'-'+position.line+'-'+ready+'-'+visible} data-ready={ready}/></small>
          <button ref={nextButton} type="button" className="visit-next" aria-disabled={position.traveling} onClick={()=>dispatch({from:position,kind:'line'})}>{en?'Next line':'다음 대사'}　›</button>
        </div>
      </div>
    </div>
  </section>;
}
