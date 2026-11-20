// The overlay gets a short-lived display copy, never the ledger or account token.
const commands=new Set(['open-trade','open-flight','show-prices','show-my-work','toggle-overlay']);
const fail=code=>{throw Error(code);};
const text=(v,max)=>typeof v==='string'&&v.length<=max&&!/[\u0000-\u0008\u000b-\u001f]/.test(v)?v:fail('invalid-display');
export function createCompanionState({clock=Date.now}={}){
 let session='',sequence=-1,receivedAt=0,display=null,queue=[],commandSequence=0;
 const current=()=>{if(clock()-receivedAt>10000){session='';display=null;queue=[];}return display;};
 function publish(value){
  current();if(!value||!/^[-\w]{16,100}$/.test(value.session||'')||!Number.isSafeInteger(value.sequence)||value.sequence<0)fail('invalid-display');
  if(session&&value.session!==session)fail('display-in-use');
  if(session===value.session&&value.sequence<=sequence)fail('stale-display');
  if(value.clear){session='';sequence=-1;display=null;queue=[];return {accepted:true};}
  const d=value.display;if(!d||!['personal','fleet','flight'].includes(d.mode)||!Array.isArray(d.lines)||d.lines.length>6)fail('invalid-display');
  const next={mode:d.mode,title:text(d.title,100),lines:d.lines.map(v=>text(v,180)),at:clock()};
  if(d.mode==='flight'&&typeof d.stepId==='string'&&/^[0-9a-f-]{36}$/.test(d.stepId)&&['departure','pickup','delivery','jump','stop'].includes(d.step)){
   next.stepId=d.stepId;next.step=d.step;
  }
  if(d.guidance){
   next.guidance={};
   for(const key of ['task','destination','load','cash','profit']){
    if(typeof d.guidance[key]==='string')next.guidance[key]=text(d.guidance[key],220);
   }
  }
  if(d.answer&&Number.isSafeInteger(d.answer.id)&&d.answer.id>0)next.answer={id:d.answer.id,text:text(d.answer.text,240)};
  session=value.session;sequence=value.sequence;receivedAt=clock();display=next;return {accepted:true};
 }
 return {publish,snapshot:()=>current(),
  enqueue(command){
   const d=current(),flight=typeof command==='string'&&command.startsWith('complete-flight:');
   const quote=typeof command==='string'&&/^quote-(buy|sell):[1-9][0-9]{0,8}$/.test(command);
   if(quote&&(!d||d.mode==='flight'))return false;
   if(!flight&&!quote&&!commands.has(command))fail('unsupported-command');
   if(!d)return false;
   if(flight&&(!d.stepId||command!=='complete-flight:'+d.stepId||queue.some(x=>x.command===command)))return false;
   queue.push({id:++commandSequence,command,at:clock()});queue=queue.slice(-20);return true;
  },
  poll(value){current();if(!session||value.session!==session)fail('display-session');const after=Number(value.after);if(!Number.isSafeInteger(after)||after<0)fail('invalid-cursor');return {commands:queue.filter(x=>x.id>after)};}
 };
}
