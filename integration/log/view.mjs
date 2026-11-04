import {createRewardPanel} from './reward-view.mjs';
import {createPlanChoiceStore} from './plan-choice-store.mjs';
import {partnerVoice,partnerSpeaker} from './partner-voice.mjs';
import {receptionActive,contractReception,receptionDetails} from './reception.mjs';
import {createRetainedCargo} from './retained-cargo.mjs';
import {contractRemoval,confirmCargoCleared} from './contract-removal.mjs';
import {mountScreenWatch} from './screen-watch.mjs';
import {renderProgress,progressLabel} from './progress-view.mjs';
import {createFlightReady} from './flight-ready.mjs';
import {mountWorkspaceTools} from './workspace-tools.mjs';
import {mountAccount} from './account-view.mjs';
import {previewPanel} from './preview-view.mjs';
import {createPreviewSession,createPlanSelection} from './preview-session.mjs';
import {previewReadiness} from './preview-packing.mjs';
import { LogEvidence } from './state.mjs';
import { LogLines } from './lines.mjs';
import { connectLive } from './live-client.mjs';
import { definitionIndex, definitionReference } from './catalog.mjs';
import { renderDefinitionRules } from './catalog-view.mjs';
import { locationIndex } from './locations.mjs';
import { renderContractLocations } from './locations-view.mjs';
import { renderBoxProfile } from './box-profiles-view.mjs';
import { renderOriginalManifest } from './manifest-view.mjs';

const $ = id => document.getElementById(id);
const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const connection=$('workspace-connection');
function connectionState(state,label){connection.dataset.state=state;connection.querySelector('span').textContent=label;}
connection.onclick=()=>{const target=$('live').hidden?$('replay-controls'):$('live');target.scrollIntoView({block:'nearest',behavior:'smooth'});};
$('workspace-help').onclick=()=>{const guide=$('run-guide');guide.open=!guide.open;if(guide.open)guide.scrollIntoView({block:'nearest',behavior:'smooth'});};
let storage; try { storage = localStorage; } catch {}
const previewSession = createPreviewSession(storage), planSelection=createPlanSelection(12,{store:storage?createPlanChoiceStore(storage):null,persistent:false}), selectedContracts=planSelection.selected;
const rewardPanel=createRewardPanel($('reward-observations'),{storage,partner:()=>previewSession.preferences.partner});
mountAccount({renderHistoryExtra:host=>rewardPanel.renderHistory(host)});
previewSession.retained=createRetainedCargo(storage);previewSession.removalPending=new Set();
let planner,removalDialog=null,guidanceActive=false,replayMode=false;const dismissedRemoval=new Set();
function removeContract(c,automatic=false){
  if(removalDialog)return;
  previewSession.removalPending.add(c.missionId);planner?.pauseForRemoval();
  const saved=previewSession.retained.snapshot().records.find(r=>r.id===c.missionId);
  const cargo=previewSession.continuity.snapshot().records.find(r=>r.id===c.missionId);
  const plan=saved?.review&&saved.ship?{ship:saved.ship,packing:{boxes:saved.boxes.map(b=>({...b,retained:false}))}}:planner?.getPacking()||(cargo?{ship:cargo.ship,packing:{boxes:cargo.boxes.filter(b=>b.state==='aboard')}}:null);
  removalDialog=contractRemoval({contract:c,plan,store:previewSession.retained,partner:previewSession.preferences.partner,
    onApply:()=>{try{previewSession.continuity.forget(c.missionId);}catch{}removalDialog=null;previewSession.removalPending.delete(c.missionId);dismissedRemoval.delete(c.missionId);planSelection.set(c.missionId,false,{remember:false});renderPlanning();},
    onCancel:()=>{removalDialog=null;if(!automatic)previewSession.removalPending.delete(c.missionId);else dismissedRemoval.add(c.missionId);renderPlanning();}});
}
function renderRetained(){
 const host=$('retained-cargo'),state=previewSession.retained.snapshot();host.replaceChildren();
 const records=state.records.filter(r=>r.boxes.length||r.unlocated||r.review);host.hidden=!state.error&&!records.length;
 if(state.error){host.append(el('p',state.error));const reset=el('button','화물 기록 초기화');reset.type='button';reset.onclick=()=>confirmCargoCleared(()=>{previewSession.retained.clearCorrupt();previewSession.removalPending.clear();renderPlanning();},{title:'화물 기록 초기화',description:'이 브라우저의 남은 화물 기록을 모두 지웁니다. 함선에 화물이 있다면 초기화하지 말고 기록을 먼저 복구해 주세요.',confirm:'기록 초기화'});host.append(reset);}
 if(records.length)host.append(el('h2','함선에 남은 화물'),el('p','제외한 계약의 화물입니다. 아래 기록은 이 브라우저에만 보관합니다.'));
 for(const r of records){const card=el('div',undefined,'retained-card');card.dataset.mission=r.id;card.append(el('strong',r.title),el('p',r.review?'화물 확인이 필요합니다.':r.unlocated?'화물 위치 확인 중':`${r.ship.name} · ${r.boxes.reduce((n,b)=>n+b.size,0)} SCU · 위치 유지`));const clear=el('button',r.review?'남은 화물 확인':'화물 정리');clear.type='button';clear.onclick=()=>r.review?removeContract({missionId:r.id,title:r.title},true):confirmCargoCleared(()=>{previewSession.retained.release(r.id);renderPlanning();},{partner:previewSession.preferences.partner});card.append(clear);host.append(card);}
}
function renderCargoContinuity(){
 const host=$('cargo-continuity'),state=previewSession.continuity.snapshot(),ignored=new Set(previewSession.retained.snapshot().records.map(r=>r.id));host.replaceChildren();
 const records=state.records.filter(r=>!ignored.has(r.id));host.hidden=!state.error&&!records.length;
 if(state.error){host.append(el('p',state.error));const reset=el('button','적재 기록 초기화');reset.type='button';reset.onclick=()=>confirmCargoCleared(()=>{previewSession.continuity.clearCorrupt();renderPlanning();},{title:'적재 기록 초기화',description:'이 브라우저의 적재·배송 기록을 모두 지웁니다. 실제 화물이 남아 있다면 초기화하지 말고 기록을 먼저 복구해 주세요.',confirm:'기록 초기화'});host.append(reset);}
 if(records.length)host.append(el('h2','적재 상태'),el('p','저장된 사용자 확인 기록입니다. 현재 상태와 다르면 먼저 정리해 주세요. 이 브라우저에만 보관합니다.'));
 for(const r of records){const card=el('div',undefined,'retained-card');card.dataset.cargoContinuity=r.id;
  const aboard=r.boxes.filter(b=>b.state==='aboard'),delivered=r.boxes.filter(b=>b.state==='delivered');
  card.append(el('strong',r.title),el('p',`${r.ship.name} · 위치 유지 ${aboard.reduce((n,b)=>n+b.size,0)} SCU · 배송 확인 ${delivered.reduce((n,b)=>n+b.size,0)} SCU`));
  if(aboard.some(b=>b.reservation))card.append(el('small','예약 영역 포함 · 실제 상자 구성 미확인'));
  if(!snapshot.contracts.some(c=>c.missionId===r.id))card.append(el('p','현재 로그에서 이 계약을 기다리고 있습니다. 남은 화물 위치는 유지합니다.'));
  const review=el('button','계약 정리');review.type='button';review.onclick=()=>removeContract({missionId:r.id,title:r.title});card.append(review);host.append(card);
 }
}
const flightReady=createFlightReady($('flight-ready-host'),{session:previewSession,
  onStart:()=>planner?.prepareAndStart(),onAdvance:()=>planner?.advanceGuidance(),canAdvance:()=>planner?.canAdvance(),onPartner:value=>{planner?.setPartner(value);renderPlanning();rewardPanel.refresh();},onSettings:()=>planner?.invalidateConfiguration()});
function closePreviews() {
  replayMode=true;previewSession.guidanceEnabled=false;
  rewardPanel.update(null);
  flightReady.observations(null,null);
  planner?.dispose(); planner = null;guidanceActive=false;flightReady.update({selected:0,blocked:0,pending:0}); planSelection.useSaved(false);planSelection.clear(); previewSession.clearDrafts();
  $('planning-preview').replaceChildren(); $('planning-contracts').replaceChildren();$('pending-contracts').replaceChildren();$('pending-contracts').hidden=true;$('recovery-help').hidden=true;
}
function renderChoiceStorage(){
 const host=$('planning-choice-storage'),saved=planSelection.status();host.replaceChildren();
 host.append(el('small',saved.persistent?'계약 선택은 이 브라우저에 저장합니다. 같은 계약이 로그에 다시 나오면 반영합니다.':'저장 로그의 선택은 이번 화면에서만 사용합니다.'));
 if(saved.error){host.append(el('p',saved.error));const reset=el('button','계약 선택 기록 초기화');reset.type='button';reset.onclick=()=>confirmCargoCleared(()=>{planSelection.resetSaved();renderPlanning();},{partner:previewSession.preferences.partner,title:'계약 선택 기록 초기화',description:'현재 계정의 이 브라우저 선택 기록만 지웁니다. 다음 계획으로 남긴 선택과 제외 선택도 초기화됩니다. 실제 화물·게임 계약은 변경하지 않습니다.',confirm:'선택 기록 초기화'});host.append(reset);}
}
function renderPlanning() {
  if (!catalog || !locations || !snapshot) return;
  if (!planner) {
    planner = previewPanel([], {catalog, locations, locationData, locationEdits:personalEdits, onGuidance:value=>{guidanceActive=value;flightReady.guidance(value);}, onCargoChange:()=>{renderPlanning();flightReady.refresh();}, session: previewSession,
      prepareAssets: () => live?.preparePreview()});
    $('planning-preview').replaceChildren(planner.root);
  }
  const entries = snapshot.contracts;
  const cargoById=new Map(previewSession.continuity.snapshot().records.map(r=>[r.id,r]));
  const dispositions=new Map(previewSession.retained.snapshot().records.map(r=>[r.id,r]));
  for(const id of dispositions.keys())planSelection.set(id,false,{remember:false});
  for(const c of entries)if((selectedContracts.has(c.missionId)||cargoById.get(c.missionId)?.boxes.some(b=>b.state==='aboard'))&&!dispositions.has(c.missionId)&&(c.status==='end-observed'||c.participation?.state==='left-observed')){
    planSelection.set(c.missionId,true,{remember:false});previewSession.removalPending.add(c.missionId);
    const savedCargo=cargoById.get(c.missionId);
    const plan=planner?.getPacking()||(savedCargo?{ship:savedCargo.ship,packing:{boxes:savedCargo.boxes.filter(b=>b.state==='aboard')}}:null);
    try{previewSession.retained.markReview(c.missionId,c.title,plan?.ship,(plan?.packing?.boxes||[]).filter(b=>b.missionId===c.missionId&&!b.retained));}
    catch(e){$('planning-readiness').textContent=e.message;}
  }
  for(const r of previewSession.retained.snapshot().records)if(r.review)previewSession.removalPending.add(r.id);
  renderRetained();renderCargoContinuity();
  const unresolved=entries.find(c=>previewSession.removalPending.has(c.missionId)&&!dismissedRemoval.has(c.missionId));
  if(unresolved&&!removalDialog)removeContract(unresolved,true);
  const readiness=new Map(entries.map(c=>[c.missionId,previewReadiness(c,catalog,locations)]));
  planSelection.reconcile(entries,new Set(entries.filter(c=>readiness.get(c.missionId).ready).map(c=>c.missionId)),{autoSelect:!guidanceActive});
  renderChoiceStorage();
  const readyCount=entries.filter(c=>readiness.get(c.missionId).ready).length;
  $('planning-readiness').textContent=`자동 연결 가능 ${readyCount}개 · 추가 근거 필요 ${entries.length-readyCount}개. 미확인 계약은 아래에 보류 이유를 표시합니다.`;
  const progressOpen=new Set([...$('planning-contracts').querySelectorAll('[data-progress][open]')].map(n=>n.dataset.progress));
  const receptionOpen=new Set([...document.querySelectorAll('[data-reception][open]')].map(n=>n.dataset.reception));
  $('planning-contracts').replaceChildren();
  const waiting=(snapshot.pendingContracts||[]).filter(receptionActive).sort((a,b)=>(b.acceptedAt||b.lastEvidenceAt||'').localeCompare(a.acceptedAt||a.lastEvidenceAt||''));
  const pending=$('pending-contracts'),pendingOpen=!!pending.querySelector('details')?.open;pending.replaceChildren();pending.hidden=!waiting.length;
  if(waiting.length){
    pending.append(el('h3',`계약 정보 확인 중 · ${waiting.length}개`),el('p','수락·참여 기록을 보관했습니다. 운송 유형과 목표가 확인되면 자동으로 연결합니다.'));
    const list=el('details');list.open=pendingOpen;list.append(el('summary','정보를 기다리는 계약 보기'));
    for(const c of waiting.slice(0,50)){
      const row=el('div',undefined,'pending-contract');row.dataset.mission=c.missionId;
      row.append(el('strong',c.title||'제목 확인 중'),el('small','유형·픽업·배송 목표 확인 중 · 아직 계산에 포함되지 않습니다.'));
      const detail=receptionDetails(contractReception(c,null,catalog,locations),c.missionId);detail.open=receptionOpen.has(c.missionId);row.append(detail);list.append(row);
    }
    if(waiting.length>50)list.append(el('p',`최근 목록은 50개까지 표시합니다. 총 ${waiting.length}개의 기록을 보관하고 있습니다.`));
    pending.append(list);
  }
  $('recovery-help').hidden=!waiting.length&&!entries.some(c=>!readiness.get(c.missionId).ready);
  for (const c of entries) {
    const label = el('label'), check = el('input'); check.type = 'checkbox'; check.checked = selectedContracts.has(c.missionId);
    check.dataset.mission = c.missionId;const disposition=dispositions.get(c.missionId);check.disabled=!!(disposition?.boxes.length||disposition?.unlocated||disposition?.review);
    label.append(check, document.createTextNode(`${c.title || '제목 미확인'} · ${statuses[c.status] || '미확인'}`));
    label.append(el('small',readiness.get(c.missionId).label,'planning-readiness'));
    const include=()=>{try{planSelection.set(c.missionId,true);if(dispositions.has(c.missionId)){previewSession.continuity.forget(c.missionId);previewSession.retained.restore(c.missionId);}renderPlanning();}catch(e){check.checked=false;$('planning-readiness').textContent=e.message;}};
    check.onchange = () => {if(!check.checked){check.checked=true;removeContract(c);return;}include();};
    $('planning-contracts').append(label);
    if(!check.checked&&!disposition&&receptionActive(c)&&(planSelection.awaiting.has(c.missionId)||planSelection.deferred.has(c.missionId))){
      const deferred=planSelection.deferred.has(c.missionId),choice=el('div',undefined,'contract-choice');choice.dataset.choice=c.missionId;
      const partner=previewSession.preferences.partner;choice.append(partnerSpeaker(partner,partnerVoice(partner)[deferred?'contractDeferred':'contractChoice']));
      const add=el('button','현재 항로에 추가');add.type='button';add.disabled=!readiness.get(c.missionId).ready;add.onclick=include;
      const later=el('button',deferred?'다음 계획에 보관됨':'다음 계획으로 보관');later.type='button';later.disabled=deferred;later.onclick=()=>{try{planSelection.defer(c.missionId);renderPlanning();}catch(e){$('planning-readiness').textContent=e.message;}};
      choice.append(add,later,el('small','추가하면 현재 항로·적재 계획을 다시 계산합니다. 실제 적재 위치는 확인된 기록을 유지합니다.'));
      $('planning-contracts').append(choice);
    }
    if(!disposition){const remove=el('button',previewSession.removalPending.has(c.missionId)?'남은 화물 확인':'운송에서 제외');remove.type='button';remove.dataset.removeMission=c.missionId;remove.onclick=()=>removeContract(c,previewSession.removalPending.has(c.missionId));$('planning-contracts').append(remove);}else label.append(el('small','운송 계획에서 제외했습니다.'));
    const detail=receptionDetails(contractReception(c,readiness.get(c.missionId),catalog,locations),c.missionId);detail.open=receptionOpen.has(c.missionId);$('planning-contracts').append(detail);
    const progress=renderProgress(c,locations);progress.open=progressOpen.has(c.missionId);$('planning-contracts').append(progress);
  }
  updatePlanSelection();
}
function updatePlanSelection() {
  const chosen = snapshot.contracts.filter(c => selectedContracts.has(c.missionId));
  $('planning-count').textContent = `선택한 계약 ${chosen.length}개 · 한 번에 최대 12개`;
  planner?.updateContracts(chosen);
  flightReady.update({selected:chosen.length,reservations:chosen.filter(c=>previewReadiness(c,catalog,locations).reservation).length,blocked:previewSession.removalPending.size+Number(!!previewSession.retained.snapshot().error)+Number(!!previewSession.continuity.snapshot().error)+chosen.filter(c=>!previewReadiness(c,catalog,locations).ready&&!previewSession.draft(c.missionId).confirmed).length,pending:(snapshot.pendingContracts||[]).filter(receptionActive).length,queued:snapshot.contracts.filter(c=>planSelection.awaiting.has(c.missionId)&&receptionActive(c)).length,deferred:snapshot.contracts.filter(c=>planSelection.deferred.has(c.missionId)&&receptionActive(c)).length});
}
let locationData,personalEdits=[];
let cancelled = false, displayed = 0, snapshot, catalog, locations, live, liveStatus;
const screenWatch=mountScreenWatch($('screen-watch'),{prepare:()=>live?.prepareScreen(),getSnapshot:()=>snapshot,isLive:()=>!!live&&liveStatus?.phase==='watching'});
const workspaceTools=mountWorkspaceTools({
  context:()=>({contracts:snapshot?.contracts?.length||0,pendingContracts:snapshot?.pendingContracts?.length||0}),
  onLocations:async edits=>{
    personalEdits=structuredClone(edits);flightReady.setLocations(locationData,personalEdits);const reopen=planner?.isOpen();
    planner?.dispose();planner=null;$('planning-preview').replaceChildren();
    renderPlanning();if(reopen)planner?.root.querySelector('.preview-launch')?.click();
  },
});
window.addEventListener('pagehide',event=>{if(!event.persisted){workspaceTools.destroy();flightReady.destroy();screenWatch.destroy();}});
const locationsReady = fetch(new URL('../../data/log-location-index.json', import.meta.url))
  .then(r => { if (!r.ok) throw new Error('locations-unavailable'); return r.json(); })
  .then(data => { locationData=data; locations = locationIndex(data);personalEdits=workspaceTools.setLocations(data);flightReady.setLocations(data,personalEdits); if (snapshot) renderSnapshot(snapshot); }).catch(() => {});
const catalogReady = fetch(new URL('../../data/log-mission-index.json', import.meta.url))
  .then(r => { if (!r.ok) throw new Error('catalog-unavailable'); return r.json(); })
  .then(data => { catalog = definitionIndex(data); if (snapshot) renderSnapshot(snapshot); }).catch(() => {});
const statuses = { 'acceptance-observed': '수락 기록 관측', 'end-observed': '종료 기록 관측',
  'participation-observed': '본인 참여 기록 관측', 'acceptance-unconfirmed': '내 참여 미확인 · 후보', conflict: '기록 충돌 · 확인 필요' };
const memberships = { 'acceptance-observed': '수락 기록 관측', 'joined-observed': '본인 참여 기록 관측',
  'left-observed': '본인 참여 이탈 기록 관측', conflict: '참여·이탈 기록 충돌', unconfirmed: '내 참여 상태 미확인' };

function showMore() {
  const entries = [...snapshot.contracts, ...snapshot.candidates].sort((a, b) => (b.acceptedAt || b.participation.observedAt || '').localeCompare(a.acceptedAt || a.participation.observedAt || '') || a.missionId.localeCompare(b.missionId));
  const contracts = entries.slice(displayed, displayed + 50);
  for (const contract of contracts) {
    const card = el('details', undefined, 'contract');
    card.dataset.mission = contract.missionId;
    const title = el('summary', contract.title || '제목 미확인');
    title.append(el('span', contract.progress?.outcome!=='unconfirmed'&&progressLabel(contract)||statuses[contract.status]||'미확인','badge'));
    if (contract.participation.shared) title.append(el('span', '공유 기록 있음', 'badge'));
    if (contract.participation.state === 'left-observed') title.append(el('span', memberships['left-observed'], 'badge'));
    card.append(title);
    // Build detailed evidence only when opened, keeping large replays inexpensive.
    card.addEventListener('toggle', () => {
      if (!card.open || card.querySelector('.body')) return;
      const body = el('div', undefined, 'body');
      const boxesKnown = contract.boxComposition?.status === 'matched-fixed-profile';
      body.append(el('p', contract.originalManifest?.status === 'resolved-original-manifest'
        ? '목적지별 원래 상자 명세 연결 완료 · 현재 적재·배송 진행 상태는 별도 확인이 필요합니다.' : boxesKnown
        ? '고정 상자 조합 확인 · 픽업·배송지별 할당을 추가 확인해 주세요.'
        : '실제 상자 구성 미확인 · 주문별 경로·수량 확인 후 예상 배치로 계획할 수 있습니다.', 'blocked'));
      for (const conflict of contract.conflicts) body.append(el('p', ({
        'definition-conflict': '서로 다른 계약 정의 ID가 관측되었습니다. 유형을 확정하지 않습니다.',
        'terminal-state-conflict': '서로 다른 종료 상태가 관측되었습니다. 완료 여부를 확정하지 않습니다.',
        'acceptance-after-end': '종료 기록 이후 수락 기록이 관측되었습니다. 현재 참여 상태를 확인해야 합니다.',
        'participation-conflict': '동일 시각에 참여와 이탈이 관측되었습니다. 순서를 추정하지 않습니다.',
        'mixed-local-players': '서로 다른 로그인 캐릭터 기록이 섞여 있습니다. 캐릭터별로 로그를 나누어 확인해 주세요.',
      })[conflict] || '기록 충돌을 확인해 주세요.', 'notice'));
      body.append(el('p', `${memberships[contract.participation.state]}${contract.participation.reentryObserved ? ' · 이탈 이후 재수락/참여 기록 있음' : ''}. 현재 참여 여부가 확정된 것은 아닙니다.`, 'detail'));
      if (contract.partyObservations.some(e => e.type === 'participant-left')) body.append(el('p', 'PlayerLeft만으로 직접 포기했는지, 완료 후 참여가 정리됐는지는 확정하지 않습니다.', 'detail'));
      if (contract.acceptedAt) body.append(el('p', `최초 수락 기록: ${contract.acceptedAt}`, 'detail'));
      const reference = catalog ? definitionReference(contract, catalog) : null;
      body.append(el('p', reference?.status === 'matched'
        ? `공개 유형 참고: ${reference.title} · ${reference.version}${reference.notForRelease || !reference.released ? ' · 미출시 표시' : ''}`
        : '공개 유형 대조: 미확인', 'detail'));
      if (reference?.status === 'matched') body.append(renderDefinitionRules(reference));
      body.append(renderBoxProfile(contract.boxComposition));
      if (boxesKnown) body.append(renderOriginalManifest(contract.originalManifest));
      body.append(renderContractLocations(contract, locations));
      if (snapshot.contracts.some(c => c.missionId === contract.missionId)) {
        const add = el('button', '함께 계획할 계약에 추가');
        add.onclick = () => {try{planSelection.set(contract.missionId,true);renderPlanning();$('planning').scrollIntoView({block:'start'});}catch(e){$('planning-readiness').textContent=e.message;} };
        body.append(add);
      }
      if (contract.objectiveNotices?.length) {
        const notices = el('details', undefined, 'definition-location');
        notices.append(el('summary', `수량 없는 목표 알림 ${contract.objectiveNotices.length}건`),
          el('p', '복귀·방문 등의 안내를 원문으로 보존합니다. 알림만으로 필수 운송 구간을 추가하거나 완료된 계약을 다시 진행 중으로 바꾸지 않습니다.', 'detail'));
        for (const event of contract.objectiveNotices) {
          notices.append(el('p', event.notification, 'evidence'),
            el('p', `${event.at} · ${event.source.input} ${event.source.line}번째 줄`, 'detail'));
        }
        const selfCompletion = contract.status === 'end-observed' && !contract.conflicts.length &&
          contract.endingObservations.some(e => e.completion === 'Complete' && e.actor === 'self');
        if (selfCompletion) notices.append(el('p', '이 계약은 본인 대상 완료 종료 기록도 관측되었습니다. 위 알림을 남은 복귀 의무로 취급하지 않습니다.', 'detail'));
        body.append(notices);
      }
      body.append(el('p', `목표 마커 ${contract.markerObservations.length}건 · 수량 알림 ${contract.quantityObservations.length}건. 계약 목표의 위치이며 내 함선 위치를 나타내지 않습니다.`, 'detail'));
      for (const event of contract.partyObservations) {
        const action = ({ 'share-observed': '공유 알림(공유자)', 'participant-joined': '참여 기록', 'participant-left': '참여 이탈 기록' })[event.type];
        const actor = ({ self: '본인', other: '다른 캐릭터', unknown: '대상 미확인' })[event.actor];
        body.append(el('p', `${action} · ${actor} · ${event.at} · ${event.source.input} ${event.source.line}번째 줄`, 'detail'));
      }
      if (!contract.quantityObservations.length) body.append(el('p', '수량 알림이 관측되지 않았습니다.'));
      for (const q of contract.quantityObservations) {
        body.append(el('p', q.notification, 'evidence'));
        body.append(el('p', `${q.at} · ${q.source.input} · ${q.source.line}번째 줄`, 'detail'));
      }
      body.append(el('p', '수량 알림을 품목별 화물 명세로 확정하거나 합산하지 않습니다.', 'detail'));
      card.append(body);
    });
    $('contracts').append(card);
  }
  displayed += contracts.length;
  $('more').hidden = displayed >= entries.length;
}


function renderSnapshot(next) {
  const open = new Set([...document.querySelectorAll('.contract[open]')].map(node => node.dataset.mission));
  const visible = Math.max(50, displayed);
  snapshot = next;
  previewSession.guidanceEnabled=!replayMode&&!!liveStatus&&!snapshot.identity?.mixedPlayers;
  screenWatch.update();
  rewardPanel.update(snapshot,{persistent:!replayMode&&!!liveStatus});
  flightReady.observations(snapshot.identity?.mixedPlayers?null:snapshot.navigation,liveStatus);
  displayed = 0;
  $('contracts').replaceChildren();
  $('summary').replaceChildren();
  $('diagnostics').hidden = true;

  for (const [label, value] of [['수락·본인 참여 기록이 있는 계약', snapshot.statistics.registeredHauling], ['수량 알림이 있는 계약', snapshot.statistics.withQuantityObservation], ['고정 상자 조합이 확인된 계약', snapshot.statistics.withKnownBoxComposition || 0], ['목적지별 원래 명세가 연결된 계약', snapshot.statistics.withOriginalManifest || 0]]) {
    const metric = el('div', undefined, 'metric');
    metric.append(el('strong', String(value)), el('span', label));
    $('summary').append(metric);
  }
  const diagnostics = Object.entries(snapshot.diagnostics);
  if (diagnostics.length || !catalog || snapshot.identity.mixedPlayers) {
    $('diagnostics').hidden = false;
    $('diagnostics').textContent = '확인이 필요합니다. ' + diagnostics.map(([code, count]) => `${({ 'invalid-utf8-line': '읽을 수 없는 문자 줄 제외', 'unrecognized-mission-format': '해석하지 못한 미션 형식', 'unrecognized-navigation-format': '해석하지 못한 항법 기록', 'unterminated-line-withheld': '마지막 미완성 줄 보류', 'log-generation-changed': '로그 파일 교체 감지(이전 기록 포함)' })[code] || code}: ${count}건`).join(' · ') + (!catalog ? ' · 공개 유형 목록을 불러오지 못했습니다.' : '') + (snapshot.identity.mixedPlayers ? ' · 서로 다른 로그인 캐릭터 기록이 섞여 있어 본인 여부를 확정하지 않습니다.' : '');
  }

  if (!snapshot.contracts.length && !snapshot.candidates.length) $('contracts').append(el('p', '운송 마커가 확인되는 계약이 없습니다.', 'empty'));

  while (displayed < Math.min(visible, snapshot.contracts.length + snapshot.candidates.length)) showMore();
  $('more').hidden = displayed >= snapshot.contracts.length + snapshot.candidates.length;
  for (const node of document.querySelectorAll('.contract')) if (open.has(node.dataset.mission)) node.open = true;
  $('save-report').disabled = false;
  renderPlanning();
}

$('cancel').addEventListener('click', () => { cancelled = true; });
$('more').addEventListener('click', showMore);
$('files').addEventListener('change', async () => {
  const files = [...$('files').files];
  if (!files.length) return;
  const total = files.reduce((n, f) => n + f.size, 0);
  if (files.length > 64 || total > 512 * 1024 * 1024) {
    $('progress').textContent = '한 번에 64개·512MB 이하의 로그를 선택해 주세요.';
    return;
  }
  void screenWatch.stop();screenWatch.reset();
  closePreviews();
  cancelled = false;
  snapshot = null;
  displayed = 0;
  $('files').disabled = true;
  $('cancel').disabled = false;
  $('contracts').replaceChildren();
  $('summary').replaceChildren();
  $('more').hidden = true;
  $('diagnostics').hidden = true;
  $('save-report').disabled = true;
  $('progress').textContent = '로그 읽는 중 · 0%';
  connectionState('replay','저장 로그 읽는 중');
  const state = new LogEvidence();
  let done = 0;
  try {
    for (const [index, file] of files.entries()) {
      const lines = new LogLines({ onLine: (line, n) => state.ingest(line, { input: `log-${index + 1}`, line: n }), onInvalid: code => state.note(code) });
      // Fixed-size slices bound memory and yield to cancel/touch/progress events.
      for (let offset = 0; offset < file.size; offset += 256 * 1024) {
        if (cancelled) throw new Error('cancelled');
        const bytes = new Uint8Array(await file.slice(offset, offset + 256 * 1024).arrayBuffer());
        lines.write(bytes);
        done += bytes.length;
        $('progress').textContent = `로그 읽는 중 · ${total ? Math.floor(done / total * 100) : 100}%`;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (lines.finish().unterminatedLine) state.note('unterminated-line-withheld');
    }
    if (cancelled) throw new Error('cancelled');
    await Promise.all([catalogReady, locationsReady]);
    state.locations = locations;
    renderSnapshot(state.snapshot());
    connectionState('replay','저장 로그 · 실시간 아님');
    $('progress').textContent = '로그 재생을 완료했습니다. 실제 운항 데이터는 변경하지 않았습니다.';
  } catch (error) {
    snapshot = null;
    connectionState('disconnected','로그 연결 대기');
    $('progress').textContent = error.message === 'cancelled' ? '읽기를 중단했습니다. 결과를 적용하지 않았습니다.' : '로그 처리를 완료하지 못했습니다. 부분 결과는 적용하지 않습니다.';
  } finally {
    $('files').disabled = false;
    $('files').value = '';
    $('cancel').disabled = true;
  }
});


const phaseLabels = {
  starting: '연결됨 · 로그를 확인하고 있습니다.',
  'catching-up': '기존 로그를 읽고 있습니다. 완료 후 새 기록을 감시합니다.',
  watching: '실시간 감시 중 · 새 계약 기록을 기다리고 있습니다.',
  paused: '감시가 일시정지되었습니다.',
  'waiting-file': '선택한 로그를 읽을 수 없어 다시 시도하고 있습니다. 표시된 기록은 최신이 아닐 수 있습니다.',
  error: '감시가 중단되었습니다. 마지막 정상 기록만 표시합니다. 실행 도우미를 다시 시작해 주세요.',
};
function showLiveStatus(status) {
  if(!replayMode)planSelection.useSaved(true);
  if(liveStatus&&status.generation!==liveStatus.generation)screenWatch.reset();
  liveStatus = status;
  connectionState(status.phase,status.phase==='watching'?'로그 연결됨':status.phase==='paused'?'로그 감시 일시정지':status.phase==='error'?'로그 연결 오류':status.phase==='waiting-file'?'로그 파일 확인 필요':'로그 확인 중');
  flightReady.observations(snapshot?.identity?.mixedPlayers?null:snapshot?.navigation,status);
  $('live-status').textContent = phaseLabels[status.phase] || '연결 상태 미확인';
  $('live-detail').textContent = `마지막 읽기: ${status.lastReadAt ? new Date(status.lastReadAt).toLocaleTimeString() : '미확인'} · 읽은 로그 ${(status.bytesRead / 1024 / 1024).toFixed(1)} MB · 파일 교체 ${status.generation}회${status.lastError ? ' · 오류: ' + status.lastError : ''}`;
  $('live-pause').disabled = status.phase === 'error';
  $('live-pause').textContent = status.phase === 'paused' ? '감시 다시 시작' : '감시 일시정지';
}
live = connectLive({
  onSnapshot: renderSnapshot,
  onStatus: showLiveStatus,
  onError: code => {
    connectionState('error','로그 연결 확인 필요');
    flightReady.observations(null,null);
    $('live-status').textContent = code === 'pairing-expired' ? '연결 키가 만료되었습니다. 실행 도우미에 표시된 주소로 다시 접속해 주세요.' : '로컬 연결을 확인하고 있습니다. 표시된 기록은 최신이 아닐 수 있습니다.';
    $('live-pause').disabled = true;
  },
  onDisconnect: () => {
    void screenWatch.stop();
    live = null;
    liveStatus = null;
    connectionState('disconnected','로그 연결 해제');
    flightReady.observations(null,null);
    $('live-pause').disabled = true;
    $('live-disconnect').disabled = true;
    $('replay-controls').hidden = false;
  },
});
if (live) { connectionState('starting','로그 연결 중'); $('live').hidden = false; $('replay-controls').hidden = true; }
$('live-pause').addEventListener('click', async () => {
  $('live-pause').disabled = true;
  if (liveStatus?.phase === 'paused') await live?.resume(); else await live?.pause();
});
$('live-disconnect').addEventListener('click', () => {
  live?.disconnect();
  $('live-status').textContent = '화면 연결을 해제했습니다. 감시 프로그램도 종료하려면 실행 창에서 Ctrl+C를 눌러 주세요.';
});
$('save-report').addEventListener('click', () => {
  if (!snapshot) return;
  const report = {
    format: 'stam-log-check-v1', createdAt: new Date().toISOString(),
    statistics: snapshot.statistics, identity: snapshot.identity, diagnostics: snapshot.diagnostics,
    conflicts: snapshot.contracts.reduce((counts, c) => { for (const key of c.conflicts) counts[key] = (counts[key] || 0) + 1; return counts; }, {}),
    live: liveStatus ? { phase: liveStatus.phase, lastError: liveStatus.lastError, generation: liveStatus.generation } : null,
    planningAllowed: false, gameIntegrationVerified: false,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = el('a'); link.href = url; link.download = 'STAM-log-check.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
