import {hasReward,rewardValue,rewardText} from './reward-summary.mjs';
import {L} from './i18n.mjs';
// Completed-run history and totals ("운항 기록"). Stored in the browser and synced with the account when signed in.
export const HISTORY_KEY='sfc-history';
const LIMIT=500;
export const unknownRewardCount=record=>Number.isSafeInteger(record.rewardUnknownCount)&&record.rewardUnknownCount>=0?record.rewardUnknownCount:record.missions?.length?record.missions.filter(m=>rewardValue(m)===null).length:hasReward(record)?0:1;
const estimatedRewardCount=r=>Number.isSafeInteger(r.rewardEstimatedCount)?r.rewardEstimatedCount:(r.missions||[]).filter(m=>!hasReward(m)&&rewardValue(m)!==null).length;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(Number(n)||0).toLocaleString('ko-KR');
const hm=s=>{const m=Math.round((Number(s)||0)/60);return m>=60?`${Math.floor(m/60)}시간 ${m%60}분`:`${m}분`;};

export function readHistory(storage=localStorage){try{const v=JSON.parse(storage.getItem(HISTORY_KEY)||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
// Same run finished again after an undo replaces its record instead of counting twice.
export function addRecord(records,record){const rest=records.filter(r=>r.id!==record.id);return [record,...rest].slice(0,LIMIT);}
export function summarize(records){
 const s={runs:records.length,reward:0,scu:0,seconds:0,missions:0,distanceMeters:0,distanceRuns:0,byShip:new Map()};
 for(const r of records){if(Number.isFinite(r.distanceMeters)&&r.distanceMeters>=0){s.distanceMeters+=r.distanceMeters;s.distanceRuns++;}s.reward+=r.reward||0;s.scu+=r.scu||0;s.seconds+=r.seconds||0;s.missions+=r.missions?.length||0;
  const k=r.ship||'함선 미상',b=s.byShip.get(k)||{runs:0,reward:0,scu:0,seconds:0};b.runs++;b.reward+=r.reward||0;b.scu+=r.scu||0;b.seconds+=r.seconds||0;s.byShip.set(k,b);}
 s.perHour=s.seconds>0?s.reward/(s.seconds/3600):0;return s;}

export function formatHistoryDistance(meters){if(!Number.isFinite(meters))return '—';if(meters>=1e9)return `${(meters/1e9).toLocaleString('ko-KR',{maximumFractionDigits:1})} Gm`;if(meters>=1e6)return `${(meters/1e6).toLocaleString('ko-KR',{maximumFractionDigits:1})} Mm`;return `${(meters/1000).toLocaleString('ko-KR',{maximumFractionDigits:1})} km`;}
export function clearHistory(storage=localStorage){storage.setItem(HISTORY_KEY,'[]');}
export function historyTotalsMarkup(records=readHistory()){const s=summarize(records),unknown=records.reduce((n,r)=>n+unknownRewardCount(r),0),estimated=records.reduce((n,r)=>n+estimatedRewardCount(r),0),distance=s.runs&&!s.distanceRuns?'—':formatHistoryDistance(s.distanceMeters);
 return `<div class="history-totals"><div><small>${estimated?L('목록 기본 보상 포함 예상 누적수입','Estimated earnings including catalogue base'):unknown?L('확인된 누적수입','Confirmed earnings subtotal'):L('총 누적수입','Total earnings')}</small><b>${fmt(s.reward)} <em>aUEC</em></b></div><div><small>${L('총 운항거리','Total flight distance')}</small><b>${distance}</b></div><div><small>${L('완료 운항','Completed runs')}</small><b>${s.runs}</b></div><div><small>${L('완료 계약','Completed contracts')}</small><b>${s.missions}</b></div><div><small>${L('누적 운항 시간','Total flight time')}</small><b>${hm(s.seconds)}</b></div><div><small>${L('누적 운송량','Total cargo')}</small><b>${fmt(s.scu)} <em>SCU</em></b></div></div><p class="small subtle">${L('운항거리는 완료한 구간의 계산 거리 합계이며 항성계 점프 거리는 제외합니다. 수입은 완료 운항의 계약 보상 기준입니다.','Distance sums calculated completed legs, excluding system jump distances. Earnings use contract rewards from completed runs.')}${estimated?' '+L(`목록 기본 보상 ${estimated}건을 포함한 예상 수입입니다. 실제 지급액과 다를 수 있습니다.`,`Estimates include ${estimated} catalogue base reward(s) and may differ from actual payouts.`):''}${unknown?' '+L(`보상 미확인 ${unknown}건은 수입 합계에서 제외했습니다.`,`${unknown} unknown reward(s) are excluded from earnings.`):''}${s.distanceRuns<s.runs?' '+L(`거리 정보가 없는 예전 기록 ${s.runs-s.distanceRuns}건은 거리 합계에서 제외했습니다.`,`${s.runs-s.distanceRuns} older records without distance are excluded from the distance total.`):''}</p>`;
}

export function createHistory(button,{notify=()=>{}}={}){
 const dialog=document.createElement('dialog');dialog.className='history-dialog';document.body.append(dialog);
 function render(){const list=readHistory(),s=summarize(list);
  dialog.innerHTML=`<div class="dialog-title"><h2>운항 기록</h2><button type="button" data-close aria-label="닫기">×</button></div>
  ${list.length?`${historyTotalsMarkup(list)}<p class="small subtle">${L('평균 시간당 수입','Average hourly earnings')}: ${fmt(s.perHour)} aUEC/h</p><button type="button" class="quiet danger" data-reset>${L('운항기록 초기화','Reset run history')}</button>
  <h3>함선별</h3><table class="history-ships"><thead><tr><th>함선</th><th>운항</th><th>수익</th><th>SCU</th><th>시간당</th></tr></thead><tbody>${[...s.byShip].sort((a,b)=>b[1].reward-a[1].reward).map(([n,b])=>`<tr><td>${esc(n)}</td><td>${b.runs}</td><td>${fmt(b.reward)}</td><td>${fmt(b.scu)}</td><td>${fmt(b.seconds?b.reward/(b.seconds/3600):0)}</td></tr>`).join('')}</tbody></table>
  <h3>지난 운항</h3><ol class="history-list">${list.map(r=>`<li><details><summary><span>${new Date(r.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span><b>${esc(r.ship)}</b><span>계약 ${r.missions?.length||0}건 · ${fmt(r.scu)} SCU · ${hm(r.seconds)}</span><strong>${estimatedRewardCount(r)?fmt(r.reward)+' aUEC'+L(' · 목록 기준 예상',' · catalogue estimate'):hasReward(r)?fmt(r.reward)+' aUEC'+(unknownRewardCount(r)?L(' · 일부 확인',' · partial'):''):L('보상 미확인','Reward unknown')}</strong></summary>
   <ul>${(r.missions||[]).map(m=>`<li>${esc(m.company||'')} ${esc(m.title||m.id)} · ${fmt(m.scu)} SCU · ${esc(rewardText(m))}</li>`).join('')}</ul><p class="small subtle">${esc(r.route||'')} · ${formatHistoryDistance(r.distanceMeters)} · 거점 ${esc(r.stops||0)}곳</p><button type="button" class="text-button" data-delete="${esc(r.id)}">이 기록 삭제</button></details></li>`).join('')}</ol>`
  :'<p>아직 완료한 운항이 없습니다. 관제 모드에서 마지막 거점까지 완료하면 함선·계약·수익·걸린 시간이 여기에 쌓입니다.</p>'}
  <p class="small subtle">기록은 이 브라우저에 저장되고, 로그인하면 계정에도 저장되어 다른 PC에서 함께 볼 수 있습니다. 수익은 계약에 입력된 보상 기준입니다.</p>`;
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-reset]')?.addEventListener('click',reset);
  dialog.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(!confirm('이 운항 기록을 삭제할까요?'))return;try{localStorage.setItem(HISTORY_KEY,JSON.stringify(readHistory().filter(r=>r.id!==b.dataset.delete)));window.dispatchEvent(new Event('sfc-history-changed'));}catch{notify('운항 기록을 삭제하지 못했습니다.',true);}});}
 function reset(){if(!readHistory().length)return false;if(!confirm(L('완료된 운항기록과 누적 통계를 모두 초기화할까요? 진행 중인 미션과 설정은 유지됩니다. 로그인 중이면 계정에도 반영됩니다.','Reset all completed runs and cumulative statistics? Active missions and settings are kept. While signed in, this change also syncs to your account.')))return false;
  try{clearHistory();window.dispatchEvent(new Event('sfc-history-changed'));notify(L('운항기록과 누적 통계를 초기화했습니다.','Run history and totals have been reset.'));return true;}catch{notify(L('운항기록을 초기화하지 못했습니다.','Could not reset run history.'),true);return false;}}
 const refresh=()=>{if(dialog.open)render();};
 window.addEventListener('sfc-history-changed',refresh);
 window.addEventListener('storage',e=>{if(!e.key||e.key===HISTORY_KEY)refresh();});
 if(button)button.onclick=()=>{render();dialog.showModal();};
 return {
  // Called when the last stop of a run is completed.
  record(entry){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(addRecord(readHistory(),entry)));window.dispatchEvent(new Event('sfc-history-changed'));notify(`운항 기록에 저장했습니다 · ${estimatedRewardCount(entry)?'목록 기준 예상 '+fmt(entry.reward)+' aUEC':hasReward(entry)?(unknownRewardCount(entry)?'확인된 보상 합계 ':'이번 운항 ')+fmt(entry.reward)+' aUEC':'보상 미확인'}`);}catch{notify('운항 기록을 저장하지 못했습니다.',true);}},
  reset,open:()=>{render();dialog.showModal();}};
}
