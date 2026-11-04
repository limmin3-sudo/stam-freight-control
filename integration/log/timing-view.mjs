import {TIMING_FIELDS} from './timing.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function mountTiming(host,{store,onChange,canEdit=()=>true}){
 const root=el('details');root.className='timing-settings';root.append(el('summary','정박·상하차 시간 설정'));
 const body=el('div');root.append(body);host.append(root);let signature='',dirty=false;
 function render(){let value;try{value=store.get();}catch(e){body.replaceChildren(el('p',e.message));const reset=el('button','시간 설정 기본값으로 복원');reset.type='button';reset.onclick=()=>apply(null);reset.disabled=!canEdit();body.append(reset);signature='';return;}
  const key=JSON.stringify([value,canEdit()]);if(key===signature)return;signature=key;body.replaceChildren();
  const form=el('form');form.className='timing-fields';
  for(const [key,label,,min,max] of TIMING_FIELDS){const row=el('label',label),input=el('input');input.name=key;input.type='number';input.min=min;input.max=max;input.step='any';input.required=true;input.value=value[key];input.setAttribute('aria-label',label);input.disabled=!canEdit();input.oninput=()=>{dirty=true;message.textContent='아직 적용하지 않은 값입니다. 시간 설정을 적용하거나 변경을 취소해 주세요.';};row.append(input);form.append(row);}
  form.append(el('p','실제 운항 기록이 아닌 계획용 가정입니다. 상자 작업 시간은 적재·하역 각각에 적용하며, 상자 구성·픽업별 배분을 모르면 합산하지 않습니다.'));
  form.append(el('p','구간 준비 여유는 드라이브 준비·재사용 대기 시간에 추가됩니다. 접근 시간은 선택한 함선의 속도를 사용합니다.'));
  const save=el('button','시간 설정 적용');save.type='submit';save.disabled=!canEdit();const reset=el('button','기본값으로 복원');reset.type='button';reset.disabled=!canEdit();reset.onclick=()=>apply(null);const discard=el('button','변경 취소');discard.type='button';discard.disabled=!canEdit();discard.onclick=()=>{dirty=false;signature='';render();message.textContent='저장된 시간 설정으로 돌아왔습니다.';};form.append(save,reset,discard);form.onsubmit=e=>{e.preventDefault();if(form.reportValidity())apply(Object.fromEntries(TIMING_FIELDS.map(([key])=>[key,Number(form.elements[key].value)])));};body.append(form);
 }
 const message=el('p');message.className='timing-message';message.setAttribute('role','status');root.append(message);
 function apply(patch){if(!canEdit())return;try{store.save(patch);dirty=false;signature='';render();message.textContent='시간 설정을 반영했습니다. 출항 준비를 다시 확인해 주세요.';onChange();}catch(e){message.textContent=e.message;}}
 render();return {root,isDirty:()=>dirty,refresh:render,destroy:()=>root.remove()};
}
