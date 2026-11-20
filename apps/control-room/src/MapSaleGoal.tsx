import {useEffect,useMemo,useState} from 'react';
import {useTradeSuite} from './use-trade-suite';
import {expeditionSummary,remainingSaleGoal} from './trade-expedition';
import {loadMarket} from './market-reference';
import {resolveTradeTerminal} from './trade-navigation.mjs';
import {tradeLabel} from './trade-labels';
import type {MarketSnapshot} from './trade-data';
import type {Locale} from './navigation';
export function MapSaleGoal({locale,focus}:{locale:Locale;focus:(id:string)=>void}){
 const {book}=useTradeSuite(),[data,setData]=useState<MarketSnapshot|null>(null);
 const goal=useMemo(()=>{
  for(const run of book?.runs??[]){if(!run.saleGoal)continue;const s=expeditionSummary(run),g=remainingSaleGoal(run,s);
   if(g)return {...g,goods:s.holdings.find(l=>l.id===g.lotId)!.commodityId};}
  return null;
 },[book]);
 useEffect(()=>{if(!goal||data)return;let alive=true;loadMarket().then(m=>{if(alive)setData(m);}).catch(()=>{});return()=>{alive=false;};},[goal,data]);
 if(!goal)return null;
 const at=data?.terminals.find(r=>r.id===goal.terminalId),point=at&&resolveTradeTerminal(at)?.point,good=data?.commodities.find(c=>c.id===goal.goods);
 return <div className="chart-sale-goal"><strong>{locale==='en'?'Personal sale target':'개인 화물 판매 목표'}</strong><p>{good?tradeLabel(good.name,'goods',locale):'#'+goal.goods} · <span data-value="quantity">{goal.quantity} SCU</span> → <span data-value="place">{at?tradeLabel(at.name,'places',locale):'#'+goal.terminalId}</span></p>{point&&<button onClick={()=>focus(point.id)}>{locale==='en'?'Locate buyer':'지도에서 판매처 보기'}</button>}</div>;
}
