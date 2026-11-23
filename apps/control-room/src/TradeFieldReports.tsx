import { useEffect, useState } from 'react';
import type { Locale } from './navigation';
import { useFreightCloud } from './use-freight-cloud';
import type { Observation } from './trade-field';

export type FieldNews = {
  url: string;
  title: string;
  en: string;
  date?: string;
  terminal?: string;
  commodity?: string;
  places?: string[];
  goods?: string[];
  route?: { buyAt: string; sellAt: string; commodity: string };
};
export function useTradeNews() {
  const [articles, set] = useState<FieldNews[]>([]),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const ctl = new AbortController();
    fetch(new URL('trade-news.json', document.baseURI), { signal: ctl.signal })
      .then((r) => {
        if (!r.ok) throw Error('feed');
        return r.json();
      })
      .then((rows: FieldNews[]) =>
        set(rows.filter((r) => /^https:\/\/www\.reddit\.com\/r\/starcitizen\/comments\//.test(r.url))),
      )
      .catch(() => {
        if (!ctl.signal.aborted) setFailed(true);
      });
    return () => ctl.abort();
  }, []);
  return { articles, failed };
}
export function NewsList({ articles, locale }: { articles: FieldNews[]; locale: Locale }) {
  return (
    <ul className="trade-news-list">
      {articles.map((a) => (
        <li key={a.url}>
          <a href={a.url} target="_blank" rel="noreferrer">
            {locale === 'en' ? a.en : a.title}
          </a>
          <small>Reddit · {a.date || (locale === 'en' ? 'Date unknown' : '날짜 미확인')}</small>
        </li>
      ))}
    </ul>
  );
}
export function useObservations() {
  const { client } = useFreightCloud();
  const [rows, setRows] = useState<Observation[]>([]),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setRows([]);
    setFailed(false);
    const stop = client?.watch(
      'tradeObservations',
      (docs) => {
        if (live) {
          setRows(docs as unknown as Observation[]);
          setFailed(false);
        }
      },
      () => {
        if (live) setFailed(true);
      },
      { order: 'at', max: 100 },
    );
    return () => {
      live = false;
      stop?.();
    };
  }, [client]);
  return { rows, failed };
}
type ReportProps = {
  locale: Locale;
  patch: string;
  terminalId: number;
  commodityId: number;
  side: 'sell' | 'buy';
  attempted: number;
  name: string;
};
export function ReportFill({
  locale,
  patch,
  terminalId,
  commodityId,
  side,
  attempted,
  name,
}: ReportProps) {
  const cloud = useFreightCloud(),
    en = locale === 'en';
  const [partial, setPartial] = useState(false),
    [qty, setQty] = useState(''),
    [waited, setWaited] = useState(false);
  const [sent, setSent] = useState(false);
  const send = (filled: number) =>
    void cloud.act(async (client, check) => {
      await client.command({
        action: 'observeTrade',
        terminalId,
        commodityId,
        patch,
        side,
        attempted,
        filled,
        waited,
      });
      check();
      setSent(true);
    });
  return (
    <details className="trade-fill-report">
      <summary>
        {en ? 'Report actual fill' : '실제 거래 제보'} · {name} · {attempted} SCU
      </summary>
      {sent ? (
        <p role="status">
          {en ? 'Shared with signed-in captains.' : '로그인한 선장들에게 제보했습니다.'}
        </p>
      ) : !cloud.client ? (
        <p>{en ? 'Sign in to share a fill.' : '로그인하면 거래 결과를 공유할 수 있습니다.'}</p>
      ) : (
        <>
          <p>
            {en
              ? 'Share what the terminal accepted with other signed-in captains.'
              : '거래소가 실제로 받아준 물량을 로그인한 선장들에게 공유합니다.'}
          </p>
          <label>
            <input type="checkbox" checked={waited} onChange={(e) => setWaited(e.target.checked)} />
            {en ? 'Waited for restock or demand' : '재입고·수요 회복을 기다림'}
          </label>
          <div className="suite-actions">
            <button disabled={cloud.busy} onClick={() => send(attempted)}>
              {en ? 'Filled all' : side === 'sell' ? '전량 팔림' : '전량 구매'}
            </button>
            <button onClick={() => setPartial(true)} disabled={cloud.busy || attempted <= 1}>
              {en ? 'Partial fill' : '일부만 거래'}
            </button>
            <button disabled={cloud.busy} onClick={() => send(0)}>
              {en ? 'No fill' : '거래 불가'}
            </button>
          </div>
          {partial && (
            <label>
              {en ? 'Actual SCU' : '실제 거래량 · SCU'}{' '}
              <input
                type="number"
                min="1"
                max={attempted - 1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <button
                disabled={cloud.busy || !Number.isInteger(+qty) || +qty <= 0 || +qty >= attempted}
                onClick={() => send(+qty)}
              >
                {en ? 'Share' : '제보하기'}
              </button>
            </label>
          )}
          {cloud.error && (
            <p role="alert">{en ? 'Could not share the report.' : '제보를 저장하지 못했습니다.'}</p>
          )}
        </>
      )}
    </details>
  );
}
