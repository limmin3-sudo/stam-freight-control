import type {TradeCandidate,TradeInputs} from './trade-planning';
export type TradePlan={createdAt:string;ship:{id:string;name:string;capacity:number};inputs:TradeInputs;commodity:{id:number;name:string};origin:{id:number;name:string};destination:{id:number;name:string};systemPath:string[];quantity:number;purchase:number;revenue:number;profit:number;reserve:number;boxSize:number;buyUpdatedAt:string|null;sellUpdatedAt:string|null;sourceVersion:string;warnings:string[]};
export type TradeEventKind='buy'|'depart'|'arrive'|'sell'|'expense'|'loss'|'finish'|'cancel';
export type TradeEntry={id:string;kind:TradeEventKind;at:string;quantity:number;amount:number;note:string;voidedAt?:string};
export type TradeRun={id:string;createdAt:string;plan:TradePlan;entries:TradeEntry[]};
export type TradeBook={schema:1;owner:string;revision:number;runs:TradeRun[]};
export type TradeSummary={status:'active'|'completed'|'cancelled';stage:'purchase'|'transit'|'sale';bought:number;sold:number;lost:number;aboard:number;purchase:number;revenue:number;expenses:number;inventoryCost:number;releasedCost:number;profit:number;cash:number;reserveUsed:number};
export class TradeError extends Error{code:string;constructor(code:string){super(code);this.code=code;}}
function fail(code:string):never{throw new TradeError(code);}
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const text=(v:unknown,max=300):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
const money=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e12&&Math.abs(v*100-Math.round(v*100))<.001;
const whole=(v:unknown,max=10000):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max;
const cents=(v:number)=>Math.round(v*100);
export const blankTradeBook=(owner:string):TradeBook=>({schema:1,owner,revision:0,runs:[]});
export function makeTradePlan(candidate:TradeCandidate,inputs:TradeInputs,ship:TradePlan['ship'],sourceVersion:string):TradePlan{
 const plan:TradePlan={createdAt:new Date().toISOString(),ship:structuredClone(ship),inputs:structuredClone(inputs),commodity:{id:candidate.commodity.id,name:candidate.commodity.name},origin:{id:candidate.origin.id,name:candidate.origin.name},destination:{id:candidate.destination.id,name:candidate.destination.name},systemPath:[...candidate.systemPath],quantity:candidate.quantity,purchase:candidate.purchase,revenue:candidate.revenue,profit:candidate.profit,reserve:candidate.reserve,boxSize:candidate.boxSize,buyUpdatedAt:candidate.buy.updatedAt,sellUpdatedAt:candidate.sell.updatedAt,sourceVersion,warnings:[...candidate.warnings]};
 validateTradePlan(plan);return plan;
}
export function validateTradePlan(p:TradePlan){
 if(!p||!date(p.createdAt)||!text(p.ship?.id)||!text(p.ship.name)||!whole(p.ship.capacity)||p.ship.capacity<1||!whole(p.quantity)||p.quantity<1||p.quantity>p.ship.capacity||![1,2,4,8,16,24,32].includes(p.boxSize)||p.quantity%p.boxSize!==0||![p.purchase,p.revenue,p.profit,p.reserve].every(money)||!Array.isArray(p.systemPath)||!p.systemPath.length||p.systemPath.length>20||p.systemPath.some(s=>!text(s))||!text(p.sourceVersion)||!Array.isArray(p.warnings)||p.warnings.some(w=>!text(w)))fail('invalid');
 for(const point of [p.commodity,p.origin,p.destination])if(!point||!whole(point.id,1e9)||point.id<1||!text(point.name))fail('invalid');
 const i=p.inputs;if(!i||i.shipId!==p.ship.id||i.originId!==p.origin.id||!Number.isFinite(i.budget)||i.budget<=0||i.budget>1e12||!Number.isFinite(i.costs)||i.costs<0||i.costs>1e12||!Number.isFinite(i.reservePercent)||i.reservePercent<0||i.reservePercent>100||!whole(i.cargoLimit)||i.cargoLimit<1||i.cargoLimit>p.ship.capacity||p.quantity>i.cargoLimit||!['intrasystem','interstellar'].includes(i.scope)||!['low','known','all'].includes(i.risk)||!['legal','known','all'].includes(i.legality)||!['current','stale'].includes(i.prices))fail('invalid');
 if(p.origin.id===p.destination.id||[p.buyUpdatedAt,p.sellUpdatedAt].some(d=>d!==null&&!date(d)))fail('invalid');
}
export function tradeSummary(run:TradeRun):TradeSummary{
 let status:TradeSummary['status']='active',stage:TradeSummary['stage']='purchase',bought=0,sold=0,lost=0,aboard=0,purchase=0,revenue=0,expenses=0,basis=0,released=0;
 const ids=new Set<string>();
 for(const e of run.entries){
  if(!text(e.id)||ids.has(e.id)||!date(e.at)||!whole(e.quantity)||!money(e.amount)||typeof e.note!=='string'||e.note.length>500||!['buy','depart','arrive','sell','expense','loss','finish','cancel'].includes(e.kind)||e.voidedAt!==undefined&&!date(e.voidedAt))fail('invalid');ids.add(e.id);
  if(e.voidedAt)continue;if(status!=='active')fail('closed');
  const amount=cents(e.amount);
  if(['buy','sell','loss'].includes(e.kind)){if(e.quantity<1)fail('quantity');}else if(e.quantity!==0)fail('quantity');
  if(!['buy','sell','expense'].includes(e.kind)&&amount!==0)fail('amount');
  if(e.kind==='buy'){
   if(stage!=='purchase')fail('stage');if(aboard+e.quantity>run.plan.ship.capacity)fail('capacity');aboard+=e.quantity;bought+=e.quantity;purchase+=amount;basis+=amount;
  }else if(e.kind==='sell'||e.kind==='loss'){
   if(e.kind==='sell'&&stage!=='sale')fail('stage');if(e.quantity>aboard)fail('aboard');if(e.kind==='loss'&&!e.note.trim())fail('note');
   // Cent-exact pooled acquisition cost; the last disposal releases the remainder.
   const cost=e.quantity===aboard?basis:Number(BigInt(basis)*BigInt(e.quantity)/BigInt(aboard));basis-=cost;released+=cost;aboard-=e.quantity;
   if(e.kind==='sell'){sold+=e.quantity;revenue+=amount;}else lost+=e.quantity;
  }else if(e.kind==='expense'){if(amount<=0)fail('amount');if(!e.note.trim())fail('note');expenses+=amount;}
  else if(e.kind==='depart'){if(stage!=='purchase'||aboard===0)fail('stage');stage='transit';}
  else if(e.kind==='arrive'){if(stage!=='transit')fail('stage');stage='sale';}
  else if(e.kind==='finish'){if(aboard!==0||bought===0)fail('remaining');status='completed';}
  else if(e.kind==='cancel'){if(bought!==0||aboard!==0)fail('remaining');status='cancelled';}
  if([purchase,revenue,expenses,basis,released].some(n=>!Number.isSafeInteger(n)||n<0)||bought>1e7)fail('amount');
 }
 const cash=Number(BigInt(Math.floor(run.plan.inputs.budget*100+1e-6))-BigInt(purchase)-BigInt(expenses)+BigInt(revenue)),profit=Number(BigInt(revenue)-BigInt(released)-BigInt(expenses));
 if(!Number.isSafeInteger(cash)||!Number.isSafeInteger(profit)||!Number.isSafeInteger(cents(run.plan.reserve)-cash))fail('amount');
 return {status,stage,bought,sold,lost,aboard,purchase:purchase/100,revenue:revenue/100,expenses:expenses/100,inventoryCost:basis/100,releasedCost:released/100,profit:profit/100,cash:cash/100,reserveUsed:Math.max(0,cents(run.plan.reserve)-cash)/100};
}
export function validateTradeBook(value:unknown,owner?:string):TradeBook{
 const b=value as TradeBook;
 if(!b||b.schema!==1||!text(b.owner)||owner!==undefined&&b.owner!==owner||!whole(b.revision,Number.MAX_SAFE_INTEGER)||!Array.isArray(b.runs)||b.runs.length>1000)fail('invalid');
 const ids=new Set<string>();let active=0;
 for(const r of b.runs){if(!r||!text(r.id)||ids.has(r.id)||!date(r.createdAt)||!Array.isArray(r.entries)||r.entries.length>10000)fail('invalid');ids.add(r.id);validateTradePlan(r.plan);if(tradeSummary(r).status==='active')active++;}
 if(active>1)fail('active');return b;
}
export type TradeCommand={kind:'start';plan:TradePlan;id:string}|{kind:'entry';runId:string;entry:TradeEntry}|{kind:'undo';runId:string;entryId:string;at:string};
export function changeTradeBook(book:TradeBook,command:TradeCommand):TradeBook{
 validateTradeBook(book);const next=structuredClone(book);
 if(command.kind==='start'){
  if(next.runs.some(r=>tradeSummary(r).status==='active'))fail('active');validateTradePlan(command.plan);if(!text(command.id)||next.runs.some(r=>r.id===command.id))fail('duplicate');
  next.runs.push({id:command.id,createdAt:command.plan.createdAt,plan:structuredClone(command.plan),entries:[]});
 }else{
  const run=next.runs.find(r=>r.id===command.runId);if(!run)fail('missing');
  if(command.kind==='entry'){if(command.entry.voidedAt)fail('invalid');if(run.entries.some(e=>e.id===command.entry.id))fail('duplicate');run.entries.push(structuredClone(command.entry));}
  else{const last=[...run.entries].reverse().find(e=>!e.voidedAt);if(!last||last.id!==command.entryId||!date(command.at))fail('conflict');last.voidedAt=command.at;}
 }
 next.revision++;validateTradeBook(next);return next;
}
export function exportTradeBook(book:TradeBook){validateTradeBook(book);return JSON.stringify({kind:'stam-trade-backup',version:1,createdAt:new Date().toISOString(),book},null,2);}
export function importTradeBook(raw:string,owner:string):TradeBook{
 if(new TextEncoder().encode(raw).length>8_000_000)fail('size');const parsed=JSON.parse(raw);if(parsed.kind!=='stam-trade-backup'||parsed.version!==1)fail('invalid');const b=validateTradeBook(parsed.book,owner);return structuredClone(b);
}
