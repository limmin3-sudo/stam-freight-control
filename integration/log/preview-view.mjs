import {personalNavigation} from './personal-locations.mjs';
import {boxEditor} from './box-editor.mjs';
import {createPreview, previewReadiness, previewContractSignature} from './preview-packing.mjs';
import {createPreviewSession} from './preview-session.mjs';
import {createPreviewMap,partnerBadge} from './preview-map.mjs';
import {stepNumbers,jumpSegments} from '../../route-display.mjs';
import {DEFAULT_SHIP, selectShipGrids, capacity, validateShip} from '../../ships.mjs';
const el = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
const options = (node, items) => {
  node.replaceChildren();
  for (const item of items) { const o = el('option', item.name); o.value = item.id; node.append(o); }
};
const boxText = boxes => {
  const counts = new Map();
  for (const b of boxes) counts.set(b.size, (counts.get(b.size) || 0) + 1);
  return [...counts].sort((a,b) => b[0]-a[0]).map(([size,count]) => `${size} SCU × ${count}개`).join(' + ');
};

export function previewPanel(initialContracts, {catalog, locations, locationData, locationEdits = [], prepareAssets, onGuidance=()=>{}, session = createPreviewSession()}) {
  let contracts = [], signature = '', forms = [], view, mapView, worker, timer, scheduled, serial = 0, opening = 0, closed = true;
  let settleCalculation;
  const boxOverrides={};
  let ships = [DEFAULT_SHIP], ship = DEFAULT_SHIP, controlMode = false, flightRoute = null, flightIndex = 0;
  const events = new AbortController();
  const prefs = session.preferences;
  const root = el('section'); root.className = 'preview-panel';
  const open = el('button', '운송 관제 열기'), panel = el('div'), status = el('p');
  open.className='preview-launch';panel.className='preview-workspace';
  status.setAttribute('role', 'status'); status.className='preview-calculation-status'; panel.hidden = true; root.append(open, panel);
  const close = el('button', '관제 닫기'), retry = el('button', '3D 준비 다시 시도'); retry.hidden = true;
  const form = el('div'), controls = el('div'); controls.className = 'preview-controls';
  const select = el('select'), start = el('select'), partner = el('select'), step = el('select'), search = el('input');
  select.setAttribute('aria-label','미리보기 함선'); start.setAttribute('aria-label','미리보기 출발지');
  partner.setAttribute('aria-label','운항 파트너'); step.setAttribute('aria-label','미리보기 작업 단계');
  search.type = 'search'; search.placeholder = 'New Babbage 등 영문 지명 검색'; search.setAttribute('aria-label','출발지 검색');
  options(partner, [{id:'operator',name:'브리지 오퍼레이터'}, {id:'navigator',name:'수석 항해사'}]); partner.value = prefs.partner;
  const partnerHint = el('p');
  function describePartner() {
    partnerHint.textContent = partner.value === 'operator'
      ? '가까운 계약부터 차근차근 마무리하겠습니다. 짧은 우회로 들를 수 있는 픽업도 함께 챙기겠습니다.'
      : '함께 실을 수 있는 화물을 모으겠습니다. 같은 방향의 계약을 묶고 재방문을 줄이겠습니다.';
    cargoPartner?.set(partner.value);mapView?.setPartner(partner.value);
  }
  const run = el('button','경로·배치 계산'), itinerary = el('ol'), instructions = el('div'), warnings = el('div');
  itinerary.className = 'preview-itinerary'; instructions.className = 'preview-instructions';
  const canvas = el('div'); canvas.className = 'preview-canvas';
  const configuration=el('details');configuration.className='preview-configuration';configuration.open=!prefs.startId;
  configuration.append(el('summary','함선 · 출발지 · 파트너 설정'),controls,partnerHint);
  const revealPartner=()=>{if(controlMode)setControlMode(false);configuration.open=true;partner.focus();};
  const cargoPartner=partnerBadge(revealPartner);cargoPartner.set(partner.value);describePartner();
  const visuals=el('div');visuals.className='preview-visuals';
  const mapHost=el('div');mapHost.className='preview-map-host';
  const cargoHost=el('section');cargoHost.className='preview-cargo-host';
  const cargoHeader=el('div');cargoHeader.className='preview-cargo-header';cargoHeader.append(el('h3','화물 배치'),cargoPartner.root);
  cargoHost.append(cargoHeader,canvas);visuals.append(mapHost,cargoHost);
  const metrics=el('div');metrics.className='preview-metrics';metrics.setAttribute('aria-label','운송 계획 요약');
  const modeBar=el('div');modeBar.className='preview-view-modes';modeBar.setAttribute('aria-label','지도와 적재 화면');
  for(const [mode,label] of [['both','지도 + 아래 적재'],['map','지도'],['cargo','적재 3D']]) {
    const button=el('button',label);button.type='button';button.setAttribute('aria-pressed',String(mode==='both'));
    button.onclick=()=>{mapHost.hidden=mode==='cargo';cargoHost.hidden=mode==='map';visuals.dataset.mode=mode;
      for(const b of modeBar.children)b.setAttribute('aria-pressed',String(b===button));};modeBar.append(button);
  }
  const stageBar=el('div');stageBar.className='preview-stage-bar';
  const previous=el('button','← 이전 단계'),next=el('button','다음 단계 →');
  previous.type=next.type='button';previous.disabled=next.disabled=true;stageBar.append(previous,step,next);
  previous.onclick=()=>{if(step.selectedIndex>0){step.selectedIndex--;step.onchange?.();}};
  next.onclick=()=>{if(step.selectedIndex<step.options.length-1){step.selectedIndex++;step.onchange?.();}};
  const routePanel=el('section');routePanel.className='preview-route-panel';routePanel.append(el('h3','방문 순서'),itinerary);
  const operations=el('aside');operations.className='preview-operations';operations.append(routePanel,instructions);
  const manifest=el('details');manifest.className='preview-manifest';manifest.append(el('summary','계약별 화물과 연결 근거'),form);
  const assumptions=el('details');assumptions.className='preview-assumptions';assumptions.append(el('summary','계산 근거와 주의 사항'),warnings);
  const desk=el('button','관제 모드');desk.type='button';desk.setAttribute('aria-pressed','false');
  const exitDesk=el('button','기본 화면으로');exitDesk.type='button';exitDesk.hidden=true;exitDesk.onclick=()=>setControlMode(false);
  const toolbar=el('div');toolbar.className='preview-toolbar';toolbar.append(el('h2','운송 계획'),exitDesk,close,retry);
  const flightBar=el('div');flightBar.className='preview-flight-bar';
  const launch=el('button','운송 시작 · 예상 이동'),pause=el('button','일시정지'),end=el('button','이동 표시 종료');
  launch.type=pause.type=end.type='button';launch.disabled=true;pause.hidden=end.hidden=true;
  const flightNote=el('p','운송을 시작하면 계획 경로를 따라 예상 위치를 표시합니다. 실제 위치·도착·배송 완료와는 별개입니다.');
  flightNote.className='preview-flight-note';
  flightBar.append(launch,pause,end,flightNote);
  function setControlMode(value) {
    controlMode=value;panel.classList.toggle('preview-control-mode',value);
    document.body.classList.toggle('preview-control-open',value);
    exitDesk.hidden=!value;
    mapHost.hidden=!value&&visuals.dataset.mode==='cargo';cargoHost.hidden=!value&&visuals.dataset.mode==='map';
    // Reuse the existing views and controls; never create a second WebGL scene for control mode.
    if(value)flightBar.prepend(launch);else left.insertBefore(launch,desk);
    desk.textContent=value?'기본 화면으로':'관제 모드';desk.setAttribute('aria-pressed',String(value));
    mapView?.followFlight(value);
  }
  desk.onclick=()=>setControlMode(!controlMode);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&controlMode){setControlMode(false);e.preventDefault();e.stopPropagation();}},{signal:events.signal,capture:true});
  function resetFlight() {
    onGuidance(false);
    flightRoute=null;flightIndex=0;launch.disabled=true;launch.textContent='운송 시작 · 예상 이동';
    pause.hidden=end.hidden=true;pause.textContent='일시정지';
    mapView?.stopFlight();flightNote.textContent='운송을 시작하면 계획 경로를 따라 예상 위치를 표시합니다. 실제 위치·도착·배송 완료와는 별개입니다.';
  }
  launch.onclick=()=>{
    if(!flightRoute||!mapView)return;
    flightIndex++;
    const visit=flightRoute.visits[flightIndex];if(!visit)return;
    // Stage inspection remains a preview. Animation never changes cargo or completes a contract.
    step.value=String(flightIndex-1);step.onchange?.();
    launch.disabled=true;pause.hidden=end.hidden=false;pause.textContent='일시정지';
    if(!controlMode)mapHost.scrollIntoView({block:'center',behavior:'smooth'});
    const started=mapView.startFlight(flightIndex,{follow:controlMode,onState:state=>{
      flightNote.textContent=`예상 이동 · ${state.destination} · ${Math.round(state.progress*100)}%${state.paused?' · 일시정지':''}${state.arrived?' · 예상 시간 경과, 실제 도착 미확인':''}`;
      if(state.arrived){pause.hidden=true;launch.disabled=flightIndex>=flightRoute.visits.length-1;launch.textContent='다음 구간 출발 · 예상 이동';}
    }});
    if(started){launch.disabled=flightIndex>=flightRoute.visits.length-1;launch.textContent='다음 구간 출발 · 예상 이동';}
    if(!started){flightIndex--;launch.disabled=false;pause.hidden=end.hidden=true;flightNote.textContent='구간 이동 시간을 확인하지 못했습니다. 항로를 다시 계산해 주세요.';}
    onGuidance(!!started);return !!started;
  };
  pause.onclick=()=>{const paused=mapView?.pauseFlight();pause.textContent=paused?'계속 이동':'일시정지';};
  end.onclick=()=>{const saved=flightRoute;resetFlight();flightRoute=saved;launch.disabled=!saved||saved.visits.length<2;};
  const available = personalNavigation(locationData,locationEdits).locations.sort((a,b) => a.name.localeCompare(b.name));
  function fillStarts() {
    const query = search.value.trim().toLowerCase();
    options(start, [{id:'',name:'출발지를 선택해 주세요'}, ...available.filter(p =>
      p.id === prefs.startId || !query || [p.name,...(p.aliases||[])].some(n=>n.toLowerCase().includes(query))).map(p => ({...p, name:`${p.name} · ${p.system}`}))]);
    start.value = available.some(p => p.id === prefs.startId) ? prefs.startId : '';
  }
  fillStarts(); configuration.open=!start.value; search.oninput = fillStarts;
  for (const [text, control] of [['운항 파트너',partner],['함선',select],['출발지 검색',search],['계획 출발지 (현재 함선 위치 아님)',start]]) {
    const label = el('label',text); label.append(control); controls.append(label);
  }
  const center=el('div');center.className='preview-center';center.append(metrics,modeBar,stageBar,visuals,flightBar,manifest,assumptions);
  const shipSummary=el('section');shipSummary.className='preview-ship-card';
  function renderShipSummary(result) {
    shipSummary.replaceChildren(el('small','SHIP / 운용 함선'),el('h3',ship.name));
    const rows=[['화물칸',`${capacity(ship)} SCU · 사용 ${ship.grids.filter(g=>!g.disabled).length}/${ship.grids.length}`],
      ['출발',available.find(p=>p.id===start.value)?.name||'선택 필요'],
      ['계약',result?`${result.contractCount}건 · ${result.totalScu} SCU`:'계산 대기']];
    const list=el('dl');for(const [name,value] of rows)list.append(el('dt',name),el('dd',value));shipSummary.append(list);
  }
  const left=el('div');left.className='preview-settings';left.append(shipSummary,launch,desk,configuration,run);
  launch.className='preview-flight-launch';desk.className='preview-desk-launch';renderShipSummary();
  // Same floorplan as the original: contracts/settings left, map/cargo center, route right.
  panel.append(toolbar,status,left,center,operations);
  function stop() { settleCalculation?.(false);settleCalculation=null;serial++; clearTimeout(timer); clearTimeout(scheduled); worker?.terminate(); worker = null; }
  function scheduleCalculation() {
    clearTimeout(scheduled);
    if(!closed&&view)scheduled=setTimeout(calculate,350);
  }
  function invalidate(message) {
    resetFlight();renderShipSummary(); stop(); step.replaceChildren(); itinerary.replaceChildren(); instructions.replaceChildren(); warnings.replaceChildren();
    metrics.replaceChildren();previous.disabled=next.disabled=true;mapView?.setResult(null);
    view?.update(null,{ship}); status.textContent = message || '변경 사항을 반영하고 있습니다…';
  }
  function dispose() {
    panel.insertBefore(left,center);setControlMode(false);resetFlight(); closed = true; opening++; stop(); view?.dispose(); view = null;mapView?.dispose();mapView=null; panel.hidden = true; open.disabled = !contracts.length;open.hidden=false;
  }
  close.onclick = dispose; retry.onclick = () => { dispose(); open.click(); };
  function captureDraft(f) {
    session.saveDraft(f.id, {confirmed:f.check.checked, rows:f.inputs.map(r =>
      ({scu:Number(r.amount.value),pickupId:r.pickup.value,dropoffId:r.delivery.value}))});
  }
  function buildForms() {
    forms = []; form.replaceChildren();
    for (const contract of contracts) {
      const group = el('section'); group.className = 'preview-orders';
      group.append(el('h3',contract.title || '제목 미확인'));
      try {
        const readiness=previewReadiness(contract,catalog,locations);
        group.append(el('p',readiness.label));
        if(readiness.ready) {
          const names=new Map(available.map(p=>[p.id,p.name]));
          for(const c of readiness.preview.mission.cargo){group.append(el('p',
            `${c.commodity} · ${c.scu} SCU · ${c.pickupId?names.get(c.pickupId):'픽업별 배분 미확인'} → ${names.get(c.dropoffId)} · ${c.boxes.length?c.boxes.map(b=>`${b.size} SCU × ${b.count}개`).join(' + '):`${c.maxBoxSize} SCU 이하 공간 가이드`}`));
            group.append(boxEditor(c,boxOverrides[c.key],value=>{if(value)boxOverrides[c.key]=value;else delete boxOverrides[c.key];invalidate('상자 구성을 반영하고 있습니다.');scheduleCalculation();}));}
          group.append(el('small','원래 요구량입니다. 현재 실린 화물이나 남은 배송량이 아닙니다.'));
        } else if(readiness.input) {
          const input = readiness.input, draft = session.draft(contract.missionId);
          group.append(el('p',`픽업: ${input.pickups.map(p=>p.name).join(' / ')} → 배송: ${input.deliveries.map(p=>p.name).join(' / ')}`));
          group.append(el('p','새 로그 근거가 들어오면 다시 대조합니다. 지금 수동 입력하실 필요는 없습니다. 이 계약은 자동 계획에 반영되지 않습니다.'));
          const manual=el('details');manual.append(el('summary','직접 확인한 정보로 별도 예상 계획 만들기 (선택)'));
          manual.append(el('p','로그로 확인되지 않은 배분을 직접 입력하는 선택 기능입니다. 자동 연동으로 처리하지 않습니다.'));
          const f = {id:contract.missionId,inputs:[],check:el('input')};
          f.check.type = 'checkbox'; f.check.checked = draft.confirmed;
          input.orders.forEach((order,i) => {
            const row = el('div'); row.className = 'preview-row';
            const amount = el('input'), pickup = el('select'), delivery = el('select');
            amount.type = 'number'; amount.min = '1'; amount.max = '10000';
            amount.setAttribute('aria-label',`주문 ${i+1} SCU`);
            amount.value = draft.rows[i]?.scu ?? '';
            amount.placeholder = '실제 주문 SCU';
            options(pickup,[{id:'',name:'픽업 선택'},...input.pickups]);
            options(delivery,[{id:'',name:'배송 선택'},...input.deliveries]);
            pickup.value = draft.rows[i]?.pickupId || (input.pickups.length===1?input.pickups[0].id:'');
            delivery.value = draft.rows[i]?.dropoffId || (input.deliveries.length===1?input.deliveries[0].id:'');
            pickup.setAttribute('aria-label',`주문 ${i+1} 픽업`); delivery.setAttribute('aria-label',`주문 ${i+1} 배송`);
            row.append(el('p',`주문 ${i+1} · ${order.name} · 상자 상한 ${order.maxBoxScu} SCU`),amount,pickup,delivery);
            manual.append(row); f.inputs.push({amount,pickup,delivery});
          });
          const label = el('label'); label.append(f.check,document.createTextNode('각 주문의 수량과 경로를 확인했습니다 (실제 상자 구성 확인 아님)'));
          manual.append(label);group.append(manual); forms.push(f);
          group.oninput = event => {
            if (event.target !== f.check) f.check.checked = false;
            captureDraft(f); invalidate('직접 입력한 예상 계획이 변경되었습니다.');
            if(f.check.checked)scheduleCalculation();
          };
        }
      } catch (e) { group.append(el('p',e.message)); }
      form.append(group);
    }
  }
  function updateContracts(next) {
    next = Array.isArray(next) ? next : next ? [next] : [];
    const key = JSON.stringify(next.map(c=>previewContractSignature(c,catalog,locations)));
    if (key === signature) { contracts=next;return; }
    forms.forEach(captureDraft);
    for (const contract of next) session.observe(contract);
    contracts = next; signature = key;
    open.disabled = !closed || !contracts.length;
    if (!closed) {
      invalidate('선택한 계약의 근거를 다시 대조하고 있습니다.');
      buildForms(); run.disabled = !view || !contracts.length;
      scheduleCalculation();
    }
  }
  function currentShip() {
    const base = ships.find(s => s.id === prefs.shipId) || DEFAULT_SHIP;
    return selectShipGrids(base,prefs.disabled[base.id] || []);
  }
  function calculate({startGuidance=false}={}) {
    if (closed || !view) return;
    invalidate(); forms.forEach(captureDraft);
    const confirmations = Object.fromEntries(contracts.map(c => [c.missionId,session.draft(c.missionId)]));
    try {
      if (!contracts.length) throw Error('계획할 계약을 선택해 주세요.');
      for (const c of contracts) {
        const readiness=previewReadiness(c,catalog,locations);
        if(!readiness.ready&&!confirmations[c.missionId]?.confirmed)
          throw Error(`${c.title || '제목 미확인'}: ${readiness.label}. 이 계약을 선택 해제하면 나머지 계약을 계획할 수 있습니다.`);
        createPreview(c,catalog,locations,confirmations[c.missionId],boxOverrides);
      }
      if (!start.value&&!contracts.some(c=>previewReadiness(c,catalog,locations).reservation)) throw Error('계획 출발지를 선택해 주세요.');
    } catch (e) { status.textContent = e.message; return; }
    const id = serial; status.textContent = '항로와 적재 순서를 계산하고 있습니다…';
    return new Promise(resolve=>{settleCalculation=resolve;
    const fail = message => { if (id !== serial || closed) return; stop(); status.textContent = message; };
    try { worker = new Worker(new URL('./preview-worker.mjs',import.meta.url),{type:'module'}); }
    catch { fail('계산 작업을 시작하지 못했습니다. 다시 계산해 주세요. 로그 감시는 계속됩니다.'); return; }
    timer = setTimeout(() => fail('계산 시간이 8초를 넘었습니다. 계약을 나누거나 함선·그리드를 확인해 주세요.'),8000);
    worker.onerror = () => fail('미리보기 작업을 시작하지 못했습니다. 로그 감시는 계속됩니다.');
    worker.onmessage = ({data}) => {
      if (closed || id !== serial || data.id !== id) return;
      clearTimeout(timer); worker.terminate(); worker = null;
      if (data.error) { fail(data.error); return; }
      try {renderResult(data.result);const started=data.result.scope==='destination-space-reservation'?'reservation':!startGuidance||(!launch.disabled&&launch.onclick()===true);settleCalculation?.(started);settleCalculation=null;}
      catch{fail('항로를 표시하지 못했습니다. 함선과 출발지를 확인한 뒤 다시 시도해 주세요.');}
    };
    try{worker.postMessage({id,input:{contracts,catalogData:[...catalog],locationData,locationEdits,confirmations,boxOverrides,ship,startId:start.value,partner:partner.value}});}catch{fail('계산할 화물을 전달하지 못했습니다. 다시 시도해 주세요.');}
    });
  }
  function renderResult(r) {
    const map = new Map(r.stops.map(p => [p.id,p])), names = new Map(r.contracts.map((c,i) => [c.id,`계약 ${i+1} · ${c.title || '제목 미확인'}`]));
    panel.dataset.packingMode=r.scope;
    if(r.scope==='destination-space-reservation'){
      renderShipSummary(r);flightRoute=null;launch.disabled=true;mapView?.setResult(null);
      status.textContent=`공간 예약 · ${r.totalScu} SCU · ${r.boxCount}개 배치 블록${r.partial?' · 확인된 일부 화물만 포함':''}. 실제 상자 개수와 다를 수 있습니다.`;
      const nameOf=id=>map.get(id)?.name||'배송지 확인 필요';
      view.update(r.packing,{ship:r.ship,nameOf,missionNameOf:id=>names.get(id)||'계약 미확인'});
      itinerary.append(el('li','배송지별 적재 공간입니다. 픽업별 배분이 확인되기 전에는 운항 순서로 사용하지 않습니다.'));
      for(const id of [...new Set(r.rows.map(x=>x.dropoffId))]){
        instructions.append(el('h3',nameOf(id)));
        for(const row of r.rows.filter(x=>x.dropoffId===id))instructions.append(el('p',`${row.commodity} · ${row.scu} SCU · ${row.boxSource==='user'?'사용자 지정 상자':row.boxSource==='profile'?'확인된 원래 상자':'공간 가이드 · 실물 조합 미확인'}`),el('small',names.get(row.missionId)));
      }
      warnings.append(el('p','테두리는 적재 공간 예약입니다. 같은 SCU여도 실제 상자 형상·그리드 제한에 따라 다시 배치해야 할 수 있습니다. 정확한 구성이 필요하면 계약별 화물에서 상자 크기와 개수를 직접 지정해 주세요.'));
      if(!r.packing){status.textContent+=' 현재 그리드에 전량을 배치할 수 없습니다.';warnings.append(el('p','다른 함선·사용할 그리드·직접 지정한 상자 구성을 확인해 주세요. 빈 그리드를 적재 완료로 간주하지 않습니다.'));}
      return;
    }
    const numbers=stepNumbers(r.route.visits,map);
    renderShipSummary(r);flightRoute=r.route;launch.disabled=!mapView||r.route.visits.length<2;
    mapView?.setResult(r);
    const nameOf = id => map.get(id)?.name || id;
    status.textContent = `${r.userBoxes?'사용자 지정 상자 구성 포함':r.estimated?'예상 상자 배치 · 실제 구성 미확인':'확인된 원래 상자 구성'} · ${r.boxCount}개 / ${r.totalScu} SCU. 현재 적재·남은 수량이 아닌 운송 계획입니다.`;
    for(const [value,label] of [[r.contractCount,'계약'],[`${r.totalScu} SCU`,'전체 화물'],[r.boxCount,'상자'],[`${Math.round(r.route.seconds/60)}분`,'예상 운항·작업']]){
      const metric=el('div');metric.append(el('strong',String(value)),el('small',label));metrics.append(metric);
    }
    if(!r.packing)warnings.append(el('p','전체 동시 적재가 불가능합니다. 단계별 분할 운송을 확인해 주세요.'));
    warnings.append(el('p',r.route.algorithm),el('p',`점프 연결: ${r.routeEvidence.snapshot} 공개 스냅샷. 상자 수에 따른 작업 시간도 예상값입니다.`));
    for (const warning of r.warnings) warnings.append(el('p',warning));
    const frames = [{id:'all',name:'원래 화물 전체 · 합산 미리보기',packing:r.packing},...r.route.visits.flatMap((v,i) => [
      ...jumpSegments(v.leg,map).map((jump,j)=>({id:`jump-${i}-${j}`,index:i,jump,
        name:`${numbers.jumps[i][j]}. ${jump.fromSystem.toUpperCase()} → ${jump.toSystem.toUpperCase()} · 점프`,
        packing:i>0?r.route.visits[i-1].packing:r.route.initialPacking})),
      {id:String(i),name:`${numbers.stop[i]}. ${nameOf(v.locationId)} · ${i===0?'출발지':'작업 후'}`,packing:v.packing,visit:v,index:i}])];
    options(step,frames); step.value = r.packing ? 'all' : frames.find(f=>f.visit?.load>0)?.id || '0';
    step.onchange = () => {
      const frame = frames.find(f => f.id === step.value), v = frame?.visit;
      if (!frame) return;
      previous.disabled=step.selectedIndex===0;next.disabled=step.selectedIndex===step.options.length-1;
      mapView?.focusStage(frame.index??-1);
      if(frame.jump)mapView?.focus(frame.jump.entryId);
      for(const button of itinerary.querySelectorAll('[data-visit]'))button.setAttribute('aria-current',String(button.dataset.visit===step.value));
      const loadIds = v?.events.filter(e => e.type === 'pickup').flatMap(e => r.route.shipments[e.shipmentIndex].boxes.map(b => b.boxId));
      const leavingIds = new Set(v?.events.filter(e => e.type === 'delivery').flatMap(e => r.route.shipments[e.shipmentIndex].boxes.map(b => b.boxId)));
      const before = frame.index > 0 ? r.route.visits[frame.index-1].packing : r.route.initialPacking;
      view.update(frame.packing,{ship:r.ship,nameOf,missionNameOf:id=>names.get(id)||'계약 미확인',loadIds,leaving:v ? before.boxes.filter(b => leavingIds.has(b.boxId)) : []});
      instructions.replaceChildren(el('h3',frame.name));
      if(frame.jump) {
        instructions.append(el('p',`${frame.jump.entryName} → ${frame.jump.exitName}`),el('p','항성계 이동 구간입니다. 계획한 적재 상태를 유지하며, 이 단계에서는 화물을 싣거나 내리지 않습니다.'));return;
      }
      if (!v) { instructions.append(el('p','선택한 계약의 원래 화물을 합산했습니다. 실제 적재 상태가 아닙니다.')); return; }
      for (const e of v.events) {
        if (e.type === 'departure') { instructions.append(el('p','여기서 출발합니다. 다음 단계에서 첫 픽업지까지의 이동과 적재할 상자를 확인해 주세요.')); continue; }
        const s = r.route.shipments[e.shipmentIndex]; if (!s) continue;
        instructions.append(el('p',`${e.type==='pickup'?'↑ 적재':'↓ 하역'} · ${s.commodity} ${s.scu} SCU · ${boxText(s.boxes)} → ${nameOf(s.dropoffId)}${s.estimated?' · 예상 구성':''}`),
          el('small',names.get(s.missionId) || '제목 미확인'));
      }
    };
    for (const [i,v] of r.route.visits.entries()) {
      for(const [j,jump] of jumpSegments(v.leg,map).entries()) {
        const transit=el('li'),b=el('button',`${numbers.jumps[i][j]}. ${jump.fromSystem.toUpperCase()} → ${jump.toSystem.toUpperCase()} · 점프`);
        b.type='button';b.dataset.visit=`jump-${i}-${j}`;b.onclick=()=>{step.value=b.dataset.visit;step.onchange();};transit.append(b);itinerary.append(transit);
      }
      const li = el('li'), button = el('button',`${numbers.stop[i]}. ${nameOf(v.locationId)}${i===0?' · 출발':''}`);
      button.dataset.visit=String(i);button.type='button';
      button.onclick = () => { step.value = String(i); step.onchange(); };
      li.append(button); itinerary.append(li);
    }
    step.onchange();
  }
  run.onclick = calculate;
  start.onchange = () => { session.setPreferences({startId:start.value}); invalidate();scheduleCalculation(); };
  partner.onchange = () => { session.setPreferences({partner:partner.value}); describePartner(); invalidate();scheduleCalculation(); };
  select.onchange = () => { session.setPreferences({shipId:select.value}); ship = currentShip(); invalidate();scheduleCalculation(); };
  open.onclick = async ({planOnOpen=true}={}) => {
    if (!contracts.length) return;
    const accountCard=document.getElementById('flight-ready-host')||document.getElementById('workspace-account');
    if(accountCard)accountCard.after(left);else document.querySelector('.log-contract-rail')?.prepend(left);
    closed = false; open.disabled = true;open.hidden=true; panel.hidden = false; retry.hidden = true;
    const generation = ++opening; invalidate('3D 라이브러리를 준비하고 있습니다. 처음에는 다운로드가 필요할 수 있습니다…'); buildForms();
    select.disabled = start.disabled = partner.disabled = run.disabled = true;
    try {
      await prepareAssets?.();
      const [renderer,response] = await Promise.all([import('../../cargo-scene.mjs'),fetch(new URL('../../data/ships.json',import.meta.url))]);
      if (closed || generation !== opening) return;
      if (!response.ok) throw Error('ships-unavailable');
      ships = [DEFAULT_SHIP,...(await response.json()).filter(s => s.id !== DEFAULT_SHIP.id)];
      for(const saved of session.savedShips())try{const custom=validateShip(saved);if(!ships.some(s=>s.id===custom.id))ships.push(custom);}catch{ /* Retain invalid originals in storage; do not calculate with them. */ }
      if (closed || generation !== opening) return;
      ship = currentShip(); options(select,ships); select.value = ship.id;
      select.disabled = start.disabled = partner.disabled = false; run.disabled = !contracts.length;
      view = renderer.createCargoView(canvas,{onGridToggle:index => {
        const disabled = new Set(ship.grids.filter(g => g.disabled).map(g => g.id)), key = ship.grids[index].id;
        if (disabled.has(key)) disabled.delete(key); else disabled.add(key);
        ship = selectShipGrids(ship,[...disabled]); session.setDisabled(ship.id,[...disabled]);
        invalidate('사용할 그리드를 반영하고 있습니다.');scheduleCalculation();
      }});
      view.update(null,{ship});
      mapHost.replaceChildren();
      try {
        const createdMap=await createPreviewMap(mapHost,{locations:available,partner:partner.value,onPartner:revealPartner,
          onVisit:i=>{step.value=String(i);step.onchange?.();},
          quality:prefs.mapQuality,onQuality:mapQuality=>session.setPreferences({mapQuality}),
          onStart:id=>{session.setPreferences({startId:id});fillStarts();start.onchange();}});
        if(closed||generation!==opening){createdMap.dispose();return;}
        mapView=createdMap;
      } catch {
        if(closed||generation!==opening)return;
        mapHost.replaceChildren(el('p','지도를 시작하지 못했습니다. 화물 3D와 방문 목록은 계속 사용할 수 있습니다.'));
      }
      if (start.value||contracts.some(c=>previewReadiness(c,catalog,locations).reservation)) {if(planOnOpen)calculate();}
      else status.textContent = '처음 한 번 출발지를 선택해 주세요. 선택한 계약의 근거가 충분하면 자동으로 계산합니다.';
    } catch {
      if (!closed && generation === opening) {
        status.textContent = '3D 준비를 완료하지 못했습니다. 인터넷 연결과 앱 폴더의 쓰기 권한을 확인한 뒤 다시 시도해 주세요. 라이브러리 다운로드가 차단된 경우에도 로그 감시는 계속됩니다.';
        retry.hidden = false;
      }
    }
  };
  updateContracts(initialContracts);
  return {root,isOpen:()=>!closed,dispose(){dispose();events.abort();},updateContracts,
    canAdvance:()=>!!flightRoute&&!launch.disabled,advanceGuidance:()=>!launch.disabled&&launch.onclick()===true,
    setPartner(value){partner.value=value;partner.onchange();},
    invalidateConfiguration(){ship=currentShip();select.value=ship.id;fillStarts();invalidate('함선·출발지를 변경했습니다. 준비를 마치면 항로 안내를 시작해 주세요.');},
    async prepareAndStart(){
      if(closed)await open.onclick({planOnOpen:false});if(closed||!view)return false;
      ship=currentShip();options(select,ships);select.value=ship.id;partner.value=prefs.partner;describePartner();fillStarts();
      if(!start.value){configuration.open=true;start.focus();return false;}
      const started=await calculate({startGuidance:true});onGuidance(started===true);return started;
    }};
}
