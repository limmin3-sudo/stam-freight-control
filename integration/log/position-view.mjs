const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function positionDialog({feed,locations,partner,onClose=()=>{}}) {
  const dialog=el('dialog');dialog.className='position-dialog';dialog.setAttribute('aria-label','위치 연결');
  const heading=el('h2','위치 연결'),intro=el('p',partner==='operator'?'함장님, 현재 위치를 확인하겠습니다.':'현재 위치를 기준으로 지도를 맞추겠습니다.');
  const form=el('form'),method=el('select'),place=el('input'),places=el('datalist'),system=el('select'),coordinates=el('textarea');
  for(const [value,title] of [['place','거점에서 확인'],['coordinates','좌표로 확인']]){const o=el('option',title);o.value=value;method.append(o);}
  const field=(label,input)=>{input.setAttribute('aria-label',label);const n=el('label',label);n.append(input);return n;};
  places.id='position-place-options';place.setAttribute('list',places.id);place.placeholder='현재 거점 찾기';place.autocomplete='off';
  const names=new Map();
  for(const location of locations){const name=`${location.name} · ${location.system}`;if(!names.has(name))names.set(name,[]);names.get(name).push(location.id);}
  for(const [name,ids] of names)if(ids.length===1)places.append(el('option',name));
  for(const [value,title] of [['','항성계 선택'],['stanton','Stanton'],['pyro','Pyro'],['nyx','Nyx']]){const o=el('option',title);o.value=value;system.append(o);}
  coordinates.rows=3;coordinates.maxLength=512;coordinates.placeholder='Coordinates: x:… y:… z:…';
  const placeField=field('현재 거점',place),coordinateFields=el('section');
  coordinateFields.append(field('항성계',system),field('복사한 좌표',coordinates),el('p','게임 채팅에 /showlocation을 직접 입력한 뒤, 복사된 좌표를 여기에 붙여 넣어 주세요.'));
  coordinateFields.hidden=true;
  method.onchange=()=>{placeField.hidden=method.value!=='place';coordinateFields.hidden=method.value!=='coordinates';};
  const status=el('p');status.setAttribute('role','status');
  const actions=el('div'),save=el('button','위치 확인'),clear=el('button','위치 표시 해제'),cancel=el('button','닫기');
  save.type='submit';clear.type=cancel.type='button';actions.append(save,clear,cancel);
  form.append(field('확인 방식',method),placeField,places,coordinateFields,status,actions);dialog.append(heading,intro,form);document.body.append(dialog);
  const finish=()=>dialog.close();cancel.onclick=finish;clear.onclick=()=>{feed.clear();finish();};
  form.onsubmit=event=>{event.preventDefault();try{
    if(method.value==='place'){const ids=names.get(place.value);feed.confirmPlace(ids?.length===1?ids[0]:null);finish();}
    else {feed.receiveCoordinates(coordinates.value,system.value);finish();}
  }catch(error){status.textContent=error.message;}};
  dialog.addEventListener('close',()=>{dialog.remove();onClose();},{once:true});dialog.showModal();place.focus();return dialog;
}
