import type {MarketSnapshot} from './trade-data';
import {quoteFreshness} from './trade-data';
import {tradeLabel} from './trade-labels';

export function priceAnswer(market:MarketSnapshot|null,side:'buy'|'sell',id:number,en:boolean,quantity?:number){
  const good=market?.commodities.find(item=>item.id===id);
  if(!market||!good)return en?'There is no quote for that item.':'그 품목의 시세 자료가 없습니다.';
  const buy=side==='buy',locale=en?'en':'ko';
  const name=tradeLabel(good.name,'goods',locale);
  const quotes=market.quotes.filter(q=>q.commodityId===id&&(q[side]??0)>0&&
    (buy?(q.stock??0)>0:(q.demand??0)>0)&&quoteFreshness(q,market.liveVersion)==='current');
  const sorted=quotes.sort((a,b)=>(buy?1:-1)*(a[side]!-b[side]!)||Date.parse(b.updatedAt!)-Date.parse(a.updatedAt!));
  const available=(q:typeof quotes[number])=>(buy?q.stock:q.demand)??0;
  const full=quantity?sorted.find(q=>available(q)>=quantity):sorted[0];
  const best=full??sorted[0];
  if(!best)return en?'No current quote with reported '+(buy?'stock':'demand')+' for '+name+'.':name+'의 최근 24시간 이내 '+(buy?'재고가 있는 매입가':'수요가 있는 판매가')+' 보고가 없습니다.';
  const terminal=market.terminals.find(t=>t.id===best.terminalId);
  const place=terminal?tradeLabel(terminal.name,'places',locale):String(best.terminalId);
  const price=best[side]!.toLocaleString(locale,{maximumFractionDigits:2});
  const when=new Intl.DateTimeFormat(en?'en-GB':'ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(best.updatedAt!));
  if(quantity){
    const fill=Math.min(quantity,available(best));
    const total=(fill*best[side]!).toLocaleString(locale,{maximumFractionDigits:2});
    if(!full)return en?'No reported terminal covers all '+quantity+' SCU. At '+place+', '+fill+' SCU of '+name+' at '+price+' aUEC per SCU totals '+total+' aUEC. Reported '+when+'.':
      name+' '+quantity+' SCU 전량을 '+(buy?'살':'팔')+' 수 있는 보고가 없습니다. '+place+'에서 '+fill+' SCU까지, 단가 '+price+' aUEC입니다. 예상 총액은 '+total+' aUEC입니다. '+when+' 보고입니다.';
    return en?place+' reported '+name+' available to '+side+' for '+price+' aUEC per SCU. '+quantity+' SCU totals '+total+' aUEC. Reported '+when+'.':
      place+'에서 '+name+' '+quantity+' SCU 전량을 '+(buy?'살':'팔')+' 수 있습니다. 1 SCU당 '+price+' aUEC, 예상 총액은 '+total+' aUEC입니다. '+when+' 보고입니다.';
  }
  return en?name+' was reported at '+place+' for '+price+' aUEC per SCU to '+side+'. Updated '+when+'.':
    place+'에서 '+name+' 1 SCU를 '+price+' aUEC에 '+(buy?'살 수 있습니다.':'팔 수 있습니다.')+' '+when+' 보고입니다.';
}
