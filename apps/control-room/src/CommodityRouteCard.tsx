import { useState } from 'react';
import type { MarketSnapshot } from './trade-data';
import type { Observation } from './trade-field';
import type { SuiteOptions, SuiteRoute, TradeLine } from './trade-suite';

export type MarketHandoff=(route:SuiteRoute,options:SuiteOptions,start:boolean)=>Promise<void>;

export default function CommodityRouteCard({route,options,data,place,goods,reports,scenario,onHandoff,en}:{
  route:SuiteRoute;options:SuiteOptions;data:MarketSnapshot;place:(id:number)=>string;goods:(id:number)=>string;
  reports:Observation[];scenario:boolean;onHandoff?:MarketHandoff;en:boolean;
}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const t=(ko:string,english:string)=>en?english:ko;
  const fmt=(n:number)=>n.toLocaleString(en?'en-US':'ko-KR',{maximumFractionDigits:2});
  const first=route.legs[0]!, origin=first.originId, item=first.lines[0]!;
  const legs=route.legs, qty=legs.reduce((sum,leg)=>sum+leg.lines.reduce((n,l)=>n+l.quantity,0),0);
  const limit:Record<NonNullable<TradeLine['quantityLimit']>,string>={capacity:t('함선 적재량','Ship capacity'),packing:t('상자 규격·배치','Box size and fit'),stock:t('구매소 재고','Purchase stock'),demand:t('판매소 수요','Buyer demand'),capital:t('투자 자금','Trading budget')};
  function evidence(id:number,side:'buy'|'sell'){
    const quote=data.quotes.find(q=>q.terminalId===id&&q.commodityId===item.commodityId);
    const report=reports.find(r=>r.terminalId===id&&r.commodityId===item.commodityId&&r.side===side);
    const volume=side==='buy'?quote?.stock:quote?.demand;
    const date=(v:string|number)=>new Date(v).toLocaleString(en?'en-GB':'ko-KR');
    return <div><small>UEX {side==='buy'?t('재고','stock'):t('수요','demand')} {volume==null?'—':fmt(volume)+' SCU'}{quote?.updatedAt?' · '+date(quote.updatedAt):''}</small>
      {report&&<small>{t('함대 실거래','Pilot fill')} · {t('시도','Attempted')} {fmt(report.attempted)} / {t('체결','filled')} {fmt(report.filled)} SCU · {report.waited?t('대기 후','after waiting'):t('즉시','immediate')} · {date(report.at)}</small>}</div>;
  }
  async function handoff(start:boolean){
    if(!onHandoff||busy)return;
    setBusy(true);setMessage('');
    try{
      await onHandoff(route,{...options,originId:origin,destinationId:route.splitSale?0:first.destinationId,
        scope:legs.some(l=>new Set(l.systems).size>1)?'interstellar':'intrasystem'},start);
      setMessage(t('연결된 네비게이터의 무역 모드에서 ‘무역 시작’을 누르세요.','Press Start trade in the connected Navigator’s trade mode.'));
    }catch(e){
      const active=e instanceof Error&&['active','legacyActive'].includes(e.message);
      setMessage(active?t('진행 중인 무역을 마감한 뒤 다시 선택하세요.','Finish the active trade before selecting another.'):t('경로를 인계하지 못했습니다. 장부 상태를 확인하고 다시 시도하세요.','Could not hand over this route. Check the ledger and retry.'));
    }finally{setBusy(false);}
  }
  return <article className="suite-card">
    <h4>{route.splitSale?t('두 곳 분할 판매','Sell at two terminals'):t('한 곳 판매','Sell at one terminal')}</h4>
    <strong>{t('예상 차익','Expected profit')} +{fmt(route.profit)} aUEC</strong>
    <p>{goods(item.commodityId)} · {fmt(qty)} SCU · {t('매입금','Purchase cost')} {fmt(route.purchase)} aUEC</p>
    <ol><li>{place(origin)} · {t('구매','Buy')} {fmt(qty)} SCU × {fmt(item.buy)} aUEC{evidence(origin,'buy')}</li>
      {legs.map(leg=><li key={leg.destinationId}>{place(leg.destinationId)} · {t('판매','Sell')} {leg.lines.map(l=>fmt(l.quantity)+' SCU × '+fmt(l.sell)+' aUEC').join(' + ')}
        {' · '}{t('단위 차익','Unit margin')} +{fmt(leg.lines[0]!.sell-item.buy)} aUEC/SCU{evidence(leg.destinationId,'sell')}</li>)}</ol>
    {item.quantityLimit&&<small>{t('수량 제한','Quantity limited by')} · {limit[item.quantityLimit]}</small>}
    {scenario&&<small>{t('함대 제보를 적용한 예상 물량','Volumes estimated from pilot fills')}</small>}
    {onHandoff&&<div className="suite-actions"><button disabled={busy} onClick={()=>handoff(false)}>{t('네비게이터로 보내기','Send to Navigator')}</button>
      <button disabled={busy} onClick={()=>handoff(true)}>{t('웹에서 무역 시작','Start trade on web')}</button></div>}
    {message&&<p role="status">{message}</p>}
  </article>;
}
