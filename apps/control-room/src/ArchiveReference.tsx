import {useState} from 'react';
import type {Locale} from './navigation';
import type {MissionArchiveData} from './mission-archive-data.mjs';
import {referenceValue,type ReferenceStatus} from './archive-reference.mjs';

const labels:Record<string,readonly [string,string]>={reward:['목록 기본 보상','Catalogue base reward'],cargoRules:['목록 화물 규격','Catalogue cargo rules'],type:['미션 유형','Mission type'],company:['발주처','Contractor'],title:['미션 이름','Title'],description:['미션 내용 원문','Original description'],rank:['평판 단계','Reputation rank'],rankName:['평판 이름','Rank name'],systems:['항성계','Systems'],illegal:['불법 여부','Illegal'],shareable:['공유 가능','Shareable'],referenceMinutes:['목록 기준 시간 · 경로 예상 시간 아님','Catalogue time · not route ETA'],buyIn:['선납금','Buy-in']};
const statuses:Record<ReferenceStatus,readonly [string,string]>={unknown:['자료 없음','No reference'],unresolved:['자료 충돌 · 미확정','Conflicting references · unresolved'],preferred:['차이 있음 · 기준값 유지','Different values · reference retained'],matched:['두 출처 일치','Sources agree'],'wiki-only':['위키 단독 자료','Wiki-only reference'],supplemented:['위키로 누락 보완','Missing field supplied by Wiki'],primary:['기준 자료','Primary reference']};

export function ArchiveReference({ids,data,locale}:{ids:string[];data:MissionArchiveData;locale:Locale}){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState(ids[0]||''),[onlyDifferences,setOnlyDifferences]=useState(false);
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko;
 const info=open?data.reference(selected):null;
 const sourceNames=(keys:string[])=>keys.map(k=>info?.sources.find(s=>s.key===k)?.name||k).join(' + ')||t('출처 미확인','Source unknown');
 const differences=info?.fields.filter(f=>f.variants.length)??[];
 const checkedDate=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?t('확인일 미확인','Check date unknown'):new Intl.DateTimeFormat(en?'en-US':'ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(date)+' UTC';};
 return <details className="archive-reference" onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary>{t('출처·서로 다른 값 대조','Sources & differing values')}</summary>
  {open&&<>
   <p className="archive-reference-policy">{t('SCMDB를 기준으로 같은 정의의 누락 정보만 위키로 보완합니다. 두 자료의 게임 버전이 다를 수 있습니다.','SCMDB is primary; Wiki fills missing fields for the same definition. The sources may describe different game versions.')}</p>
   <p>{t('자료 열람 전용입니다. 실제 수주한 수량·보상·상자가 우선이며, 여기의 값은 내 계약이나 경로에 적용되지 않습니다. 수량·최대 상자만으로 실제 상자 구성을 확정할 수 없습니다.','Reference only. Accepted quantities, rewards and containers take priority. These values do not update your contracts or route. Quotas and maximum container sizes do not establish the actual box layout.')}</p>
   {ids.length>1&&<label className="archive-definition-select">{t('대조할 미션 정의','Definition to compare')}<select value={selected} onChange={e=>setSelected(e.target.value)}>{ids.map((id,i)=><option key={id} value={id}>{i+1} · {id}</option>)}</select></label>}
   <p className="archive-ids">{selected}</p>
   {!info?<p>{t('이 정의의 상세 출처 자료가 없습니다. 다른 미션의 값으로 채우지 않습니다.','No detailed reference for this definition. Values from other missions are not substituted.')}</p>:<>
    <ul className="archive-reference-sources">{info.sources.map(source=><li key={source.key}>{source.url?<a href={source.url} target="_blank" rel="noopener noreferrer">{source.name} ↗</a>:<span>{source.name}</span>}<span>{source.version||t('버전 미확인','Unknown version')}</span>{source.checkedAt&&<small>{t('자료 확인','Checked')} · {checkedDate(source.checkedAt)}</small>}</li>)}</ul>
    <label className="archive-difference-filter"><input type="checkbox" checked={onlyDifferences} onChange={e=>setOnlyDifferences(e.target.checked)}/>{t(`서로 다른 값만 보기 (${differences.length})`,`Only differing fields (${differences.length})`)}</label>
    {onlyDifferences&&!differences.length&&<p>{t('기록된 차이가 없습니다. 자료가 없는 항목까지 일치한다는 뜻은 아닙니다.','No differences recorded. Missing fields are not evidence of agreement.')}</p>}
    <div className="archive-reference-fields">{(onlyDifferences?differences:info.fields).map(field=>{
     const content=<>
      <p className="archive-reference-value">{referenceValue(field.key,field.value,locale)}</p>
      {field.value!==null&&<p className="archive-field-source">{sourceNames(field.sources)}</p>}
      {!!field.variants.length&&<div className="archive-variants">{field.variants.map((variant,i)=><div key={i}><strong>{sourceNames(variant.sources)}</strong><p>{referenceValue(field.key,variant.value,locale)}</p></div>)}</div>}
      {field.key==='description'&&<p>{t('대괄호의 이름·거점은 수주 후 정해지는 자리표시자입니다.','Bracketed names and places are placeholders resolved after acceptance.')}</p>}
     </>;
     const long=(field.key==='description'||field.key==='cargoRules')&&(field.value!==null||field.variants.length>0);
     return <section key={field.key} data-field={field.key} data-status={field.status}>
      <h3>{labels[field.key]?.[en?1:0]||field.key}<small>{statuses[field.status][en?1:0]}</small></h3>
      {long?<details className="archive-reference-long"><summary>{t('원문·출처별 값 펼치기','Expand original values by source')}</summary>{content}</details>:content}
     </section>;
    })}</div>
   </>}
  </>}
 </details>;
}
