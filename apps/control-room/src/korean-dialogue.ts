import {useEffect, useRef} from 'react';
import catalogue from './voiceover-ko.json';

const assets = import.meta.glob<string>('./assets/voiceover-ko/*.mp3', {
  eager: true, query: '?url&no-inline', import: 'default',
});
const recordings = new Map(catalogue.map(({id,speaker,text}) => [
  speaker+'\n'+text, assets['./assets/voiceover-ko/'+id+'.mp3'],
]));

export function koreanRecording(speaker:string, text:string) {
  const role = speaker==='director'?'guide':speaker==='academic-advisor'?'professor':speaker;
  return recordings.get(role+'\n'+text);
}

export function stopRecording(audio:HTMLAudioElement) {
  audio.onended=null;
  audio.onplaying=null;
  audio.onerror=null;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
}

// Manual dialogue advances only on the player's next action.
export function useKoreanDialogue(speaker:string,text:string,enabled:boolean,volume:number) {
  const url = enabled ? koreanRecording(speaker,text) : undefined;
  const current = useRef<HTMLAudioElement|null>(null);
  const level = useRef(volume);
  useEffect(()=>{
    level.current=volume;
    if(current.current)current.current.volume=volume/50;
  },[volume]);
  useEffect(()=>{
    if(!url)return;
    const audio = new Audio(url);
    current.current=audio;
    audio.volume=level.current/50;
    let finished=false;
    audio.onended=()=>{finished=true;};
    const sync=()=>{
      if(document.hidden)audio.pause();
      else if(!finished)void audio.play().catch(()=>{});
    };
    document.addEventListener('visibilitychange',sync);
    sync();
    return ()=>{
      document.removeEventListener('visibilitychange',sync);
      current.current=null;
      stopRecording(audio);
    };
  },[url]);
}
