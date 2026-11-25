import {expeditionSummary,type Expedition,type ExpeditionSummary} from './trade-expedition.ts';
import type {SuiteLeg} from './trade-suite.ts';

export type PlannedPurchase={commodityId:number;name:string;boxSize:number;planned:number;recorded:number;remaining:number;amount:number};
// Suggestions only: actual ledger events remain the authority. Match visits in
// order so a circular route never offers the first visit's purchases again.
export function tradeNextStep(run:Expedition,summary:ExpeditionSummary=expeditionSummary(run)){
 const replanAt=run.routeHistory?.at(-1)?.at;
 const events=run.events.filter(e=>!e.voidedAt&&(!replanAt||Date.parse(e.at)>Date.parse(replanAt)));
 let index=0,aligned=true,departed=false,visit=0;
 events.forEach((e,i)=>{
  const leg=run.route.legs[index];
  if(e.kind==='depart'){if(!leg||leg.destinationId!==e.terminalId)aligned=false;departed=true;}
  if(e.kind==='arrive'){if(!departed||!leg||leg.destinationId!==e.terminalId)aligned=false;else index++;departed=false;visit=i+1;}
 });
 const leg:SuiteLeg|undefined=run.route.legs[index];
 if(leg&&leg.originId!==summary.position)aligned=false;
 const purchases:PlannedPurchase[]=[];
 if(aligned&&leg&&!leg.empty&&summary.target===null){
  const bought=new Map<string,number>();
  for(const e of events.slice(visit))if(e.kind==='buy'){const key=`${e.commodityId}:${e.boxSize}`;bought.set(key,(bought.get(key)??0)+e.quantity!);}
  const groups=new Map<string,PlannedPurchase>();
  for(const line of leg.lines){if(line.buySource==='holding')continue;const key=`${line.commodityId}:${line.boxSize}`,previous=groups.get(key);
   const quantity=run.route.splitSale && index===0 ? line.quantity+run.route.legs[1]!.lines[0]!.quantity : line.quantity;
   if(previous){previous.planned+=quantity;previous.amount+=line.purchase;}else groups.set(key,{commodityId:line.commodityId,name:line.name,boxSize:line.boxSize,planned:quantity,recorded:0,remaining:0,amount:line.purchase});
  }
  for(const [key,p] of groups){p.recorded=bought.get(key)??0;p.remaining=Math.max(0,p.planned-p.recorded);p.amount=Math.round(p.amount/p.planned*p.remaining*100)/100;purchases.push(p);}
 }
 return {index,leg,aligned,complete:aligned&&index>=run.route.legs.length,purchases};
}

export function lastPartialSale(run:Expedition,state:ExpeditionSummary){
 const sale=run.events.filter(e=>!e.voidedAt).at(-1);
 if(state.status!=='active'||state.target!==null||sale?.kind!=='sell'||!sale.quantity)return null;
 const lot=state.holdings.find(l=>l.id===sale.lotId&&l.terminalId===null&&l.quantity>0);
 return lot?{eventId:sale.id,lot,before:sale.quantity+lot.quantity,sold:sale.quantity}:null;
}

export function tradeSettlement(summary:ExpeditionSummary){
 const remainingCost=summary.holdings.reduce((sum,l)=>sum+(l.cost===null?0:Math.round(l.cost*100)),0)/100;
 return {remainingCost,remainingCostUnknown:summary.holdings.some(l=>l.cost===null),cashFlow:Math.round((summary.sales-summary.purchase-summary.expenses)*100)/100};
}
