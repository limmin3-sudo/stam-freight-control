import {quoteFreshness,type MarketSnapshot} from './trade-data.ts';
import {resolveTradeTerminal} from './trade-navigation.mjs';
export function saleOffers(market:MarketSnapshot,commodityId:number,amount:number,stops:ReadonlySet<string>,now=Date.now()){
 const rows=market.quotes.flatMap(q=>{
  if(q.commodityId!==commodityId||!q.sell||!q.demand||quoteFreshness(q,market.liveVersion,now)!=='current')return [];
  const terminal=market.terminals.find(t=>t.id===q.terminalId);if(!terminal)return [];
  const point=resolveTradeTerminal(terminal)?.point;
  return [{terminal,price:q.sell,fill:Math.min(amount,q.demand),onRoute:!!point&&stops.has(point.id),reported:q.updatedAt!}];
 }).sort((a,b)=>b.fill*b.price-a.fill*a.price||Date.parse(b.reported)-Date.parse(a.reported));
 return [rows.find(r=>r.onRoute&&r.fill===amount),rows.find(r=>!r.onRoute&&r.fill===amount),rows.find(r=>r.fill<amount)].filter(r=>r!==undefined);
}
