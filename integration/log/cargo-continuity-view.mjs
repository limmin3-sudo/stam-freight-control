import {partnerVoice,partnerSpeaker} from './partner-voice.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function cargoContinuityDialog({plan,store,partner,getPlan,onApply}){
 const d=el('dialog');d.className='contract-removal cargo-continuity-dialog';d.setAttribute('aria-label','적재 상태 확인');
 const voice=partnerVoice(partner);d.append(el('h2','적재 상태 확인'),partnerSpeaker(partner,voice.cargoCheck));
 const saved=store.snapshot();if(saved.error)throw Error(saved.error);
 const active=new Map(saved.records.flatMap(r=>r.boxes.map(b=>[b.boxId,b]))),boxes=[...(plan?.packing?.boxes||[]).filter(b=>!b.retained),...saved.records.filter(r=>r.ship.id===plan.ship.id&&plan.contracts.some(c=>c.id===r.id)).flatMap(r=>r.boxes.filter(b=>b.state==='delivered'))],checks=[];
 const action=el('select');action.setAttribute('aria-label','화물 상태 작업');for(const [id,name] of [['lock','실린 화물 위치 유지'],['deliver','배송한 화물 반영'],['undo','배송 기록 되돌리기']]){const o=el('option',name);o.value=id;action.append(o);}d.append(action);
 const location=el('select');location.setAttribute('aria-label','작업한 거점');const none=el('option','현재 작업한 거점을 선택해 주세요');none.value='';location.append(none);
 const stopIds=new Set(plan.route?.visits.map(v=>v.locationId)||[]);for(const b of boxes)if(b.dropoffId)stopIds.add(b.dropoffId);if(plan.startId)stopIds.add(plan.startId);
 const names=new Map(plan.stops.map(p=>[p.id,p.name]));for(const id of stopIds){const o=el('option',names.get(id)||id);o.value=id;location.append(o);}d.append(location);
 const all=el('button','표시된 화물 모두 선택');all.type='button';const list=el('div');list.className='cargo-state-boxes';d.append(all,list);
 for(const b of boxes){const label=el('label'),check=el('input');check.type='checkbox';check.dataset.cargoBox=b.boxId;check.dataset.destination=b.dropoffId;label.append(check,document.createTextNode(`${b.commodity} · ${b.size} SCU${b.reservation?' 예약 영역':''} → ${names.get(b.dropoffId)||'배송지 확인 중'} · ${plan.ship.grids[b.bin].name}${active.get(b.boxId)?.state==='aboard'?' · 위치 유지 중':''}`));list.append(label);checks.push({box:b,check,label});}
 const confirmation=el('label'),yes=el('input'),line=el('span');yes.type='checkbox';confirmation.append(yes,line);d.append(confirmation);
 const help=el('p'),message=el('p');message.setAttribute('role','status');d.append(help,message);
 const render=()=>{yes.checked=false;for(const c of checks){c.check.checked=false;c.label.hidden=action.value==='undo'?active.get(c.box.boxId)?.state!=='delivered':active.get(c.box.boxId)?.state==='delivered'||action.value==='deliver'&&(!active.has(c.box.boxId)||c.box.reservation||location.value&&c.box.dropoffId!==location.value);}line.textContent=action.value==='lock'?'선택한 화물이 표시된 위치에 실려 있습니다.':action.value==='undo'?'선택한 화물이 이전에 기록한 위치에 실려 있습니다.':'선택한 화물을 해당 배송지에 전달했습니다.';help.textContent=action.value==='lock'?voice.cargoLockHelp:action.value==='undo'?voice.cargoUndoHelp:voice.cargoDeliveryHelp;};action.onchange=render;location.onchange=render;render();
 all.onclick=()=>{for(const c of checks)if(!c.label.hidden)c.check.checked=true;};
 const apply=el('button','적재 상태 반영'),cancel=el('button','취소');apply.type=cancel.type='button';cancel.onclick=()=>d.close();
 apply.onclick=()=>{try{
  if(getPlan()!==plan)throw Error('계획이 갱신됐습니다. 창을 닫고 새 배치에서 확인해 주세요.');
  const selected=checks.filter(c=>!c.label.hidden&&c.check.checked).map(c=>c.box.boxId);
  if(!selected.length||!yes.checked||!location.value)throw Error('화물과 작업 거점, 확인 항목을 선택해 주세요.');
  if(action.value==='lock')store.lock(plan,selected);else if(action.value==='undo')store.undoDelivery(selected,plan.ship);else store.deliver(selected,location.value);
  onApply(location.value);d.close();
 }catch(e){message.textContent=e.message;}};
 d.append(apply,cancel,el('small','사용자 확인으로 기록합니다. 게임의 적재·배송·계약 완료를 대신 처리하지 않습니다.'));d.onclose=()=>d.remove();document.body.append(d);d.showModal();return d;
}
