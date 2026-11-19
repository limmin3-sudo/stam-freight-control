import type {ReactNode} from 'react';
import type {Locale} from './navigation';

type Props={locale:Locale;shot:(step:string,ko:string,en:string)=>ReactNode};
export function OperationsGuide({locale,shot}:Props){
 const t=(ko:string,en:string)=>locale==='en'?en:ko;
 return <div className="manual-operations-guide">
  <p className="manual-caption-note">{t('아래는 예시 운항으로 실제 조작한 화면입니다. 완료 버튼은 게임에서 끝낸 작업을 기록합니다. 사이트에서 버튼을 눌러도 게임의 화물이 이동하지는 않습니다.','These screens show actual controls with a sample flight. Completion buttons record work already done in game; they do not move cargo in the game.')}</p>
  <article className="manual-step"><header><span>01</span><div><small>CONFIRM & UNDO</small><h3>{t('현재 목적지의 작업을 마친 뒤 완료를 누르세요','Confirm after completing the current task')}</h3></div></header>
   <p>{t('관제 콘솔에서 현재 목적지와 픽업·배송 작업을 확인하세요. 출발 전에는 「운항 시작」, 그다음은 단계에 따라 「출발 완료」·「점프 완료」·「픽업 완료」·「배송 완료」가 표시됩니다. 픽업과 배송을 함께 처리하는 거점은 「거점 작업 완료」로 표시됩니다.','Check the current destination and pickup/delivery tasks in the control console. Begin with “Start run”. The next button follows the current stage: “Departed”, “Complete jump”, “Confirm pickup” or “Confirm delivery”. A stop combining tasks uses “Complete stop”.')}</p>
   {shot('operation-actions','배송 단계의 완료·운항 관리·직전 작업 되돌리기 버튼','Delivery-stage controls: confirm, run options and undo')}
   <p>{t('잘못 완료 처리했다면 「직전 작업 되돌리기」를 누르고 목적지·작업 단계·선적 기록을 다시 확인하세요. 이것은 사이트의 운항 기록을 되돌리는 기능이며, 게임에서 실제로 실었거나 내린 화물을 되돌리지는 않습니다.','If you confirm by mistake, use “Undo last action” and recheck the destination, task and cargo record. This reverses the site’s flight record, not cargo you physically loaded or unloaded in game.')}</p>
   <p className="manual-note">{t('항해사의 「선적 기록」은 완료 처리한 작업 기준입니다. 「작업 전 예상」·「작업 후 예상」은 계산된 배치를 보는 기능이며 운항을 진행시키지 않습니다. 오퍼레이터는 적재 3D 없이 경로와 방문 순서를 안내합니다.','The navigator’s “Recorded aboard” view reflects confirmed actions. “Before stop · Plan” and “After stop · Plan” preview calculated layouts without advancing the flight. The operator shows routing and visit order without cargo 3D.')}</p>
  </article>
  <article className="manual-step"><header><span>02</span><div><small>RUN OPTIONS</small><h3>{t('시간을 멈추거나 남은 경로를 조정하세요','Pause the clock or adjust the remaining route')}</h3></div></header>
   <p>{t('진행 중인 운항에서 「운항 관리」를 펼치면 타이머와 경로 조작이 나옵니다. 잠깐 자리를 비울 때는 「타이머 일시정지」, 돌아왔을 때는 「타이머 재개」를 사용합니다.','Open “Run options” during an active flight for clock and route controls. Use “Pause timer” when stepping away and “Resume timer” when returning.')}</p>
   {shot('operation-menu','운항 관리 펼침 — 타이머·현재 위치 재계산·거점 연기','Expanded run options — timer, replan from here and defer stop')}
   <dl className="manual-operation-options"><div><dt>{t('현재 위치에서 재계산','Replan from here')}</dt><dd>{t('사이트에 기록된 현재 위치에서 남은 작업의 경로를 다시 계산합니다. 실제 위치와 다르면 아래 방문 순서 수정에서 먼저 위치를 지정하세요.','Recalculate remaining work from the position recorded by the site. If that differs from your actual position, specify the correct location in the stop-order editor below.')}</dd></div><div><dt>{t('이 거점 나중에','Defer this stop')}</dt><dd>{t('현재 거점을 뒤로 미루는 조건으로 남은 경로를 다시 계산합니다. 계산 결과의 다음 목적지를 확인하세요.','Recalculate the remaining route with the current stop deferred. Check the resulting next destination.')}</dd></div><div><dt>{t('운항 종료','End run')}</dt><dd>{t('확인 후 현재 운항을 종료하고 계약 준비로 돌아갑니다. 잠시 멈추려는 경우에는 타이머 일시정지를 사용하세요.','After confirmation, end the current run and return to contract preparation. Use Pause timer for a temporary break.')}</dd></div></dl>
  </article>
  <article className="manual-step"><header><span>03</span><div><small>EDIT ROUTE</small><h3>{t('방문 순서와 실제 함선 위치를 직접 지정할 수 있어요','Adjust visit order and the actual ship position')}</h3></div></header>
   <p>{t('「방문 순서 수정」을 펼칩니다. 위·아래 버튼으로 순서를 바꾸거나 거점을 추가한 뒤 「적용하고 재계산」을 누르세요. 진행 중인 운항에서는 「실제 함선 위치」를 검색·선택하고 「선택한 위치에서 재계산」할 수도 있습니다.','Expand “Edit stop order”. Move stops up or down or add a stop, then select “Apply and recalculate”. During an active flight you can also choose “Actual ship location” and select “Replan from this location”.')}</p>
   {shot('operation-route','방문 순서 수정과 실제 함선 위치 검색 영역','Stop-order editor and actual ship-location search')}
   <p>{t('수정한 순서는 적용 버튼을 눌러야 계산됩니다. 계약 변경 알림이 떠 있다면 먼저 변경을 확인하세요. 계산이 끝나면 다음 목적지와 남은 작업을 확인하고 운항을 이어갑니다.','The edited order is calculated only after you apply it. Review any pending contract-change notice first. Once calculation finishes, check the next destination and remaining work before continuing.')}</p>
  </article>
  <article className="manual-step"><header><span>04</span><div><small>CONTRACT CHANGES</small><h3>{t('변경 알림은 내용을 비교한 뒤 반영하세요','Compare contract changes before applying them')}</h3></div></header>
   <p>{t('운항 중 수신한 계약 내용이 달라지면 「변경 확인」 알림이 나타납니다. 현재 운항과 최근 수신 내용을 비교하세요. 일반 내용 변경은 적용 가능 여부에 따라 「최근 수신 내용 적용」 또는 「현재 운항 내용 유지」를 선택합니다.','When received contract details change during a flight, a “Review changes” notice appears. Compare the current flight with the latest receipt. For changed details, choose “Apply latest receipt” when available or “Keep current flight details”.')}</p>
   {shot('operation-change','종료·취소 신호 예시 — 확인 전에는 기존 운항 유지','Example ended/cancelled signal — the flight remains unchanged before confirmation')}
   <p>{t('「나중에 확인」으로 닫으면 경로는 그대로이며, 변경을 확인할 때까지 현재 단계의 완료 버튼은 사용할 수 없습니다. 「확인하고 남은 경로 재계산」을 눌러야 반영됩니다. 종료·취소 계약은 남은 픽업·배송에서 제외하고 이미 실린 화물은 선내 보류로 남깁니다. 배송 완료나 보상 수령으로 기록하지 않습니다.','“Review later” leaves the route unchanged, and the current completion button stays disabled until the changes are reviewed. Apply the decision with “Confirm and replan remaining route”. Ended or cancelled contracts are removed from remaining pickups/deliveries; cargo already aboard stays on hold. This does not record successful delivery or payment.')}</p>
  </article>
  <article className="manual-step"><header><span>05</span><div><small>HELD CARGO</small><h3>{t('보류 화물은 실제로 내린 상자만 정리하세요','Clear held cargo only after physically unloading it')}</h3></div></header>
   <p>{t('항해사 운항에서 보류 화물은 적재 공간을 계속 차지합니다. 게임에서 함선 밖으로 내린 뒤 「보류 화물 하역 확인」을 엽니다. 내린 상자만 선택하고 「선택한 상자를 게임에서 실제로 내렸습니다」에 체크한 뒤 「선택한 상자 하역 확인」을 누르세요.','In navigator mode, held cargo continues to occupy space. After removing it from the ship in game, open “Confirm held cargo unloaded”. Select only the unloaded crates, check “I physically unloaded the selected crates in game”, then confirm.')}</p>
   {shot('operation-held','보류 상자 선택과 실제 하역 확인 — 선택한 상자만 정리','Held-crate selection and physical-unload confirmation — only selected crates are cleared')}
   <p>{t('선택하지 않은 화물의 위치는 유지하고 남은 경로를 다시 계산합니다. 이전 운항은 백업으로 보관하며, 처리 내역은 「보류 화물 정리 기록」에 남습니다. 오퍼레이터는 적재를 직접 관리하므로 이 적재 정리 화면을 사용하지 않습니다.','Unselected cargo stays in place while the remaining route is recalculated. The previous flight is backed up and the action appears in “Held cargo discharge record”. Operator mode leaves loading to you and does not use this cargo-management screen.')}</p>
  </article>
  <div className="manual-ready"><div><h3>{t('현재 운항에서 확인하기','Review your current flight')}</h3><p>{t('아래 버튼은 관제 콘솔만 엽니다. 작업을 완료하거나 경로를 바꾸지 않습니다.','This opens the control console without completing work or changing the route.')}</p></div><a className="manual-action" href={`#/operations?lang=${locale}`}>{t('관제 콘솔 열기','Open control console')} ↗</a></div>
 </div>;
}
