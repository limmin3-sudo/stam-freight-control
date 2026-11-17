import {ApprovedGlass} from './ApprovedGlass';
import {lazy,Suspense,useEffect,useState} from 'react';
import type {Locale} from './navigation';
import type {MarketSnapshot} from './trade-data';
import {loadMarket,marketWithRecentQuotes} from './market-reference';
const CrewPanel=lazy(()=>import('./CrewTradePanel'));
export default function FleetWorkspace({locale,onExit,closing}:{locale:Locale;onExit:()=>void;closing:boolean}){
 const [market,setMarket]=useState<MarketSnapshot|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let live=true;loadMarket().then(m=>live&&setMarket(marketWithRecentQuotes(m))).catch(()=>live&&setError(true));return()=>{live=false;};},[]);
 return <aside className="lobby-detail market-room trade-suite fleet-workspace" data-room="trade-operations" data-closing={closing} inert={closing} onKeyDown={e=>{if(e.key==='Escape'&&!e.defaultPrevented){e.stopPropagation();onExit();}}}>
 <header className="market-header"><div><p className="market-eyebrow">STAM / FLEET TRADE</p><h2>{locale==='en'?'Trade control · Fleet':'무역 관제실 · 함대'}</h2><p>{locale==='en'?'Follow assignments, reports and settlement within each operation.':'내 작업·함대 진행·승인·정산을 한 교역 안에서 이어갑니다.'}</p></div><button type="button" className="market-action" onClick={onExit}><ApprovedGlass kind="normal"/><span>{locale==='en'?'Lobby overview':'로비 전체 보기'}</span></button></header>
 {error?<p role="alert">{locale==='en'?'Market references could not be loaded. Reopen this screen.':'시장 자료를 불러오지 못했습니다. 다시 열어 주세요.'}</p>:<Suspense fallback={<p>…</p>}>{market?<CrewPanel locale={locale} market={market} route={null}/>:<p role="status">{locale==='en'?'Loading market references…':'시장 자료를 불러오는 중…'}</p>}</Suspense>}
 </aside>;
}
