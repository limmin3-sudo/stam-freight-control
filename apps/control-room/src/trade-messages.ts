import {TradeError} from './trade-operations';
const messages:Record<string,[string,string]>={
 active:['진행 중인 교역이 있습니다. 무역 관제에서 이어가거나 마감한 뒤 새 계획을 넣으세요.','A trade is already active. Continue or close it in trade control before adding another.'],
 account:['계정 확인 중이거나 계정이 변경되었습니다. 확인이 끝난 뒤 다시 열어주세요.','Account verification is pending or the account changed. Reopen after verification.'],
 conflict:['다른 화면에서 기록이 변경되었습니다. 최신 기록을 확인한 뒤 다시 입력하세요.','Records changed elsewhere. Review the latest records and try again.'],
 storage:['저장 자료를 읽거나 기록하지 못했습니다. 기존 자료는 덮어쓰지 않았습니다. 저장 공간을 확인하고 다시 시도하세요.','Records could not be read or saved. Existing data was not replaced. Check browser storage and retry.'],
 locks:['이 브라우저는 안전한 동시 저장을 지원하지 않습니다. 최신 브라우저에서 열어주세요.','This browser does not support safe concurrent saving. Use a current browser.'],
 quantity:['수량은 1 SCU 이상의 정수로 입력하세요.','Enter a whole quantity of at least 1 SCU.'],
 amount:['실제 합계 금액을 소수 둘째 자리까지 입력하세요.','Enter the actual total amount with at most two decimal places.'],
 capacity:['기록 후 선내 수량이 함선 기준 용량을 초과합니다. 수량을 확인하세요.','Recorded cargo would exceed the ship profile capacity. Check the quantity.'],
 aboard:['기록된 선내 수량보다 많이 판매하거나 손실 처리할 수 없습니다.','You cannot sell or write off more than the recorded cargo aboard.'],
 stage:['현재 단계에서 처리할 수 없습니다. 출발·도착 상태를 확인하세요.','This action does not match the current stage. Check departure and arrival.'],
 note:['비용 또는 손실의 사유를 입력하세요.','Enter a reason for the expense or loss.'],
 remaining:['선내 화물이 남아 있습니다. 실제 판매 또는 손실을 기록한 뒤 마감하세요.','Cargo remains aboard. Record its actual sale or loss before closing.'],
 closed:['이미 마감된 교역입니다. 필요한 경우 마지막 마감을 되돌리세요.','This trade is closed. Undo its last closing entry if needed.'],
 restoreOccupied:['현재 기록을 덮어쓰지 않습니다. 복원은 교역 기록이 비어 있을 때만 가능합니다.','Existing records are preserved. Restore is available only when the trade book is empty.'],
 size:['파일이나 기록이 너무 큽니다. 기존 기록을 백업한 뒤 확인하세요.','The file or trade book is too large. Back up existing records and review it.'],
 invalid:['교역 자료의 형식이나 수치를 확인할 수 없습니다. 원본을 유지했습니다.','The trade data format or values could not be validated. Existing data was preserved.'],
 duplicate:['이미 기록된 작업입니다. 최신 내역을 확인하세요.','This action was already recorded. Review the latest entries.'],
 missing:['해당 교역 기록을 찾지 못했습니다. 다시 열어주세요.','This trade was not found. Reopen trade control.'],
};
export function tradeMessage(error:unknown,en=false){const code=error instanceof TradeError?error.code:typeof error==='string'?error:'storage';return (messages[code]??messages.invalid)![en?1:0];}
