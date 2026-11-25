import { useEffect, useRef, useState } from 'react';
import type { Locale } from './navigation';
import type { MarketSnapshot } from './trade-data';
import type { PlanFromQuote } from './TradeMarketBoard';
import { defaultSuiteOptions, type SuiteOptions, type SuiteRoute } from './trade-suite';
import { tradeShips } from './trade-cargo.mjs';
import { useTradeView } from './use-trade-view';
import { tradeLabel } from './trade-labels';
import { freshReports } from './trade-field';
import { NewsList, useObservations, type FieldNews } from './TradeFieldReports';
import CommodityRouteCard,{type MarketHandoff} from './CommodityRouteCard';
import ShipSelect from './ShipSelect';

const ships = tradeShips.map((s) => ({
  id: s.id,
  name: s.name,
  capacity: s.grids.filter((g) => !g.disabled).reduce((n, g) => n + g.w * g.h * g.l, 0),
}));
export default function QuickTrade({
  data,
  locale,
  onPlan,
  initial,
  articles,
  selectedCommodity, onHandoff,
}: {
  onHandoff?:MarketHandoff;
  selectedCommodity?: number;
  articles: FieldNews[];
  data: MarketSnapshot;
  locale: Locale;
  onPlan?: PlanFromQuote;
  initial: SuiteOptions;
}) {
  const en = locale === 'en',
    t = (ko: string, english: string) => (en ? english : ko);
  const [input, setInput] = useTradeView('quick-search', {
    shipId: initial.shipId,
    budget: initial.budget,
    commodity: 0,
    from: 0,
    to: 0,
    hourly: false,
    older: false,
  });
  const { rows, failed: fieldFailed } = useObservations();
  const [result, setResult] = useState<{ routes: SuiteRoute[]; reported: SuiteRoute[]; split:SuiteRoute|null;fieldSplit:SuiteRoute|null } | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [scenario, setScenario] = useState(false);
  const returnRequested = useRef(false);
  const worker = useRef<Worker | null>(null);
  useEffect(() => {
    setResult(null);
    setBusy(false);
    setError(false);
    return () => {
      worker.current?.terminate();
      worker.current = null;
    };
  }, [input, data, rows, selectedCommodity]);
  const ship = ships.find((s) => s.id === input.shipId);
  const goods = (id: number) =>
    tradeLabel(data.commodities.find((c) => c.id === id)?.name || String(id), 'goods', locale);
  const place = (id: number) =>
    tradeLabel(data.terminals.find((c) => c.id === id)?.name || String(id), 'places', locale);
  const commodity = selectedCommodity ?? input.commodity;
  const valid = !!ship && input.budget > 0 && input.budget <= 1e12;
  const options = {
    ...defaultSuiteOptions,
    mode: 'direct' as const,
    shipId: input.shipId,
    maxAgeHours: input.older ? 168 : 24,
    capacity: ship?.capacity ?? 0,
    budget: input.budget,
    originId: selectedCommodity ? 0 : input.from,
    destinationId: selectedCommodity ? 0 : input.to,
    commodityIds: commodity ? [commodity] : [],
    goal: !selectedCommodity && input.hourly ? ('time' as const) : ('profit' as const),
  };
  const recent = freshReports(rows, data.liveVersion, Date.now());
  function search() {
    if (!valid) return;
    worker.current?.terminate();
    setResult(null);
    setBusy(true);
    setError(false);
    setScenario(false);
    const w = new Worker(new URL('./trade-suite.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.onmessage = (e) => {
      if (worker.current !== w) return;
      setBusy(false);
      if (e.data.error) setError(true);
      else setResult(e.data);
      w.terminate();
    };
    w.onerror = () => {
      if (worker.current === w) {
        setBusy(false);
        setError(true);
      }
      w.terminate();
    };
    w.postMessage({ quick: true, compare:!!selectedCommodity, options, market: data, observations: recent });
  }
  useEffect(() => {
    if (selectedCommodity && valid) {
      const timer = window.setTimeout(search, 350);
      return () => window.clearTimeout(timer);
    }
    if (returnRequested.current) {
      returnRequested.current = false;
      search();
    }
  }, [input, selectedCommodity, data, rows]);
  const terminals = (key: 'from' | 'to') => (
    <select value={input[key]} onChange={(e) => setInput({ ...input, [key]: Number(e.target.value) })}>
      <option value="0">{t('전체', 'All')}</option>
      {data.terminals.map((x) => (
        <option key={x.id} value={x.id}>
          {place(x.id)} · {x.system}
        </option>
      ))}
    </select>
  );
  const list = result && (scenario ? result.reported : result.routes);
  const selectedName=data.commodities.find(c=>c.id===selectedCommodity)?.name;
  const relatedNews=selectedName?articles.filter(a=>a.goods?.includes(selectedName)||a.commodity===selectedName):[];
  const split=result&&(scenario?result.fieldSplit:result.split);
  return (
    <section className="quick-trade">
      <h3>{selectedCommodity ? goods(selectedCommodity) + ' · ' + t('한 곳 판매 · 분할 판매 비교', 'Compare single and split sales') : t('내 함선으로 거래 찾기', 'Find trades for my ship')}</h3>
      <ShipSelect
        locale={locale}
        allowEmpty
        value={input.shipId}
        options={ships}
        onChange={(shipId) => setInput({ ...input, shipId })}
      />
      <label>
        {t('투자할 자금', 'Trading budget')} · aUEC
        <input
          type="number"
          min="1"
          value={input.budget || ''}
          onChange={(e) => setInput({ ...input, budget: Number(e.target.value) })}
        />
      </label>
      {!selectedCommodity && <details>
        <summary>{t('조건 더보기', 'More conditions')}</summary>
        <div className="suite-fields">
          <label>
            {t('물품', 'Commodity')}
            <select
              value={input.commodity}
              onChange={(e) => setInput({ ...input, commodity: +e.target.value })}
            >
              <option value="0">{t('전체', 'All')}</option>
              {data.commodities.map((x) => (
                <option key={x.id} value={x.id}>
                  {goods(x.id)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('구매소', 'Buy at')}
            {terminals('from')}
          </label>
          <label>
            {t('판매소', 'Sell at')}
            {terminals('to')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={input.older}
              onChange={(e) => setInput({ ...input, older: e.target.checked })}
            />
            {t('최근 7일 가격까지 포함', 'Include prices up to 7 days old')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={input.hourly}
              onChange={(e) => setInput({ ...input, hourly: e.target.checked })}
            />
            {t('시간당 예상 수익순', 'Rank by estimated profit per hour')}
          </label>
        </div>
      </details>}
      {selectedCommodity && <label><input type="checkbox" checked={input.older} onChange={e=>setInput({...input, older:e.target.checked})}/>{t('최근 7일 가격까지 포함', 'Include prices up to 7 days old')}</label>}
      {selectedCommodity && (!valid || busy) && <p role="status">{busy ? t('경로 계산 중…', 'Searching…') : t('함선과 투자할 자금을 입력하면 자동으로 계산합니다.', 'Choose a ship and enter your budget to calculate.')}</p>}
      {(!selectedCommodity || error) && <button disabled={busy || !valid} onClick={search}>
        {busy ? t('경로 계산 중…', 'Searching…') : t('수익 경로 찾기', 'Find profitable routes')}
      </button>}
      {error && (
        <p role="alert">
          {t(
            '계산에 실패했습니다. 입력을 확인하고 다시 시도하세요.',
            'Calculation failed. Check the inputs and retry.',
          )}
        </p>
      )}
      {result && (
        <>
          <p>
            {t(
              '구매소 출발 기준 · 현행 패치 · 비용 입력 전',
              'From purchase terminal · current patch · before expenses',
            )}{' '}
            · {options.maxAgeHours}h
          </p>
          {!!recent.length && (
            <div className="suite-actions">
              <button aria-pressed={!scenario} onClick={() => setScenario(false)}>
                {t('UEX 보고 물량', 'UEX volume')}
              </button>
              <button aria-pressed={scenario} onClick={() => setScenario(true)}>
                {t('제보 물량 가정', 'Field-report scenario')}
              </button>
            </div>
          )}
          {list?.length === 0 && (
            <p role="status">
              {t(
                '선택한 함선·자금으로 거래할 최신 경로가 없습니다.',
                'No current trade fits this ship and budget.',
              )}
            </p>
          )}
          {selectedCommodity && <>
            {[list?.[0],split].map(route=>route&&<CommodityRouteCard key={route.id+'/'+scenario} {...{route,options,data,en,goods,place,scenario,onHandoff}} reports={recent}/>)}
            {!!list?.length && !split && <small>{t('같은 구매소에서 두 판매처로 나눠 팔 수 있는 물량이 없습니다.','No two-buyer allocation fits this purchase.')}</small>}
            {relatedNews.length>0&&<NewsList articles={relatedNews} locale={locale}/>}
            {list?.[0] && !scenario && onPlan && <button onClick={()=>{
              const l=list[0]!.legs[0]!;
              onPlan(l.originId,commodity,l.destinationId,l.systems.length>1?'interstellar':'intrasystem',options);
            }}>{t('이 경로로 계획 열기','Open route in planner')}</button>}
          </>}
          {(!selectedCommodity ? list : [])?.map((r) => {
            const leg = r.legs[0]!,
              dest = data.terminals.find((x) => x.id === leg.destinationId)!;
            const items = new Set(leg.lines.map((l) => l.commodityId));
            const related = articles.filter((a) =>
              a.places?.length
                ? (a.places.includes(dest.location) || a.places.includes(dest.name)) &&
                  (!a.goods?.length || leg.lines.some((l) => a.goods!.includes(l.name)))
                : (a.terminal
                    ? dest.name.toLowerCase().includes(a.terminal.toLowerCase())
                    : Boolean(a.commodity)) &&
                  (!a.commodity ||
                    leg.lines.some((l) => l.name.toLowerCase() === a.commodity!.toLowerCase())),
            );
            return (
              <article className="suite-card" key={r.id}>
                <h4>
                  {place(leg.originId)} → {place(leg.destinationId)}
                </h4>
                <strong>
                  {scenario ? t('제보 기준 예상', 'Field estimate') : t('예상 차익', 'Expected margin')}{' '}
                  +{r.profit.toLocaleString()} aUEC
                </strong>
                {r.profitPerHour !== null && (
                  <small> · {Math.round(r.profitPerHour).toLocaleString()} aUEC/h</small>
                )}
                <p>
                  {leg.lines.map((l) => goods(l.commodityId) + ' ' + l.quantity + ' SCU').join(' · ')}
                </p>
                <p>
                  {t('매입금', 'Purchase cost')} {r.purchase.toLocaleString()} aUEC
                </p>
                {leg.lines.map((l) => {
                  const q = data.quotes.find(
                    (q) => q.terminalId === leg.destinationId && q.commodityId === l.commodityId,
                  );
                  return (
                    <small key={l.commodityId + '/' + l.boxSize}>
                      {goods(l.commodityId)} · {t('구매소 재고', 'Purchase stock')}{' '}
                      {data.quotes
                        .find((x) => x.terminalId === leg.originId && x.commodityId === l.commodityId)
                        ?.stock?.toLocaleString() ?? '—'}{' '}
                      SCU · UEX {t('판매소 보고 수요', 'reported buyer demand')}{' '}
                      {q?.demand?.toLocaleString() ?? '—'} SCU ·{' '}
                      {q?.updatedAt && new Date(q.updatedAt).toLocaleString(en ? 'en-GB' : 'ko-KR')}{' '}
                    </small>
                  );
                })}
                {recent
                  .filter(
                    (o) =>
                      items.has(o.commodityId) &&
                      o.terminalId === (o.side === 'sell' ? leg.destinationId : leg.originId),
                  )
                  .slice(0, 5)
                  .map((o) => (
                    <p key={o.ownerUid + o.commodityId + o.side}>
                      {goods(o.commodityId)} ·{' '}
                      {o.side === 'sell' ? t('판매', 'Sold') : t('구매', 'Bought')} {o.filled}/
                      {o.attempted} SCU ·{' '}
                      {o.waited ? t('대기 후', 'After waiting') : t('즉시', 'Immediate')} ·{' '}
                      {new Date(o.at).toLocaleString(en ? 'en-GB' : 'ko-KR')}
                    </p>
                  ))}
                {related.length > 0 && <NewsList articles={related} locale={locale} />}
                {onPlan && !scenario && (
                  <button
                    onClick={() =>
                      onPlan(
                        leg.originId,
                        commodity,
                        leg.destinationId,
                        leg.systems.length > 1 ? 'interstellar' : 'intrasystem',
                        { ...options, commodityIds: [...items] },
                      )
                    }
                  >
                    {t('이 경로로 계획 열기', 'Open route in planner')}
                  </button>
                )}
                {!selectedCommodity && <button
                  onClick={() => {
                    returnRequested.current = true;
                    setInput({
                      ...input,
                      from: leg.destinationId,
                      to: leg.originId,
                      commodity: 0,
                      budget: Math.round(r.cash * 100) / 100,
                    });
                  }}
                >
                  {t('돌아오는 길도 거래 찾기', 'Find a return trade')}
                </button>}
              </article>
            );
          })}
        </>
      )}
      {!selectedCommodity && articles.some((a) => a.route) && (
        <details>
          <summary>{t('후기에 나온 경로로 계산', 'Price a pilot-reported route')}</summary>
          {articles
            .filter((a) => a.route)
            .map((a) => {
              const tip = a.route!,
                item = data.commodities.find((c) => c.name === tip.commodity);
              const sites = (name: string, side: 'buy' | 'sell') =>
                data.terminals.filter(
                  (loc) =>
                    loc.location === name &&
                    data.quotes.some(
                      (q) => q.terminalId === loc.id && q.commodityId === item?.id && q[side] !== null,
                    ),
                );
              return (
                <div key={a.url}>
                  <NewsList articles={[a]} locale={locale} />
                  {sites(tip.buyAt, 'buy').flatMap((from) =>
                    sites(tip.sellAt, 'sell').map((to) => (
                      <button
                        key={from.id + '-' + to.id}
                        disabled={!ship || !(input.budget > 0)}
                        onClick={() => {
                          returnRequested.current = true;
                          setInput({ ...input, from: from.id, to: to.id, commodity: item!.id });
                        }}
                      >
                        {place(from.id)} → {place(to.id)} ·{' '}
                        {t('내 함선으로 계산', 'Calculate for my ship')}
                      </button>
                    )),
                  )}
                </div>
              );
            })}
        </details>
      )}
      {fieldFailed && (
        <small role="status">
          {t('함대 제보를 불러오지 못했습니다.', 'Fleet reports unavailable.')}
        </small>
      )}
    </section>
  );
}
