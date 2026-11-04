// User planning assumptions, not observed gameplay durations.
export const TIMING_FIELDS=[
 ['jumpMinutes','점프 통과 (분/회)',8,1,60],
 ['dockMinutes','정박 준비 (분/방문)',3,0,60],
 ['surfaceMinutes','착륙·이륙 여유 (분/편도)',5,0,60],
 ['surfaceDistanceKm','지상 접근 거리 (km/편도)',30,0,500],
 ['spaceDistanceKm','우주 거점 접근 거리 (km/편도)',20,0,500],
 ['secondsPerBox','상자 작업 (초/개·작업)',25,1,600],
 ['spool','구간 준비 여유 (초)',25,0,600],
 ['detourFactor','거리 여유 배율',1.15,1,3],
];
export function timingSettings(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('운항 시간 설정을 확인해 주세요.');
 return Object.fromEntries(TIMING_FIELDS.map(([key,label,fallback,min,max])=>{
  const n=Object.hasOwn(value,key)?value[key]:fallback;
  if(!Number.isFinite(n)||n<min||n>max)throw Error(`${label}: ${min}~${max} 범위로 입력해 주세요.`);
  return [key,n];
 }));
}
export function createTimingStore(storage){
 const owner=()=>{try{return JSON.parse(storage?.getItem('vh-account-meta')||'null')?.uid||'guest';}catch{return 'guest';}},initial=owner();
 const read=()=>{
  if(owner()!==initial)throw Error('계정이 바뀌었습니다. 화면을 새로 열어 주세요.');
  try{const raw=storage?.getItem('vh-settings');if(!raw)return {};if(raw.length>900000)throw Error();const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}
  catch{throw Error('저장된 운항 설정을 읽지 못했습니다. 기존 기록을 먼저 확인해 주세요.');}
 };
 return {get:()=>timingSettings(read()),save(patch){
  const current=read(),next=timingSettings(patch===null?{}:{...current,...patch});
  const serialized=JSON.stringify({...current,...next});if(serialized.length>900000)throw Error('운항 설정 저장 공간이 부족합니다.');
  try{if(!storage)throw Error();storage.setItem('vh-settings',serialized);}catch{throw Error('운항 설정을 저장하지 못했습니다. 이전 설정을 유지합니다.');}
  return next;
 }};
}
export function routeTimeSummary(route){
 if(!route||!Number.isFinite(route.seconds)||route.seconds<0)return null;
 const transit=route.visits.reduce((sum,v)=>sum+(v.leg?.seconds||0),0);
 if(!Number.isFinite(transit)||transit<0||transit>route.seconds+.01)return null;
 const handlingIncluded=route.handlingIncluded!==false;
 return {total:route.seconds,transit,handling:handlingIncluded?Math.max(0,route.seconds-transit):null,handlingIncluded};
}
