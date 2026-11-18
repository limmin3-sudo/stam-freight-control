import {useEffect,useRef,useState} from 'react';
import {serviceControls} from './service-account.mjs';
import type {FormEvent} from 'react';

export type GuideDestination={id:string;label:string;open:()=>void};
type Props={partner:string;en:boolean;destinations:GuideDestination[];disabled:boolean};

export function PartnerQuestion({partner,en,destinations,disabled}:Props){
 const [question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[room,setRoom]=useState(''),[busy,setBusy]=useState(false);
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const destination=destinations.find(d=>d.id===room);
 const example=partner==='academic-advisor'?(en?'How do I combine my first contracts?':'첫 운송 계약은 어떻게 묶어요?'):
  partner==='ling-broker'?(en?'What should I check before crossing systems?':'행성계를 건너기 전에 뭘 확인해요?'):
  (en?'Where do I compare buy and sell prices?':'어디서 얼마에 사고팔 수 있는지 어떻게 봐요?');
 async function ask(event:FormEvent){
  event.preventDefault();
  if(!question.trim()||controller.current||disabled)return;
  const request=new AbortController();
  controller.current=request;setBusy(true);setAnswer('');setRoom('');
  const signIn=en?'Sign in to ask a partner.':'파트너에게 질문하려면 먼저 로그인해 주세요.';
  try{
   const token=await serviceControls().partnerIdToken();
   if(request.signal.aborted)return;
   if(!token){setAnswer(signIn);return;}
   const response=await fetch('/api/partner-guide',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    signal:request.signal,body:JSON.stringify({partner,question:question.trim(),language:en?'en':'ko'})});
   const result=await response.json();
   if(result.reason==='sign-in'){setAnswer(signIn);return;}
   if(result.reason==='auth-unavailable'){setAnswer(en?'Sign-in verification is temporarily unavailable.':'지금은 로그인을 확인할 수 없습니다. 잠시 뒤 다시 질문해 주세요.');return;}
   if(result.reason==='budget'){setAnswer(en?'The partner question budget has been reached.':'파트너 질문에 사용할 수 있는 예산 한도에 도달했습니다.');return;}
   if(result.reason==='frequency'){setAnswer(en?'Please wait a minute before asking again.':'1분 뒤 다시 질문해 주세요.');return;}
   if(result.reason==='budget-unavailable'){setAnswer(en?'The server could not check the question budget.':'서버에서 질문 예산을 확인할 수 없습니다.');return;}
   if(result.reason==='missing-key'){setAnswer(en?'Set the API key on the local server to try a live answer.':'실제 답변을 받으려면 로컬 서버에 API 키를 설정해 주세요.');return;}
   if(!response.ok)throw Error();
   if(typeof result.answer!=='string')throw Error();
   setAnswer(result.answer);setRoom(result.room);
  }catch{if(!request.signal.aborted)setAnswer(en?'The partner could not answer. Please try again.':'답변을 가져오지 못했습니다. 잠시 뒤 다시 질문해 주세요.');}
  finally{controller.current=null;if(!request.signal.aborted)setBusy(false);}
 }
 return <form className="partner-question" onSubmit={ask}>
  <label>{en?'Ask the partner':'파트너에게 질문'}<input value={question} maxLength={600} disabled={disabled||busy} placeholder={example} onChange={e=>setQuestion(e.target.value)}/></label>
  <button type="submit" disabled={disabled||busy||!question.trim()}>{busy?(en?'Answering…':'답변 중…'):(en?'Ask':'질문하기')}</button>
  <p role="status">{answer}</p>
  {destination&&<button type="button" disabled={disabled} onClick={destination.open}>{destination.label} ↗</button>}
 </form>;
}
