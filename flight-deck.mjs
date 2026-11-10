import {L} from './i18n.mjs';

// Presentation only. The existing planner, editors and run controller own data.
export function preparationAction({contracts=0,start='',active=false}) {
  return active?'continue':!start?'location':!contracts?'contracts':'calculate';
}

export function mountFlightDeck({state,calculate,startRun}) {
  const $=id=>document.getElementById(id);
  const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
  const button=(text,fn,cls='quiet')=>{const el=make('button',cls,text);el.type='button';el.onclick=fn;return el;};
  const details=(text,cls)=>{const el=make('details',cls);el.append(make('summary','',text));return el;};
  const scroll=el=>el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  const text=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
  document.body.classList.add('clear-deck');

  // A stable preparation rail; the real controls are retained, not cloned.
  const rail=document.querySelector('.mission-pane'),launchers=document.querySelector('.desk-launchers');
  const heading=make('div','prep-heading');heading.append(make('span','eyebrow','FLIGHT PREPARATION'),make('h2','',L('운송 준비','Prepare a haul')),make('p','',L('위에서부터 준비하고 경로를 확인하세요.','Set up your haul, then review the route.')));rail.prepend(heading);
  const ship=$('ship-panel');ship.querySelector('.eyebrow').textContent=L('01 / 함선 · 출발지','01 / SHIP · DEPARTURE');
  ship.title=L('함선과 출발지 변경','Change ship and departure');ship.setAttribute('aria-label',ship.title);
  const partner=$('map-partner');partner.querySelector('small').textContent=L('02 / 운송 파트너','02 / HAULING PARTNER');ship.after(partner);
  const partnerNote=make('small','prep-partner-note');partner.querySelector('span').append(partnerNote);
  const contracts=$('contracts-open');contracts.classList.add('prep-contracts');contracts.querySelector('b').firstChild.textContent=L('03 / 계약 선택','03 / Select contracts');
  const contractSummary=contracts.querySelector('small');contracts.setAttribute('aria-haspopup','dialog');
  const primary=$('flight-open');primary.replaceChildren();primary.className='primary prep-calculate';
  const hint=make('p','prep-hint');hint.id='prep-hint';primary.setAttribute('aria-describedby',hint.id);
  launchers.append(contracts,hint,primary);
  const utility=details(L('설정 · 데이터 관리','Settings · data'),'prep-utility'),utilityBody=make('div','prep-utility-body');utility.append(utilityBody);
  for(const id of ['settings-open','locations-open','plan-reset-open','feedback-open'])if($(id))utilityBody.append($(id));
  rail.append(utility);
  const connection=document.querySelector('.sidebar-log-link');utility.before(connection);
  const account=document.querySelector('.account-panel');document.querySelector('.topnav').append($('account-btn'));account.remove();
  document.querySelector('.topnav-more')?.remove();
  const appDownload=document.querySelector('.app-download');if(appDownload)utilityBody.prepend(appDownload);
  const backup=document.querySelector('.manual-editor');utilityBody.append(backup);

  // Route results span the full content width, with cargo and stops together.
  const workspace=document.querySelector('.workspace'),cargo=document.querySelector('.cargo-section'),route=document.querySelector('.route-pane'),execution=document.querySelector('.execution-section');
  const ops=make('section','deck-operations');ops.id='deck-operations';ops.setAttribute('aria-label',L('적재 배치와 거점 작업','Cargo layout and stop tasks'));
  workspace.append(ops);ops.append(cargo,route);route.prepend(execution);
  execution.querySelector('h2').textContent=L('현재 운항','Current run');
  const current=make('section','deck-current');current.setAttribute('aria-live','polite');execution.after(current);
  const toolbar=document.querySelector('.map-toolbar'),resultActions=make('div','deck-result-actions');
  const launch=button(L('운항 시작','Start run'),()=>{startRun();refresh();scroll(ops);},'primary');launch.id='deck-start-run';
  const view=$('run-view');view.classList.add('quiet');
  resultActions.append(launch,view);toolbar.append(resultActions);
  const mapHint=make('p','deck-map-hint',L('왼쪽에서 함선과 계약을 준비하면 이동 경로가 여기에 표시됩니다.','Prepare your ship and contracts to see your route here.'));workspace.insertBefore(mapHint,$('map-wrap'));
  const cargoHint=make('p','deck-cargo-hint',L('경로를 계산하면 거점별 적재 배치를 확인할 수 있습니다.','Calculate a route to inspect cargo at each stop.'));cargo.querySelector('.section-line').after(cargoHint);
  const cargoPlace=make('p','deck-cargo-place');cargoHint.after(cargoPlace);
  $('cargo-expand').textContent=L('3D 크게 보기','Expand 3D');
  const cargoMore=details(L('상자 목록 · 상세 · 메모','Containers · details · notes'),'deck-cargo-more');
  const boxList=cargo.querySelector('details');cargoMore.append($('cargo-detail-open'),boxList,document.querySelector('.storage-note-label'));cargo.append(cargoMore);
  const mapOptions=details(L('보기 설정','View options'),'deck-map-options');
  const mapMenu=make('div','deck-map-menu');mapOptions.append(mapMenu);
  for(const id of ['map-top','map-expand','map-ui-toggle','map-quality'])mapMenu.append($(id));
  document.querySelector('.map-actions').append(mapOptions);

  // Contract intake and existing manifest now share one entry point.
  const dialog=$('contracts-dialog');$('contracts-dialog-title').textContent=L('운송 계약','Hauling contracts');
  const intake=dialog.querySelector('.inbox-head').parentElement;
  const supplement=details(L('다른 방법으로 추가','Add another way'),'deck-contract-input');
  for(const selector of ['.intake-heading','#dropzone','.ocr-options','.text-intake']){const node=dialog.querySelector(selector);if(node)supplement.append(node);}
  intake.after(supplement);
  const planned=make('section','deck-planned');planned.id='deck-planned';
  const listTitle=$('mission-count').closest('.section-line');planned.append(listTitle,$('missions'));
  const manifest=details(L('품목 · 수량 · 상자 구성 확인','Review cargo quantities and containers'),'deck-manifest');
  manifest.id='deck-manifest';manifest.append(document.querySelector('.manifest-empty'),$('manifest-workbench'));planned.append(manifest);
  const tabs=make('div','deck-contract-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',L('계약 목록','Contract lists'));
  const receivedTab=button(L('받은 계약','Received'),()=>showContracts(false));receivedTab.id='deck-received-tab';
  const plannedTab=button(L('계획에 담은 계약','In your plan'),()=>showContracts(true));plannedTab.id='deck-planned-tab';
  const received=make('section','deck-received');received.id='deck-received';received.append(intake,supplement);
  for(const [tab,panel] of [[receivedTab,received],[plannedTab,planned]]){tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel.id);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);}
  tabs.append(receivedTab,plannedTab);dialog.append(tabs,received,planned);
  const contractFooter=make('div','deck-contract-footer');
  contractFooter.append(button(L('경로 확인하기','Review route'),()=>{dialog.close();calculate();scroll(workspace);},'primary'));planned.append(contractFooter);
  $('clear').remove(); // The same confirmed reset is available in Data management.
  $('manifest-open').remove();
  contracts.onclick=()=>{showContracts(state().contracts>0&&!Number(document.querySelector('.inbox-launch-count')?.textContent));if(!dialog.open)dialog.showModal();};
  tabs.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?false:e.key==='End'?true:planned.hidden;showContracts(next);(next?plannedTab:receivedTab).focus();};
  function showContracts(inPlan){planned.hidden=!inPlan;received.hidden=inPlan;for(const [tab,on]of [[receivedTab,!inPlan],[plannedTab,inPlan]]){tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;}}
  showContracts(false);
  // Escape closes a disclosure before closing the containing screen.
  for(const disclosure of [utility,mapOptions]){disclosure.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();disclosure.open=false;disclosure.querySelector('summary').focus();}});}
  document.addEventListener('click',e=>{if(!mapOptions.contains(e.target))mapOptions.open=false;});
  const oldIntro=document.querySelector('[data-intro=start]');oldIntro.onclick=()=>{scroll(rail);ship.focus({preventScroll:true});};
  primary.onclick=()=>{const s=state(),action=preparationAction(s);if(action==='location')ship.click();else if(action==='contracts')contracts.click();else if(action==='continue')scroll(ops);else{calculate();refresh();if(state().plan)scroll(workspace);}};
  const fullGuide=$('guide-open');fullGuide.textContent=L('전체 이용 안내','Full guide');
  const help=details(L('도움말','Help'),'deck-help'),helpBody=make('div','deck-help-body');
  fullGuide.before(help);help.append(helpBody);helpBody.append(fullGuide);
  const quickHelp=document.querySelector('.context-help-toggle');if(quickHelp){quickHelp.textContent=L('기능별 도움말','Help by topic');helpBody.append(quickHelp);}
  if($('updates-open'))helpBody.append($('updates-open'));
  help.addEventListener('keydown',e=>{if(e.key==='Escape'){help.open=false;help.querySelector('summary').focus();}});
  helpBody.addEventListener('click',()=>{help.open=false;});
  document.addEventListener('click',e=>{if(!help.contains(e.target))help.open=false;});
  // Update on run render, not on every timer tick or animation frame.
  const observer=new MutationObserver(()=>refresh());observer.observe($('execution'),{childList:true});
  let stamp='';
  function refresh(){
    const s=state(),action=preparationAction(s),ready=!!s.plan;
    text(primary,({location:L('출발지 선택하기','Choose departure'),contracts:L('계약 선택하기','Select contracts'),calculate:L('경로 계산','Calculate route'),continue:L('현재 운항으로 이동','Continue current run')})[action]);
    text(hint,s.active?L('운항 중입니다. 진행 중인 작업을 이어가세요.','Your run is in progress. Continue your current task.'):!s.contracts?L('계약을 선택하면 경로와 적재를 계산합니다.','Select contracts to plan the route and cargo.'):s.plan?L('계약을 바꿨다면 경로를 다시 확인하세요.','Review the route after changing your contracts.'):L('계약의 거점과 수량을 확인해 주세요.','Check the contract locations and quantities.'));
    text(contractSummary,s.contracts?L(`계획에 ${s.contracts}건 · 확인·수정`,` ${s.contracts} in plan · review / edit`):L('받은 계약을 선택하거나 직접 추가','Select received contracts or add your own'));
    text(partnerNote,s.partnerNote);
    primary.disabled=s.busy;
    document.body.classList.toggle('deck-has-plan',ready);document.body.classList.toggle('deck-running',s.active);
    mapHint.hidden=ready;cargoHint.hidden=ready;launch.hidden=!ready||s.active||s.finished;
    cargoPlace.hidden=!ready;text(cargoPlace,s.selected?L('표시 중인 거점: ','Viewing stop: ')+s.selected.name:'');
    view.hidden=!s.active;resultActions.hidden=!ready||s.finished;
    execution.hidden=!s.active&&!s.finished;
    oldIntro.hidden=!!s.contracts;
    current.hidden=!ready||s.active||s.finished;
    text(plannedTab,L(`계획에 담은 계약 (${s.contracts})`,`In your plan (${s.contracts})`));
    contractFooter.hidden=!s.contracts;manifest.hidden=!s.contracts;
    document.querySelector('.manifest-empty').hidden=!!s.contracts;
    $('route-edit').hidden=!ready;$('cargo-expand').disabled=!ready||s.simple;cargoMore.hidden=!ready;
    const selected=s.selected;
    const next=JSON.stringify([selected,s.active,s.finished,s.currentIndex]);
    if(next!==stamp){stamp=next;current.replaceChildren();if(selected){current.append(make('span','eyebrow',L('선택한 거점 · 작업 미리보기','SELECTED STOP · TASK PREVIEW')),make('h3','',selected.name));const list=make('ul');for(const line of selected.lines)list.append(make('li','',line));current.append(list);if(!selected.lines.length)current.append(make('p','',L('이 거점에서는 화물 작업이 없습니다.','No cargo operations at this stop.')));}}
    for(const stop of $('itinerary').querySelectorAll('[data-stop]')){stop.classList.toggle('is-past',s.finished||s.active&&Number(stop.dataset.stop)<s.currentIndex);stop.setAttribute('aria-pressed',String(Number(stop.dataset.stop)===s.selectedIndex));}
  }
  refresh();
  return {refresh,prepare(){scroll(rail);ship.focus({preventScroll:true});},review(){refresh();scroll(workspace);},showContracts,dispose(){observer.disconnect();}};
}
