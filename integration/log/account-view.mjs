import {createAccount} from '../../account-core.mjs';
import {createHistory} from '../../history-core.mjs';

// Account storage is separate from live log evidence and the estimated flight.
export function mountAccount({renderHistoryExtra}={}){
 const status=document.getElementById('account-status');
 const notify=(text,error=false)=>{status.textContent=text;status.classList.toggle('account-error',error);};
 const history=createHistory(document.getElementById('workspace-history'),{notify,renderExtra:renderHistoryExtra,
  emptyMessage:'아직 저장된 운항 기록이 없습니다. 기존 계정의 완료 기록을 불러올 수 있습니다. 개발판의 예상 이동은 완료 기록이나 수입으로 저장되지 않습니다.'});
 const account=createAccount(document.getElementById('workspace-login'),{notify,openHistory:history.open,resetHistory:history.reset,
  syncDescription:'함선·출발지·파트너·그리드 설정과 기존 운항 기록을 계정에 보관합니다. 로그 계약과 예상 이동은 전송하지 않습니다.',
  loginNote:'<div class="account-note"><b>기존 STAM 계정으로 이어서 사용하세요.</b><p>함선·출발지·파트너·그리드 설정과 기존 운항 기록을 계정에 보관합니다. 기존 미션·개인 장소 등 저장 데이터도 유지합니다.</p><p>Game.log 원문, 로그에서 읽은 계약, 연결 키와 예상 이동은 계정에 보내지 않습니다. 로그인 없이도 운송 계획을 사용할 수 있습니다.</p></div>'});
 window.addEventListener('pagehide',event=>{if(!event.persisted)account.dispose();});
 return account;
}
