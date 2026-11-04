import {parseMissionText,recognizeImage,stopOCR} from '../../ocr.mjs';
import {previewReadiness,previewOrders} from './preview-packing.mjs';
import {userContractScope} from './user-contracts.mjs';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function mountUserContracts(host,{store,context,onChange,prepareOCR}){
 const button=el('button',undefined,'manual-contract-open');button.type='button';button.append(el('b','운송 계약 추가'),el('small','스크린샷 · 텍스트 · 직접 입력'));const feedback=el('p');feedback.setAttribute('role','status');host.append(button,feedback);let dialog=null;
 button.onclick=()=>{
  if(dialog)return;const {locationData,catalog,locations,contracts=[],canEdit=true}=context();if(!canEdit){feedback.textContent='저장 로그를 살펴보는 중입니다. 실시간 관제로 돌아온 뒤 계약을 추가해 주세요.';return;}if(!locationData||!catalog||!locations){feedback.textContent='거점과 미션 목록을 불러오는 중입니다. 잠시 후 다시 열어 주세요.';return;}
  const saved=store.snapshot();if(saved.error){feedback.textContent=saved.error;return;}
  const counts=new Map();for(const p of locationData.locations)counts.set(p.id,(counts.get(p.id)||0)+1);
  const places=locationData.locations.filter(p=>p.id&&counts.get(p.id)===1&&Array.isArray(p.position)&&!['Star','Planet','Moon'].includes(p.type)).sort((a,b)=>a.name.localeCompare(b.name));
  const label=id=>{const p=places.find(p=>p.id===id);return p?`${p.name} · ${p.system}`:'';};
  const resolve=value=>{const exact=places.filter(p=>label(p.id)===value||p.name===value);return exact.length===1?exact[0].id:'';};
  dialog=el('dialog',undefined,'user-contract-dialog');dialog.setAttribute('aria-labelledby','user-contract-title');let closed=false,busy=false,rows=[],objectURL;
  const heading=el('h2','계약 보완 · 직접 추가');heading.id='user-contract-title';const close=el('button','닫기');close.type='button';close.onclick=()=>dialog?.close();
  const header=el('header');header.append(heading,close);const intro=el('p','함장님, 받은 계약을 골라 빠진 내용만 채워 주세요. 스크린샷이나 글에서 읽은 내용도 여기서 확인할 수 있습니다.');
  const target=el('select');target.setAttribute('aria-label','보완할 계약');target.append(new Option('새 계약 직접 추가',''));
  const targets=contracts.filter(c=>c.status!=='end-observed'&&c.participation?.state!=='left-observed');
  for(const c of targets)target.append(new Option(`${c.title||'계약 이름 미확인'} · ${c.missionId.slice(-8)}`,c.missionId));
  for(const r of saved.records.filter(r=>r.id.startsWith('manual:')))if(!targets.some(c=>c.missionId===r.id))target.append(new Option(r.title,r.id));
  const title=el('input');title.maxLength=200;title.setAttribute('aria-label','계약 이름');title.placeholder='계약 이름';
  const importBox=el('details');importBox.append(el('summary','스크린샷 · 텍스트에서 가져오기'));
  const text=el('textarea');text.setAttribute('aria-label','계약 내용');text.placeholder='게임 계약 내용을 붙여 넣어 주세요.';text.maxLength=60000;text.rows=6;
  const file=el('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.setAttribute('aria-label','계약 스크린샷');
  const image=el('img');image.alt='선택한 계약 스크린샷';image.hidden=true;
  const read=el('button','내용 읽기');read.type='button';const message=el('p');message.setAttribute('role','status');
  const table=el('div',undefined,'user-cargo-rows'),list=el('datalist');list.id='user-contract-places';for(const p of places)list.append(new Option(label(p.id)));
  function field(name,control){const l=el('label',name);l.append(control);return l;}
  function locationInput(value,aria){const n=el('input');n.setAttribute('list',list.id);n.setAttribute('aria-label',aria);n.value=label(value);n.placeholder='거점 이름 검색';return n;}
  function addRow(row={}){
   if(rows.length>=64){message.textContent='한 계약은 화물 64항목까지 추가할 수 있습니다.';return;}
   const root=el('section',undefined,'user-cargo-row'),commodity=el('input'),scu=el('input'),dropoff=locationInput(row.dropoffId,'배송지');commodity.value=row.commodity||'';commodity.maxLength=120;commodity.setAttribute('aria-label','품목');scu.type='number';scu.min='1';scu.max='10000';scu.step='1';scu.value=row.scu??'';scu.setAttribute('aria-label','총 SCU');
   const shape=el('select');shape.setAttribute('aria-label','화물 형태');shape.append(new Option('컨테이너',''),new Option('냉동포드 · 개당 1 SCU','cryopod'));shape.value=row._cargoShape==='cryopod'?'cryopod':'';
   const pickups=el('div',undefined,'user-pickups'),inputs=[];const addPickup=id=>{if(inputs.length>=12)return;const wrap=el('div'),n=locationInput(id,'픽업지'),remove=el('button','삭제');remove.type='button';remove.onclick=()=>{if(inputs.length===1){n.value='';return;}inputs.splice(inputs.indexOf(n),1);wrap.remove();};inputs.push(n);wrap.append(n,remove);pickups.append(wrap);};
   for(const id of row.pickupIds?.length?row.pickupIds:[row.pickupId||''])addPickup(id);
   const more=el('button','픽업지 추가');more.type='button';more.onclick=()=>addPickup('');
   const remove=el('button','품목 삭제');remove.type='button';const entry={root,commodity,scu,shape,dropoff,pickups:inputs,boxes:row.boxes||[]};remove.onclick=()=>{rows=rows.filter(r=>r!==entry);root.remove();};
   root.append(field('품목',commodity),field('화물 형태',shape),field('총량 · SCU',scu),field('배송지',dropoff),field('픽업 지점',pickups),more,remove);if(entry.boxes.length)root.append(el('small','저장된 상자 구성 유지 · 수량을 바꾸면 화물 확인에서 상자 구성도 수정해 주세요.'));table.append(root);rows.push(entry);
  }
  function populate(cargo){rows=[];table.replaceChildren();for(const row of cargo)addRow(row);if(!rows.length)addRow();}
  target.onchange=()=>{
   const record=saved.records.find(r=>r.id===target.value),contract=targets.find(c=>c.missionId===target.value);title.value=record?.title||contract?.title||'';message.textContent='';
   if(record){populate(record.rows);return;}
   if(contract){const ready=previewReadiness(contract,catalog,locations);if(ready.preview){const p=ready.preview;populate(p.mission.cargo.map(row=>({...row,pickupIds:row.pickupId?[row.pickupId]:p.visitRequirements?.pickups||[]})));return;}try{const input=previewOrders(contract,catalog,locations);populate(input.orders.map(o=>({commodity:o.name,scu:o.minScu===o.maxScu?o.minScu:null,pickupIds:input.pickups.length===1?[input.pickups[0].id]:[],dropoffId:input.deliveries.length===1?input.deliveries[0].id:''})));return;}catch{}}
   populate([]);
  };
  read.onclick=()=>{if(busy)return;const parsed=parseMissionText(text.value,places);if(!title.value)title.value=parsed.title||'';populate(parsed.cargo);message.textContent='읽은 내용입니다. 품목·총량·방문 지점을 확인한 뒤 추가해 주세요.';};
  file.onchange=async()=>{
   const selected=file.files?.[0];if(!selected||busy)return;if(selected.size>12*1024*1024){message.textContent='12 MB 이하의 이미지를 선택해 주세요.';return;}
   busy=true;read.disabled=save.disabled=file.disabled=true;message.textContent='계약 화면을 읽고 있습니다…';
   try{if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(selected);image.src=objectURL;image.hidden=false;await image.decode();if(image.naturalWidth*image.naturalHeight>25000000)throw Error('이미지 해상도가 너무 큽니다. 계약 부분만 잘라 선택해 주세요.');await prepareOCR?.();const result=await recognizeImage(selected,{language:'eng+kor',onProgress:p=>{if(!closed&&p.status==='recognizing text')message.textContent=`계약 화면을 읽고 있습니다… ${Math.round(p.progress*100)}%`;}});if(!closed){text.value=result.text;message.textContent='글자를 읽었습니다. 내용을 확인하고 ‘내용 읽기’를 눌러 주세요.';}}
   catch(e){if(!closed)message.textContent=e.message;}finally{busy=false;read.disabled=save.disabled=file.disabled=false;}
  };
  importBox.append(file,image,text,read);
  const add=el('button','품목 추가');add.type='button';add.onclick=()=>addRow();
  const check=el('input');check.type='checkbox';const consent=field('게임 계약의 품목·총량·픽업·배송지를 확인했습니다.',check);consent.className='user-contract-confirm';
  const save=el('button','계약에 반영','ready-primary');save.type='button';save.onclick=()=>{if(busy)return;try{
   if(!check.checked)throw Error('입력한 내용이 게임 계약과 맞는지 확인해 주세요.');
   const contract=targets.find(c=>c.missionId===target.value),id=target.value||`manual:${crypto.randomUUID()}`;
   const value={id,title:title.value,binding:contract?userContractScope(contract):null,updatedAt:new Date().toISOString(),rows:rows.map(r=>({commodity:r.commodity.value,scu:Number(r.scu.value),dropoffId:resolve(r.dropoff.value),pickupIds:r.pickups.map(n=>resolve(n.value)),boxes:r.shape.value==='cryopod'?[]:r.boxes,...(r.shape.value==='cryopod'?{_cargoShape:'cryopod'}:{})}))};
   store.save(value);onChange();feedback.textContent='화물을 반영했습니다. 선택한 계약으로 항로를 준비할 수 있습니다.';dialog.close();
  }catch(e){message.textContent=e.message;}};
  dialog.append(header,intro,target,title,importBox,list,table,add,consent,message,save);dialog.addEventListener('input',e=>{if(e.target!==check)check.checked=false;});dialog.addEventListener('close',()=>{closed=true;if(objectURL)URL.revokeObjectURL(objectURL);void stopOCR();dialog.remove();dialog=null;button.focus();},{once:true});document.body.append(dialog);populate([]);dialog.showModal();
 };
 return {destroy(){dialog?.close();button.remove();feedback.remove();}};
}
