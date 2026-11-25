import type { Expedition, ExpeditionSummary } from './trade-expedition.ts';
import { remainingSaleGoal } from './trade-expedition.ts';
import { tradeNextStep } from './trade-workflow.ts';

// The ledger owns quantities. Route prices are estimates saved when the plan was made.
export function tradeCompanion(run: Expedition, state: ExpeditionSummary, place: (id:number)=>string, goods: (id:number)=>string, en: boolean) {
  const t=(ko:string,english:string)=>en?english:ko;
  const format=(n:number)=>n.toLocaleString(en?'en-US':'ko-KR',{maximumFractionDigits:2});
  const step=tradeNextStep(run,state);
  const events=run.events.filter(e=>!e.voidedAt);
  const arrival=events.map(e=>e.kind).lastIndexOf('arrive');
  const newLots=new Set(events.slice(arrival+1).filter(e=>e.kind==='buy'||e.kind==='cargo').map(e=>e.lotId));
  const aboard=state.holdings.filter(l=>l.terminalId===null);
  const previous=step.aligned&&step.index>0?run.route.legs[step.index-1]:undefined;
  const current=step.aligned?step.leg:undefined;
  const goal=remainingSaleGoal(run,state);
  const firstSplit=run.route.splitSale && step.aligned && step.index===1 && previous?.destinationId===state.position;
  const plannedSale=run.route.splitSale&&previous?.destinationId===state.position?previous.lines[0]:undefined;
  const sourceLots=new Set(plannedSale?events.filter(e=>e.commodityId===plannedSale.commodityId&&(e.kind==='buy'||e.kind==='cargo')).map(e=>e.lotId):[]);
  const soldHere=plannedSale?events.slice(arrival+1).reduce((n,e)=>n+(e.kind==='sell'&&sourceLots.has(e.lotId)?e.quantity??0:0),0):0;
  const remainingQuota=Math.max(0,(plannedSale?.quantity??0)-soldHere);
  const arrivedToSell=(!firstSplit||soldHere===0)&&state.target===null&&previous?.destinationId===state.position&&aboard.some(l=>
    !newLots.has(l.id)&&previous.lines.some(line=>line.commodityId===l.commodityId));
  const saleLeg=arrivedToSell?previous:current;
  const goalLot=goal&&aboard.find(l=>l.id===goal.lotId);
  const cargo=new Map<number,number>();
  for(const lot of aboard)cargo.set(lot.commodityId,(cargo.get(lot.commodityId)??0)+lot.quantity);
  const aboardRows=[...cargo].map(([id,qty])=>t('선내','Aboard')+' · '+goods(id)+' '+format(qty)+' SCU');
  const loadedForLeg=!!current?.lines.some(line=>cargo.has(line.commodityId));
  const buying=!goal&&!state.target&&!arrivedToSell&&!loadedForLeg&&step.purchases.some(p=>p.remaining>0);
  const stop=state.target??goal?.terminalId??(buying||arrivedToSell?state.position:current?.destinationId);
  const destination=stop?place(stop):'';
  const purchaseRows=step.purchases.filter(p=>p.remaining>0).map(p=>t('남은 매입','Buy remaining')+' · '+goods(p.commodityId)+' '+format(p.remaining)+' SCU · '+format(p.amount/p.remaining)+' aUEC/SCU');
  const saleRows:string[]=[];
  if(goal&&goalLot&&stop===goal.terminalId)saleRows.push(t('판매 목표','Sale target')+' · '+goods(goalLot.commodityId)+' '+format(goal.quantity)+' SCU');
  if(!buying&&stop&&saleLeg?.destinationId===stop){
    for(const line of saleLeg.lines){
      if(!cargo.has(line.commodityId)||(goalLot&&line.commodityId!==goalLot.commodityId))continue;
      const price=t('예상 판매가','Planned sale price')+' · '+goods(line.commodityId)+' '+format(line.sell)+' aUEC/SCU';
      if(!saleRows.includes(price))saleRows.push(price);
    }
  }
  if(run.route.splitSale && !goal && !buying && saleLeg && stop===saleLeg.destinationId){
    const line=saleLeg.lines[0]!;
    const quota=arrivedToSell?remainingQuota:line.quantity;
    if(quota>0)saleRows.unshift(t('예정 판매','Planned sale')+' · '+format(Math.min(cargo.get(line.commodityId)??0,quota))+' SCU');
  }
  const selling=!!stop&&(!!goal&&goal.terminalId===stop||saleRows.length>0);
  const stage=buying?t('구매소','Buy at'):selling?t('판매소','Sell at'):stop?t('이동','Travel to'):
    step.complete?t('경로 도착','Route complete'):t('경로 재확인','Review route');
  const heading=destination?stage+' · '+destination:stage;
  const rows=buying?[...purchaseRows,...aboardRows]:[...aboardRows,...saleRows,...purchaseRows];
  const lines=rows.length?[...rows]:[heading];
  if(lines.length>6)lines.splice(5,lines.length-5,t('추가 항목','More entries')+' '+(lines.length-5));
  const buyer=state.target??goal?.terminalId??(arrivedToSell?state.position:current?.destinationId);
  const compact=(value:string)=>value.slice(0,220);
  const purchases=step.purchases.filter(p=>p.remaining>0).map(p=>({commodityId:p.commodityId,lotId:'',label:goods(p.commodityId),qty:p.remaining,box:p.boxSize}));
  const holdings=aboard.map(l=>({commodityId:l.commodityId,lotId:l.id,label:goods(l.commodityId),qty:l.quantity,box:l.boxSize}));
  const suggestion=!goal&&arrivedToSell?plannedSale:undefined;
  let left=remainingQuota;
  const sales=holdings.map(row=>{
    if(!suggestion||row.commodityId!==suggestion.commodityId||left<row.box)return row;
    const suggested=Math.min(row.qty,Math.floor(left/row.box)*row.box);
    left-=suggested;return {...row,suggested};
  });
  const action=state.target?'arrive':buying?'buy':stop&&stop!==state.position?'depart':holdings.length?'sell':'';
  return {control:{action,buyer,purchases,holdings:sales},mode:'personal' as const,title:t('개인 무역','Personal trade'),lines,
    guidance:{destination:compact(destination?heading:''),task:compact([heading,rows[0]].filter(Boolean).join(' · ')),
      load:compact((buying?purchaseRows:aboardRows).join(' / ')||t('선내 화물 없음','No cargo aboard')),
      afterLoad:buyer?place(buyer):destination,cash:format(state.cash)+' aUEC',profit:t('실현 손익','Realized P/L')+' '+format(state.realized)+' aUEC'}};
}
