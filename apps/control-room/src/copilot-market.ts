import {suiteTerminalAllowed} from './trade-suite.ts';
import {freshReports,type Observation} from './trade-field.ts';
import {remainingSaleGoal,type Expedition,type ExpeditionSummary} from './trade-expedition.ts';
import {tradeNextStep} from './trade-workflow.ts';
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

export function remainingBuyers(data:MarketSnapshot,run:Expedition,state:ExpeditionSummary,lot:{commodityId:number;qty:number;box:number},reports:Observation[],now=Date.now()){
 const step=tradeNextStep(run,state);
 const planned=new Set(step.aligned?run.route.legs.slice(step.index).map(l=>l.destinationId):[]);
 const goal=remainingSaleGoal(run,state);
 if(goal)planned.add(goal.terminalId);
 const recent=freshReports(reports,data.liveVersion,now).filter(r=>r.side==='sell'&&r.commodityId===lot.commodityId);
 const terminals=new Map(data.terminals.map(t=>[t.id,t]));
 const offers=data.quotes.flatMap(q=>{
  if(q.commodityId!==lot.commodityId||!q.sell||!q.demand||quoteFreshness(q,data.liveVersion,now)!=='current')return [];
  const terminal=terminals.get(q.terminalId);
  if(!terminal||!suiteTerminalAllowed(terminal,run.options)||terminal.maxContainerScu!==null&&terminal.maxContainerScu<lot.box)return [];
  const fill=Math.floor(Math.min(lot.qty,q.demand)/lot.box)*lot.box;
  if(fill<=0)return [];
  const here=q.terminalId===state.position;
  return [{terminalId:q.terminalId,fill,demand:q.demand,price:q.sell,here,extra:here||planned.has(q.terminalId)?0:1,report:recent.find(r=>r.terminalId===q.terminalId)}];
 }).sort((a,b)=>Number(b.here)-Number(a.here)||b.fill*b.price-a.fill*a.price||a.extra-b.extra);
 return offers.slice(0,8);
}
export function remainingBuyerLabel(offer:ReturnType<typeof remainingBuyers>[number],place:string,en:boolean){
 const {here,fill,demand,price,extra,report}=offer;
 return [place.slice(0,40),here?(en?'Here':'현재 위치'):(en?'Extra stops +':'추가 방문 +')+extra,
  (en?'Can sell ':'판매 가능 ')+fill+' SCU × '+price.toLocaleString()+' aUEC',
  (en?'UEX demand ':'UEX 수요 ')+demand+' SCU',
  report?(en?'Pilot fill ':'실판매 제보 ')+report.filled+'/'+report.attempted+' SCU':(en?'No pilot report':'실판매 제보 없음')].join(' · ');
}
