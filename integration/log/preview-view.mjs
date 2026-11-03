import {previewOrders,createPreview} from './preview-packing.mjs';
import {definitionQuantity} from './catalog.mjs';
import {DEFAULT_SHIP,selectShipGrids} from '../../ships.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function previewPanel(contract,{catalog,locations,locationData,prepareAssets}) {
  const root=el('section');root.className='preview-panel';
  const open=el('button','3D · 예상 경로 미리보기'),panel=el('div'),status=el('p');panel.hidden=true;
  root.append(open,panel);let view,worker,timer,serial=0,closed=true,ships=[DEFAULT_SHIP],ship=DEFAULT_SHIP,confirmation;
  const itinerary=el('p');
  const canvas=el('div');canvas.className='preview-canvas';
  const select=el('select'),start=el('select'),step=el('select'),run=el('button','경로·배치 계산'),close=el('button','미리보기 닫기'),form=el('div');
  select.setAttribute('aria-label','미리보기 함선');start.setAttribute('aria-label','미리보기 출발지');step.setAttribute('aria-label','미리보기 작업 단계');
  const options=(node,items)=>{node.replaceChildren();for(const item of items){const o=el('option',item.name);o.value=item.id;node.append(o);}};
  function stop(){serial++;clearTimeout(timer);worker?.terminate();worker=null;}
  function dispose(){closed=true;stop();view?.dispose();view=null;panel.hidden=true;open.disabled=false;}
  close.onclick=dispose;
  function calculate(){
    stop();if(closed||!view)return;
    view.update(null,{ship});step.replaceChildren();itinerary.textContent='';
    let input;
    try {
      if(confirmation){confirmation.confirmed=confirmation.check.checked;confirmation.rows=confirmation.inputs.map(r=>({scu:Number(r.amount.value),pickupId:r.pickup.value,dropoffId:r.delivery.value}));}
      createPreview(contract,catalog,locations,confirmation);
      input={contract,catalogData:[...catalog],locationData,confirmation:confirmation?{confirmed:confirmation.confirmed,rows:confirmation.rows}:undefined,ship,startId:start.value};
    } catch(e){status.textContent=e.message;return;}
    const id=serial;status.textContent='경로와 배치를 계산하고 있습니다…';step.replaceChildren();view.update(null,{ship});
    worker=new Worker(new URL('./preview-worker.mjs',import.meta.url),{type:'module'});
    const fail=message=>{if(id!==serial||closed)return;stop();status.textContent=message;};
    timer=setTimeout(()=>fail('계산 시간이 8초를 넘었습니다. 함선·그리드 또는 주문을 확인해 주세요.'),8000);
    worker.onerror=()=>fail('미리보기 작업을 시작하지 못했습니다. 로그 감시는 계속됩니다.');
    worker.onmessage=({data})=>{
      if(closed||id!==serial||data.id!==id)return;
      clearTimeout(timer);worker.terminate();worker=null;
      if(data.error){status.textContent=data.error;return;}
      const r=data.result,map=new Map(r.stops.map(p=>[p.id,p]));
      itinerary.textContent=r.route.visits.map((v,i)=>`${i+1}. ${(v.leg?.nodes||[v.locationId]).map(id=>map.get(id)?.name||id).join(' → ')}`).join(' / ') + ` · 예상 ${Math.round(r.route.seconds/60)}분 (이동·작업 가정 포함). 점프 연결: ${r.routeEvidence.snapshot} 공개 스냅샷.`;
      status.textContent=`${r.estimated?'예상 상자 배치 · 실제 상자 구성 미확인':'확인된 원래 상자 구성의 배치 미리보기'} · ${r.boxCount}개 / ${r.totalScu} SCU. ${r.packing?'전체 화물 동시 배치 계산됨':'전체 동시 적재 불가 · 경로의 분할 운송을 확인하세요.'} 현재 적재·남은 수량을 나타내지 않습니다. 상자 수에 따른 작업 시간도 예상값입니다.`;
      const frames=[{id:'all',name:'원래 화물 전체',packing:r.packing},...r.route.visits.map((v,i)=>({id:String(i),name:`${i+1}. ${map.get(v.locationId)?.name||v.locationId} · 작업 후`,packing:v.packing}))];
      options(step,frames);step.onchange=()=>view?.update(frames.find(f=>f.id===step.value)?.packing,{ship:r.ship,nameOf:id=>map.get(id)?.name||id});step.onchange();
    };
    worker.postMessage({id,input});
  }
  form.oninput=event=>{if(!confirmation)return;stop();view?.update(null,{ship});step.replaceChildren();itinerary.textContent='';if(event.target!==confirmation.check)confirmation.check.checked=false;status.textContent='입력이 변경되었습니다. 주문별 경로·수량을 확인하고 다시 계산해 주세요.';};
  run.onclick=calculate;
  select.onchange=()=>{ship=ships.find(s=>s.id===select.value);calculate();};start.onchange=calculate;
  open.onclick=async()=>{
    closed=false;open.disabled=true;panel.hidden=false;panel.replaceChildren(close,status);status.textContent='미리보기를 준비하고 있습니다…';
    const generation=++serial;
    try {
      let preview;
      try {preview=createPreview(contract,catalog,locations);}catch {
        const inputs=previewOrders(contract,catalog,locations);form.replaceChildren();
        form.append(el('p','공개 주문의 참고값입니다. 주문별 수량과 픽업·배송지를 게임에서 확인한 값으로 선택해 주세요. 자동 균등 배분하지 않습니다. 상자 구성은 계속 예상값으로 남습니다.'));
        confirmation={inputs:inputs.orders.map((order,i)=>{
          const row=el('div');row.className='preview-row';const amount=el('input'),pickup=el('select'),delivery=el('select');
          amount.type='number';amount.min='1';amount.max='10000';amount.setAttribute('aria-label',`주문 ${i+1} SCU`);
          const q=definitionQuantity(order);amount.value=q.value||'';
          options(pickup,[{id:'',name:'픽업 선택'},...inputs.pickups]);options(delivery,[{id:'',name:'배송 선택'},...inputs.deliveries]);
          pickup.setAttribute('aria-label',`주문 ${i+1} 픽업`);delivery.setAttribute('aria-label',`주문 ${i+1} 배송`);
          row.append(el('p',`주문 ${i+1} · ${order.name} · 상자 상한 ${order.maxBoxScu} SCU`),amount,pickup,delivery);form.append(row);return {amount,pickup,delivery};
        })};
        const label=el('label'),check=el('input');check.type='checkbox';label.append(check,document.createTextNode('각 주문의 수량과 경로를 확인했습니다 (실제 상자 구성 확인 아님)'));confirmation.check=check;form.append(label);
        options(start,[...inputs.pickups,...inputs.deliveries]);
      }
      if(preview)options(start,[preview.manifest.pickup,...preview.manifest.deliveries]);
      panel.append(form,el('label','함선'),select,el('label','계획 출발지 (현재 함선 위치 아님)'),start,run,step,itinerary,canvas);
      form.inert=true;select.disabled=start.disabled=run.disabled=true;
      await prepareAssets?.();
      const [renderer,shipResponse]=await Promise.all([import('../../cargo-scene.mjs'),fetch(new URL('../../data/ships.json',import.meta.url))]);
      if(closed||generation!==serial)return;
      if(shipResponse.ok)ships=[DEFAULT_SHIP,...(await shipResponse.json()).filter(s=>s.id!==DEFAULT_SHIP.id)];
      if(closed||generation!==serial)return;
      options(select,ships);select.value=ship.id;
      form.inert=false;select.disabled=start.disabled=run.disabled=false;
      view=renderer.createCargoView(canvas,{onGridToggle:index=>{
        const disabled=new Set(ship.grids.filter(g=>g.disabled).map(g=>g.id)),key=ship.grids[index].id;
        if(disabled.has(key))disabled.delete(key);else disabled.add(key);
        ship=selectShipGrids(ship,[...disabled]);calculate();
      }});
      if(preview)calculate();else status.textContent='주문별 경로와 수량을 확인한 뒤 계산하세요. 실제 운항 데이터는 변경하지 않습니다.';
    }catch(e){if(!closed&&generation===serial){status.textContent=e.message+' · 미리보기를 닫고 다시 시도할 수 있습니다. 로그 감시는 계속됩니다.';}}
  };
  return {root,dispose};
}
