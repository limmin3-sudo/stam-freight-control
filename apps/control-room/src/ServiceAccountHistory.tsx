import {useEffect, useRef, useState} from 'react';
import type {Locale} from './navigation';
import {HISTORY_KEY, readHistory, serviceControls} from './service-account.mjs';
import './service-account.css';

export function ServiceAccountHistory({locale}: {locale: Locale}) {
  const en = locale === 'en';
  const host = useRef<HTMLDivElement>(null);
  const [records, setRecords] = useState(() => readHistory());
  const [message, setMessage] = useState('');
  useEffect(() => {
    const {accountButton} = serviceControls();
    host.current?.append(accountButton);
    const refresh = () => setRecords(readHistory());
    const storage = (event: StorageEvent) => {
      if (!event.key || event.key === HISTORY_KEY) refresh();
    };
    const announce = (event: Event) => setMessage((event as CustomEvent<string>).detail);
    window.addEventListener('storage', storage);
    window.addEventListener('sfc-history-changed', refresh);
    window.addEventListener('stam-account-message', announce);
    refresh();
    return () => {
      accountButton.remove();
      window.removeEventListener('storage', storage);
      window.removeEventListener('sfc-history-changed', refresh);
      window.removeEventListener('stam-account-message', announce);
    };
  }, []);
  const latest = records[0];
  return <>
    <section className="service-record">
      <h2>{en ? 'Account' : '계정'}</h2>
      <p>{en ? 'Sign in to sync completed runs across devices.' : '로그인하면 다른 기기에서도 완료한 운송기록을 확인할 수 있어요.'}</p>
      <div ref={host} className="service-account-control" />
      {message && <p role="status">{message}</p>}
    </section>
    <section className="service-record" aria-live="polite">
      <h2>{en ? 'Latest delivery' : '최근 완료한 배송'}</h2>
      {latest ? <div className="service-latest">
        <strong>{latest.missions?.map(m => m.title || m.id).join(' · ') || latest.ship}</strong>
        <p>{latest.route}</p>
        <p>{[latest.ship, Number.isFinite(latest.scu) && latest.scu.toLocaleString() + ' SCU',
          latest.at && new Date(latest.at).toLocaleString(en ? 'en-US' : 'ko-KR')].filter(Boolean).join(' · ')}</p>
      </div> : <p>{en ? 'Completed contracts appear here after the final delivery. Practice contracts are excluded.' : '마지막 배송을 완료하면 여기에 표시돼요. 예시 계약은 운송기록에서 제외돼요.'}</p>}
      <button type="button" onClick={() => serviceControls().openHistory()}>{en ? 'All flight records' : '전체 운송기록'} ({records.length})</button>
    </section>
  </>;
}
