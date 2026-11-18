import type {SuiteOptions} from './trade-suite';
import type {MarketSnapshot} from './trade-data';
import type {Locale} from './navigation';
import {ApprovedGlass} from './ApprovedGlass';
export default function TradeConditionSummary({options:o,market,locale,onChange}:{options:SuiteOptions;market:MarketSnapshot;locale:Locale;onChange:(o:SuiteOptions)=>void}){
 const t=(k:string,e:string)=>locale==='en'?e:k;
 const rows:{label:string;remove:()=>void}[]=[];
 for(const key of ['commodityIds','excludeCommodityIds','excludeTerminalIds','excludeSystems','excludeFactions','excludePlanets','facilities'] as const)for(const value of o[key])rows.push({label:({commodityIds:t('포함','Include'),excludeCommodityIds:t('품목 제외','Exclude commodity'),excludeTerminalIds:t('거점 제외','Exclude terminal'),excludeSystems:t('행성계 제외','Exclude system'),excludeFactions:t('세력 제외','Exclude faction'),excludePlanets:t('행성권 제외','Exclude planet'),facilities:t('설비','Facility')}[key])+': '+(typeof value==='number'?(key==='excludeTerminalIds'?market.terminals:market.commodities).find(x=>x.id===value)?.name||value:value),remove:()=>onChange({...o,[key]:(o[key] as (string|number)[]).filter(x=>x!==value)})});
 if(o.destinationId)rows.push({label:t('목적지','Destination')+': '+market.terminals.find(x=>x.id===o.destinationId)?.name,remove:()=>onChange({...o,destinationId:0})});
 for(const key of ['system','faction'] as const)if(o[key])rows.push({label:o[key],remove:()=>onChange({...o,[key]:''})});
 return <div className="trade-filter-chips" aria-label={t('적용 중인 조건','Active conditions')}><span>{o.scope==='interstellar'?t('행성계 간','Between systems'):t('행성계 내부','Within system')} · {t('위험','Risk')} {{low:t('낮음','Low'),known:t('확인된 위험','Known risks'),all:t('제한 없음','Unrestricted')}[o.risk]} · {t('위법','Legality')} {{legal:t('합법만','Legal only'),known:t('확인된 합법·불법','Known legal/illegal'),all:t('미확인 포함','Include unknown')}[o.legality]}</span>{rows.map((r,i)=><button type="button" className="market-action" key={r.label+i} onClick={r.remove} aria-label={r.label+' '+t('해제','remove')}><ApprovedGlass/>{r.label} ×</button>)}</div>;
}
