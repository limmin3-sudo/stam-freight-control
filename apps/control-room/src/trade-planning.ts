import {commodityAllowed,quoteFreshness,patch,type MarketSnapshot,type Commodity,type Quote,type Terminal} from './trade-data.ts';
export type TradeScope='intrasystem'|'interstellar';
export type TradeInputs={shipId:string;budget:number;reservePercent:number;costs:number;cargoLimit:number;originId:number;scope:TradeScope;legality:'legal'|'known'|'all';risk:'low'|'known'|'all';prices:'current'|'stale'};
export type TradeCandidate={key:string;commodity:Commodity;origin:Terminal;destination:Terminal;buy:Quote;sell:Quote;quantity:number;boxSize:number;boxCount:number;purchase:number;revenue:number;gross:number;profit:number;reserve:number;remaining:number;systemPath:string[];limits:string[];warnings:string[]};
export type PlanningResult={candidates:TradeCandidate[];rejected:Record<string,number>;error:string|null};
export type TradeContext={capacity:number;boxCapacities:Record<number,number>;shipId:string;systemEdges:[string,string][]};
const validMoney=(v:number)=>Number.isFinite(v)&&v>=0&&v<=1e12;
const centsUp=(v:number)=>Math.ceil(v*100-1e-6),centsDown=(v:number)=>Math.floor(v*100+1e-6);
export function systemPath(from:string,to:string,edges:[string,string][]):string[]|null{
 const start=from.toLowerCase(),end=to.toLowerCase();if(!start||!end)return null;if(start===end)return [from];
 const queue=[[start]],seen=new Set([start]);while(queue.length){const path=queue.shift()!,last=path[path.length-1];for(const [a0,b0] of edges){const a=a0.toLowerCase(),b=b0.toLowerCase(),next=a===last?b:b===last?a:null;if(!next||seen.has(next))continue;const route=[...path,next];if(next===end)return route;seen.add(next);queue.push(route);}}return null;
}
function locationAllowed(t:Terminal,risk:TradeInputs['risk'],now:number){
 if(risk==='all')return true;
 const s=t.security;if(!s||typeof s.monitored!=='boolean'||typeof s.armistice!=='boolean'||!s.updatedAt||!Number.isFinite(Date.parse(s.updatedAt))||Date.parse(s.updatedAt)>now+300000||typeof s.source!=='string'||!s.source.startsWith('https://api.uexcorp.uk/2.0/'))return false;
 return risk==='known'||(s.monitored&&s.armistice);
}
export function planTrades(data:MarketSnapshot,input:TradeInputs,context:TradeContext,now=Date.now()):PlanningResult{
 const rejected:Record<string,number>={},out:PlanningResult={candidates:[],rejected,error:null};const reject=(why:string)=>{rejected[why]=(rejected[why]||0)+1;};
 if(!['intrasystem','interstellar'].includes(input.scope)||!['legal','known','all'].includes(input.legality)||!['low','known','all'].includes(input.risk)||!['current','stale'].includes(input.prices)||!validMoney(input.budget)||input.budget<=0||!validMoney(input.costs)||!Number.isFinite(input.reservePercent)||input.reservePercent<0||input.reservePercent>100||!Number.isSafeInteger(input.cargoLimit)||input.cargoLimit<1||input.cargoLimit>context.capacity||!Number.isSafeInteger(context.capacity)||context.capacity>10000||input.shipId!==context.shipId){out.error='inputs';return out;}
 const budget=centsDown(input.budget),reserve=Math.ceil(budget*input.reservePercent/100),fees=centsUp(input.costs),spend=budget-reserve-fees;if(spend<=0){out.error='capital';return out;}
 const origin=data.terminals.find(t=>t.id===input.originId);if(!origin){out.error='origin';return out;}
 const allowedPrice=(q:Quote)=>{const state=quoteFreshness(q,data.liveVersion,now);return state==='current'||(input.prices==='stale'&&state==='stale');};
 const goods=new Map(data.commodities.map(c=>[c.id,c])),terminals=new Map(data.terminals.map(t=>[t.id,t]));
 const sells=new Map<number,Quote[]>();for(const quote of data.quotes)if(quote.sell!==null&&quote.sell>0){const group=sells.get(quote.commodityId)??[];group.push(quote);sells.set(quote.commodityId,group);}
 for(const buy of data.quotes.filter(q=>q.terminalId===origin.id&&q.buy!==null&&q.buy>0)){
  const commodity=goods.get(buy.commodityId);if(!commodity||!commodityAllowed(commodity,input.legality,input.risk)){reject('cargoPolicy');continue;}
  if(!locationAllowed(origin,input.risk,now)){reject('locationPolicy');continue;}
  if(!allowedPrice(buy)){reject('priceAge');continue;}if(buy.stock===null||buy.stock<=0){reject('stock');continue;}
  for(const sell of sells.get(commodity.id)??[]){
   const dest=terminals.get(sell.terminalId);if(!dest||dest.id===origin.id)continue;
   if(!origin.system||!dest.system){reject('connection');continue;}
   const same=origin.system.toLowerCase()===dest.system.toLowerCase();if(same!==(input.scope==='intrasystem'))continue;
   if(!locationAllowed(dest,input.risk,now)){reject('locationPolicy');continue;}
   if(!allowedPrice(sell)){reject('priceAge');continue;}if(sell.demand===null||sell.demand<=0){reject('demand');continue;}
   const path=systemPath(origin.system,dest.system,context.systemEdges);if(!path){reject('connection');continue;}
   // Hull C's expanded cargo handling requires a loading dock; docking alone is insufficient.
   if(context.shipId==='misc-hull-c'&&(origin.loadingDock!==true||dest.loadingDock!==true)){reject('loadingDock');continue;}
   if(!origin.maxContainerScu||!dest.maxContainerScu){reject('containers');continue;}
   const unitBuy=centsUp(buy.buy!),unitSell=centsDown(sell.sell!);if(unitBuy<=0||unitSell<=unitBuy){reject('margin');continue;}
   const capitalQty=Math.floor(spend/unitBuy),rawLimit=Math.min(input.cargoLimit,Math.floor(buy.stock),Math.floor(sell.demand),capitalQty);
   let quantity=0,boxSize=0,fit=0;
   // Source container sizes are purchase options; sell-side sizes do not constrain the purchased boxes.
   for(const size of buy.containers){if(![1,2,4,8,16,24,32].includes(size)||size>origin.maxContainerScu||size>dest.maxContainerScu)continue;
    const capacity=context.boxCapacities[size];if(capacity===undefined||!Number.isSafeInteger(capacity)||capacity<1)continue;
    const amount=Math.floor(Math.min(rawLimit,capacity)/size)*size;
    if(amount>quantity||amount===quantity&&size>boxSize){quantity=amount;boxSize=size;fit=capacity;}
   }
   if(quantity<1){reject('quantity');continue;}const purchase=quantity*unitBuy,revenue=quantity*unitSell,gross=revenue-purchase,profit=gross-fees;
   if(!Number.isSafeInteger(purchase)||!Number.isSafeInteger(revenue)||purchase+fees+reserve>budget||profit<=0){reject('margin');continue;}
   const limits=[];const limiting=Math.min(input.cargoLimit,Math.floor(buy.stock),Math.floor(sell.demand),capitalQty,fit);
   for(const [key,value] of [['cargo',input.cargoLimit],['stock',Math.floor(buy.stock)],['demand',Math.floor(sell.demand)],['budget',capitalQty],['packing',fit]] as const)if(value===limiting)limits.push(key);
   if(quantity<limiting)limits.push('boxMultiple');
   const warnings=['emptyShip','reportedInventory','routeSecurityUnknown','costsEnteredOnly'];
   if([origin,dest].some(t=>patch(t.version)!==data.liveVersion))warnings.push('oldFacilities');
   if([origin,dest].some(t=>!t.security?.updatedAt))warnings.push('unknownSecurityDate');
   if(quoteFreshness(buy,data.liveVersion,now)==='stale'||quoteFreshness(sell,data.liveVersion,now)==='stale')warnings.push('stalePrices');
   if(commodity.illegal===true)warnings.push('illegal');if(commodity.illegal===null)warnings.push('unknownLegality');if(commodity.hazards.length||!commodity.riskKnown)warnings.push('cargoRisk');
   out.candidates.push({key:`${buy.id}:${sell.id}`,commodity,origin,destination:dest,buy,sell,quantity,boxSize,boxCount:quantity/boxSize,purchase:purchase/100,revenue:revenue/100,gross:gross/100,profit:profit/100,reserve:reserve/100,remaining:(budget-purchase-fees)/100,systemPath:path,limits,warnings});
  }
 }
 out.candidates.sort((a,b)=>b.profit-a.profit||a.purchase-b.purchase||a.key.localeCompare(b.key));return out;
}
