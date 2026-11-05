import {L} from './i18n.mjs';
export function createPlanReset({summary,onReset}){
 const dialog=document.createElement('dialog');dialog.className='plan-reset-dialog';dialog.id='plan-reset-dialog';dialog.setAttribute('aria-labelledby','plan-reset-title');document.body.append(dialog);
 let resolve=null;
 const finish=value=>{const done=resolve;resolve=null;if(dialog.open)dialog.close();done?.(value);};
 function render(final=false){
  dialog.innerHTML='<div class="dialog-title"><h2 id="plan-reset-title"></h2><button type="button" class="reset-cancel" aria-label="'+L('닫기','Close')+'">×</button></div><div class="reset-scroll"><p class="reset-step"></p><p class="reset-summary"></p><p class="reset-scope"></p><div class="reset-check"></div><p class="reset-error" role="alert"></p></div><div class="reset-actions"></div>';
  dialog.querySelector('h2').textContent=final?L('계획 초기화 · 최종 확인','Reset plan · final confirmation'):L('계획 초기화 · 내용 확인','Reset plan · review');
  dialog.querySelector('.reset-step').textContent=final?'02 / 02':'01 / 02';
  const s=summary();dialog.querySelector('.reset-summary').textContent=L(`현재 계약 ${s.contracts}건과 경로 ${s.stops}곳, 현재 운항 진행을 초기화합니다.`,`Reset ${s.contracts} current contracts, ${s.stops} route stops and current run progress.`);
  dialog.querySelector('.reset-scope').textContent=L('완료한 운항 기록·계정·함선·개인 장소·설정·계약 수신함 카드는 유지합니다.','Completed run history, account, ships, personal places, settings and received inbox cards are preserved.');
  const cancel=document.createElement('button');cancel.type='button';cancel.className='quiet';cancel.textContent=L('취소','Cancel');cancel.onclick=()=>finish(false);
  const action=document.createElement('button');action.type='button';action.id='plan-reset-confirm';action.className=final?'danger':'primary';action.textContent=final?L('확인한 계획 초기화','Reset reviewed plan'):L('내용 확인 · 다음','Review · continue');
  if(final){const label=document.createElement('label');label.className='check-label';const check=document.createElement('input');check.type='checkbox';check.id='plan-reset-ack';label.append(check,document.createTextNode(L('현재 계약과 운항 진행이 삭제된다는 점을 확인했습니다.','I understand that current contracts and run progress will be deleted.')));dialog.querySelector('.reset-check').append(label);action.disabled=true;check.onchange=()=>action.disabled=!check.checked;action.onclick=()=>{if(!check.checked)return;action.disabled=true;try{onReset();finish(true);}catch(error){dialog.querySelector('.reset-error').textContent=error.message;action.disabled=false;}};}else action.onclick=()=>{render(true);dialog.querySelector('.reset-cancel').focus();};
  dialog.querySelector('.reset-actions').append(cancel,action);dialog.querySelector('.reset-cancel').onclick=()=>finish(false);
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);});dialog.addEventListener('close',()=>{if(!dialog.open){const done=resolve;resolve=null;done?.(false);}});
 return {open(){if(resolve)return Promise.resolve(false);render();const result=new Promise(done=>resolve=done);dialog.showModal();dialog.querySelector('.reset-cancel').focus();return result;}};
}
