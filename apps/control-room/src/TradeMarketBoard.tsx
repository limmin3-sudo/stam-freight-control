import {useEffect, useMemo, useRef, useState} from 'react';
import type {Locale} from './navigation';
import {quoteFreshness, type Commodity, type MarketSnapshot, type Quote, type Terminal} from './trade-data';
import {matchingCommodityCodes, commodityCodeVariants, commoditySearchTerms,tradeLabel, tradeMatches} from './trade-labels';
import {useTradeView} from './use-trade-view';
import {defaultSuiteOptions,suiteTerminalIssue,terminalIssueLabel,suiteQuoteAllowed,type SuiteOptions} from './trade-suite';
import './trade-market-board.css';
import {NewsList,useTradeNews} from './TradeFieldReports';
import type {MarketHandoff} from './CommodityRouteCard';
import QuickTrade from './QuickTrade';

export type PlanFromQuote = (origin:number, commodity:number, destination?:number, scope?:SuiteOptions['scope'], quick?:SuiteOptions)=>void;
const metrics=['buy','sell','roi','spread'] as const;
type Metric=typeof metrics[number];
const compactPrice=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1});
type Side = {quote:Quote; terminal:Terminal};
type Pair = {item:Commodity; buy:Side; sell:Side; spread:number};

type TickerEntry={item:Commodity;buy:number|null;sell:number|null;roi:number|null;spread:number|null;sides:Side[]};

// Each tile finishes its turn before the next wave. Fixed modes update immediately.
function TickerValue({entry,target,cycle,delay,names,locale}:{entry:TickerEntry;target:Metric;cycle:boolean;delay:number;names:Record<Metric,string>;locale:Locale}){
  const [face,setFace]=useState<Metric>(target);
  useEffect(()=>{
    if(!cycle){setFace(target);return;}
    const timer=window.setTimeout(()=>setFace(target),delay);
    return ()=>clearTimeout(timer);
  },[target,cycle,delay]);
  const displayed=cycle?face:target;
  const value=entry[displayed];
  const percent=displayed==='roi';
  const tone=value===null?'missing':percent?(value>=20?'high':value<5?'low':'neutral'):displayed;
  const full=value?.toLocaleString(locale==='en'?'en-US':'ko-KR',{maximumFractionDigits:2})??'—';
  const text=value===null?'—':percent?full+'%':compactPrice.format(value);
  return <b key={displayed} className="ticker-value" data-value={!percent&&value!==null?'price':undefined} data-tone={tone} data-face={displayed}
    aria-label={names[displayed]+' '+full+(percent?'%':' aUEC/SCU')} title={names[displayed]+' · '+full+(percent?'%':' aUEC/SCU')}>{text}</b>;
}

export default function TradeMarketBoard({data,locale,onPlan,onDetails,quickOpen,onQuickToggle,onSelectCommodity,quoteStatus,onHandoff}:{onHandoff?:MarketHandoff;onSelectCommodity:(id:number)=>void;quoteStatus:string;data:MarketSnapshot;locale:Locale;quickOpen:boolean;onQuickToggle:()=>void;onPlan?:PlanFromQuote;onDetails:(id:number)=>void}) {
  const en=locale==='en', t=(ko:string,english:string)=>en?english:ko;
  const news=useTradeNews();
  const [filters,setFilters]=useTradeView('market-search',{query:'',commodity:0,sort:'spread',fresh:false,available:true});
  const [limit,setLimit]=useState(16), [showFilters,setShowFilters]=useState(false);
  const [expanded,setExpanded]=useState(true);
  const [savedPlan]=useTradeView('personal-options',defaultSuiteOptions);
  const planOptions={...defaultSuiteOptions,...savedPlan};
  const [includeUnreported,setIncludeUnreported]=useState(false);
  const [direction,setDirection]=useState<'desc'|'asc'|'default'>('default');
  const [metric,setMetric]=useState<Metric>('sell');
  const [automatic,setAutomatic]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible,setVisible]=useState(!document.hidden);
  const routesHeading=useRef<HTMLHeadingElement>(null);
  const detailHeading=useRef<HTMLHeadingElement>(null);
  const focusDetail=useRef(false);
  const grid=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const visibility=()=>setVisible(!document.hidden);
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduce=()=>{if(motion.matches)setAutomatic(false);};
    document.addEventListener('visibilitychange',visibility);
    motion.addEventListener('change',reduce);
    return ()=>{document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',reduce);};
  },[]);
  useEffect(()=>{
    if(focusDetail.current&&detailHeading.current){
      detailHeading.current.focus({preventScroll:true});
      detailHeading.current.scrollIntoView({block:'start'});
    }
    focusDetail.current=false;
  },[filters.commodity]);
  useEffect(()=>{onSelectCommodity(filters.commodity);},[filters.commodity,onSelectCommodity]);
  function update(next:Partial<typeof filters>) {
    setFilters(previous=>({...previous,...next}));
    setLimit(16);
  }
  const variants=useMemo(()=>commodityCodeVariants(data.commodities),[data.commodities]);
  const {pairs,tickers}=useMemo(()=>{
    const codeMatches=matchingCommodityCodes(filters.query,data.commodities,variants);
    const query=codeMatches.size?'':filters.query;
    const terminals=new Map(data.terminals.map(term=>[term.id,term]));
    const byItem=new Map<number,Side[]>();
    for(const quote of data.quotes) {
      const state=quoteFreshness(quote,data.liveVersion);
      const terminal=terminals.get(quote.terminalId);
      if(!terminal||state==='unknown'||state==='old-patch'||(filters.fresh&&state!=='current')) continue;
      const sides=byItem.get(quote.commodityId)??[];
      sides.push({quote,terminal});
      byItem.set(quote.commodityId,sides);
    }
    const pairs:Pair[]=[], tickers:TickerEntry[]=[];
    for(const item of data.commodities) {
      if(codeMatches.size&&!codeMatches.has(item.id)) continue;
      const sides=byItem.get(item.id)??[];
      const buys=sides.filter(s=>s.quote.buy!==null);
      const sells=sides.filter(s=>s.quote.sell!==null);
      const goods=commoditySearchTerms(item);
      const places=(side:Side)=>[side.terminal.name,side.terminal.location,side.terminal.planet,side.terminal.system];
      const matchingSides=query?sides.filter(side=>tradeMatches(query,goods,places(side))):sides;
      const availableBuys=matchingSides.filter(s=>s.quote.buy!==null&&(!filters.available||(s.quote.stock??0)>0));
      const availableSells=matchingSides.filter(s=>s.quote.sell!==null&&(!filters.available||(s.quote.demand??0)>0));
      const buyPrice=availableBuys.length?Math.min(...availableBuys.map(s=>s.quote.buy!)):null;
      const sellPrice=availableSells.length?availableSells.reduce((sum,s)=>sum+s.quote.sell!,0)/availableSells.length:null;
      let roi:number|null=null,spread:number|null=null;
      let hasMatchingPair=false;
      for(const buy of buys) for(const sell of sells) {
        if(buy.terminal.id===sell.terminal.id) continue;
        if(filters.available&&(!(buy.quote.stock&&buy.quote.stock>0)||!(sell.quote.demand&&sell.quote.demand>0))) continue;
        if(query&&!tradeMatches(query,goods,[...places(buy),...places(sell)])) continue;
        hasMatchingPair=true;
        const margin=sell.quote.sell!-buy.quote.buy!;
        spread=spread===null?margin:Math.max(spread,margin);
        const rate=(sell.quote.sell!/buy.quote.buy!-1)*100;
        roi=roi===null?rate:Math.max(rate,roi);
        if(filters.commodity&&item.id!==filters.commodity)continue;
        pairs.push({item,buy,sell,spread:sell.quote.sell!-buy.quote.buy!});
      }
      if(matchingSides.length||hasMatchingPair||(includeUnreported&&tradeMatches(query,goods))) {
        tickers.push({item,buy:buyPrice,sell:sellPrice,roi,spread,sides});
      }
    }
    tickers.sort((a,b)=>a.item.name.localeCompare(b.item.name));
    const pairValue=(p:Pair)=>filters.sort.startsWith('buy')?p.buy.quote.buy!:filters.sort.startsWith('sell')?p.sell.quote.sell!:p.spread;
    const ascending=filters.sort==='buy'||filters.sort.endsWith('Asc');
    pairs.sort((a,b)=>(pairValue(a)-pairValue(b))*(ascending?1:-1));
    return {pairs,tickers};
  },[data,filters,includeUnreported,variants]);
  useEffect(()=>{
    if(!automatic||!visible||!tickers.length)return;
    setMetric('sell');
    let timer:number;
    function wave(next:'sell'|'roi'){
      setMetric(next);
      const pause=next==='roi'?2000:4000;
      timer=window.setTimeout(()=>wave(next==='roi'?'sell':'roi'),(tickers.length-1)*80+300+pause);
    }
    timer=window.setTimeout(()=>wave('roi'),3000);
    return ()=>clearTimeout(timer);
  },[automatic,visible,tickers.length]);
  const format=(n:number|null)=>n===null?'—':n.toLocaleString(en?'en-US':'ko-KR',{maximumFractionDigits:2});
  const date=new Intl.DateTimeFormat(en?'en-GB':'ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  const title=(item:Commodity)=>en?(item.code||item.name):tradeLabel(item.name,'goods','ko');
  const caption=(item:Commodity)=><>{title(item)}{en&&variants.get(item.id)&&' · '+variants.get(item.id)}{!en&&item.code&&item.code!==title(item)&&<small className="board-code"> {item.code}</small>}</>;
  const selection=tickers.find(entry=>entry.item.id===filters.commodity);
  const ordered=useMemo(()=>{
    if(direction==='default'||automatic)return tickers;
    return [...tickers].sort((a,b)=>{
      const x=a[metric],y=b[metric];
      if(x===null||y===null)return Number(x===null)-Number(y===null);
      return (x-y)*(direction==='asc'?1:-1);
    });
  },[direction,automatic,tickers,metric]);
  const metricNames={spread:t('단위 차익','Margin / SCU'),buy:t('최저 매입가','Lowest buy'),sell:t('평균 판매가','Average sell'),roi:t('최대 차익률','Best ROI')};
  function closeDetail(){
    grid.current?.querySelector<HTMLButtonElement>('[aria-pressed=true]')?.focus();
    update({commodity:0});
  }
  function sideCell(side:Side,buying:boolean) {
    const {terminal,quote}=side;
    const issue=suiteTerminalIssue(terminal,planOptions);
    const expired=!suiteQuoteAllowed(quote,data.liveVersion,planOptions,Date.now());
    return <td className="board-side">
      <div className="board-quote"><strong data-value="price" className={buying?'price-buy':'price-sell'}>{format(buying?quote.buy:quote.sell)}</strong><span data-value="place">{tradeLabel(terminal.name,'places',locale)}</span></div>
      <div className="board-report"><span data-value="place">{tradeLabel(terminal.system,'places',locale)}</span><span data-value="quantity">{buying?t('재고','Stock'):t('예측 수요','Forecast demand')} {format(buying?quote.stock:quote.demand)} SCU</span>
        {quote.updatedAt&&<time dateTime={quote.updatedAt} data-stale={quoteFreshness(quote,data.liveVersion)==='stale'} title={t('가격 수정 시각','Price updated')}>{date.format(new Date(quote.updatedAt))}</time>}
      </div>{issue&&<small className="board-policy">{terminalIssueLabel(issue,en)}</small>}
      {expired&&<small className="board-policy">{t('계획 시세 기준 초과','Outside planner quote limit')} · {planOptions.maxAgeHours}h</small>}</td>;
  }
  return <section className="trade-market-board">
    <div className="market-board-search">
      <input aria-label={t('품목·거점 검색','Search goods or terminals')} type="search" placeholder={t('품목명 · UEX 약자 · 거점 검색','Search by commodity, UEX code or terminal')} value={filters.query} onChange={e=>update({query:e.target.value,commodity:0})}/>
      {onPlan&&<button aria-expanded={quickOpen} onClick={onQuickToggle}>{t('내 함선·자금으로 거래 찾기','Find trades for my ship and budget')}</button>}
      <button aria-expanded={showFilters} aria-controls="trade-board-filters" onClick={()=>setShowFilters(!showFilters)}>{t('조회 조건','Filters')}</button>
    </div>
    {quickOpen&&<QuickTrade onHandoff={onHandoff} articles={news.articles} data={data} locale={locale} initial={planOptions} onPlan={onPlan}/>}
    <details className="market-field-news"><summary>{t('무역 소문 · 선장들의 후기','Trade rumors · pilot reports')}</summary><p>{t('게시 당시의 경험담입니다. 패치와 실제 수량은 원문에서 확인하세요.','Pilot accounts at the time of posting. See the original for patch and quantities.')}</p><NewsList articles={news.articles} locale={locale}/>{news.failed&&<p>{t('후기를 불러오지 못했습니다.','News unavailable.')}</p>}</details>
    <div hidden={!showFilters} id="trade-board-filters"><div className="market-filters">
      <label><input type="checkbox" checked={filters.available} onChange={e=>update({available:e.target.checked})}/>{t('재고와 예측 수요가 있는 거래만','Only pairs with stock and forecast demand')}</label>
      <label><input type="checkbox" checked={includeUnreported} onChange={e=>setIncludeUnreported(e.target.checked)}/>{t('보고 없는 품목 포함','Include goods without reports')}</label>
      <label><input type="checkbox" checked={filters.fresh} onChange={e=>update({fresh:e.target.checked})}/>{t('24시간 이내 보고만','Reports within 24 hours')}</label>
    </div></div>
    <div className="ticker-toolbar">
      <div className="ticker-modes" aria-label={t('버튼에 표시할 지표','Tile metric')}>
        {metrics.map(key=><button key={key} aria-pressed={!automatic&&metric===key} onClick={()=>{setDirection(key!==metric||automatic||direction==='default'?'desc':direction==='desc'?'asc':'default');setAutomatic(false);setMetric(key);}}>{metricNames[key]}{!automatic&&metric===key&&(direction==='asc'?' ↑':direction==='desc'?' ↓':'')}</button>)}
        <button aria-pressed={automatic} onClick={()=>{setDirection('default');if(!automatic)setMetric('sell');setAutomatic(!automatic);}}>{t('자동 전환','Auto cycle')}</button>
        {direction!=='default'&&<button onClick={()=>setDirection('default')}>{t('정렬 되돌리기','Reset order')}</button>}
      </div>
      <span>UEX · {data.liveVersion} · {date.format(new Date(data.retrievedAt))}</span>
    </div>
    <div className="ticker-legend">{automatic?t('평균 판매가 ↔ 최대 차익률 · aUEC/SCU ↔ %','Average sell ↔ best ROI · aUEC/SCU ↔ %'):metricNames[metric]} · {automatic?t('비용 차감 전','Before costs'):metric==='roi'?t('서로 다른 거래소 기준 · 비용 차감 전','Across terminals · before costs'):'aUEC/SCU'} · {tickers.length} {t('품목','goods')}</div>
    <div id="trade-board-tickers" ref={grid} className="board-ticker" data-expanded={expanded} data-metric={metric} aria-label={t('품목 시세판','Commodity board')}>
      {ordered.map((entry,index)=>{
        const {item}=entry;
        return <button key={item.id} type="button" title={item.name} aria-controls="trade-commodity-detail" aria-pressed={filters.commodity===item.id}
          onClick={()=>{if(filters.commodity===item.id){closeDetail();return;}if(quickOpen)onQuickToggle();focusDetail.current=true;update({commodity:item.id});}}>
          <span className="ticker-name" data-value="goods" data-shared-code={variants.has(item.id)||undefined}>
            {title(item)}
            {en&&variants.get(item.id)&&<small>{variants.get(item.id)}</small>}
            {!en&&item.code&&item.code!==title(item)&&<small>{item.code}</small>}
          </span>
          <TickerValue entry={entry} target={metric} cycle={automatic&&visible} delay={index*80} names={metricNames} locale={locale}/>
        </button>;
      })}
    </div>
    {tickers.length>12&&<button className="ticker-expand" aria-expanded={expanded} aria-controls="trade-board-tickers" onClick={()=>setExpanded(!expanded)}>{expanded?t('품목판 접기','Compact board'):t('품목판 전체 펼치기','Expand commodity board')}</button>}
    {!tickers.length&&<p role="status">{t('검색과 일치하는 품목이 없습니다.','No commodities match your search.')}</p>}
    <section id="trade-commodity-detail" hidden={!selection} className="ticker-detail">
      {selection&&<>
        <header><h3 data-value="goods" ref={detailHeading} tabIndex={-1}>{caption(selection.item)}</h3>
          {pairs.length>0&&<button onClick={()=>{
            routesHeading.current?.focus({preventScroll:true});
            routesHeading.current?.scrollIntoView({block:'start'});
          }}>{t('이 품목의 경로 보기','View routes for this commodity')}</button>}
          <button onClick={()=>onDetails(selection.item.id)}>{t('최신 시세 확인','Check latest quotes')}</button>
          <button onClick={closeDetail}>{t('상세 닫기','Close detail')}</button>
        </header>
        {quoteStatus&&<p role="status">{quoteStatus}</p>}
        {!quickOpen&&onPlan&&<QuickTrade onHandoff={onHandoff} key={`route-${selection.item.id}`} selectedCommodity={selection.item.id} articles={news.articles} data={data} locale={locale} initial={planOptions} onPlan={onPlan}/>}
        {selection.sides.length?<details open={!pairs.length} key={selection.item.id}><summary>{t('거래소별 가격·재고·수요','Terminal prices, stock and demand')} ({selection.sides.length})</summary><div className="ticker-terminals"><table><thead><tr>{[t('거래소','Terminal'),t('매입가','Buy'),t('판매가','Sell'),t('재고 · SCU','Stock · SCU'),t('예측 수요 · SCU','Forecast demand · SCU'),t('수정 시각','Updated')].map(text=><th key={text}>{text}</th>)}</tr></thead>
          <tbody>{selection.sides.map(({quote,terminal})=><tr key={quote.id}><th data-value="place" scope="row">{tradeLabel(terminal.name,'places',locale)}</th><td data-value="price" className="price-buy">{format(quote.buy)}</td><td data-value="price" className="price-sell">{format(quote.sell)}</td><td data-value="quantity">{format(quote.stock)}</td><td data-value="quantity">{format(quote.demand)}</td><td>{quote.updatedAt&&date.format(new Date(quote.updatedAt))}</td></tr>)}</tbody></table></div></details>:<p>{t('조회 조건에 맞는 보고가 없습니다.','No reports match the current filters.')}</p>}
      </>}
    </section>
    <div className="pair-toolbar"><h3 ref={routesHeading} tabIndex={-1}>{t('매입·판매 경로','Buy and sell routes')}</h3>
      <select aria-label={t('정렬','Sort')} value={filters.sort} onChange={e=>update({sort:e.target.value})}>
        <option value="spread">{t('단위 차익 높은 순','Highest spread')}</option><option value="buy">{t('매입가 낮은 순','Lowest buy price')}</option><option value="sell">{t('판매가 높은 순','Highest sell price')}</option><option value="spreadAsc">{t('단위 차익 낮은 순','Lowest spread')}</option><option value="buyDesc">{t('매입가 높은 순','Highest buy price')}</option><option value="sellAsc">{t('판매가 낮은 순','Lowest sell price')}</option>
      </select>{filters.sort!=='spread'&&<button onClick={()=>update({sort:'spread'})}>{t('정렬 되돌리기','Reset order')}</button>}
    </div>
    {pairs.length>0?<><div className="board-table" tabIndex={0} role="region" aria-label={t('매입·판매 시세표','Buy and sell price board')}><table><caption><span>UEX · {data.liveVersion}</span> · {t('수집','Collected')} {date.format(new Date(data.retrievedAt))} <span className="board-units">aUEC/SCU · {t('비용 차감 전','Before costs')}</span></caption><thead><tr>{[t('품목','Commodity'),t('매입가 · 구매소','Buy price · From'),t('판매가 · 판매소','Sell price · To'),t('단위 차익','Spread / SCU')].map(name=><th key={name}>{name}</th>)}</tr></thead>
    <tbody>{pairs.slice(0,limit).map(({item,buy,sell,spread})=><tr key={buy.quote.id+'-'+sell.quote.id}><th scope="row"><button data-value="goods" title={item.name} onClick={()=>onDetails(item.id)}>{caption(item)}</button></th>
      {sideCell(buy,true)}{sideCell(sell,false)}<td className="board-spread" data-positive={spread>0}><strong>{spread>0?'+':''}{format(spread)}</strong><small>{buy.quote.buy?format(100*spread/buy.quote.buy)+'%':'—'}</small>{onPlan&&<button onClick={()=>onPlan(buy.terminal.id,item.id,sell.terminal.id,buy.terminal.system===sell.terminal.system?'intrasystem':'interstellar')}>{t('경로 검토','Plan route')} ›</button>}</td></tr>)}</tbody></table></div>
    {pairs.length>limit&&<button className="market-action" onClick={()=>setLimit(limit+16)}>{t('더 보기','Show more')} ({limit}/{pairs.length})</button>}</>:<p role="status">{t('조건에 맞는 매입·판매 쌍이 없습니다. 개별 가격은 거래소 시세에서 확인하세요.','No matching buy and sell pair. Check terminal prices for one-sided quotes.')}</p>}
  </section>;
}
