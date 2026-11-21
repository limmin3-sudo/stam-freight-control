import CompanionDisplay from './CompanionDisplay';
import TradeMarketBoard,{type PlanFromQuote} from './TradeMarketBoard';
import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import type {Locale} from './navigation';
import {ApprovedGlass} from './ApprovedGlass';
import {loadMarket,refreshCommodity,marketWithRecentQuotes} from './market-reference';
import {quoteFreshness,type MarketSnapshot,type Quote,type Freshness} from './trade-data';
import './market-information.css';
import './trade-suite.css';
import {useTradeSuite} from './use-trade-suite';
const TradeBoard=lazy(()=>import('./TradeBoard'));
const PriceDesk=lazy(()=>import('./TradePriceDesk'));
import {matchingCommodityCodes,commodityCodeVariants,commoditySearchTerms,tradeMatches,tradeLabel} from './trade-labels';
const statusNames:Record<Freshness,[string,string]>={current:['24시간 내 수정','Updated within 24h'],'old-patch':['이전 패치 자료','Older patch'],stale:['24시간 이상 경과','Over 24h old'],unknown:['버전·시점 미확인','Version/date unknown']};
export default function MarketInformation({locale,onExit,closing,onPlan}:{locale:Locale;onExit:()=>void;closing:boolean;onPlan?:PlanFromQuote}){
 const suiteStore=useTradeSuite();const en=locale==='en',t=(ko:string,english:string)=>en?english:ko;
 const [data,setData]=useState<MarketSnapshot|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 const [tab,setTab]=useState<'search'|'prices'|'terminals'|'tools'|'sources'|'board'>('search'),[query,setQuery]=useState(''),[selected,setSelected]=useState<number|null>(null),[system,setSystem]=useState(''),[freshOnly,setFreshOnly]=useState(false);
 const [live,setLive]=useState<{id:number;quotes:Quote[];checkedAt:string}|null>(null),[updating,setUpdating]=useState(false),[refreshFailed,setRefreshFailed]=useState(false),[refreshTick,setRefreshTick]=useState(0);
 const title=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{title.current?.focus({preventScroll:true});},[]);
 useEffect(()=>{let active=true;setError(false);loadMarket().then(d=>{if(active)setData(d);}).catch(()=>{if(active)setError(true);});
  return()=>{active=false;};
 },[retry]);
 const label=(name:string,kind:'goods'|'places'='places')=>tradeLabel(name,kind,locale);
 const variants=useMemo(()=>commodityCodeVariants(data?.commodities??[]),[data?.commodities]);
 const commodities=useMemo(()=>{
  if(!data) return [];
  const codes=matchingCommodityCodes(query,data.commodities,variants);
  return data.commodities.filter(c=>codes.size?codes.has(c.id):tradeMatches(query,commoditySearchTerms(c))).sort((a,b)=>a.name.localeCompare(b.name));
 },[data,query,variants]);
 const pricedIds=useMemo(()=>new Set(data?.quotes.map(q=>q.commodityId)??[]),[data]);
 const item=commodities.find(c=>c.id===selected)??commodities.find(c=>pricedIds.has(c.id))??commodities[0];
 useEffect(()=>{let active=true;setRefreshFailed(false);setLive(previous=>previous?.id===item?.id?previous:null);if(tab!=='prices'||!data||!item){setUpdating(false);return;}
  setUpdating(true);refreshCommodity(data,item.id,refreshTick>0).then(result=>{if(active)setLive({id:item.id,...result});}).catch(()=>{if(active)setRefreshFailed(true);}).finally(()=>{if(active)setUpdating(false);});return()=>{active=false;};
 },[data,item?.id,refreshTick,tab]);
 const boardData=useMemo(()=>data&&tab==='search'?marketWithRecentQuotes(data):data,[data,tab,live]);
 const termMap=useMemo(()=>new Map(data?.terminals.map(term=>[term.id,term])??[]),[data]);
 const quotes=(item?(live?.id===item.id?live.quotes:data?.quotes.filter(q=>q.commodityId===item.id)??[]):[]).filter(q=>(!system||termMap.get(q.terminalId)?.system===system)&&(!freshOnly||quoteFreshness(q,data!.liveVersion)==='current')).sort((a,b)=>(termMap.get(a.terminalId)?.name||'').localeCompare(termMap.get(b.terminalId)?.name||''));
 const terminals=data?.terminals.filter(term=>(!system||term.system===system)&&tradeMatches(query,[],[term.name,term.location,term.planet,term.system]))??[];
 const date=(v:string|null)=>v?new Intl.DateTimeFormat(en?'en-GB':'ko-KR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):t('미확인','Unknown');
 const price=(v:number|null)=>v===null?'—':v.toLocaleString(en?'en-US':'ko-KR',{maximumFractionDigits:2});
 const yn=(v:boolean|null)=>v===null?t('미확인','Unknown'):v?t('있음','Yes'):t('없음','No');
 return <aside className="lobby-detail market-room" data-closing={closing} inert={closing} aria-label={t('무역관제실','Trade control')}>
  <header className="market-header market-entry-header">
    <h2 ref={title} tabIndex={-1}>{t('무역관제실','Trade control')}</h2>
    <nav className="market-entry-nav" aria-label={t('무역관제실 보기','Trade views')}>
      <button aria-pressed={tab==='search'} onClick={()=>setTab('search')}>{t('시세표','Price board')}</button>
      {(tab!=='search'||!boardData)&&onPlan&&<button onClick={()=>onPlan(0,0)}>{t('내 함선·자금으로 거래 찾기','Find trades for my ship and budget')}</button>}
      <details className="board-reference"><summary>{t('시장 자료','Market research')}</summary>
        <nav className="market-tabs" aria-label={t('시장 자료','Market reference')}>{(['prices','terminals','tools','board','sources'] as const).map((value,i)=><button key={value} aria-pressed={tab===value} onClick={event=>{setTab(value);setQuery('');event.currentTarget.closest('details')?.removeAttribute('open');}}><ApprovedGlass kind={tab===value?'gold':'normal'}/><span>{[t('거래소별 시세','Terminal prices'),t('거점·적재 조건','Locations & cargo'),t('시세 기록·관심 가격','Reports & price watches'),t('매입·판매 게시판','Buy / sell board'),t('출처·검증','Sources & checks')][i]}</span></button>)}</nav>
      </details>
    </nav>
    <button className="lobby-reset" onClick={onExit}>{t('로비로','Lobby')}</button>
  </header>
  {error?<div role="alert"><p>{t('시장 자료를 불러오지 못했습니다.','Market reference could not be loaded.')}</p><button className="market-action" onClick={()=>setRetry(n=>n+1)}><ApprovedGlass/><span>{t('다시 불러오기','Retry')}</span></button></div>:!data?<p role="status">{t('시장 자료를 불러오고 있습니다…','Loading market reference…')}</p>:<>
   {tab!=='search'&&<div className="market-meta"><span>UEX · LIVE {data.liveVersion}</span><span>{t('전체 자료 수집','Snapshot collected')} {date(data.retrievedAt)}</span><span>{data.commodities.length} {t('품목','commodities')} · {data.terminals.length} {t('거래소','terminals')}</span></div>}
   <CompanionDisplay market={boardData} locale={locale} summary={{mode:'personal',title:t('무역 시세','Market prices'),lines:[t('품목 이름과 매입가 또는 판매가를 물어보세요.','Ask for the buy or sell price of a commodity.')]}} onCommand={command=>{if(command==='open-flight')window.location.hash='#/mission?lang='+locale;else if(command==='open-trade'||command==='show-my-work')window.location.hash='#/division?facility=trade&room=trade-operations&lang='+locale;else setTab('search');}}/>
   {tab==='search'&&boardData&&<TradeMarketBoard data={boardData} locale={locale} onPlan={onPlan} onDetails={id=>{setQuery('');setSelected(id);setSystem('');setTab('prices');}}/>}
   {(tab==='prices'||tab==='terminals')&&<div className="market-filters"><label>{t('검색','Search')}<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={tab==='prices'?t('품목명 또는 UEX 약자','Commodity name or UEX code'):t('거점·행성 이름','Location or planet')}/></label><label>{t('행성계','Star system')}<select value={system} onChange={e=>setSystem(e.target.value)}><option value="">{t('전체','All')}</option>{[...new Set(data.terminals.map(r=>r.system))].filter(Boolean).sort().map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label></div>}
   {tab==='board'&&<Suspense fallback={<p>…</p>}><TradeBoard market={data} locale={locale}/></Suspense>}{tab==='prices'&&<><p className="market-note">{t('합법성은 UEX 분류로, 관할·화물 소유권에 따라 달라질 수 있습니다.','Legality uses UEX classification; jurisdiction and cargo ownership may differ.')}</p><div className="market-layout"><nav className="market-commodities" aria-label={t('품목 선택','Select commodity')}><p>{commodities.length} {t('품목','commodities')}</p>{commodities.map(c=><button key={c.id} aria-pressed={item?.id===c.id} onClick={()=>setSelected(c.id)}>{en?(c.code||c.name):tradeLabel(c.name,'goods','ko')}{en&&variants.get(c.id)&&' · '+variants.get(c.id)} {locale!=='en'&&c.code&&<small className="board-code">{c.code}</small>}</button>)}</nav><section className="market-results">
    {!item?<p>{t('조건에 맞는 품목이 없습니다.','No commodities match your filters.')}</p>:<><div className="market-result-heading"><h3>{tradeLabel(item.name,'goods',en?'en':'ko')} {item.code&&<small className="board-code">{item.code}</small>}</h3><button className="market-action" disabled={updating} onClick={()=>setRefreshTick(n=>n+1)}><ApprovedGlass/><span>{updating?t('시세 확인 중…','Checking prices…'):t('시세 다시 확인','Refresh prices')}</span></button></div>
     <p role="status">{refreshFailed?t('외부 시세를 확인하지 못해 저장된 자료를 표시합니다.','Live lookup failed; showing the saved reference.'):live?.id===item.id?t('선택 품목 조회','Selected commodity fetched')+' '+date(live.checkedAt):t('저장된 시세 자료','Saved price reference')}</p>
     {!!item.hazards.length&&<p className="market-warning">{t('주의 특성','Handling flags')}: {item.hazards.map(h=>({is_volatile_qt:t('퀀텀 중 불안정','Quantum instability'),is_volatile_time:t('시간 경과 불안정','Time instability'),is_explosive:t('폭발성','Explosive'),is_buggy:t('자료상 문제 보고','Reported issues')}[h]||h)).join(' · ')}</p>}
     <label className="market-check"><input type="checkbox" checked={freshOnly} onChange={e=>setFreshOnly(e.target.checked)}/>{t('현재 패치 · 24시간 내 수정 자료만','Current patch · updated within 24h only')}</label>
     <p className="market-note">{t('내가 구매 / 판매하는 가격 · aUEC/SCU. — 는 가격 미확인·거래 불가입니다. 수정일은 게임 내 실측 시각과 다를 수 있습니다.','Your buy / sell price · aUEC/SCU. — means unknown/unavailable. Record modification time may differ from observation time.')}</p>
     <div className="market-table"><table><thead><tr>{[t('거래소','Terminal'),t('구매','Buy'),t('판매','Sell'),t('출처 상태','Source status')].map(v=><th key={v}>{v}</th>)}</tr></thead><tbody>{quotes.map(q=>{const term=termMap.get(q.terminalId)!;const freshness=quoteFreshness(q,data.liveVersion);return <tr key={q.id}><th scope="row">{label(term.location)||term.name}<small>{term.name} · {label(term.system)}</small><small>{t('보고 공급 / 수요','Reported supply / demand')} {price(q.stock)} / {price(q.demand)} SCU</small></th><td>{price(q.buy)}{onPlan&&q.buy!==null&&<button className="market-action" onClick={()=>onPlan(q.terminalId,q.commodityId)}><ApprovedGlass/>{t('무역 계획','Plan trade')}</button>}</td><td>{price(q.sell)}</td><td><span className="market-status" data-status={freshness}>{statusNames[freshness][en?1:0]}</span><small>{q.version||t('버전 미확인','Unknown patch')} · {date(q.updatedAt)}</small></td></tr>;})}</tbody></table></div>{!quotes.length&&<p>{t('조건에 맞는 시세 기록이 없습니다. 다른 패치나 미확인 가격을 최신으로 대신 표시하지 않습니다.','No matching price records. Older or unknown prices are not substituted as current.')}</p>}
    </>}
   </section></div></>}
   {tab==='terminals'&&<><p className="market-note">{t('거점의 설비와 최대 상자 자료입니다. 함선의 출입·도킹·적재 가능 여부를 보장하지 않으며, 0·미확인을 가능으로 추정하지 않습니다.','Facility and maximum-container references do not guarantee ship access, docking or cargo compatibility. Unknown values remain unknown.')}</p><div className="market-terminal-grid">{terminals.map(term=><article key={term.id}><h3>{label(term.location)||term.name}</h3><p>{term.name}</p><p>{label(term.system)} · {label(term.planet)}</p><dl><div><dt>{t('최대 상자','Max container')}</dt><dd>{term.maxContainerScu?term.maxContainerScu+' SCU':t('미확인','Unknown')}</dd></div><div><dt>{t('화물 엘리베이터','Freight elevator')}</dt><dd>{yn(term.elevator)}</dd></div><div><dt>{t('도킹 포트','Docking port')}</dt><dd>{yn(term.docking)}</dd></div><div><dt>{t('자동 적재','Automatic loading')}</dt><dd>{yn(term.autoLoad)}</dd></div></dl><small>UEX · {term.version||t('버전 미확인','Unknown patch')} · {date(term.updatedAt)}</small></article>)}</div>{!terminals.length&&<p>{t('검색 결과가 없습니다.','No results.')}</p>}</>}
   {tab==='tools'&&<div className="trade-suite"><Suspense fallback={<p>…</p>}><PriceDesk data={data} locale={locale} store={suiteStore} onData={setData} onPlan={onPlan}/></Suspense></div>}{tab==='sources'&&<div className="market-source-list"><h3>{t('시세를 읽는 기준','Reading the evidence')}</h3><p>{t('UEX 커뮤니티 보고 자료입니다. 게임 서버별 실제 재고·판매 가능량·수익을 보장하지 않습니다. 가격 조회가 실패하면 마지막 자료와 날짜를 유지합니다.','UEX community reports do not guarantee server inventory, demand or profit. Failed requests retain the last reference and its dates.')}</p><p>{t('수집 시각과 각 가격 기록의 수정 시각을 따로 표시합니다. 이전 패치와 24시간 이상 지난 자료는 별도로 표시하며, 현재 패치 필터로 제외할 수 있습니다.','Collection time and record modification time are shown separately. Older patches and records over 24 hours old are marked and can be excluded.')}</p><dl><div><dt>{t('수집 거래소','Terminals queried')}</dt><dd>{data.coverage.queriedTerminals}</dd></div><div><dt>{t('유효 가격 기록','Joined price records')}</dt><dd>{data.quotes.length}</dd></div><div><dt>{t('비공개·비활성 품목 등 제외','Excluded reference rows')}</dt><dd>{data.coverage.excludedQuotes}</dd></div></dl><a href="https://uexcorp.space/api/documentation/" target="_blank" rel="noreferrer">UEX API ↗</a><a href="https://uexcorp.space/api/documentation/id/get_commodities_prices/" target="_blank" rel="noreferrer">{t('시세와 단위 정의','Price and unit definitions')} ↗</a><a href="https://uexcorp.space/api/documentation/id/get_terminals/" target="_blank" rel="noreferrer">{t('거래소 설비 정의','Terminal facility definitions')} ↗</a><p>{t('SC Trade Tools와 Gallog는 참고 출처로 조사했으며 이 화면의 시세에 합쳐 넣지 않았습니다. 사용자 조건을 반영한 경로 추천·실제 거래 기록은 무역 계획·관제 기능에서 별도로 연결합니다.','SC Trade Tools and Gallog were researched, but their prices are not merged here. Personalized route planning and executed trades belong to the separate planning and operations features.')}</p></div>}
  </>}
 </aside>;
}
