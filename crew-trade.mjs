// Shared convoy accounting uses integer aUEC cents. It never writes personal ledgers.
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const fail=code=>{throw Error(code);};
const uid=v=>typeof v==='string'&&/^[^/\s]{1,128}$/.test(v);
const text=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
const integer=(v,max=1e12)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const identity=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(v);
export function crewTotals(op){
 const capital=Object.fromEntries(op.members.map(m=>[m.uid,0])),cargo=Object.fromEntries(op.assignments.map(a=>[a.id,{quantity:0,cost:0,bought:0,sold:0,lost:0}]));
 let cash=0,purchases=0,sales=0,expenses=0,realized=0;
 for(const e of op.events){if(e.voidedAt)continue;const a=op.assignments.find(a=>a.id===e.assignmentId),lot=cargo[e.assignmentId];
  if(!op.members.some(m=>m.uid===e.memberUid))fail('crew-member');
  if(e.kind==='capital'){capital[e.memberUid]+=e.amount;cash+=e.amount;}
  else if(e.kind==='expense'){expenses+=e.amount;cash-=e.amount;realized-=e.amount;}
  else{
   if(!a||!lot||a.uid!==e.memberUid||!integer(e.quantity,10000)||e.quantity<1||e.quantity%a.boxSize)fail('crew-cargo');
   if(e.kind==='buy'){if(lot.bought+e.quantity>a.planned)fail('crew-planned');lot.quantity+=e.quantity;lot.bought+=e.quantity;lot.cost+=e.amount;purchases+=e.amount;cash-=e.amount;}
   else{if(e.quantity>lot.quantity)fail('crew-quantity');const cost=Number((BigInt(lot.cost)*BigInt(e.quantity)*2n+BigInt(lot.quantity))/(2n*BigInt(lot.quantity)));lot.cost-=cost;lot.quantity-=e.quantity;realized-=cost;
    if(e.kind==='sell'){lot.sold+=e.quantity;sales+=e.amount;cash+=e.amount;realized+=e.amount;}else if(e.kind==='loss'){lot.lost+=e.quantity;}else fail('crew-kind');
   }
  }
  if(!Number.isSafeInteger(cash)||cash<0||cash>1e14)fail('crew-capital');
  for(const m of op.members){const aboard=op.assignments.filter(a=>a.uid===m.uid).reduce((n,a)=>n+cargo[a.id].quantity,0);if(aboard>m.capacity)fail('crew-capacity');}
 }
 const contributed=Object.values(capital).reduce((n,v)=>n+v,0),remaining=Object.values(cargo).reduce((n,c)=>n+c.quantity,0);
 return {cash,purchases,sales,expenses,realized,capital,contributed,cargo,remaining,remainingCost:Object.values(cargo).reduce((n,c)=>n+c.cost,0)};
}
function allocate(total,weights){
 const sum=weights.reduce((n,r)=>n+r.weight,0);if(!sum)return weights.map(r=>({uid:r.uid,value:0}));
 // BigInt avoids rounding/overflow when a large treasury is split by capital.
 const rows=weights.map(r=>{const product=BigInt(total)*BigInt(r.weight);return {uid:r.uid,value:Number(product/BigInt(sum)),remainder:product%BigInt(sum)};});
 let rest=total-rows.reduce((n,r)=>n+r.value,0);for(const r of [...rows].sort((a,b)=>a.remainder===b.remainder?a.uid.localeCompare(b.uid):a.remainder>b.remainder?-1:1)){if(rest--<=0)break;r.value++;}
 return rows.map(({uid,value})=>({uid,value}));
}
export function crewSettlement(op){
 const totals=crewTotals(op),principal=Math.min(totals.cash,totals.contributed),profit=Math.max(0,totals.cash-totals.contributed);
 const capitalWeights=op.members.map(m=>({uid:m.uid,weight:totals.capital[m.uid]}));
 const refund=new Map(allocate(principal,capitalWeights).map(r=>[r.uid,r.value]));
 const weights=op.splitMode==='custom'?op.members.map(m=>({uid:m.uid,weight:op.shares[m.uid]??0})):capitalWeights;
 if(profit>0&&!weights.some(r=>r.weight>0))fail('crew-shares');
 const shares=new Map(allocate(profit,weights).map(r=>[r.uid,r.value]));
 return {cash:totals.cash,net:totals.sales-totals.purchases-totals.expenses,contributed:totals.contributed,remaining:totals.remaining,payouts:op.members.map(m=>({uid:m.uid,capital:totals.capital[m.uid],principal:refund.get(m.uid)??0,profit:shares.get(m.uid)??0,payout:(refund.get(m.uid)??0)+(shares.get(m.uid)??0),loss:totals.capital[m.uid]-(refund.get(m.uid)??0)}))};
}
export function validateCrew(op){
 if(!op||op.schema!==1||!identity(op.id)||!uid(op.ownerUid)||!text(op.title,120)||!integer(op.revision)||op.revision<1||!['open','review','settled'].includes(op.phase)||!Number.isFinite(Date.parse(op.at))||!['capital','custom'].includes(op.splitMode))fail('crew-format');
 for(const [key,max] of [['members',30],['assignments',100],['events',500]])if(!Array.isArray(op[key])||op[key].length>max)fail('crew-limit');
 if(!op.members.length||new Set(op.members.map(m=>m.uid)).size!==op.members.length||op.members.some(m=>!uid(m.uid)||!text(m.name,60)||!['leader','officer','pilot','escort'].includes(m.role)||typeof m.active!=='boolean'||!integer(m.capacity,10000)||typeof m.ship!=='string'||m.ship.length>100))fail('crew-member');
 if(!op.members.some(m=>m.uid===op.ownerUid&&m.role==='leader'&&m.active)||op.members.some(m=>m.role==='leader'&&m.uid!==op.ownerUid))fail('crew-owner');
 if(new Set(op.assignments.map(a=>a.id)).size!==op.assignments.length||op.assignments.some(a=>!identity(a.id)||!op.members.some(m=>m.uid===a.uid)||![a.commodityId,a.from,a.to,a.planned].every(n=>integer(n,100000000)&&n>0)||a.planned>10000||![1,2,4,8,16,24,32].includes(a.boxSize)||a.planned%a.boxSize))fail('crew-assignment');
 if(new Set(op.events.map(e=>e.id)).size!==op.events.length||op.events.some(e=>!identity(e.id)||!uid(e.actorUid)||!uid(e.memberUid)||!['capital','buy','sell','expense','loss'].includes(e.kind)||!integer(e.amount)||typeof e.note!=='string'||e.note.length>500||!Number.isFinite(Date.parse(e.at))||e.voidedAt&&!Number.isFinite(Date.parse(e.voidedAt))||['expense','loss'].includes(e.kind)&&!e.note.trim()||e.kind==='loss'&&e.amount!==0))fail('crew-event');
 if(!op.shares||typeof op.shares!=='object'||Array.isArray(op.shares)||Object.keys(op.shares).some(id=>!op.members.some(m=>m.uid===id))||Object.values(op.shares).some(n=>!integer(n,10000))||op.splitMode==='custom'&&Object.values(op.shares).reduce((n,v)=>n+v,0)!==10000)fail('crew-shares');
 if(op.rejections!==undefined&&(!Array.isArray(op.rejections)||op.rejections.length>500||op.rejections.some(r=>!identity(r.id)||!uid(r.memberUid)||!text(r.reason,500)||!Number.isFinite(Date.parse(r.at)))))fail('crew-rejection');
 crewTotals(op);
 if(op.phase==='settled'){
  const value=crewSettlement(op);if(!op.settlement||!identity(op.settlement.id)||!Number.isFinite(Date.parse(op.settlement.at))||value.remaining!==0||canonical(op.settlement.value)!==canonical(value))fail('crew-settlement');
 }else if(op.settlement)fail('crew-settlement');
 if(new TextEncoder().encode(JSON.stringify(op)).length>650000)fail('crew-size');return op;
}
export function createCrew({id,ownerUid,name,title,ship='',capacity=0,at=new Date().toISOString()}){
 return validateCrew({schema:1,id,ownerUid,title,revision:1,phase:'open',at,members:[{uid:ownerUid,name,ship,capacity,role:'leader',active:true}],assignments:[],events:[],splitMode:'capital',shares:{},settlement:null});
}
export function changeCrew(input,command,actorUid,at=new Date().toISOString()){
 validateCrew(input);if(actorUid!==input.ownerUid)fail('crew-permission');if(input.phase==='settled')fail('crew-closed');const op=structuredClone(input);
 if(command.kind==='member'){
  const m=op.members.find(m=>m.uid===command.member.uid);if(m)Object.assign(m,command.member);else op.members.push({...command.member});
 }else if(command.kind==='assignment'){
  const a=op.assignments.find(a=>a.id===command.assignment.id);if(a){if(op.events.some(e=>e.assignmentId===a.id&&!e.voidedAt))fail('crew-assignment-started');Object.assign(a,command.assignment);}else op.assignments.push({...command.assignment});
 }else if(command.kind==='event'){
  if(!op.members.some(m=>m.uid===command.event.memberUid&&m.active))fail('crew-member');op.events.push({...command.event,actorUid,at});
 }else if(command.kind==='undo'){
  const e=[...op.events].reverse().find(e=>!e.voidedAt);if(!e)fail('crew-event');e.voidedAt=at;
 }else if(command.kind==='shares'){op.splitMode=command.mode;op.shares={...command.shares};}
 else if(command.kind==='review'){op.phase='review';}
 else if(command.kind==='resume'){op.phase='open';}
 else if(command.kind==='reject'){if(!text(command.reason,500))fail('crew-reason');op.rejections=[...op.rejections??[],{id:command.id,memberUid:command.memberUid,reason:command.reason,at}];}
 else if(command.kind==='settle'){if(op.phase!=='review')fail('crew-review');const value=crewSettlement(op);if(value.remaining)fail('crew-remaining');op.phase='settled';op.settlement={id:command.id,at,value};}
 else fail('crew-command');op.revision++;return validateCrew(op);
}
