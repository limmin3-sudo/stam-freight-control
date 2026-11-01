// Completed-run history and totals ("운항 기록"). Stored in the browser and synced with the account when signed in.
export const HISTORY_KEY='sfc-history';
const LIMIT=500;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(Number(n)||0).toLocaleString('ko-KR');
const hm=s=>{const m=Math.round((Number(s)||0)/60);return m>=60?`${Math.floor(m/60)}시간 ${m%60}분`:`${m}분`;};

export function readHistory(storage=localStorage){try{const v=JSON.parse(storage.getItem(HISTORY_KEY)||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
// Same run finished again after an undo replaces its record instead of counting twice.
export function addRecord(records,record){const rest=records.filter(r=>r.id!==record.id);return [record,...rest].slice(0,LIMIT);}
export function summarize(records){
 const s={runs:records.length,reward:0,scu:0,seconds:0,missions:0,byShip:new Map()};
 for(const r of records){s.reward+=r.reward||0;s.scu+=r.scu||0;s.seconds+=r.seconds||0;s.missions+=r.missions?.length||0;
  const k=r.ship||'함선 미상',b=s.byShip.get(k)||{runs:0,reward:0,scu:0,seconds:0};b.runs++;b.reward+=r.reward||0;b.scu+=r.scu||0;b.seconds+=r.seconds||0;s.byShip.set(k,b);}
 s.perHour=s.seconds>0?s.reward/(s.seconds/3600):0;return s;}

export function createHistory(button,{notify=()=>{}}={}){
 const dialog=document.createElement('dialog');dialog.className='history-dialog';document.body.append(dialog);
 function render(){const list=readHistory(),s=summarize(list);
  dialog.innerHTML=`<div class="dialog-title"><h2>운항 기록</h2><button type="button" data-close aria-label="닫기">×</button></div>
  ${list.length?`<div class="history-totals"><div><small>누적 수익</small><b>${fmt(s.reward)} <em>aUEC</em></b></div><div><small>운항</small><b>${s.runs}회</b></div><div><small>완료 계약</small><b>${s.missions}건</b></div><div><small>운송량</small><b>${fmt(s.scu)} SCU</b></div><div><small>운항 시간</small><b>${hm(s.seconds)}</b></div><div><small>평균 시간당</small><b>${fmt(s.perHour)} <em>aUEC/h</em></b></div></div>
  <h3>함선별</h3><table class="history-ships"><thead><tr><th>함선</th><th>운항</th><th>수익</th><th>SCU</th><th>시간당</th></tr></thead><tbody>${[...s.byShip].sort((a,b)=>b[1].reward-a[1].reward).map(([n,b])=>`<tr><td>${esc(n)}</td><td>${b.runs}</td><td>${fmt(b.reward)}</td><td>${fmt(b.scu)}</td><td>${fmt(b.seconds?b.reward/(b.seconds/3600):0)}</td></tr>`).join('')}</tbody></table>
  <h3>지난 운항</h3><ol class="history-list">${list.map(r=>`<li><details><summary><span>${new Date(r.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span><b>${esc(r.ship)}</b><span>계약 ${r.missions?.length||0}건 · ${fmt(r.scu)} SCU · ${hm(r.seconds)}</span><strong>${fmt(r.reward)} aUEC</strong></summary>
   <ul>${(r.missions||[]).map(m=>`<li>${esc(m.company||'')} ${esc(m.title||m.id)} · ${fmt(m.scu)} SCU · ${fmt(m.reward)} aUEC</li>`).join('')}</ul><p class="small subtle">${esc(r.route||'')} · 거점 ${r.stops||0}곳</p><button type="button" class="text-button" data-delete="${esc(r.id)}">이 기록 삭제</button></details></li>`).join('')}</ol>`
  :'<p>아직 완료한 운항이 없습니다. 운항 모드에서 마지막 거점까지 완료하면 함선·계약·수익·걸린 시간이 여기에 쌓입니다.</p>'}
  <p class="small subtle">기록은 이 브라우저에 저장되고, 로그인하면 계정에도 저장되어 다른 PC에서 함께 볼 수 있습니다. 수익은 계약에 입력된 보상 기준입니다.</p>`;
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(!confirm('이 운항 기록을 삭제할까요?'))return;try{localStorage.setItem(HISTORY_KEY,JSON.stringify(readHistory().filter(r=>r.id!==b.dataset.delete)));}catch{}render();});}
 if(button)button.onclick=()=>{render();dialog.showModal();};
 return {
  // Called when the last stop of a run is completed.
  record(entry){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(addRecord(readHistory(),entry)));notify(`운항 기록에 저장했습니다 · 이번 운항 ${fmt(entry.reward)} aUEC`);}catch{notify('운항 기록을 저장하지 못했습니다.',true);}},
  open:()=>{render();dialog.showModal();}};
}
