import {useEffect,useState} from 'react';
import {ApprovedGlass} from './ApprovedGlass';
import {loadPriceHistory,type PriceHistory} from './trade-price-history';
import type {Locale} from './navigation';
import './trade-workflow.css';
export default function TradePriceHistory({terminalId,commodityId,version,locale,side='sell'}:{terminalId:number;commodityId:number;version:string;locale:Locale;side?:'buy'|'sell'}){
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko;
 const [open,setOpen]=useState(false),[data,setData]=useState<PriceHistory|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setData(null);setError(false);if(open)loadPriceHistory(terminalId,commodityId,version).then(d=>{if(active)setData(d);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[open,terminalId,commodityId,version,attempt]);
 const points=data?.reports.filter(r=>r[side]!==null)??[],values=points.map(p=>p[side]!),low=Math.min(...values),high=Math.max(...values),first=points[0]?.at??0,last=points.at(-1)?.at??first;
 const money=(n:number)=>n.toLocaleString(en?'en-US':'ko-KR',{maximumFractionDigits:2}),date=(n:number)=>new Date(n).toLocaleString(en?'en-GB':'ko-KR');
 return <details className="trade-source-history" onToggle={e=>setOpen(e.currentTarget.open)}><summary>{t('이 거래처의 보고 가격 이력','Reported price history at this terminal')}</summary>{open&&<>
 <p>{t('UEX 보고 기록 · 현재 패치','UEX reports · current patch')} {version} · {side==='buy'?t('내 매입가','Your buy price'):t('내 판매가','Your sell price')} · aUEC/SCU</p>
 {!data&&!error&&<p role="status">{t('가격 이력 조회 중…','Loading price reports…')}</p>}
 {error&&<p role="status">{t('이력을 불러오지 못했습니다. 현재 가격과 장부는 유지됩니다.','History is unavailable. Current prices and ledger are unchanged.')} <button className="market-action" onClick={()=>setAttempt(n=>n+1)}><ApprovedGlass/><span>{t('다시 조회','Retry')}</span></button></p>}
 {data&&points.length===0&&<p>{t('이 품목·거래처·패치에 해당하는 보고가 없습니다.','No reports for this commodity, terminal and patch.')}</p>}
 {points.length>0&&<><div className="trade-history-range"><strong>{money(low)}–{money(high)} aUEC/SCU</strong><span>{points.length} {t('건','reports')}</span></div>
 <svg className="trade-report-chart" viewBox="0 0 600 130" role="img" aria-label={`${t('보고 가격 범위','Reported price range')} ${money(low)}–${money(high)} aUEC/SCU`}><path d="M20 105H580" stroke="#7997a7"/>{points.map(p=><circle key={p.id} cx={last===first?300:20+(p.at-first)/(last-first)*560} cy={high===low?58:100-(p[side]!-low)/(high-low)*85} r={3} fill="#efd18b"><title>{date(p.at)} · {money(p[side]!)} aUEC/SCU</title></circle>)}</svg>
 <div className="trade-history-range"><small>{date(first)}</small><small>{date(last)}</small></div>
 <details><summary>{t('보고값 표로 보기','View report values')}</summary><div className="market-table"><table><thead><tr><th>{t('보고 시각','Reported at')}</th><th>aUEC/SCU</th><th>{side==='buy'?t('보고 재고 · SCU','Reported stock · SCU'):t('보고 수요 · SCU','Reported demand · SCU')}</th></tr></thead><tbody>{[...points].reverse().map(p=><tr key={p.id}><td>{date(p.at)}</td><td>{money(p[side]!)}</td><td>{p[side==='buy'?'stock':'demand']===null?'—':money(p[side==='buy'?'stock':'demand']!)}</td></tr>)}</tbody></table></div></details></>}
 {data&&<p className="suite-note">{t('최대 500개 보고 · 조회 결과는 12시간 재사용합니다. 점 사이의 가격이나 재고는 추정하지 않습니다.','Up to 500 reports · cached for 12 hours. Prices and inventory between reports are not inferred.')} {data.excluded>0&&t(`다른 패치·유효하지 않은 보고 ${data.excluded}건 제외.`,`${data.excluded} other-patch or invalid reports excluded.`)} <a href={data.url} target="_blank" rel="noopener noreferrer">{t('원천 자료','Source data')} ↗</a></p>}
 </>}</details>;
}
