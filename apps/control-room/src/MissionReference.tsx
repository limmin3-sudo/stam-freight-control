import type {Job} from './mission-trial';
import type {Locale} from './navigation';

export function MissionReference({job,locale}:{job:Job;locale:Locale}){
 const info=job.referenceInfo;if(!info)return null;
 const en=locale==='en',source=(field:string)=>(info.provenance[field]||[]).map(key=>info.sources[key]?`${info.sources[key]!.name} ${info.sources[key]!.version}`:key).join(' · ');
 const type=info.values.type,description=info.values.description,reward=info.values.reward as {min?:number;max?:number}|undefined;
 return <details className="receipt-reference"><summary>{en?'Mission reference · Sources':'미션 자료 · 출처'}</summary>
  {typeof type==='string'&&<p><small>{en?'Mission type':'미션 유형'} · {source('type')}</small><span>{type}</span></p>}
  {reward&&Number.isSafeInteger(reward.min)&&Number.isSafeInteger(reward.max)&&<p><small>{en?'Catalogue reward reference':'목록 보상 참고'} · {source('reward')}</small><span>{reward.min!.toLocaleString()}{reward.min!==reward.max?'–'+reward.max!.toLocaleString():''} aUEC</span></p>}
  {typeof description==='string'&&<p><small>{en?'Mission description':'미션 내용 원문'} · {source('description')}</small><span>{description}</span></p>}
  <small>{en?'SCMDB comes first; Wiki fills missing fields. Confirm the accepted contract.':'SCMDB를 우선하고 빈 정보는 위키로 보충합니다. 실제 수주 내용을 우선하세요.'}</small>
 </details>;
}
