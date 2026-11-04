import {ACCOUNT_META} from '../../sync.mjs';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const validId=id=>typeof id==='string'&&UUID.test(id)&&id!=='00000000-0000-0000-0000-000000000000';
const fields=['at','amount','notificationId','missionId','linkedMissionId'];
function observation(r){
 if(!r||typeof r.at!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(r.at)||(!Number.isFinite(Date.parse(r.at))||new Date(r.at).toISOString()!==r.at)||!Number.isSafeInteger(r.amount)||r.amount<=0||typeof r.notificationId!=='string'||!/^\d{1,20}$/.test(r.notificationId)||(r.missionId!==null&&!validId(r.missionId)))throw Error('지급 기록 형식을 확인하지 못했습니다.');
 return {at:r.at,amount:r.amount,notificationId:r.notificationId,missionId:r.missionId};
}
// Match the log collector's evidence identity, independent of filename/line number.
export const rewardKey=r=>JSON.stringify([r.at,r.notificationId,r.amount,r.missionId]);
function checked(rows){
 if(!Array.isArray(rows)||rows.length>2048)throw Error('지급 기록 보관 한도(2,048건)를 넘었거나 기록이 손상됐습니다.');
 const seen=new Set();let total=0;
 return rows.map(r=>{const item=observation(r),key=rewardKey(item);if(Object.keys(r).some(k=>!fields.includes(k))||seen.has(key)||(r.linkedMissionId!==null&&!validId(r.linkedMissionId))||(r.missionId&&r.linkedMissionId))throw Error('지급 기록을 읽지 못했습니다.');seen.add(key);total+=r.amount;if(!Number.isSafeInteger(total))throw Error('지급 합계가 계산 범위를 넘었습니다.');return {...item,linkedMissionId:r.linkedMissionId};});
}
export function rewardCandidates(contracts){
 return contracts.filter(c=>validId(c.missionId)&&c.progress?.outcome==='completed'&&!c.conflicts?.length&&(c.acceptanceObservations?.length||c.participation?.selfJoinObserved));
}
// Separate ledger: never writes sfc-history (which can already include the same reward).
// Only structured evidence and optional user assignment. No log text/player/name fields.
export function createRewardStore(storage){
 const owner=()=>{const raw=storage?.getItem(ACCOUNT_META);if(!raw)return 'guest';const v=JSON.parse(raw);if(!v||typeof v.uid!=='string'||!v.uid||v.uid.length>256)throw Error();return v.uid;};
 let initial,key,raw,rows=[],loadError;
 try{if(!storage)throw Error();initial=owner();key='stam-rewards-v1:'+encodeURIComponent(initial);raw=storage.getItem(key);if(raw){if(raw.length>600000)throw Error();const v=JSON.parse(raw);if(v.version!==1||Object.keys(v).some(k=>!['version','records'].includes(k)))throw Error();rows=checked(v.records);}}
 catch{loadError='지급 기록을 불러오지 못했습니다. 기존 기록을 보존하고 자동 보관을 멈췄습니다.';}
 function check(){if(loadError)throw Error(loadError);if(owner()!==initial)throw Error('계정이 바뀌었습니다. 화면을 다시 열어 주세요.');if(storage.getItem(key)!==raw)throw Error('다른 창에서 지급 기록이 바뀌었습니다. 새로고침해 주세요.');}
 function save(next){check();const clean=checked(next);if(JSON.stringify(clean)===JSON.stringify(rows))return;const text=JSON.stringify({version:1,records:clean});if(text.length>600000)throw Error('지급 기록 보관 공간이 부족합니다.');try{storage.setItem(key,text);}catch{throw Error('지급 기록을 저장하지 못했습니다. 이전 기록은 유지됩니다.');}rows=clean;raw=text;}
 return {
  snapshot(){try{check();return {records:structuredClone(rows),error:null};}catch(e){return {records:[],error:e.message};}},
  observe(rewards){check();const next=[...rows],seen=new Set(rows.map(rewardKey));for(const reward of rewards){const r=observation(reward),id=rewardKey(r);if(!seen.has(id)){seen.add(id);next.push({...r,linkedMissionId:null});}}save(next);},
  link(key,missionId,contracts){check();const r=rows.find(r=>rewardKey(r)===key);if(!r)throw Error('지급 기록을 다시 확인해 주세요.');if(r.missionId)throw Error('로그에 계약 ID가 있는 지급은 다른 계약에 연결할 수 없습니다.');if(missionId!==null&&!rewardCandidates(contracts).some(c=>c.missionId===missionId))throw Error('완료가 확인된 운송 계약만 연결할 수 있습니다.');save(rows.map(r=>rewardKey(r)===key?{...r,linkedMissionId:missionId}:r));},
 };
}
