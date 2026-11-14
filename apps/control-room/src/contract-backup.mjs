import {missionFor} from './flight-engine.mjs';
import {jobFromMission} from './saved-flight.mjs';
import {hasPlace} from './mission-trial.ts';

export function exportContracts(jobs){return JSON.stringify(jobs.map(missionFor),null,2);}
export function importContracts(text,existing){
  const missions=JSON.parse(text);
  if(!Array.isArray(missions)||!missions.length)throw Error('계약 목록을 담은 JSON 백업을 선택하세요.');
  const seen=new Set(),existingIds=new Set(existing.map(job=>job.id));
  const jobs=[];
  for(const mission of missions){
    if(!mission || typeof mission.id!=='string'||!mission.id.trim()||seen.has(mission.id)||
      (mission.title!=null&&typeof mission.title!=='string')||
      (mission.reward!=null&&(!Number.isFinite(mission.reward)||mission.reward<0))||
      !Array.isArray(mission.cargo)||!mission.cargo.length)throw Error('계약 번호·보상·화물 목록을 확인하세요.');
    seen.add(mission.id);
    for(const row of mission.cargo){
      if(!row||typeof row.commodity!=='string'||!row.commodity.trim()||
        (row.pickupId&&!hasPlace(row.pickupId))||(row.dropoffId&&!hasPlace(row.dropoffId))||
        (row.scu!=null && row.scu!=='' && (!Number.isSafeInteger(row.scu)||row.scu<0||row.scu>10000))||
        (row.boxes!=null && (!Array.isArray(row.boxes)||row.boxes.some(b=>!b||![1,2,4,8,16,24,32].includes(b.size)||!Number.isSafeInteger(b.count)||b.count<1||b.count>10000))))
        throw Error('화물의 거점·수량·상자 규격을 확인하세요.');
    }
    if(!existingIds.has(mission.id)){
      const job=jobFromMission(mission);
      if(job.shipments.some(row=>!row.from||!row.to))job.state='incomplete';
      jobs.push(job);
    }
  }
  return {jobs,skipped:missions.length-jobs.length};
}
