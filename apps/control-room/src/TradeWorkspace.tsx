import {ApprovedGlass} from './ApprovedGlass';
import {useTradeCloud} from './use-trade-cloud';
import {lazy,Suspense,useState} from 'react';
import type {Locale} from './navigation';
import type {TradeScope} from './trade-planning';
import type {LobbyRoom} from './space-navigation';
import {TradeError,tradeSummary,type TradePlan} from './trade-operations';
import {readyTradeOwner} from './trade-storage';
import {expeditionSummary,validateSuiteBook} from './trade-expedition';
import {suiteBookKey} from './use-trade-suite';
import {useTradeBook} from './use-trade-book';
const TradeSuite=lazy(()=>import('./TradeSuite'));
const TradePlanning=lazy(()=>import('./TradePlanning'));
const TradeOperations=lazy(()=>import('./TradeOperations'));
export default function TradeWorkspace({locale,room,scope,initialShip,onRoom,onExit,closing}:{locale:Locale;room:'planning'|'trade-operations';scope:TradeScope;initialShip?:string;onRoom:(room?:LobbyRoom,scope?:TradeScope)=>void;onExit:()=>void;closing:boolean}){
 const store=useTradeBook(),cloud=useTradeCloud();const [legacy,setLegacy]=useState(false);
 const planScope=store.book?.runs.find(r=>tradeSummary(r).status==='active')?.plan.inputs.scope??store.book?.runs.at(-1)?.plan.inputs.scope??scope;
 const handover=async(plan:TradePlan)=>{if(!store.book)throw new TradeError(store.error||'storage');const owner=readyTradeOwner(),raw=localStorage.getItem(suiteBookKey(owner));if(raw&&validateSuiteBook(JSON.parse(raw),owner).runs.some(r=>expeditionSummary(r).status==='active'))throw new TradeError('active');await store.dispatch({kind:'start',plan,id:crypto.randomUUID()});onRoom('trade-operations');};
 return <>{legacy&&<button className="suite-return market-action" onClick={()=>setLegacy(false)}><ApprovedGlass/>{locale==='en'?'Expanded trade workspace':'통합 교역 화면'}</button>}<Suspense fallback={<aside className="lobby-loading-panel"><p role="status">{locale==='en'?'Opening trade workspace…':'교역 화면을 열고 있습니다…'}</p></aside>}>{!legacy?<TradeSuite cloud={cloud} locale={locale} room={room} scope={scope} initialShip={initialShip} onRoom={onRoom} onScope={s=>onRoom('planning',s)} onExit={onExit} closing={closing} onLegacy={()=>{setLegacy(true);onRoom('trade-operations');}} legacyActive={!!store.book?.runs.some(r=>tradeSummary(r).status==='active')}/>:room==='planning'?<TradePlanning cloud={cloud} locale={locale} scope={scope} initialShip={initialShip} onScope={s=>onRoom('planning',s)} onExit={onExit} closing={closing} onStart={handover} onOperations={()=>onRoom('trade-operations')}/>:<TradeOperations cloud={cloud} key={store.owner} locale={locale} store={store} onPlanning={()=>onRoom('planning',planScope)} onExit={onExit} closing={closing}/>}</Suspense></>;
}
