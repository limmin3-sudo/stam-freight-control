import {useState} from 'react';
import type {Expedition,ExpeditionSummary} from './trade-expedition';
import type {MarketSnapshot} from './trade-data';
import type {Locale} from './navigation';
import {commoditySearchTerms,tradeLabel,tradeMatches} from './trade-labels';
import {tradeSettlement} from './trade-workflow';
import {ApprovedGlass} from './ApprovedGlass';
import {csvCell,tradeDownload} from './trade-files';
import './trade-workflow.css';

export function TradeSettlement({summary,locale}:{summary:ExpeditionSummary;locale:Locale}){
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko,money=(n:number)=>n.toLocaleString(en?'en-US':'ko-KR',{maximumFractionDigits:2}),settlement=tradeSettlement(summary);
 const remainingScu=summary.holdings.reduce((total,lot)=>total+lot.quantity,0);
 const rows=[[t('실제 매입','Actual purchases'),summary.purchase],[t('실제 판매','Actual sales'),summary.sales],[t('기록한 비용','Recorded expenses'),summary.expenses],[t('교역 현금 증감','Trade cash flow'),settlement.cashFlow],[t('남은 화물의 확인된 원가','Known cost of remaining cargo')+' · '+money(remainingScu)+' SCU',settlement.remainingCost],[summary.unknownCost?t('미확인 원가 제외 손익','Result excluding unknown cost'):t('실현 손익','Realized result'),summary.realized]] as [string,number][];
 return <details className="trade-settlement"><summary>{t('정산 내역 · 현금과 손익 구분','Settlement · cash flow and realized result')}</summary><div className="suite-metrics">{rows.map(([label,value])=><span key={label}>{label}<strong>{money(value)} aUEC</strong></span>)}</div><p className="suite-note">{t('남은 화물 원가는 아직 판매 손익에 포함되지 않습니다. 외부 자본 보정은 비용·이익이 아니며, 입력하지 않은 연료·수수료는 차감되지 않습니다.','Unsold cargo cost is not yet realized. External cash adjustments are not costs or profit; unrecorded fuel and fees are not deducted.')}{settlement.remainingCostUnknown&&' '+t('남은 화물에 원가 미확인 묶음이 있습니다.','Some remaining lots have unknown acquisition costs.')}</p></details>;
}

export default function TradeRunReview({runs,summaries,market,locale,onSelect}:{runs:Expedition[];summaries:Map<string,ExpeditionSummary>;market:MarketSnapshot;locale:Locale;onSelect:(id:string)=>void}){
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko,[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[sort,setSort]=useState('recent'),[limit,setLimit]=useState(20);
 const terms=new Map(market.terminals.map(t=>[t.id,t])),goods=new Map(market.commodities.map(c=>[c.id,c]));
 const names=(r:Expedition)=>[...new Set(r.route.legs.flatMap(l=>[l.originId,l.destinationId]))].map(id=>terms.get(id)?.name??String(id));
 const rows=runs.filter(r=>(status==='all'||summaries.get(r.id)?.status===status)&&tradeMatches(query,[...r.route.legs.flatMap(l=>l.lines.flatMap(x=>commoditySearchTerms(goods.get(x.commodityId),x.name))),...r.events.flatMap(e=>commoditySearchTerms(goods.get(e.commodityId??0)))],[...names(r),r.options.shipId])).sort((a,b)=>sort==='profit'?(Number(summaries.get(a.id)?.unknownCost)-Number(summaries.get(b.id)?.unknownCost)||(summaries.get(b.id)?.realized??0)-(summaries.get(a.id)?.realized??0)):Date.parse(b.at)-Date.parse(a.at));
 const money=(n:number)=>n.toLocaleString(en?'en-US':'ko-KR',{maximumFractionDigits:2});
 return <details className="trade-run-history"><summary>{t('전체 교역 기록 검색','Search all trade records')} · {runs.length}</summary><div className="suite-fields"><label>{t('품목·거점·함선 검색','Search goods, terminals or ships')}<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setLimit(20);}}/></label><label>{t('기록 상태','Record status')}<select aria-label={t('기록 상태','Record status')} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">{t('전체','All')}</option><option value="active">{t('진행 중','Active')}</option><option value="finished">{t('마감','Finished')}</option><option value="cancelled">{t('취소','Cancelled')}</option></select></label><label>{t('기록 정렬','Record sort')}<select aria-label={t('기록 정렬','Record sort')} value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">{t('최근 시작순','Most recently started')}</option><option value="profit">{t('실현 손익순','Realized result')}</option></select></label></div>
 <p>{rows.length} {t('건 · 취소 표시는 원본 감사 기록에 남습니다.','records · voided events remain in the audit trail.')}</p><div className="market-table"><table><thead><tr>{[t('시작 / 경로','Started / route'),t('상태','Status'),t('판매 / 비용','Sales / expenses'),t('실현 손익','Realized result'),t('열기','Open')].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.slice(0,limit).map(r=>{const s=summaries.get(r.id)!;return <tr key={r.id}><td>{new Date(r.at).toLocaleString(en?'en-GB':'ko-KR')}<small>{names(r).map(n=>tradeLabel(n,'places',locale)).join(' → ')}</small></td><td>{s.status==='active'?t('진행 중','Active'):s.status==='finished'?t('마감','Finished'):t('취소','Cancelled')}</td><td>{money(s.sales)} / {money(s.expenses)} aUEC</td><td>{money(s.realized)} aUEC{s.unknownCost&&<small>{t('미확인 원가 제외','Excludes unknown cost')}</small>}</td><td><button className="market-action" onClick={()=>onSelect(r.id)}><ApprovedGlass/><span>{t('기록 보기','View record')}</span></button></td></tr>;})}</tbody></table></div>
 {!rows.length&&<p role="status">{t('조건에 맞는 교역 기록이 없습니다.','No trade records match.')}</p>}
 {rows.length>limit&&<button className="market-action" onClick={()=>setLimit(n=>n+20)}><ApprovedGlass/><span>{t('더 보기','Show more')}</span></button>}
 <button className="market-action" disabled={!rows.length} onClick={()=>tradeDownload('STAM-trade-run-summary.csv',['id,started,status,ship,purchases_aUEC,sales_aUEC,expenses_aUEC,realized_aUEC,unknown_acquisition_cost',...rows.map(r=>{const s=summaries.get(r.id)!;return [r.id,r.at,s.status,r.options.shipId,s.purchase,s.sales,s.expenses,s.realized,s.unknownCost].map(csvCell).join(',');})].join('\r\n'))}><ApprovedGlass/><span>{t('검색한 기록 CSV 내려받기','Export filtered records CSV')}</span></button>
 </details>;
}
