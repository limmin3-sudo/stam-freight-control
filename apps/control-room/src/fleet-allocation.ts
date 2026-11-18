import {calculateSuite,type SuiteOptions,type SuiteRoute,type SuiteContext} from './trade-suite.ts';
import type {MarketSnapshot} from './trade-data.ts';
export type FleetVessel={uid:string;shipId:string;capacity:number;originId:number};
export type FleetAllocation={routes:{uid:string;route:SuiteRoute}[];remainingCash:number;reserve:number;unassigned:{uid:string;reason:string}[];examined:number};
// Bounded greedy assignment. Supply, demand and starting cash are shared; future sales
// from one participant are never used to fund another participant's simultaneous buy.
export function allocateFleet(market:MarketSnapshot,options:SuiteOptions,vessels:FleetVessel[],context:(o:SuiteOptions)=>SuiteContext,progress:(n:number,total:number)=>void=()=>{}):FleetAllocation{
 if(vessels.length>30||new Set(vessels.map(v=>v.uid)).size!==vessels.length)throw Error('fleet-limit');
 const result:FleetAllocation={routes:[],remainingCash:options.budget,reserve:0,unassigned:[],examined:0};
 let data=structuredClone(market),remaining=[...vessels],round=0;
 while(remaining.length){
  const candidates=remaining.map(v=>{const o={...options,mode:'direct' as const,maxLegs:1,cargo:[],shipId:v.shipId,capacity:v.capacity,originId:v.originId,budget:Math.max(0,result.remainingCash),reserveEnabled:false,allowWait:false,stockBasis:'reported' as const,reinvest:false};const calc=calculateSuite(data,o,context(o));result.examined+=calc.examined;return {v,route:[...calc.routes].sort((a,b)=>options.goal==='time'?(a.seconds??Infinity)-(b.seconds??Infinity):options.goal==='capital'?(a.purchase+a.costs)-(b.purchase+b.costs):b.profit-a.profit)[0],error:calc.error};});
  const eligible=candidates.filter((c):c is typeof c&{route:SuiteRoute}=>!!c.route&&c.route.purchase+c.route.costs<=result.remainingCash+.000001);
  eligible.sort((a,b)=>options.goal==='capital'?(a.route.purchase+a.route.costs)-(b.route.purchase+b.route.costs):options.goal==='time'?(a.route.seconds??Infinity)-(b.route.seconds??Infinity):options.goal==='roi'?(b.route.roi??-Infinity)-(a.route.roi??-Infinity):b.route.profit-a.route.profit);
  const best=eligible[0];if(!best){result.unassigned=remaining.map(v=>({uid:v.uid,reason:candidates.find(c=>c.v.uid===v.uid)?.error||'shared-budget-stock-demand-or-constraints'}));break;}
  result.routes.push({uid:best.v.uid,route:best.route});result.remainingCash=Math.round((result.remainingCash-best.route.purchase-best.route.costs)*100)/100;
  for(const leg of best.route.legs)for(const line of leg.lines){data.quotes=data.quotes.map(q=>q.commodityId!==line.commodityId?q:q.terminalId===leg.originId?{...q,stock:q.stock===null?null:Math.max(0,q.stock-line.quantity)}:q.terminalId===leg.destinationId?{...q,demand:q.demand===null?null:Math.max(0,q.demand-line.quantity)}:q);}
  remaining=remaining.filter(v=>v.uid!==best.v.uid);progress(++round,vessels.length);
 }
 return result;
}
