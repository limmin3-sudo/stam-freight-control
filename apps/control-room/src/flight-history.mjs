import {addRecord,HISTORY_KEY} from '../../../history.mjs';
import {jobVolume,samples,placeName,hasPlace} from './mission-trial.ts';

export function updateFlightHistory(session,previousRun,storage=localStorage){
  const {draft,plan,run}=session;
  if(!run||!plan||!run.startedAt||run.finished===previousRun.finished)return;
  // Training contracts must not appear in account earnings.
  const contracts=draft.jobs.filter(job=>{
    if(session.receiptReview?.excluded.includes(job.id))return false;
    const sample=samples.find(example=>example.id===job.id);
    // Older backups exported the example's English title and retained its short ID.
    return !sample || (job.mission && job.mission.title!==sample.title[1]);
  });
  if(!contracts.length)return;
  const records=JSON.parse(storage.getItem(HISTORY_KEY)||'[]');
  if(!Array.isArray(records))throw Error('운항 기록을 읽지 못했습니다.');
  const id='console:'+run.startedAt;
  let next=records.filter(r=>r.id!==id);
  if(run.finished){
    const missions=contracts.map(j=>({id:j.id,title:j.title[0],reward:j.pay,_rewardKnown:!j.rewardUnknown,scu:jobVolume(j)}));
    const unknown=missions.filter(j=>!j._rewardKnown).length;
    const name=id=>hasPlace(id)?placeName(id,0):plan.points.find(p=>p.id===id)?.name||id;
    next=addRecord(records,{id,at:Date.now(),seconds:run.elapsed,ship:plan.ship.name,shipId:plan.ship.id,
      missions,reward:missions.reduce((n,j)=>n+(j._rewardKnown?j.reward:0),0),rewardUnknownCount:unknown,_rewardKnown:!unknown,
      scu:missions.reduce((n,j)=>n+j.scu,0),route:name(draft.start)+' → '+name(run.positionId),
      stops:run.completedStops??plan.visits.length,distanceMeters:run.distanceMeters??null});
  }
  storage.setItem(HISTORY_KEY,JSON.stringify(next));
  window.dispatchEvent(new Event('sfc-history-changed'));
}
