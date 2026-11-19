import test,{beforeEach,afterEach} from 'node:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {reservePartnerCall} from '../server/partner-budget.mjs';
import assert from 'node:assert/strict';
import {answerAccountQuestion as accountQuestion} from '../server/partner-account.mjs';
import {FIREBASE_CONFIG} from '../firebase-config.mjs';
import greetings from '../data/partner-greetings.json' with {type:'json'};
import {answerPartner as partnerReply} from '../server/partner-guide.mjs';

const answerPartner=(body,env,send,actor='local')=>partnerReply(body,env,send,actor,reservePartnerCall);
const answerAccountQuestion=(body,authorization,env,send)=>accountQuestion(body,authorization,env,send,reservePartnerCall);

const input={partner:'senior-trade-officer',language:'ko',question:'어디에서 가격을 비교해요?'};
let env,dir;
beforeEach(()=>{
 dir=mkdtempSync(join(tmpdir(),'stam-partner-budget-'));
 env={OPENAI_API_KEY:'local-test-only',STAM_PARTNER_BUDGET_DB:join(dir,'usage.sqlite')};
});
afterEach(()=>rmSync(dir,{recursive:true,force:true}));
function completed(answer,room){
 return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer,room})}]}]});
}
test('uses one text request and limits the suggested room to this partner',async()=>{
 const reply=await answerPartner(input,env,async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');
  const req=JSON.parse(options.body);
  assert.equal(req.store,false);assert.equal(req.input,input.question);assert(!req.tools);
  assert.equal(req.text.format.schema.properties.room.enum.includes('education'),false);
  return completed('무역관제실에서 품목을 검색하세요.','market');
 });
 assert.deepEqual(reply,{status:200,answer:'무역관제실에서 품목을 검색하세요.',room:'market'});
});
test('missing key and invalid input never call the provider',async()=>{
 const unexpected=()=>assert.fail('unexpected call');
 assert.equal((await answerPartner(input,{},unexpected)).status,503);
 for(const body of [null,{...input,question:' '},{...input,partner:'__proto__'},{...input,question:'A'.repeat(601)}])
  assert.equal((await answerPartner(body,env,unexpected)).status,400);
});
test('provider errors and out-of-scope destinations are not exposed as advice',async()=>{
 assert.equal((await answerPartner(input,env,()=>completed('Open','https://example.com'))).status,502);
 assert.equal((await answerPartner(input,env,()=>new Response('',{status:429}))).status,429);
 assert.equal((await answerPartner(input,env,()=>Response.json({status:'incomplete'}))).status,502);
});

test('supplies the relevant work instructions for each partner without sending private client state',async()=>{
 const scenarios=[
  ['senior-trade-officer','ko','티타늄 원광은 어디서 봐요?','market','TITA · Ore'],
  ['ling-broker','en','How do I compare net income across systems?','planning','empty return'],
  ['senior-trade-officer','ko','절반만 팔았는데 남은 원가는 어디서 봐요?','trade-operations','remaining cargo retains'],
  ['academic-advisor','ko','초반 평판용 계약 두 건을 같이 받아도 돼요?','education','pickup overlap'],
  ['academic-advisor','en','Which reference explains ship and box sizes?','freight-information','largest individual box'],
  ['academic-advisor','ko','헐비로 여러 계약을 묶은 사례가 있어요?','operations-study','363 SCU']
 ];
 for(const [partner,language,question,room,fact] of scenarios){
  const reply=await answerPartner({partner,language,question,ledger:'PRIVATE_LEDGER'},env,async(_url,options)=>{
   const req=JSON.parse(options.body);
   assert(!options.body.includes('PRIVATE_LEDGER'));
   assert(req.instructions.includes(greetings[partner].voice));
   assert(req.instructions.includes(greetings[partner][language]));
   for(const [id,profile] of Object.entries(greetings)){
    if(id!==partner)assert(!req.instructions.includes(profile.voice));
   }
   const rooms=JSON.parse(req.instructions.split('\n').at(-1));
   assert(rooms[room].includes(fact));
   assert(req.text.format.schema.properties.room.enum.includes(room));
   assert.equal(req.input,question);
   return completed('Test reply',room);
  },partner);
  assert.equal(reply.room,room);
 }
});

test('twenty concurrent partners share the cap before any API call; returned usage frees the difference',async()=>{
 env.STAM_PARTNER_FUNDED_USD='0.40';
 let release,entered;
 const gate=new Promise(resolve=>{release=resolve;});
 const started=new Promise(resolve=>{entered=resolve;});
 let calls=0;
 const send=async()=>{
  calls++;entered();await gate;
  return Response.json({status:'completed',usage:{input_tokens:120,output_tokens:20},
   output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'시세표를 열어 보세요.',room:'market'})}]}]});
 };
 const first=answerPartner(input,env,send,'pilot-0');
 await started;
 try{
  const others=await Promise.all(Array.from({length:19},(_,i)=>answerPartner(input,env,()=>{calls++;return completed('unexpected','market');},'pilot-'+(i+1))));
  assert(others.every(r=>r.reason==='budget'));assert.equal(calls,1);
 }finally{release();}
 assert.equal((await first).status,200);
 assert.equal((await answerPartner(input,env,send,'pilot-19')).status,200);
});
test('uncertain charges survive a new connection and month; only monthly allowance resets',async()=>{
 const opts={env,model:'gpt-5.4-mini',maxOutput:500,actor:'pilot',now:Date.UTC(2026,10,30,23,59)};
 env.STAM_PARTNER_FUNDED_USD='0.65';env.STAM_PARTNER_MONTHLY_USD='0.40';
 (await reservePartnerCall(opts)).finish();
 assert.equal((await reservePartnerCall(opts)).reason,'budget');
 opts.now=Date.UTC(2026,11,1);
 (await reservePartnerCall(opts)).finish();
 opts.now=Date.UTC(2027,0,1);
 assert.equal((await reservePartnerCall(opts)).reason,'budget');
});
test('burst limit is per caller and persists across connections; provider rejections release cost',async()=>{
 env.STAM_PARTNER_FUNDED_USD='0.4';
 const opts={env,model:'gpt-5.4-mini',maxOutput:500,actor:'pilot-a',now:Date.now()};
 const zero={input_tokens:0,output_tokens:0};
 for(let i=0;i<5;i++)assert.equal((await answerPartner(input,env,()=>new Response(null,{status:429}),'pilot-a')).status,429);
 assert.equal((await reservePartnerCall(opts)).reason,'frequency');
 (await reservePartnerCall({...opts,actor:'pilot-b'})).finish(zero);
 (await reservePartnerCall({...opts,now:opts.now+61000})).finish(zero);
});
test('paused budgets, unknown model prices, unreadable ledger and timeouts do not allow unmetered retries',async()=>{
 const noCall=()=>assert.fail('unexpected request');
 assert.equal((await answerPartner(input,{...env,STAM_PARTNER_MONTHLY_USD:'0'},noCall)).reason,'budget');
 assert.equal((await answerPartner(input,{...env,STAM_PARTNER_MODEL:'unpriced'},noCall)).reason,'budget-unavailable');
 assert.equal((await answerPartner(input,{...env,STAM_PARTNER_BUDGET_DB:dir},noCall)).reason,'budget-unavailable');
 env.STAM_PARTNER_FUNDED_USD='0.40';
 assert.equal((await answerPartner(input,env,()=>{throw Error('timeout');})).status,502);
 assert.equal((await answerPartner(input,env,noCall)).reason,'budget');
});

test('uses full-price input and output counts, including when the answer cannot be displayed',async()=>{
 const {DatabaseSync}=await import('node:sqlite');
 const incomplete=()=>Response.json({status:'incomplete',usage:{input_tokens:1000,output_tokens:200}});
 assert.equal((await answerPartner(input,env,incomplete)).status,502);
 const db=new DatabaseSync(env.STAM_PARTNER_BUDGET_DB);
 try{assert.equal(db.prepare('SELECT amount FROM partner_usage').get().amount,1650000);}
 finally{db.close();}
});

function fixtureToken(sub,session='initial'){
 const project=FIREBASE_CONFIG.projectId;
 const claims={sub,aud:project,iss:'https://securetoken.google.com/'+project,auth_time:1000};
 return 'test.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.'+session;
}

test('verified Firebase accounts have independent quotas; renewed sessions share the same account limit',async()=>{
 const alice=fixtureToken('alice'), aliceRenewed=fixtureToken('alice','renewed'), bob=fixtureToken('bob');
 const accounts=new Map([[alice,'alice'],[aliceRenewed,'alice'],[bob,'bob']]);
 let modelCalls=0;
 const send=async(url,opts)=>{
  if(new URL(url).hostname==='identitytoolkit.googleapis.com'){
   const uid=accounts.get(JSON.parse(opts.body).idToken);
   assert(uid);return Response.json({users:[{localId:uid,validSince:'999'}]});
  }
  assert.equal(new URL(url).hostname,'api.openai.com');
  assert(!opts.body.includes('firebase:'));assert(!opts.body.includes(alice));
  modelCalls++;return completed('시세표에서 확인하세요.','market');
 };
 const ask=token=>answerAccountQuestion({...input,uid:'untrusted'},'Bearer '+token,env,send);
 for(let n=0;n<5;n++)assert.equal((await ask(alice)).status,200);
 assert.equal((await ask(aliceRenewed)).reason,'frequency');
 assert.equal((await ask(bob)).status,200);
 assert.equal(modelCalls,6);
});

test('only a current Firebase account may start a billable answer',async()=>{
 const ask=(header,send)=>answerAccountQuestion(input,header,env,send);
 assert.equal((await ask(undefined,()=>assert.fail('unexpected call'))).status,401);
 const header='Bearer '+fixtureToken('alice');
 for(const users of [[],[{localId:'bob'}],[{localId:'alice',disabled:true}],[{localId:'alice',validSince:'1001'}]]){
  assert.equal((await ask(header,()=>Response.json({users}))).status,401);
 }
 assert.equal((await ask(header,()=>Response.json({error:{message:'TOKEN_EXPIRED'}},{status:400}))).status,401);
 assert.equal((await ask(header,()=>{throw Error('offline');})).reason,'auth-unavailable');
});

test('follow-up keeps the last exchange as dialogue and uses the selected partner greeting',async()=>{
 const previous={question:'어디서 가격을 봐요?',answer:'시세표를 열어 주세요.'};
 const body={...input,partner:'ling-broker',question:'거기서 뭘 봐요?',previous};
 const reply=await answerPartner(body,env,async(_url,options)=>{
  const request=JSON.parse(options.body);
  assert(request.instructions.includes(greetings['ling-broker'].ko));
  assert.deepEqual(request.input,[
   {role:'user',content:previous.question},{role:'assistant',content:previous.answer},{role:'user',content:body.question}
  ]);
  return completed('매입가와 판매가를 비교해 보세요.','market');
 });
 assert.equal(reply.status,200);
 for(const invalid of [{question:'',answer:'ok'},{question:'ok',answer:'a'.repeat(1001)},'hi']){
  assert.equal((await answerPartner({...body,previous:invalid},env,()=>assert.fail('unexpected call'))).status,400);
 }
});
