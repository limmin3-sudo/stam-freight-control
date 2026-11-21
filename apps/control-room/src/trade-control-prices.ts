import type {MarketSnapshot,Quote,Terminal} from './trade-data.ts';
import {suiteQuoteAllowed,suiteTerminalAllowed,type SuiteOptions,type RouteMetric} from './trade-suite.ts';
import type {Holding} from './trade-expedition.ts';

export type SaleAllocation={lotId:string;quantity:number;amount:number};
export type ControlPriceRow={quote:Quote;terminal:Terminal;quantity:number|null;revenue:number|null;profit:number|null;allocations:SaleAllocation[];current:boolean;metric:RouteMetric|null};
// A comparison is an observation, never a trade or a promise of live stock.
// Demand is shared between lots of the same commodity at this terminal.
export function controlPriceRows(market:MarketSnapshot,holdings:Holding[],options:SuiteOptions,position:number,commodityId:number,route:(a:Terminal,b:Terminal)=>RouteMetric|null,now=Date.now()):ControlPriceRow[]{
 const origin=market.terminals.find(t=>t.id===position);if(!origin)return [];
 const aboard=holdings.filter(l=>l.terminalId===null),selling=aboard.length>0;
 const goods=new Map(market.commodities.map(c=>[c.id,c])),terms=new Map(market.terminals.map(t=>[t.id,t]));
 const metrics=new Map<number,RouteMetric|null>();
 return market.quotes.flatMap(quote=>{
  const terminal=terms.get(quote.terminalId),good=goods.get(quote.commodityId);
  if(!terminal||!good||commodityId&&quote.commodityId!==commodityId||options.excludeCommodityIds.includes(good.id)||!suiteTerminalAllowed(terminal,options)||options.scope==='intrasystem'&&terminal.system!==origin.system)return [];
  const lots=aboard.filter(l=>l.commodityId===quote.commodityId);
  if(selling?(!lots.length||!quote.sell):(!quote.buy||terminal.id!==position))return [];
  const current=suiteQuoteAllowed(quote,market.liveVersion,options,now);
  let quantity:number|null=null,revenue:number|null=null,profit:number|null=null;
  const allocations:SaleAllocation[]=[];
  if(selling&&quote.demand!==null){
   let remaining=Math.floor(quote.demand),cost=0,known=true;quantity=0;
   for(const lot of lots){
    if(lot.ownership!=='owned'&&terminal.nqa!==true||!terminal.maxContainerScu||lot.boxSize>terminal.maxContainerScu)continue;
    const n=Math.floor(Math.min(lot.quantity,remaining)/lot.boxSize)*lot.boxSize;if(!n)continue;
    remaining-=n;quantity+=n;const amount=Math.round(quote.sell!*100)*n/100;
    allocations.push({lotId:lot.id,quantity:n,amount});
    if(lot.cost===null)known=false;else cost+=Math.round(Math.round(lot.cost*100)*n/lot.quantity)/100;
   }
   revenue=allocations.reduce((s,l)=>s+l.amount,0);profit=known?Math.round((revenue-cost)*100)/100:null;
  }
  if(!metrics.has(terminal.id))metrics.set(terminal.id,terminal.id===position?{meters:0,seconds:0,jumps:0,systems:[origin.system]}:route(origin,terminal));
  return [{quote,terminal,quantity,revenue,profit,allocations,current,metric:metrics.get(terminal.id)!}];
 });
}
