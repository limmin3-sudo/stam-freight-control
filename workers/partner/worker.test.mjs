import {after,before,test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {FIREBASE_CONFIG} from '../../firebase-config.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const origin='https://limmin3-sudo.github.io';
const endpoint='https://test.invalid/api/partner-guide';
const body={partner:'ling-broker',language:'ko',question:'파이로로 가는 계획은요?'};
const temp=await mkdtemp(join(tmpdir(),'stam-partner-worker-'));
let script;
before(async()=>{
 const cli=fileURLToPath(new URL('bin/wrangler.js',import.meta.resolve('wrangler/package.json')));
 execFileSync(process.execPath,[cli,'deploy','--dry-run','--config','wrangler.partner.toml','--outdir',temp],{cwd:root,env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 script=await readFile(join(temp,'partner-worker.js'),'utf8');
});
after(()=>rm(temp,{recursive:true,force:true}));

function token(uid){
 const claims={sub:uid,auth_time:123,aud:FIREBASE_CONFIG.projectId,iss:'https://securetoken.google.com/'+FIREBASE_CONFIG.projectId};
 return 'test.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.test';
}

function runtime(persist,modelReply,bindings={}){
 return new Miniflare(convertV4MiniflareOptions({name:'stam-partner-chat',modules:true,script,compatibilityDate:'2025-10-01',compatibilityFlags:['nodejs_compat'],
  durableObjects:{PARTNER_BUDGET:{className:'PartnerBudget',useSQLite:true}},resourcePersistencePath:persist,
  bindings:{OPENAI_API_KEY:'mock-only',STAM_WEB_ORIGIN:origin,...bindings},
  outboundService:async request=>{
   const url=new URL(request.url);
   if(url.hostname==='identitytoolkit.googleapis.com'){
    const {idToken}=await request.json();
    const {sub}=JSON.parse(Buffer.from(idToken.split('.')[1],'base64url'));
    if(sub==='revoked')return Response.json({error:{message:'INVALID_ID_TOKEN'}},{status:400});
    return Response.json({users:[{localId:sub}]});
   }
   assert.equal(url.href,'https://api.openai.com/v1/responses');
   return modelReply(request);
  }
 }));
}
function ask(mf,uid,patch={}){
 return mf.dispatchFetch(endpoint,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+token(uid)},body:JSON.stringify(body),...patch});
}
const answered=(usage={input_tokens:120,output_tokens:20})=>Response.json({status:'completed',usage,output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'경로를 살펴보죠.',room:'planning'})}]}]});

test('public endpoint enforces the site origin, authentication, input bounds and shared account rate limit',async()=>{
 let sent=0;
 const mf=runtime(join(temp,'rate'),async()=>{sent++;return answered();});
 try{
  const preflight=await mf.dispatchFetch(endpoint,{method:'OPTIONS',headers:{Origin:origin}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal((await ask(mf,'a',{headers:{Origin:'https://elsewhere.example'}})).status,403);
  assert.equal((await ask(mf,'a',{headers:{Origin:origin,'Content-Type':'application/json'}})).status,401);
  assert.equal((await ask(mf,'revoked')).status,401);
  assert.equal((await ask(mf,'a',{body:' '.repeat(13000)})).status,413);
  assert.equal(sent,0);
  for(let i=0;i<5;i++)assert.equal((await ask(mf,'a')).status,200);
  assert.equal((await (await ask(mf,'a')).json()).reason,'frequency');
  assert.equal((await ask(mf,'b')).status,200);
  assert.equal(sent,6);
 }finally{await mf.dispose();}
});

test('20 users share one pre-charge; settlement releases unused credit; unknown charges survive restart',async()=>{
 const persist=join(temp,'shared');
 const limits={STAM_PARTNER_FUNDED_USD:'0.40',STAM_PARTNER_MONTHLY_USD:'0.40'};
 let admit,unblock,sent=0;
 const entered=new Promise(resolve=>{admit=resolve;}),gate=new Promise(resolve=>{unblock=resolve;});
 let mf=runtime(persist,async()=>{
  sent++;if(sent===1){admit();await gate;return answered();}
  return answered(null);
 },limits);
 try{
  const first=ask(mf,'first');await Promise.race([entered,first.then(r=>{throw Error('Early response '+r.status);})]);
  const others=await Promise.all(Array.from({length:19},(_,i)=>ask(mf,'pilot-'+i)));
  assert(others.every(r=>r.status===429));assert.equal(sent,1);unblock();
  assert.equal((await first).status,200);
  assert.equal((await ask(mf,'unknown-cost')).status,200);
  assert.equal(sent,2);
 }finally{unblock();await mf.dispose();}
 mf=runtime(persist,()=>assert.fail('Unexpected paid call after restart'),limits);
 try{assert.equal((await (await ask(mf,'new-captain')).json()).reason,'budget');}finally{await mf.dispose();}
});

test('pausing either allowance blocks the model; upstream rejection releases cost; ambiguous failure retains it',async()=>{
 for(const variable of ['STAM_PARTNER_FUNDED_USD','STAM_PARTNER_MONTHLY_USD']){
  let sent=0;
  const mf=runtime(join(temp,variable),()=>{sent++;return answered();},{[variable]:'0'});
  try{
   const reply=await ask(mf,'captain');
   assert.equal(reply.status,429);assert.equal((await reply.json()).reason,'budget');assert.equal(sent,0);
  }finally{await mf.dispose();}
 }
 let sent=0;
 const mf=runtime(join(temp,'errors'),()=>new Response(null,{status:++sent===1?429:500}),{STAM_PARTNER_MONTHLY_USD:'0.40'});
 try{
  assert.equal((await ask(mf,'one')).status,429);
  assert.equal((await ask(mf,'two')).status,502);
  assert.equal((await (await ask(mf,'three')).json()).reason,'budget');
  assert.equal(sent,2);
 }finally{await mf.dispose();}
});
