import {ACCOUNT_META} from '../../sync.mjs';
import {rewardCandidates} from './reward-store.mjs';
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
function checked(rows){
 if(!Array.isArray(rows)||rows.length>2048)throw Error('완료 계약 보관 한도를 확인해 주세요.');
 const seen=new Set();return rows.map(r=>{
  if(!r||!uuid.test(r.missionId)||seen.has(r.missionId)||typeof r.at!=='string'||!Number.isFinite(Date.parse(r.at))||new Date(r.at).toISOString()!==r.at||Object.keys(r).some(k=>!['missionId','at'].includes(k)))throw Error('완료 계약 기록을 확인해 주세요.');
  seen.add(r.missionId);return {missionId:r.missionId,at:r.at};
 });
}
export function createCompletionStore(storage){
 const owner=()=>JSON.parse(storage?.getItem(ACCOUNT_META)||'null')?.uid||'guest';
 let initial,key,raw,records=[],error=null;
 try{initial=owner();key='stam-completions-v1:'+encodeURIComponent(initial);raw=storage.getItem(key);if(raw){if(raw.length>400000)throw Error();const v=JSON.parse(raw);if(v.version!==1||Object.keys(v).some(k=>!['version','records'].includes(k)))throw Error();records=checked(v.records);}}catch{error='완료 계약 기록을 불러오지 못했습니다. 기존 기록을 보존합니다.';}
 const check=()=>{if(error)throw Error(error);if(owner()!==initial||storage.getItem(key)!==raw)throw Error('계정 또는 완료 기록이 바뀌었습니다. 화면을 다시 열어 주세요.');};
 return {
  snapshot(){try{check();return {records:structuredClone(records),error:null};}catch(e){return {records:[],error:e.message};}},
  observe(contracts){
   check();const byId=new Map(records.map(r=>[r.missionId,r]));
   // A later contradictory terminal observation invalidates the stored completion.
   for(const c of contracts)if(c.progress?.outcome==='conflict'||['failed','abandoned'].includes(c.progress?.outcome))byId.delete(c.missionId);
   for(const c of rewardCandidates(contracts))if(c.progress.observedAt)byId.set(c.missionId,{missionId:c.missionId,at:c.progress.observedAt});
   const next=checked([...byId.values()]);if(JSON.stringify(next)===JSON.stringify(records))return;
   const value=JSON.stringify({version:1,records:next});storage.setItem(key,value);records=next;raw=value;
  },
 };
}
// Never add legacy declared rewards and observed payments: they may describe the
// same money without a shared ID. Report both measures, rather than double count.
export function completionTotals(completed,rewards){
 const ids=new Set(completed.map(c=>c.missionId)),paid=new Set();let income=0,unassigned=0;
 for(const r of rewards){const id=r.missionId||r.linkedMissionId;if(id&&ids.has(id)){income+=r.amount;paid.add(id);}else unassigned+=r.amount;}
 return {completed:ids.size,paidContracts:paid.size,income,unassigned};
}
