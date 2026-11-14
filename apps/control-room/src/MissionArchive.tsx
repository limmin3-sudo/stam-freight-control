import {useEffect,useMemo,useState} from 'react';
import type {Locale} from './navigation';
import {loadMissionArchive,type MissionArchiveData,type ArchiveQuantity} from './mission-archive-data.mjs';
import './mission-archive.css';
import {ArchiveReference} from './ArchiveReference';

export default function MissionArchive({locale}:{locale:Locale}){
 const en=locale==='en',gameEn=locale!=='ko',t=(ko:string,english:string)=>en?english:ko;
 const [data,setData]=useState<MissionArchiveData|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 const [company,setCompany]=useState('all'),[rank,setRank]=useState('all'),[type,setType]=useState('all'),[sort,setSort]=useState('rank'),[search,setSearch]=useState(''),[shown,setShown]=useState(24);
 useEffect(()=>{let alive=true;setError(false);void loadMissionArchive().then(value=>{if(alive)setData(value);},()=>{if(alive)setError(true);});return()=>{alive=false;};},[retry]);
 useEffect(()=>setShown(24),[company,rank,type,sort,search]);
 const rows=useMemo(()=>data?.filter({company,rank,type,sort,search})??[],[data,company,rank,type,sort,search]);
 const number=(value:number)=>value.toLocaleString(en?'en-US':'ko-KR');
 const range=(value:ArchiveQuantity|{min:number;max:number}|null)=>value?.min!==null&&value?.min!==undefined&&value.max!==null?(value.min===value.max?number(value.min):number(value.min)+'–'+number(value.max)):t('미확인','Unknown');
 const rankName=(value:number)=>value<0?t('평판 미지정','Unspecified rank'):(en?['Trainee','Rookie','Junior','Member','Experienced','Senior','Master']:['수습','신입','초급','정규','숙련','선임','마스터'])[value]??String(value);
 const reset=()=>{setCompany('all');setRank('all');setType('all');setSort('rank');setSearch('');};
 if(error)return <div className="archive-load-state" role="alert"><p>{t('미션 자료를 불러오지 못했습니다. 다시 시도해 주세요.','Mission data could not be loaded. Please try again.')}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>{t('다시 시도','Retry')}</button></div>;
 if(!data)return <p className="archive-load-state" role="status">{t('미션 자료를 불러오고 있습니다.','Loading mission reference…')}</p>;
 return <div className="mission-archive">
  <div className="archive-intro"><p>{t('목록의 기본 보상·화물 규격을 비교하세요. 실제 수주한 계약의 수량·보상·상자 구성이 우선입니다.','Compare catalogue rewards and cargo rules. Accepted-contract quantities, rewards and containers take priority.')}</p>
   <span>SCMDB · {data.version}{data.wikiVersion?' / Wiki · '+data.wikiVersion:''}</span>
  </div>
  <div className="archive-filters" role="search" aria-label={t('미션 자료 필터','Mission reference filters')}>
   <label className="archive-search">{t('미션·품목 검색','Find mission or commodity')}<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('미션명 · 회사 · 화물','Mission · company · cargo')}/></label>
   <label>{t('회사','Company')}<select value={company} onChange={e=>setCompany(e.target.value)}><option value="all">{t('모든 회사','All companies')}</option>{data.companies.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
   <label>{t('평판','Reputation')}<select value={rank} onChange={e=>setRank(e.target.value)}><option value="all">{t('모든 평판','All ranks')}</option>{data.ranks.map(r=><option key={r} value={r}>{rankName(r)}</option>)}</select></label>
   <label>{t('유형','Type')}<select value={type} onChange={e=>setType(e.target.value)}><option value="all">{t('모든 유형','All types')}</option>{data.types.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
   <label>{t('정렬','Sort')}<select value={sort} onChange={e=>setSort(e.target.value)}><option value="rank">{t('평판 낮은 순','Lowest rank')}</option><option value="reward">{t('기본 보상 높은 순','Highest base reward')}</option><option value="scu">{t('목록 총량 적은 순','Smallest catalogue total')}</option></select></label>
  </div>
  <div className="archive-result-bar"><p role="status">{t(`${number(rows.length)}개 유형 / 전체 ${number(data.total)}개 유형 · 정의 ${number(data.definitions)}개`,`${number(rows.length)} of ${number(data.total)} types · ${number(data.definitions)} definitions`)}</p><button type="button" onClick={reset}>{t('필터 초기화','Reset filters')}</button></div>
  {!rows.length&&<p className="archive-load-state">{t('조건에 맞는 미션 자료가 없습니다. 검색어나 필터를 바꿔보세요.','No matching mission references. Try another search or filter.')}</p>}
  <div className="archive-catalogue-grid">{rows.slice(0,shown).map(record=><article className="archive-card" key={record.id} data-definition={record.id}>
   <div className="archive-card-meta"><span>{record.giver}</span><span>{rankName(record.rank)}</span></div><h2>{record.title||t('이름 미지정 계약','Unnamed contract')}</h2>
   <p className="archive-tags">{[record.type,record.illegal?t('불법 계약','Illegal contract'):'',...record.sources.map(s=>s==='scmdb'?'SCMDB':s==='wiki'?t('위키 보충','Wiki supplement'):s)].filter(Boolean).join(' · ')}</p>
   <dl className="archive-metrics"><div><dt>{t('목록 기본 보상','Catalogue base reward')}</dt><dd>{record.reward?range(record.reward)+' aUEC':t('미확인','Unknown')}</dd></div><div><dt>{t('목록 총량','Catalogue total')}</dt><dd>{record.quantity.known?range(record.quantity)+' SCU':t('명세 확인','See details')}</dd></div><div><dt>{t('최대 상자','Max container')}</dt><dd>{record.box.known?record.box.max+' SCU':t('별도 규격·미확인','Special / unknown')}</dd></div></dl>
   <p className="archive-goods">{record.orders.map(order=>gameEn?order.name:order.label).join(' · ')}</p>
   <p className="archive-certainty">{record.quantity.known?(record.quantity.fixed?t('명세상 고정량','Fixed catalogue quota'):t('수주별 가변 수량','Quantity varies per accepted contract')):t('실제 수량 확인 필요','Actual quantity required')}</p>
   <details><summary>{t('화물 규격·미션 내용','Cargo rules & mission details')}</summary>
    <div className="archive-table-scroll"><table><thead><tr><th>{t('품목 / 운송 항목','Commodity / haul orders')}</th><th>{t('항목당 수량','Quantity per order')}</th><th>{t('최대 상자','Max container')}</th></tr></thead><tbody>{record.orders.map((order,i)=><tr key={i}><td>{gameEn?order.name:order.label}{order.count>1&&<small>{t(`운송 항목 ${order.count}건 · 상자 개수 아님`,`${order.count} haul orders · not box counts`)}</small>}</td><td>{order.quantity.known?range(order.quantity)+' '+(order.quantity.unit==='items'?t('개','items'):'SCU'):t('미확인','Unknown')}</td><td>{order.maxBoxScu>0?order.maxBoxScu+' SCU':t('별도 규격','Special / unknown')}</td></tr>)}</tbody></table></div>
    {(['pickup','dropoff'] as const).map(role=><section key={role}><h3>{role==='pickup'?t('픽업 후보','Pickup candidates'):t('배송 후보','Delivery candidates')}</h3><p>{record[role].length?record[role].join(' / '):t('수주 후 계약·로그에서 확인','Confirm from the accepted contract and log')}</p></section>)}
    {record.description&&<section><h3>{t('미션 내용 원문','Original mission description')}</h3><p>{record.description}</p></section>}
    <details><summary>{t(`연결된 정의 ${record.ids.length}개`,`Linked definitions: ${record.ids.length}`)}</summary><p className="archive-ids">{record.ids.join('\n')}</p></details>
   </details>
   <ArchiveReference ids={record.ids} data={data} locale={locale}/>
  </article>)}</div>
  {rows.length>shown&&<button type="button" className="archive-more" onClick={()=>setShown(value=>value+24)}>{t('24개 유형 더 보기','Show 24 more types')}</button>}
  <footer className="archive-sources"><a href={`https://limmin3-sudo.github.io/stam-freight-control/operations-intel.html?lang=${en?'en':'ko'}`} target="_blank" rel="noopener noreferrer">{t('기존 자료실','Legacy reference library')} ↗</a> · {t('원본 출처','Original sources')} · <a href="https://scmdb.dev/" target="_blank" rel="noopener noreferrer">SCMDB ↗</a> · <a href="https://api.star-citizen.wiki/missions" target="_blank" rel="noopener noreferrer">Star Citizen Wiki ↗</a></footer>
 </div>;
}
