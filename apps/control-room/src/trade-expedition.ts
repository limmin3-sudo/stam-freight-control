import {validateSuiteOptions,type SuiteOptions,type SuiteRoute,type CargoLot} from './trade-suite.ts';
export type TradeEvent={id:string;at:string;kind:'buy'|'cargo'|'sell'|'loss'|'store'|'withdraw'|'expense'|'balance'|'depart'|'arrive'|'finish'|'cancel';lotId?:string;commodityId?:number;quantity?:number;boxSize?:number;amount?:number|null;terminalId?:number;ownership?:CargoLot['ownership'];note:string;tags?:string[];voidedAt?:string};
export type Expedition={id:string;at:string;options:SuiteOptions;route:SuiteRoute;routeHistory?:{at:string;route:SuiteRoute}[];events:TradeEvent[]};
export type Holding=CargoLot&{id:string;terminalId:number|null;tags?:string[]};
export type ExpeditionSummary={status:'active'|'finished'|'cancelled';position:number;target:number|null;holdings:Holding[];cash:number;expenses:number;purchase:number;sales:number;realized:number;unknownCost:boolean;lost:number;capitalAdjustment:number};
export type PriceWatch={id:string;commodityId:number;terminalId:number;side:'buy'|'sell';threshold:number};
export type SuiteBook={schema:1;owner:string;revision:number;plans:{id:string;name:string;options:SuiteOptions;route:SuiteRoute}[];runs:Expedition[];watches:PriceWatch[];favorites:number[]};
const validAmount=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e12;
const cents=(n:number)=>Math.round(n*100);
const fail=(message:string):never=>{throw Error(message);};
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200;
const terminal=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0;
export function expeditionSummary(run:Expedition):ExpeditionSummary{
 validateSuiteOptions(run.options);
 const s:ExpeditionSummary={status:'active',position:run.options.originId,target:null,holdings:[],cash:cents(run.options.budget),expenses:0,purchase:0,sales:0,realized:0,unknownCost:false,lost:0,capitalAdjustment:0};
 const seenLots=new Set<string>();
 for(const e of run.events){
  if(!id(e.id)||!Number.isFinite(Date.parse(e.at))||typeof e.note!=='string'||e.note.length>2000||!['buy','cargo','sell','loss','store','withdraw','expense','balance','depart','arrive','finish','cancel'].includes(e.kind)||e.voidedAt&&!Number.isFinite(Date.parse(e.voidedAt)))fail('event');
  if(e.tags!==undefined&&(!Array.isArray(e.tags)||e.tags.length>12||e.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>40)||new Set(e.tags).size!==e.tags.length))fail('tags');
  if(e.voidedAt)continue;if(['expense','loss','balance'].includes(e.kind)&&!e.note.trim())fail('reason');if(s.status!=='active')fail('closed');
  if(['buy','cargo','sell','loss'].includes(e.kind)&&(!Number.isSafeInteger(e.quantity)||e.quantity!<1))fail('quantity');
  if(['buy','cargo'].includes(e.kind)){
   if(s.target!==null||e.terminalId!==s.position||!id(e.lotId)||seenLots.has(e.lotId!)||!terminal(e.commodityId)||![1,2,4,8,16,24,32].includes(e.boxSize!)||e.quantity!%e.boxSize!||!['owned','stolen','unknown'].includes(e.ownership!))fail('cargo');
   if(e.amount!==null&&!validAmount(e.amount)||e.kind==='buy'&&e.amount===null)fail('amount');
   seenLots.add(e.lotId!);const cost=e.amount===null?null:cents(e.amount!);
   if(e.kind==='buy'){if(cost!>s.cash)fail('capital');s.cash-=cost!;s.purchase+=cost!;}
   s.holdings.push({id:e.lotId!,commodityId:e.commodityId!,quantity:e.quantity!,boxSize:e.boxSize!,ownership:e.ownership!,cost:cost===null?null:cost/100,terminalId:null,tags:[...e.tags??[]]});
  }else if(['sell','loss','store','withdraw'].includes(e.kind)){
   const lot=s.holdings.find(l=>l.id===e.lotId);if(!lot)fail('lot');
   if(e.kind==='store'||e.kind==='withdraw'){
    if(s.target!==null||e.terminalId!==s.position||e.kind==='store'&&lot!.terminalId!==null||e.kind==='withdraw'&&lot!.terminalId!==s.position)fail('location');
    lot!.terminalId=e.kind==='store'?s.position:null;
   }else{
    if(e.quantity!>lot!.quantity||e.quantity!%lot!.boxSize)fail('quantity');
    if(e.kind==='sell'&&(s.target!==null||e.terminalId!==s.position||lot!.terminalId!==null&&lot!.terminalId!==s.position))fail('location');
    const basis=lot!.cost===null?null:Math.round(cents(lot!.cost)*e.quantity!/lot!.quantity);
    if(basis===null)s.unknownCost=true;
    if(e.kind==='sell'){if(!validAmount(e.amount))fail('amount');const revenue=cents(e.amount!);s.cash+=revenue;s.sales+=revenue;s.realized+=revenue-(basis??0);}
    else{s.lost+=e.quantity!;s.realized-=basis??0;}
    lot!.quantity-=e.quantity!;if(basis!==null)lot!.cost=(cents(lot!.cost!)-basis)/100;
    s.holdings=s.holdings.filter(l=>l.quantity>0);
   }
  }else if(e.kind==='balance'){
   if(!validAmount(e.amount))fail('amount');const value=cents(e.amount!);s.capitalAdjustment+=value-s.cash;s.cash=value;
  }else if(e.kind==='expense'){
   if(!validAmount(e.amount))fail('amount');const value=cents(e.amount!);s.expenses+=value;s.cash-=value;s.realized-=value;
  }else if(e.kind==='depart'){
   if(s.target!==null||!terminal(e.terminalId)||e.terminalId===s.position)fail('location');s.target=e.terminalId!;
  }else if(e.kind==='arrive'){
   if(s.target===null||e.terminalId!==s.target)fail('location');s.position=s.target!;s.target=null;
  }else if(e.kind==='finish'){
   if(s.target!==null||s.holdings.length)fail('remaining');s.status='finished';
  }else if(e.kind==='cancel'){
   if(s.holdings.length||s.purchase||s.sales||s.expenses||s.target!==null)fail('started');s.status='cancelled';
  }
  if(s.holdings.filter(l=>l.terminalId===null).reduce((n,l)=>n+l.quantity,0)>run.options.capacity)fail('capacity');
  if(!Number.isSafeInteger(s.cash)||Math.abs(s.cash)>1e14)fail('amount');
 }
 return {...s,cash:s.cash/100,purchase:s.purchase/100,sales:s.sales/100,expenses:s.expenses/100,realized:s.realized/100,capitalAdjustment:s.capitalAdjustment/100};
}
export const blankSuiteBook=(owner:string):SuiteBook=>({schema:1,owner,revision:0,plans:[],runs:[],watches:[],favorites:[]});
export function validateSuiteRoute(route:SuiteRoute){
 if(!route||typeof route.id!=='string'||(!route.id.length||route.id.length>10000)||!Array.isArray(route.legs)||!route.legs.length||route.legs.length>6||!Array.isArray(route.warnings)||route.warnings.some(w=>typeof w!=='string')||!Array.isArray(route.unsold)||route.unsold.length>100||route.unsold.some(l=>!terminal(l.commodityId)||!Number.isSafeInteger(l.quantity)||l.quantity<1||![1,2,4,8,16,24,32].includes(l.boxSize)||l.quantity%l.boxSize||l.cost!==null&&!validAmount(l.cost)||!['owned','stolen','unknown'].includes(l.ownership))||route.seconds!==null&&!validAmount(route.seconds)||route.profitPerHour!==null&&!Number.isFinite(route.profitPerHour)||route.roi!=null&&!Number.isFinite(route.roi)||![route.profit,route.cash].every(n=>Number.isFinite(n))||![route.purchase,route.costs,route.reserve].every(validAmount))fail('route');
 for(const leg of route.legs){if(leg.drive&&(typeof leg.drive.name!=='string'||leg.drive.version!==null&&typeof leg.drive.version!=='string'))fail('drive');if(!terminal(leg.originId)||!terminal(leg.destinationId)||!Array.isArray(leg.lines)||leg.lines.length>100||![leg.purchase,leg.revenue,leg.costs,leg.meters,leg.waitMinutes].every(validAmount)||!Number.isFinite(leg.profit)||leg.seconds!==null&&!validAmount(leg.seconds)||!Array.isArray(leg.systems)||leg.systems.some(s=>typeof s!=='string'))fail('route');
  for(const l of leg.lines)if(!terminal(l.commodityId)||typeof l.name!=='string'||l.name.length>200||[l.buyAt,l.sellAt].some(v=>v!==null&&(typeof v!=='string'||!Number.isFinite(Date.parse(v))))||typeof l.costKnown!=='boolean'||l.buySource!==undefined&&!['UEX','personal','holding'].includes(l.buySource)||l.sellSource!==undefined&&!['UEX','personal'].includes(l.sellSource)||!['owned','stolen','unknown'].includes(l.ownership)||![l.available,l.demand].every(validAmount)||!Number.isSafeInteger(l.quantity)||l.quantity<1||![1,2,4,8,16,24,32].includes(l.boxSize)||l.quantity%l.boxSize||![l.buy,l.sell,l.purchase,l.revenue].every(validAmount))fail('route');
 }return route;
}
export function validateSuiteBook(value:unknown,owner:string):SuiteBook{
 const b=value as SuiteBook;if(!b||b.schema!==1||b.owner!==owner||!Number.isSafeInteger(b.revision)||b.revision<0||!Array.isArray(b.plans)||b.plans.length>100||!Array.isArray(b.runs)||b.runs.length>1000||!Array.isArray(b.watches)||b.watches.length>100||!Array.isArray(b.favorites)||b.favorites.length>1000||b.favorites.some(n=>!terminal(n)))fail('book');
 const unique=(items:{id:string}[])=>{if(items.some(i=>!id(i.id))||new Set(items.map(i=>i.id)).size!==items.length)fail('identity');};unique(b.plans);unique(b.runs);unique(b.watches);
 for(const p of b.plans){if(typeof p.name!=='string'||p.name.length>100)fail('plan');validateSuiteOptions(p.options);validateSuiteRoute(p.route);}
 let active=0;for(const r of b.runs){if(!Number.isFinite(Date.parse(r.at))||!Array.isArray(r.events)||r.events.length>10000)fail('run');unique(r.events);validateSuiteRoute(r.route);if(r.routeHistory){if(!Array.isArray(r.routeHistory)||r.routeHistory.length>1000)fail('history');for(const h of r.routeHistory){if(!Number.isFinite(Date.parse(h.at)))fail('history');validateSuiteRoute(h.route);}}if(expeditionSummary(r).status==='active')active++;}if(active>1)fail('active');
 for(const w of b.watches)if(!terminal(w.commodityId)||!terminal(w.terminalId)||!['buy','sell'].includes(w.side)||!validAmount(w.threshold))fail('watch');return b;
}
export type SuiteCommand={kind:'save';id:string;name:string;options:SuiteOptions;route:SuiteRoute}|{kind:'remove';id:string}|{kind:'start';id:string;options:SuiteOptions;route:SuiteRoute}|{kind:'event';runId:string;event:TradeEvent}|{kind:'undo';runId:string}|{kind:'events';runId:string;events:TradeEvent[]}|{kind:'replan';runId:string;route:SuiteRoute;options:SuiteOptions}|{kind:'favorite';terminalId:number}|{kind:'watch';watch:PriceWatch}|{kind:'unwatch';id:string};
export function changeSuiteBook(book:SuiteBook,command:SuiteCommand,at=new Date().toISOString()):SuiteBook{
 validateSuiteBook(book,book.owner);const b=structuredClone(book);
 if(command.kind==='save')b.plans.push({id:command.id,name:command.name,options:structuredClone(command.options),route:structuredClone(command.route)});
 else if(command.kind==='remove')b.plans=b.plans.filter(p=>p.id!==command.id);
 else if(command.kind==='start'){
  if(b.runs.some(r=>expeditionSummary(r).status==='active'))fail('active');
  b.runs.push({id:command.id,at,options:structuredClone(command.options),route:structuredClone(command.route),events:[]});
 }else if(command.kind==='replan'){
  const r=b.runs.find(r=>r.id===command.runId);if(!r)fail('run');const summary=expeditionSummary(r!);validateSuiteOptions(command.options);if(summary.status!=='active'||summary.target!==null||command.options.shipId!==r!.options.shipId||command.options.originId!==summary.position||Math.abs(command.options.budget-Math.max(0,summary.cash))>.005)fail('changed');const aboard=summary.holdings.filter(l=>l.terminalId===null);if(aboard.length&&(command.options.mode!=='buyers'||command.options.cargo.length!==aboard.length||aboard.some(l=>!command.options.cargo.some(c=>c.lotId===l.id&&c.commodityId===l.commodityId&&c.quantity===l.quantity&&c.boxSize===l.boxSize&&c.ownership===l.ownership&&c.cost===l.cost))))fail('cargoChanged');r!.routeHistory=[...r!.routeHistory??[],{at,route:r!.route}];r!.route=structuredClone(command.route);
 }else if(command.kind==='events'){
  const r=b.runs.find(r=>r.id===command.runId);if(!r||!command.events.length||command.events.length>100)fail('run');r!.events.push(...structuredClone(command.events));
 }else if(command.kind==='event'||command.kind==='undo'){
  const r=b.runs.find(r=>r.id===command.runId);if(!r)fail('run');
  if(command.kind==='event')r!.events.push(structuredClone(command.event));else{const event=[...r!.events].reverse().find(e=>!e.voidedAt);if(!event)fail('event');event!.voidedAt=at;}
 }else if(command.kind==='favorite')b.favorites=b.favorites.includes(command.terminalId)?b.favorites.filter(i=>i!==command.terminalId):[...b.favorites,command.terminalId];
 else if(command.kind==='watch')b.watches.push(structuredClone(command.watch));
 else if(command.kind==='unwatch')b.watches=b.watches.filter(w=>w.id!==command.id);
 b.revision++;return validateSuiteBook(b,b.owner);
}
