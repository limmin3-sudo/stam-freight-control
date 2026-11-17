import {useState} from 'react';
import type {Locale} from './navigation';
import {shipConfiguration,shipLabel,shipMatches} from './ship-catalogue';
import './ship-select.css';
export type ShipChoice={id:string;name:string;capacity:number};
export default function ShipSelect({locale,value,options,onChange,allowEmpty=false}:{locale:Locale;value:string;options:ShipChoice[];onChange:(id:string)=>void;allowEmpty?:boolean}){
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko,[query,setQuery]=useState('');
 const matches=options.filter(s=>shipMatches(query,s.id,s.name)),selected=options.find(s=>s.id===value),extra=selected&&!matches.some(s=>s.id===selected.id),description=shipConfiguration(value,locale);
 const option=(s:ShipChoice)=><option key={s.id} value={s.id}>{shipLabel(s.id,s.name,locale)} · {s.capacity.toLocaleString()} SCU</option>;
 return <div className="ship-select"><label>{t('함선 검색','Find ship')}<input aria-label={t('함선 검색','Find ship')} type="search" placeholder={t('이름·모듈 검색','Search names or modules')} value={query} onChange={e=>setQuery(e.target.value)}/></label><label>{t('함선','Ship')}<select aria-label={t('함선','Ship')} value={value} onChange={e=>onChange(e.target.value)}>{allowEmpty&&<option value="">{t('선택','Select')}</option>}{extra&&<optgroup label={t('현재 선택 · 검색 조건 외','Current selection · outside search')}>{option(selected)}</optgroup>}{matches.map(option)}</select></label>{query&&<small role="status">{matches.length} {t('개 검색 결과 · 선택 전까지 함선은 바뀌지 않습니다.','matches · your ship stays unchanged until selected.')}</small>}{description&&<small className="ship-configuration">{description}</small>}</div>;
}
