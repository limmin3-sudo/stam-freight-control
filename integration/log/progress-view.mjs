import {contractLocations} from './locations.mjs';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const outcomes={completed:'계약 완료 기록',failed:'계약 실패 기록',abandoned:'계약 포기 기록',conflict:'완료 상태 확인 필요','ended-unverified':'종료 기록 · 결과 확인 필요'};
const states={completed:'목표 완료',failed:'목표 실패','in-progress':'진행 중',conflict:'상태 확인 필요',unconfirmed:'진행 정보 대기'};
export function progressLabel(contract){
 const p=contract.progress;if(!p)return '';
 return outcomes[p.outcome]||`${p.completedGoals}개 목표 완료 · 확인된 목표 ${p.observedGoals}개`;
}
export function renderProgress(contract,index){
 const p=contract.progress;if(!p)return el('span');
 const details=el('details',undefined,'contract-progress');details.dataset.progress=contract.missionId;
 details.append(el('summary',progressLabel(contract)));
 const body=el('div');
 if(p.observedAt)body.append(el('p',`종료 기록 시각 · ${new Date(p.observedAt).toLocaleString()}`,'detail'));
 const locations=new Map(contractLocations(contract,index).objectives.map(o=>[o.objectiveId,o]));
 for(const [i,g] of p.goals.entries()){
  const matched=locations.get(g.objectiveId),place=matched?.status==='coordinate-match'?matched.candidates[0].name:null;
  const role={pickup:'픽업',dropoff:'배송'}[g.role]||'목표';
  const row=el('div',undefined,'goal-progress');row.dataset.goal=g.objectiveId;
  row.append(el('strong',`${role} · ${place||`지점 확인 중 (${i+1})`}`),el('span',states[g.state]));
  if(g.quantity)row.append(el('small',`목표 수량 ${g.quantity.current}/${g.quantity.total} ${g.quantity.unit==='count'?'개':'SCU'} · 마지막 알림 기준`));
  if(g.quantityConflict)row.append(el('small','수량 기록이 달라 다시 확인해야 합니다.','notice'));
  if(g.at)row.append(el('small',`마지막 기록 · ${new Date(g.at).toLocaleString()}`));
  body.append(row);
 }
 if(!p.goals.length)body.append(el('p','목표 진행 기록을 기다리고 있습니다.'));
 body.append(el('p','로그에 확인된 목표만 표시합니다. 픽업 목표 완료는 함선 적재 확인과 다릅니다. 남은 상자와 실제 적재 위치는 별도로 확인해야 합니다.','detail'));
 details.append(body);return details;
}
export function renderRewards(host,rewards=[]){
 const wasOpen=!!host.querySelector('details')?.open;host.replaceChildren();host.hidden=!rewards.length;if(!rewards.length)return;
 const details=el('details');details.open=wasOpen;
 details.append(el('summary',`지급 알림 ${rewards.length}건`));
 details.append(el('p','로그에 찍힌 지급 알림입니다. 계약 ID가 없으면 앞서 완료한 계약에 임의로 붙이지 않습니다. 계정 누적 수입에는 자동으로 더하지 않습니다.','detail'));
 for(const r of rewards.slice(0,50)){
  const row=el('div',undefined,'credit-observation');row.append(el('strong',`${r.amount.toLocaleString()} aUEC`));
  row.append(el('span',r.attribution==='exact-mission-id'?`계약 ID 일치 · ${r.title||'제목 확인 중'}`:'계약 연결 미확인'));
  row.append(el('small',new Date(r.at).toLocaleString()));details.append(row);
 }
 if(rewards.length>50)details.append(el('p','최근 50건을 표시합니다.'));
 host.append(details);
}
