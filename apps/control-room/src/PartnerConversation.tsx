import {useEffect,useRef} from 'react';
import type {PartnerId} from './partner-dialogue';
import {partnerDialogue} from './partner-dialogue';
import './partner-conversation.css';

export function PartnerConversation({partner,variant,en,onClose}:{partner:PartnerId;variant:number;en:boolean;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),profile=partnerDialogue[partner];
 const greeting=profile.greetings[variant%profile.greetings.length]!;
 useEffect(()=>{const node=dialog.current!;node.showModal();return()=>{node.close();};},[]);
 const finish=()=>{dialog.current?.close();onClose();};
 return <dialog ref={dialog} className="partner-conversation" aria-labelledby="partner-conversation-title" aria-describedby="partner-conversation-line"
  onCancel={e=>{e.preventDefault();finish();}} onKeyDown={e=>{if(e.key==='Escape')e.stopPropagation();}}>
  <p className="partner-conversation-channel">STAM / CREW</p>
  <h2 id="partner-conversation-title">{profile.name[en?1:0]}</h2>
  <p id="partner-conversation-line">{greeting[en?1:0]}</p>
  <p className="partner-conversation-note">{en?'More conversation topics are being prepared.':'더 다양한 대화 주제를 준비하고 있습니다.'}</p>
  <button type="button" autoFocus onClick={finish}>{en?'End conversation':'대화 마치기'}</button>
 </dialog>;
}
