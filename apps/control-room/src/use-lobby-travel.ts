import {useEffect,useRef,useState,type RefObject} from 'react';
import type {LobbyRoom,TradeScope} from './space-navigation';

export type LobbyTravelPhase='idle'|'approach'|'ignite'|'blackout'|'return';
// Route changes remain owned by SpaceExperience. This hook only delays a scene
// click; sidebar/history changes cancel that delay, never queue a second route.
export function useLobbyTravel({host,room,scope,motion,navigationKey,locale,onRoom}:{host:RefObject<HTMLElement|null>;room?:LobbyRoom;scope?:TradeScope;motion:boolean;navigationKey:number;locale:string;onRoom:(room?:LobbyRoom,scope?:TradeScope)=>void}){
 const [phase,setPhase]=useState<LobbyTravelPhase>('idle');
 const [focus,setFocus]=useState<readonly[number,number]>([50,50]);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),expected=useRef<{room?:LobbyRoom;scope?:TradeScope}|null>(null);
 const origin=useRef<string|null>(null),busy=useRef(false),callback=useRef(onRoom);callback.current=onRoom;
 const clear=()=>{if(timer.current!==null)clearTimeout(timer.current);timer.current=null;};
 const restore=()=>{const target=origin.current;origin.current=null;if(target)host.current?.querySelector<HTMLElement>(`[data-staff="${target}"], [data-place="${target}"]`)?.focus({preventScroll:true});};
 const finish=()=>{clear();busy.current=false;setPhase('idle');};
 const cancel=()=>{expected.current=null;finish();};
 const later=(fn:()=>void,ms:number)=>{clear();timer.current=setTimeout(()=>{timer.current=null;fn();},ms);};
 useEffect(()=>()=>clear(),[]);
 useEffect(()=>{
  if(phase==='idle')return;
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('dialog[open]')){event.preventDefault();cancel();}};
  window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
 },[phase]);
 useEffect(()=>{origin.current=null;cancel();},[navigationKey,locale]);
 useEffect(()=>{if(!motion&&busy.current){cancel();}},[motion]);
 const previous=useRef({room,scope});
 useEffect(()=>{
  if(previous.current.room===room&&previous.current.scope===scope)return;
  previous.current={room,scope};
  const destination=expected.current;expected.current=null;
  if(destination&&destination.room===room&&destination.scope===scope){
   if(room){setPhase('ignite');later(finish,250);}
   else{setPhase('return');later(finish,650);}
  }else{cancel();}
 },[room,scope]);
 useEffect(()=>{
  if(phase!=='idle')return;
  if(!room)restore();
  else host.current?.querySelector<HTMLElement>('.market-header h2')?.focus({preventScroll:true});
 },[phase,room]);
 const enter=(next:LobbyRoom,nextScope:TradeScope|undefined,point:readonly[number,number],source:string)=>{
  if(busy.current)return;
  origin.current=source;setFocus(point);
  if(!motion){callback.current(next,nextScope);return;}
  busy.current=true;setPhase('approach');
  later(()=>{expected.current={room:next,scope:nextScope};setPhase('ignite');callback.current(next,nextScope);},720);
 };
 const leave=(point:readonly[number,number])=>{
  if(busy.current)return;
  if(!origin.current){origin.current=room??null;setFocus(point);}
  if(!motion){callback.current();return;}
  busy.current=true;setPhase('blackout');
  later(()=>{expected.current={};callback.current();},180);
 };
 return {phase,focus,enter,leave,cancel,busy:phase!=='idle'};
}
