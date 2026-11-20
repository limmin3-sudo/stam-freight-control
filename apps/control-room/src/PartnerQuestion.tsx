import {useEffect,useRef,useState} from 'react';
import {serviceControls} from './service-account.mjs';
import type {FormEvent} from 'react';
import help from '../../../data/companion-help.json';

function localHelp(question:string,en:boolean){
 const normalize=(text:string)=>text.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const query=normalize(question);
 let score=0,answer='';
 for(const topic of help){
  const text=en?topic.en:topic.ko;
  if(text.examples.some(example=>normalize(example)===query))return text.answer;
  const lengths=text.groups.map(group=>Math.max(0,...group.filter(word=>query.includes(word)).map(word=>word.length)));
  if(lengths.includes(0))continue;
  const weight=lengths.reduce((a,b)=>a+100+b,0);
  if(weight>score){score=weight;answer=text.answer;}
 }
 return answer;
}

export type GuideDestination={id:string;label:string;open:()=>void};
type Props={endpoint:string;partner:string;en:boolean;destinations:GuideDestination[];disabled:boolean};

export function PartnerQuestion({endpoint,partner,en,destinations,disabled}:Props){
 const [question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[room,setRoom]=useState(''),[busy,setBusy]=useState(false);
 const previous=useRef<{question:string;answer:string}|undefined>(undefined);
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>{
  function reset(){
   controller.current?.abort();controller.current=null;previous.current=undefined;
   setBusy(false);setQuestion('');setAnswer('');setRoom('');
  }
  window.addEventListener('stam-account-boundary',reset);
  return ()=>{controller.current?.abort();window.removeEventListener('stam-account-boundary',reset);};
 },[]);
 const destination=destinations.find(d=>d.id===room);
 const examples:Record<string,[string,string]>={
  director:['처음 왔는데 어디부터 둘러볼까요?','Where should I start my first visit?'],
  operator:['첫 운송 의뢰는 어디서 준비해요?','Where do I prepare my first haul?'],
  navigator:['화물을 어디서 싣고 어떤 순서로 내려요?','Where can I check my pickup and delivery order?'],
  'academic-advisor':['첫 운송 계약은 어떻게 묶어요?','How do I combine my first contracts?'],
  'ling-broker':['행성계를 건너기 전에 뭘 확인해요?','What should I check before crossing systems?'],
  'senior-trade-officer':['어디서 얼마에 사고팔 수 있는지 어떻게 봐요?','Where do I compare buy and sell prices?'],
 };
 const example=examples[partner]?.[en?1:0];
 const localAnswer=question.trim()?localHelp(question,en):'';
 async function ask(event:FormEvent){
  event.preventDefault();
  if(!question.trim()||controller.current||disabled)return;
  if(localAnswer){
   setAnswer(localAnswer);setRoom('');setQuestion('');previous.current=undefined;return;
  }
  const request=new AbortController();
  controller.current=request;setBusy(true);setAnswer('');setRoom('');
  const signIn=en?'Sign in to ask a partner.':'파트너에게 질문하려면 먼저 로그인해 주세요.';
  try{
   const token=await serviceControls().partnerIdToken();
   if(request.signal.aborted)return;
   if(!token){setAnswer(signIn);return;}
   const response=await fetch(endpoint,{method:'POST',redirect:'error',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    signal:request.signal,body:JSON.stringify({partner,question:question.trim(),language:en?'en':'ko',previous:previous.current})});
   const result=await response.json();
   if(request.signal.aborted)return;
   if(result.reason==='sign-in'){setAnswer(signIn);return;}
   if(result.reason==='auth-unavailable'){setAnswer(en?'Sign-in verification is temporarily unavailable.':'지금은 로그인을 확인할 수 없습니다. 잠시 뒤 다시 질문해 주세요.');return;}
   if(result.reason==='budget'){setAnswer(en?'The partner question budget has been reached.':'파트너 질문에 사용할 수 있는 예산 한도에 도달했습니다.');return;}
   if(result.reason==='frequency'){setAnswer(en?'Please wait a minute before asking again.':'1분 뒤 다시 질문해 주세요.');return;}
   if(result.reason==='budget-unavailable'){setAnswer(en?'The server could not check the question budget.':'서버에서 질문 예산을 확인할 수 없습니다.');return;}
   if(result.reason==='missing-key'){setAnswer(en?'Partner answers are not configured on this server yet.':'이 서버에는 아직 파트너 답변용 API 키가 설정되지 않았어요.');return;}
   if(!response.ok)throw Error();
   if(typeof result.answer!=='string')throw Error();
   previous.current={question:question.trim(),answer:result.answer.slice(0,1000)};
   setQuestion('');setAnswer(result.answer);setRoom(result.room);
  }catch{if(!request.signal.aborted)setAnswer(en?'The partner could not answer. Please try again.':'답변을 가져오지 못했습니다. 잠시 뒤 다시 질문해 주세요.');}
  finally{if(controller.current===request){controller.current=null;setBusy(false);}}
 }
 return <form className="partner-question" onSubmit={ask}>
  <label>{en?'Ask the partner':'파트너에게 질문'}<input value={question} maxLength={600} disabled={disabled||busy} placeholder={example} onChange={e=>setQuestion(e.target.value)}/></label>
  <button type="submit" disabled={disabled||busy||!question.trim()}>{busy?(en?'Answering…':'답변 중…'):(question.trim()?(localAnswer?(en?'Ask · local guide':'질문하기 · 기본 안내'):(en?'Ask AI partner':'AI 파트너에게 질문')):(en?'Ask':'질문하기'))}</button>
  <p role="status">{answer.split(/(\*\*[^*\n]+\*\*)/g).map((part,index)=>
   index%2===1 ? <strong key={index}>{part.slice(2,-2)}</strong> : part
  )}</p>
  {destination&&<button type="button" disabled={disabled} onClick={destination.open}>{destination.label} ↗</button>}
 </form>;
}
