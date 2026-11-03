import {createPreview, previewLocations, previewReadiness} from './preview-packing.mjs';
import {createPreviewSession} from './preview-session.mjs';
import {DEFAULT_SHIP, selectShipGrids} from '../../ships.mjs';
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

export function previewPanel(initialContracts, {catalog, locations, locationData, prepareAssets, session = createPreviewSession()}) {
  let contracts = [], signature = '', forms = [], view, worker, timer, scheduled, serial = 0, opening = 0, closed = true;
  let ships = [DEFAULT_SHIP], ship = DEFAULT_SHIP;
  const prefs = session.preferences;
  const root = el('section'); root.className = 'preview-panel';
  const open = el('button', '3D · 예상 경로 미리보기'), panel = el('div'), status = el('p');
  status.setAttribute('role', 'status'); panel.hidden = true; root.append(open, panel);
  const close = el('button', '미리보기 닫기'), retry = el('button', '3D 준비 다시 시도'); retry.hidden = true;
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
  }
  describePartner();
  const run = el('button','경로·배치 계산'), itinerary = el('ol'), instructions = el('div'), warnings = el('div');
  itinerary.className = 'preview-itinerary'; instructions.className = 'preview-instructions';
  const canvas = el('div'); canvas.className = 'preview-canvas';
  const available = previewLocations(locationData).sort((a,b) => a.name.localeCompare(b.name));
  function fillStarts() {
    const query = search.value.trim().toLowerCase();
    options(start, [{id:'',name:'출발지를 선택해 주세요'}, ...available.filter(p =>
      p.id === prefs.startId || !query || p.name.toLowerCase().includes(query)).map(p => ({...p, name:`${p.name} · ${p.system}`}))]);
    start.value = available.some(p => p.id === prefs.startId) ? prefs.startId : '';
  }
  fillStarts(); search.oninput = fillStarts;
  for (const [text, control] of [['운항 파트너',partner],['함선',select],['출발지 검색',search],['계획 출발지 (현재 함선 위치 아님)',start]]) {
    const label = el('label',text); label.append(control); controls.append(label);
  }
  panel.append(close,retry,status,partnerHint,controls,form,run,step,itinerary,warnings,instructions,canvas);
  function stop() { serial++; clearTimeout(timer); clearTimeout(scheduled); worker?.terminate(); worker = null; }
  function scheduleCalculation() {
    clearTimeout(scheduled);
    if(!closed&&view)scheduled=setTimeout(calculate,350);
  }
  function invalidate(message) {
    stop(); step.replaceChildren(); itinerary.replaceChildren(); instructions.replaceChildren(); warnings.replaceChildren();
    view?.update(null,{ship}); status.textContent = message || '변경 사항을 반영하고 있습니다…';
  }
  function dispose() {
    closed = true; opening++; stop(); view?.dispose(); view = null; panel.hidden = true; open.disabled = false;
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
          for(const c of readiness.preview.mission.cargo)group.append(el('p',
            `${c.commodity} · ${c.scu} SCU · ${names.get(c.pickupId)} → ${names.get(c.dropoffId)} · ${c.boxes.length?c.boxes.map(b=>`${b.size} SCU × ${b.count}개`).join(' + '):`상한 ${c.maxBoxSize} SCU 기준 예상 구성`}`));
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
    const key = JSON.stringify(next);
    if (key === signature) return;
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
  function calculate() {
    if (closed || !view) return;
    invalidate(); forms.forEach(captureDraft);
    const confirmations = Object.fromEntries(contracts.map(c => [c.missionId,session.draft(c.missionId)]));
    try {
      if (!contracts.length) throw Error('계획할 계약을 선택해 주세요.');
      for (const c of contracts) {
        const readiness=previewReadiness(c,catalog,locations);
        if(!readiness.ready&&!confirmations[c.missionId]?.confirmed)
          throw Error(`${c.title || '제목 미확인'}: ${readiness.label}. 이 계약을 선택 해제하면 나머지 계약을 계획할 수 있습니다.`);
        createPreview(c,catalog,locations,confirmations[c.missionId]);
      }
      if (!start.value) throw Error('계획 출발지를 선택해 주세요.');
    } catch (e) { status.textContent = e.message; return; }
    const id = serial; status.textContent = '경로와 배치를 계산하고 있습니다…';
    const fail = message => { if (id !== serial || closed) return; stop(); status.textContent = message; };
    try { worker = new Worker(new URL('./preview-worker.mjs',import.meta.url),{type:'module'}); }
    catch { fail('계산 작업을 시작하지 못했습니다. 다시 계산해 주세요. 로그 감시는 계속됩니다.'); return; }
    timer = setTimeout(() => fail('계산 시간이 8초를 넘었습니다. 계약을 나누거나 함선·그리드를 확인해 주세요.'),8000);
    worker.onerror = () => fail('미리보기 작업을 시작하지 못했습니다. 로그 감시는 계속됩니다.');
    worker.onmessage = ({data}) => {
      if (closed || id !== serial || data.id !== id) return;
      clearTimeout(timer); worker.terminate(); worker = null;
      if (data.error) { status.textContent = data.error; return; }
      renderResult(data.result);
    };
    worker.postMessage({id,input:{contracts,catalogData:[...catalog],locationData,confirmations,ship,startId:start.value,partner:partner.value}});
  }
  function renderResult(r) {
    const map = new Map(r.stops.map(p => [p.id,p])), names = new Map(r.contracts.map((c,i) => [c.id,`계약 ${i+1} · ${c.title || '제목 미확인'}`]));
    const nameOf = id => map.get(id)?.name || id;
    status.textContent = `${r.estimated?'예상 상자 배치 · 실제 구성 미확인':'확인된 원래 상자 구성의 배치 미리보기'} · 계약 ${r.contractCount}개 · ${r.boxCount}개 / ${r.totalScu} SCU. ${r.packing?'전체 화물 동시 배치 계산됨':'전체 동시 적재 불가 · 단계별 분할 운송을 확인해 주세요.'} 현재 적재·남은 수량이 아닙니다. 예상 ${Math.round(r.route.seconds/60)}분 (이동·작업 가정 포함).`;
    warnings.append(el('p',r.route.algorithm),el('p',`점프 연결: ${r.routeEvidence.snapshot} 공개 스냅샷. 상자 수에 따른 작업 시간도 예상값입니다.`));
    for (const warning of r.warnings) warnings.append(el('p',warning));
    const frames = [{id:'all',name:'원래 화물 전체 · 합산 미리보기',packing:r.packing},...r.route.visits.map((v,i) =>
      ({id:String(i),name:`${i+1}. ${nameOf(v.locationId)} · ${i===0?'출발지':'작업 후'}`,packing:v.packing,visit:v,index:i}))];
    options(step,frames); step.value = r.packing ? 'all' : frames.find(f=>f.visit?.load>0)?.id || '0';
    step.onchange = () => {
      const frame = frames.find(f => f.id === step.value), v = frame?.visit;
      if (!frame) return;
      const loadIds = v?.events.filter(e => e.type === 'pickup').flatMap(e => r.route.shipments[e.shipmentIndex].boxes.map(b => b.boxId));
      const leavingIds = new Set(v?.events.filter(e => e.type === 'delivery').flatMap(e => r.route.shipments[e.shipmentIndex].boxes.map(b => b.boxId)));
      const before = frame.index > 0 ? r.route.visits[frame.index-1].packing : r.route.initialPacking;
      view.update(frame.packing,{ship:r.ship,nameOf,missionNameOf:id=>names.get(id)||'계약 미확인',loadIds,leaving:v ? before.boxes.filter(b => leavingIds.has(b.boxId)) : []});
      instructions.replaceChildren(el('h3',frame.name));
      if (!v) { instructions.append(el('p','선택한 계약의 원래 화물을 합산했습니다. 실제 적재 상태가 아닙니다.')); return; }
      for (const e of v.events) {
        if (e.type === 'departure') { instructions.append(el('p','여기서 출발합니다. 다음 단계에서 첫 픽업지까지의 이동과 적재할 상자를 확인해 주세요.')); continue; }
        const s = r.route.shipments[e.shipmentIndex]; if (!s) continue;
        instructions.append(el('p',`${e.type==='pickup'?'↑ 적재':'↓ 하역'} · ${s.commodity} ${s.scu} SCU · ${boxText(s.boxes)} → ${nameOf(s.dropoffId)}${s.estimated?' · 예상 구성':''}`),
          el('small',names.get(s.missionId) || '제목 미확인'));
      }
    };
    for (const [i,v] of r.route.visits.entries()) {
      const li = el('li'), button = el('button',`${i+1}. ${(v.leg?.nodes || [v.locationId]).map(nameOf).join(' → ')}`);
      button.onclick = () => { step.value = String(i); step.onchange(); };
      li.append(button); itinerary.append(li);
    }
    step.onchange();
  }
  run.onclick = calculate;
  start.onchange = () => { session.setPreferences({startId:start.value}); invalidate();scheduleCalculation(); };
  partner.onchange = () => { session.setPreferences({partner:partner.value}); describePartner(); invalidate();scheduleCalculation(); };
  select.onchange = () => { session.setPreferences({shipId:select.value}); ship = currentShip(); invalidate();scheduleCalculation(); };
  open.onclick = async () => {
    if (!contracts.length) return;
    closed = false; open.disabled = true; panel.hidden = false; retry.hidden = true;
    const generation = ++opening; invalidate('3D 라이브러리를 준비하고 있습니다. 처음에는 다운로드가 필요할 수 있습니다…'); buildForms();
    select.disabled = start.disabled = partner.disabled = run.disabled = true;
    try {
      await prepareAssets?.();
      const [renderer,response] = await Promise.all([import('../../cargo-scene.mjs'),fetch(new URL('../../data/ships.json',import.meta.url))]);
      if (closed || generation !== opening) return;
      if (!response.ok) throw Error('ships-unavailable');
      ships = [DEFAULT_SHIP,...(await response.json()).filter(s => s.id !== DEFAULT_SHIP.id)];
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
      if (start.value) calculate();
      else status.textContent = '처음 한 번 출발지를 선택해 주세요. 선택한 계약의 근거가 충분하면 자동으로 계산합니다.';
    } catch {
      if (!closed && generation === opening) {
        status.textContent = '3D 준비를 완료하지 못했습니다. 인터넷 연결과 앱 폴더의 쓰기 권한을 확인한 뒤 다시 시도해 주세요. 라이브러리 다운로드가 차단된 경우에도 로그 감시는 계속됩니다.';
        retry.hidden = false;
      }
    }
  };
  updateContracts(initialContracts);
  return {root,dispose,updateContracts};
}
