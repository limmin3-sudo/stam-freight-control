const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function contractRemoval({contract,plan,store,onApply,onCancel}){
 const d=el('dialog');d.className='contract-removal';d.setAttribute('aria-label','계약 제외');
 d.append(el('h2','계약 제외'),el('p',contract.title||'선택한 계약'),el('p','이 계약의 화물이 함선에 남아 있나요?'));
 const remaining=el('div'),message=el('p');message.setAttribute('role','status');remaining.hidden=true;
 const boxes=(plan?.packing?.boxes||[]).filter(b=>b.missionId===contract.missionId&&!b.retained),checks=[];let choice;
 for(const [value,label] of [['yes','남아 있습니다'],['no','없습니다']]){const row=el('label'),radio=el('input');radio.type='radio';radio.name='remaining-cargo';radio.value=value;row.append(radio,document.createTextNode(label));d.append(row);radio.onchange=()=>{choice=value;remaining.hidden=value!=='yes';message.textContent='';};}
 if(boxes.length){
  remaining.append(el('p',`${plan.ship.name} · 아직 실려 있는 화물의 상자나 적재 영역을 선택해 주세요.`));
  for(const b of boxes){const row=el('label'),check=el('input');check.type='checkbox';check.dataset.box=b.boxId;row.append(check,document.createTextNode(`${b.commodity} · ${b.size} SCU${b.reservation?' 예약 영역':''} · ${plan.ship.grids[b.bin].name}`));remaining.append(row);checks.push({box:b,check});}
 }else remaining.append(el('p','남은 화물의 위치를 확인할 수 없습니다. 계약은 제외하고, 화물 위치를 확인할 때까지 적재 계산을 보류합니다.'));
 const location=el('label'),confirmed=el('input');confirmed.type='checkbox';location.append(confirmed,document.createTextNode('선택한 화물이 적재도에 표시된 위치에 있습니다.'));if(boxes.length)remaining.append(location);
 remaining.append(el('p','선택한 화물은 현재 위치에 유지합니다. 다른 계약의 화물이 실려 있는지는 별도로 확인해 주세요.'));
 const apply=el('button','운송 계획에서 제외'),cancel=el('button','취소');apply.type=cancel.type='button';d.append(remaining,message,apply,cancel,el('small','STAM의 운송 계획에서 제외합니다. 게임 안의 계약을 포기하려면 계약 관리자에서 진행해 주세요.'));
 let applied=false;d.addEventListener('close',()=>{d.remove();if(!applied)onCancel?.();},{once:true});cancel.onclick=()=>d.close();
 apply.onclick=()=>{try{
  if(!choice)throw Error('함선에 화물이 남아 있는지 선택해 주세요.');
  const selected=checks.filter(c=>c.check.checked).map(c=>c.box);
  if(choice==='yes'&&boxes.length&&(!selected.length||!confirmed.checked))throw Error('남은 화물과 현재 위치를 확인해 주세요.');
  store.exclude(contract.missionId,contract.title,plan?.ship,choice==='yes'?selected:[],choice==='yes'&&!boxes.length);
  applied=true;d.close();onApply?.();
 }catch(e){message.textContent=e.message;}};
 document.body.append(d);d.showModal();return d;
}
export function confirmCargoCleared(onApply,{title='남은 화물 정리',description='이 화물이 함선에 없으면 적재 공간을 비울 수 있습니다.',confirm='화물이 없습니다'}={}){
 const d=el('dialog');d.className='contract-removal';d.setAttribute('aria-label',title);d.append(el('h2',title),el('p',description));
 const apply=el('button',confirm),cancel=el('button','취소'),message=el('p');apply.type=cancel.type='button';message.setAttribute('role','status');apply.onclick=()=>{try{onApply();d.close();}catch(e){message.textContent=e.message;}};cancel.onclick=()=>d.close();d.append(message,apply,cancel);d.onclose=()=>d.remove();document.body.append(d);d.showModal();
}
