import {DurableObject} from 'cloudflare:workers';
import {createHash} from 'node:crypto';
import {answerAccountQuestion} from './partner-account.mjs';
import {partnerLimits,maxPerMinute} from './partner-limits.mjs';

// Every account and edge location uses this same SQLite-backed object.
export class PartnerBudget extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  this.sql=ctx.storage.sql;
  this.sql.exec('CREATE TABLE IF NOT EXISTS totals (period TEXT PRIMARY KEY, amount INTEGER NOT NULL)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS calls (id TEXT PRIMARY KEY, actor TEXT NOT NULL, started INTEGER NOT NULL, period TEXT NOT NULL, ceiling INTEGER NOT NULL, inputRate INTEGER NOT NULL, outputRate INTEGER NOT NULL, settled INTEGER NOT NULL DEFAULT 0)');
  this.sql.exec('CREATE INDEX IF NOT EXISTS calls_by_actor ON calls(actor,started)');
  this.sql.exec('CREATE INDEX IF NOT EXISTS calls_by_time ON calls(started)');
 }
 reserve(actor,model,maxOutput){
  const {rates,ceiling,funded,monthly}=partnerLimits(this.env,model,maxOutput);
  const now=Date.now(),month=new Date(now).toISOString().slice(0,7);
  return this.ctx.storage.transactionSync(()=>{
   // Requests can time out. Expiring their details never releases the reservation.
   this.sql.exec('DELETE FROM calls WHERE started <= ?',now-600000);
   const {n}=this.sql.exec('SELECT COUNT(*) AS n FROM calls WHERE actor=? AND started>?',actor,now-60000).one();
   if(n>=maxPerMinute)return {status:429,reason:'frequency'};
   const used=period=>this.sql.exec('SELECT amount FROM totals WHERE period=?',period).toArray()[0]?.amount??0;
   if(used('funded')+ceiling>funded||used(month)+ceiling>monthly)return {status:429,reason:'budget'};
   for(const period of ['funded',month]){
    this.sql.exec('INSERT INTO totals VALUES(?,?) ON CONFLICT(period) DO UPDATE SET amount=amount+excluded.amount',period,ceiling);
   }
   const id=crypto.randomUUID();
   this.sql.exec('INSERT INTO calls(id,actor,started,period,ceiling,inputRate,outputRate) VALUES(?,?,?,?,?,?,?)',id,actor,now,month,ceiling,rates.inputRate,rates.outputRate);
   return {status:200,id};
  });
 }
 settle(id,input,output){
  if(![input,output].every(n=>Number.isSafeInteger(n)&&n>=0))return;
  this.ctx.storage.transactionSync(()=>{
   const row=this.sql.exec('SELECT * FROM calls WHERE id=? AND settled=0',id).toArray()[0];
   if(!row)return;
   const actual=row.inputRate*input+row.outputRate*output;
   if(!Number.isSafeInteger(actual))return;
   this.sql.exec("UPDATE totals SET amount=amount+? WHERE period IN ('funded',?)",actual-row.ceiling,row.period);
   this.sql.exec('UPDATE calls SET settled=1 WHERE id=?',id);
  });
 }
}

async function reserveCloud({env,actor,model,maxOutput}){
 const ledger=env.PARTNER_BUDGET.getByName('stam-partner-budget-v1');
 const who=createHash('sha256').update(actor).digest('hex');
 const admission=await ledger.reserve(who,model,maxOutput);
 if(admission.status!==200)return admission;
 return {status:200,finish:usage=>usage&&ledger.settle(admission.id,usage.input_tokens,usage.output_tokens)};
}

async function readQuestion(request){
 const reader=request.body?.getReader();
 if(!reader)return {status:400};
 const decoder=new TextDecoder('utf-8',{fatal:true});
 let text='',bytes=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   bytes+=value.byteLength;
   if(bytes>12288){await reader.cancel();return {status:413};}
   text+=decoder.decode(value,{stream:true});
  }
  return {body:JSON.parse(text+decoder.decode())};
 }catch{return {status:400};}
}

export default {
 async fetch(request,env){
  const headers={'Cache-Control':'no-store','Vary':'Origin'};
  const reply=(status,body={})=>Response.json(body,{status,headers});
  if(new URL(request.url).pathname!=='/api/partner-guide')return reply(404);
  const origin=request.headers.get('Origin');
  if(!origin||origin!==env.STAM_WEB_ORIGIN)return reply(403);
  headers['Access-Control-Allow-Origin']=origin;
  if(request.method==='OPTIONS'){
   return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});
  }
  if(request.method!=='POST')return reply(405);
  if(request.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')return reply(415);
  const parsed=await readQuestion(request);
  if(parsed.status)return reply(parsed.status);
  const {status,...body}=await answerAccountQuestion(parsed.body,request.headers.get('Authorization'),env,fetch,reserveCloud);
  return reply(status,body);
 }
};
