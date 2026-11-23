import {
  calculateSuite,
  suiteQuoteAllowed,
  type SuiteOptions,
  type SuiteContext,
  type SuiteRoute,
} from './trade-suite.ts';
import type { MarketSnapshot } from './trade-data.ts';

export type Observation = {
  ownerUid: string;
  terminalId: number;
  commodityId: number;
  side: 'buy' | 'sell';
  attempted: number;
  filled: number;
  waited: boolean;
  patch: string;
  at: number;
};
export function freshReports(rows: Observation[], patch: string, now: number) {
  return rows
    .filter(
      (r) => r.patch === patch && Number.isSafeInteger(r.at) && r.at <= now && now - r.at < 48 * 3600000,
    )
    .sort((a, b) => b.at - a.at);
}

export function quickRoutes(
  data: MarketSnapshot,
  options: SuiteOptions,
  context: SuiteContext,
  now = Date.now(),
) {
  const quotes = data.quotes.filter(
    (q) =>
      suiteQuoteAllowed(q, data.liveVersion, options, now) &&
      (!options.commodityIds.length || options.commodityIds.includes(q.commodityId)),
  );
  const sellers = new Map<number, Set<number>>();
  for (const q of quotes) {
    if (!q.sell || !q.demand || (options.destinationId && options.destinationId !== q.terminalId))
      continue;
    const set = sellers.get(q.commodityId) ?? new Set<number>();
    set.add(q.terminalId);
    sellers.set(q.commodityId, set);
  }
  const origins = new Map<number, Set<number>>();
  for (const q of quotes) {
    if (
      !q.buy ||
      !q.stock ||
      q.buy > options.budget ||
      (options.originId && q.terminalId !== options.originId)
    )
      continue;
    const dest = origins.get(q.terminalId) ?? new Set<number>();
    for (const id of sellers.get(q.commodityId) ?? []) if (id !== q.terminalId) dest.add(id);
    if (dest.size) origins.set(q.terminalId, dest);
  }
  const routes: SuiteRoute[] = [];
  for (const [originId, destinations] of origins) {
    const terminals = data.terminals.filter((t) => t.id === originId || destinations.has(t.id));
    const subset = {
      ...data,
      terminals,
      quotes: quotes.filter((q) => q.terminalId === originId || destinations.has(q.terminalId)),
    };
    for (const scope of ['intrasystem', 'interstellar'] as const) {
      const result = calculateSuite(subset, { ...options, originId, scope }, context, now);
      if (result.error) throw Error(result.error);
      routes.push(...result.routes);
    }
  }
  const score = (r: SuiteRoute) => (options.goal === 'time' ? (r.profitPerHour ?? 0) : r.profit);
  const unique = new Map<string, SuiteRoute>();
  for (const route of routes.sort((a, b) => score(b) - score(a) || b.profit - a.profit)) {
    const first = route.legs[0]!;
    const pair = first.originId + '-' + first.destinationId;
    if (!unique.has(pair)) unique.set(pair, route);
  }
  return [...unique.values()].slice(0, 5);
}

// A separate scenario: only recent immediate fills can raise a reported limit.
// The latest report from each terminal/commodity takes precedence over older successes.
export function fieldScenario(data: MarketSnapshot, reports: Observation[], now: number) {
  const latest = new Map<string, Observation>();
  for (const r of freshReports(reports, data.liveVersion, now)) {
    const key = [r.terminalId, r.commodityId, r.side].join('/');
    if (!latest.has(key)) latest.set(key, r);
  }
  return {
    ...data,
    quotes: data.quotes.map((q) => {
      const volume = (side: 'buy' | 'sell', base: number | null) => {
        const r = latest.get([q.terminalId, q.commodityId, side].join('/'));
        if (!r || r.waited) return base;
        return r.filled < r.attempted ? r.filled : Math.max(base ?? 0, r.filled);
      };
      return { ...q, stock: volume('buy', q.stock), demand: volume('sell', q.demand) };
    }),
  };
}
