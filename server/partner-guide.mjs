import greetings from '../data/partner-greetings.json' with {type:'json'};
// Guidance follows the price board, planner, ledger and Academy field lessons.
// These are navigation and reading instructions. No account or quote snapshot is sent.
const tradeRooms={
 market:[
  '무역관제실 · 시세표 / Trade control · Price board. Search by Korean name, English name or official UEX code. Titanium is TITA; TITA · Ore selects the ore.',
  'Select a commodity to see terminals. Buy is what the captain pays per SCU; sell is what the captain receives. Compare stock, forecast demand and the price modification time. Zero and unknown quantities are distinct; a positive price alone cannot confirm a trade.'
 ].join(' '),
 planning:[
  '최적 경로 / Route planner. From a buy/sell pair choose Plan route, then enter ship and available capital. Feasible SCU is limited by funds, cargo and box fit, pickup stock and forecast buyer demand.',
  'Default maximum price age is 24 hours. If the selected prices are too old, check the named terminals and refresh first. The captain may explicitly change the age limit.',
  'For income per hour, compare net profit after entered costs against total time including loading, unloading and any empty return. Compare route risk and cargo legality separately.'
 ].join(' '),
 'trade-operations':'거래기록실 / Trade records. Record actual quantity, unit price and expenses. For a partial sale, only the sold portion realizes profit; remaining cargo retains its acquisition cost. Check the remaining SCU and cost in settlement before closing.'
};
const academyRooms={
 education:[
  '교육실 / Education. First haul: in mobiGlas > Contracts choose Verified Hauling. Read pickup, delivery, SCU, maximum box and payout before accepting; track the accepted contract.',
  'For early reputation use the lesson comparing small carbon and aluminium contracts. Compare the actual contractor, eligibility, pickup overlap, extra delivery stops and box fit; finish one first if the extra stop or load is too much. The lesson is an example, not a currently available offer.',
  'First trade lessons cover reading a quote, choosing a quantity and recording a first sale.'
 ].join(' '),
 'freight-information':'운송 정보실 / Freight information. Look up mission types, reputation requirements, ships, cargo handling and locations. Check both total free SCU and the largest individual box when choosing a ship.',
 'operations-study':'작전 연구실 / Operations study. The historical Hull B case starts at Orison and covers six verified contracts totalling 363 SCU across Stanton and Pyro. Use the study to compare pickup and delivery sequences. It is a case study, not a live mission bundle.'
};
const partners={
 director:{role:'Flight guide at the lounge welcome desk',rooms:greetings.director.rooms},
 operator:{role:'Bridge operator for mission preparation and flight operations',rooms:greetings.operator.rooms},
 navigator:{role:'Senior navigator for route planning and cargo reference',rooms:greetings.navigator.rooms},
 'senior-trade-officer':{role:'Senior trade officer for routes within one star system',rooms:tradeRooms},
 'ling-broker':{role:'Ling family broker for interstellar trade',rooms:tradeRooms},
 'academic-advisor':{role:'Academy advisor for new captains',rooms:{...academyRooms,...greetings['academic-advisor'].rooms}}
};

export async function answerPartner(body,env,send,actor,reservePartnerCall) {
 const partner=typeof body?.partner==='string'&&Object.hasOwn(partners,body.partner)?partners[body.partner]:null;
 const question=typeof body?.question==='string'?body.question.trim():'';
 if(!partner||!question||question.length>600||!['ko','en'].includes(body.language))
  return {status:400};
 const previous=body.previous;
 if(previous!==undefined&&(!previous||typeof previous.question!=='string'||!previous.question.trim()||previous.question.length>600||
    typeof previous.answer!=='string'||!previous.answer.trim()||previous.answer.length>1000))return {status:400};
 const input=previous?[
  {role:'user',content:previous.question},
  {role:'assistant',content:previous.answer},
  {role:'user',content:question},
 ]:question;
 if(!env.OPENAI_API_KEY) return {status:503,reason:'missing-key'};
 const destinations=['none',...Object.keys(partner.rooms)];
 const format={type:'json_schema',name:'partner_guidance',strict:true,schema:{
  type:'object',additionalProperties:false,required:['answer','room'],
  properties:{answer:{type:'string'},room:{type:'string',enum:destinations}}
 }};
 const model=env.STAM_PARTNER_MODEL||'gpt-5.4-mini';
 const maxOutput=500;
 let reservation;
 try{reservation=await reservePartnerCall({env,model,maxOutput,actor});}
 catch{return {status:503,reason:'budget-unavailable'};}
 if(reservation.status!==200)return reservation;
 let usage;
 try {
  const response=await send('https://api.openai.com/v1/responses',{
   method:'POST',redirect:'manual',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},
   signal:AbortSignal.timeout(20000),
   body:JSON.stringify({model,service_tier:'default',store:false,max_output_tokens:maxOutput,
    reasoning:{effort:'low'},text:{format},input,
    instructions:[
     'You are the STAM '+partner.role+'. Answer the question in '+(body.language==='en'?'English':'polite Korean')+' in at most three concise sentences.',
     greetings[body.partner].voice,
     'Match the register and pacing of this partner greeting in your answer: '+greetings[body.partner][body.language],
     'Use the previous exchange only to resolve follow-up references. The STAM room reference is authoritative.',
     'Use only the following STAM reference. If it does not answer the question, say so. You cannot see a user account, current prices or cargo, or execute trades. Never invent values.',
     'Use the room names in the reference. Choose one room that lets the user take the next step; choose none for unrelated questions. When asked for a live value, explain where to check it. Navigation requires the user to press a button.',
     body.partner==='director'?'Refer both tutorials to the academic advisor. The guide introduces the facilities and manual.':'',
     ['operator','navigator','senior-trade-officer','ling-broker'].includes(body.partner)?'This panel answers questions only. Name relevant locations in the answer; there are no navigation buttons in this panel.':'',
     JSON.stringify(partner.rooms)
    ].join('\n')})
  });
  if(!response.ok){
   if([400,401,403,404,429].includes(response.status))usage={input_tokens:0,output_tokens:0};
   return {status:response.status===429?429:502};
  }
  const result=await response.json();
  usage=result.usage;
  if(result.status!=='completed')return {status:502};
  const parts=result.output?.filter(x=>x.type==='message').flatMap(x=>x.content)||[];
  if(parts.some(x=>x.type==='refusal'))return {status:422};
  const reply=JSON.parse(parts.filter(x=>x.type==='output_text').map(x=>x.text).join(''));
  if(typeof reply.answer!=='string'||!reply.answer.trim()||!destinations.includes(reply.room))return {status:502};
  return {status:200,answer:reply.answer.trim(),room:reply.room};
 }catch{return {status:502};}
 finally{
  // A failed settlement keeps the durable pre-charge in place.
  try{await reservation.finish(usage);}catch{console.error('Partner budget settlement unavailable');}
 }
}
