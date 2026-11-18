// All amounts are integer nanodollars. Reserve a model-wide upper bound before
// sending; an interrupted request can have been billed even without a reply.
import {createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const defaultFile=fileURLToPath(new URL('../.stam-private/partner-budget.sqlite',import.meta.url));
const standardMini={inputRate:750,outputRate:4500,maxInput:400000};
const maxPerMinute=5;

function usd(value){
 if(!/^\d{1,6}(\.\d{1,2})?$/.test(value))throw Error('Invalid partner budget');
 return Math.round(Number(value)*100)*10000000;
}

function pricing(model,env){
 if(model==='gpt-5.4-mini')return standardMini;
 const config={
  inputRate:Number(env.STAM_PARTNER_INPUT_NANODOLLARS),
  outputRate:Number(env.STAM_PARTNER_OUTPUT_NANODOLLARS),
  maxInput:Number(env.STAM_PARTNER_MAX_INPUT_TOKENS)
 };
 if(!Object.values(config).every(n=>Number.isSafeInteger(n)&&n>0))throw Error('Missing model pricing');
 return config;
}

export async function reservePartnerCall({env,model,maxOutput,actor,now=Date.now()}){
 const rates=pricing(model,env);
 const ceiling=rates.maxInput*rates.inputRate+maxOutput*rates.outputRate;
 const funded=usd(env.STAM_PARTNER_FUNDED_USD??'8');
 const monthly=usd(env.STAM_PARTNER_MONTHLY_USD??'8');
 if(!Number.isSafeInteger(ceiling))throw Error('Invalid partner request ceiling');
 const file=env.STAM_PARTNER_BUDGET_DB||defaultFile;
 if(file===':memory:'||file.startsWith('file:'))throw Error('Persistent budget database required');
 mkdirSync(dirname(file),{recursive:true,mode:0o700});
 const {DatabaseSync}=await import('node:sqlite');
 const db=new DatabaseSync(file);
 let keepOpen=false;
 try{
  db.exec(`PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS partner_usage (
    id INTEGER PRIMARY KEY, started INTEGER NOT NULL, actor TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>=0)
   );
   CREATE INDEX IF NOT EXISTS partner_actor_time ON partner_usage(actor,started);
   BEGIN IMMEDIATE;`);
  const who=createHash('sha256').update(actor).digest('hex');
  const recent=db.prepare('SELECT COUNT(*) AS n FROM partner_usage WHERE actor=? AND started>?').get(who,now-60000);
  if(recent.n>=maxPerMinute)return {status:429,reason:'frequency'};
  const date=new Date(now);
  const start=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1);
  const sums=db.prepare('SELECT TOTAL(amount) AS total, TOTAL(CASE WHEN started>=? THEN amount END) AS month FROM partner_usage').get(start);
  if(sums.total+ceiling>funded||sums.month+ceiling>monthly)return {status:429,reason:'budget'};
  const {lastInsertRowid}=db.prepare('INSERT INTO partner_usage(started,actor,amount) VALUES(?,?,?)').run(now,who,ceiling);
  db.exec('COMMIT');
  keepOpen=true;
  return {
   status:200,
   finish(usage){
    try{
     // Unknown usage leaves the committed maximum in the ledger, including on restart.
     if(!Number.isSafeInteger(usage?.input_tokens)||usage.input_tokens<0||
        !Number.isSafeInteger(usage.output_tokens)||usage.output_tokens<0)return;
     const cost=usage.input_tokens*rates.inputRate+usage.output_tokens*rates.outputRate;
     if(Number.isSafeInteger(cost))db.prepare('UPDATE partner_usage SET amount=? WHERE id=?').run(cost,lastInsertRowid);
    }finally{db.close();}
   }
  };
 }finally{
  if(!keepOpen)db.close(); // SQLite rolls back uncommitted admissions.
 }
}
