import {exportFlightBackup,validateFlightBackup,restoreFlightBackup,recoverFlightBackup,BACKUP_JOURNAL} from './flight-backup.mjs';
export function mountFlightBackup(storage){
 const button=document.getElementById('workspace-backup'),dialog=document.createElement('dialog');dialog.className='history-dialog';document.body.append(dialog);
 if(!storage){button.disabled=true;button.title='브라우저 저장 공간을 사용할 수 없습니다.';return;}
 button.onclick=()=>{
  const account=JSON.parse(storage.getItem('vh-account-meta')||'null')?.uid||'guest';
  dialog.innerHTML='<div class="dialog-title"><h2>운송 데이터 보관</h2><button type="button" data-close aria-label="닫기">×</button></div><p>현재 계정의 설정·기존 기록·직접 확인한 화물과 상자 구성·계약 선택·안내 단계를 파일로 보관합니다. 게임 로그 원문과 로그인 정보는 포함하지 않습니다.</p><p>다른 브라우저에서는 같은 게임 계약을 다시 읽어야 합니다. 백업으로 현재 게임 상태나 실제 위치를 만들어 내지 않습니다.</p><button type="button" data-export>백업 파일 저장</button><hr><label>백업 파일 선택 <input type="file" accept="application/json,.json" data-file></label><p data-summary></p><p>복원하면 현재 계정의 대상 기록을 교체합니다. 로그인 상태라면 기존 설정·운항 기록의 변경은 계정에도 동기화됩니다. 먼저 현재 백업을 저장해 주세요.</p><button type="button" data-import disabled>확인한 백업으로 복원</button><button type="button" data-recover hidden>이전 기록 복구</button><p data-status role="status"></p>';
  const status=dialog.querySelector('[data-status]'),apply=dialog.querySelector('[data-import]');let selected=null;
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();const report=e=>{status.textContent=e.message||String(e);};
  dialog.querySelector('[data-export]').onclick=()=>{try{const content=JSON.stringify(exportFlightBackup(storage),null,2);const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='STAM-flight-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='백업 파일을 저장했습니다.';}catch(e){report(e);}};
  dialog.querySelector('[data-file]').onchange=async e=>{selected=null;apply.disabled=true;try{const f=e.target.files[0];if(!f)return;if(f.size>6000000)throw Error('6 MB 이내의 백업 파일을 선택해 주세요.');selected=validateFlightBackup(await f.text());dialog.querySelector('[data-summary]').textContent=`설정 ${Object.keys(selected.settings).length}항목 · 운송 기록 ${Object.keys(selected.flight).length}분류 · 저장 시각 ${selected.createdAt||'미확인'}`;apply.disabled=false;}catch(error){report(error);}};
  apply.onclick=()=>{if(!selected)return;try{restoreFlightBackup(storage,selected,account);location.reload();}catch(e){report(e);dialog.querySelector('[data-recover]').hidden=!storage.getItem(BACKUP_JOURNAL);}};
  const recover=dialog.querySelector('[data-recover]');recover.hidden=!storage.getItem(BACKUP_JOURNAL);recover.onclick=()=>{try{recoverFlightBackup(storage);location.reload();}catch(e){report(e);}};
  dialog.showModal();
 };
}
