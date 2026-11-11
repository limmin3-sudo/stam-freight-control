import {useEffect,useState} from 'react';
import {elapsed} from './flight-session';
import type {Run, Session} from './flight-session';
import type {FlightPlan} from './flight-types';
import type {Locale} from './navigation';
import {placeName} from './mission-trial';

const duration=(seconds:number)=>{
  const total=Math.max(0,Math.floor(seconds));
  const parts=[Math.floor(total/60)%60,total%60].map(n=>String(n).padStart(2,'0'));
  if(total>=3600)parts.unshift(String(Math.floor(total/3600)));
  return parts.join(':');
};

export function nextStepName(plan:FlightPlan,run:Run,where:(id:string)=>string){
  const current=plan.visits[run.index];
  if(!current)return null;
  const inTransit=Boolean(current.jumps[run.jump]);
  const visit=inTransit?current:plan.visits[run.index+1];
  if(!visit)return null;
  const jump=visit.jumps[inTransit?run.jump+1:0];
  return jump?where(jump.entryId)+' → '+where(jump.exitId):where(visit.locationId);
}

export function RunDetails({session,locale}:{session:Session;locale:Locale}){
  const {draft,plan,run}=session;
  const [now,setNow] = useState(Date.now);
  useEffect(()=>{
    if(run?.since==null)return;
    const timer=window.setInterval(()=>setNow(Date.now()),1000);
    return ()=>window.clearInterval(timer);
  },[run?.since]);
  if(!plan||!run)return null;
  const t=(ko:string,en:string)=>locale==='en'?en:ko;
  const where=(id:string)=>placeName(id,locale==='ko'?0:1);
  const seconds=elapsed(run,now);
  const remaining=run.finished?0:Math.max(0,plan.seconds-(plan.visits[run.index-1]?.elapsed??0));
  const known=draft.jobs.filter(job=>!job.rewardUnknown);
  const reward=known.reduce((total,job)=>total+job.pay,0);
  const rate=run.started && seconds>0 && (run.finished||seconds>=30) && known.length?Math.round(reward*3600/(seconds+remaining)):null;
  return <section className="run-readout" aria-label={t('운항 기록','Flight record')}>
    <dl>
      <div><dt>{t('운항 시간','Elapsed')}</dt><dd>{duration(seconds)}</dd></div>
      {!run.finished&&<div><dt>{t('남은 예상 시간','Estimated remaining')}</dt><dd>{Math.ceil(remaining/60)} {t('분','min')}</dd></div>}
      <div><dt>{known.length===draft.jobs.length?t('계약 보상','Contract rewards'):t('확인된 보상','Confirmed rewards')}</dt><dd>{known.length?reward.toLocaleString()+' aUEC':'—'}</dd></div>
      <div><dt>{run.finished?t('시간당 수익','Earnings per hour'):t('예상 시간당 수익','Projected hourly earnings')}</dt><dd>{rate===null?'—':rate.toLocaleString()+' aUEC'}</dd></div>
    </dl>
    {!!run.log?.length&&<details><summary>{t('지난 구간 기록','Completed steps')} · {run.log.length}</summary>
      <table><thead><tr><th>{t('거점 · 점프','Stop or jump')}</th><th>{t('실측','Actual')}</th><th>{t('예상','Planned')}</th></tr></thead>
        <tbody>{run.log.map((step,index)=><tr key={index}><td>{step.name||(step.entryId?where(step.entryId)+' → '+where(step.locationId):where(step.locationId))}</td>
          <td>{step.seconds==null?'—':duration(step.seconds)}</td><td>{step.estimate==null?'—':duration(step.estimate)}</td></tr>)}</tbody>
      </table></details>}
  </section>;
}
