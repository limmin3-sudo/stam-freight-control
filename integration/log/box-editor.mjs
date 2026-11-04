import {boxBinding,specifiedBoxes} from './reservations.mjs';
const sizes=[32,24,16,8,4,2,1];
const el=(t,s)=>{const n=document.createElement(t);if(s!==undefined)n.textContent=s;return n;};
export function boxEditor(row,saved,onApply){
 const pod=row._cargoShape==='cryopod';
 const root=el('details');root.className='box-editor';root.dataset.boxEditor=row.key;
 root.append(el('summary',`${row.commodity} · ${pod?'포드 수량 확인':'상자 구성 직접 지정'}`),el('p',pod?`${row.scu}개 · 총 ${row.scu} SCU. 포드의 길이와 반 높이를 유지해 배치합니다.`:`${row.scu} SCU에 맞춰 실제 확인한 크기별 개수를 입력해 주세요. 같은 계약의 구성을 이 브라우저에 저장하며, 사용자 지정으로 표시합니다.`));
 const inputs=[];
 for(const size of row._cargoShape==='cryopod'?[1]:sizes){const label=el('label',`${size} SCU × `),n=el('input');n.type='number';n.min='0';n.max='2048';n.step='1';n.value=String(saved?.boxes?.find(b=>b.size===size)?.count||0);n.setAttribute('aria-label',pod?`${row.commodity} 포드 개수`:`${row.commodity} ${size} SCU 상자 개수`);label.append(n,document.createTextNode('개'));root.append(label);inputs.push({size,n});}
 const message=el('p');message.setAttribute('role','status');root.append(message);
 const value=()=>({binding:boxBinding(row),boxes:inputs.filter(r=>r.n.value!==''&&Number(r.n.value)!==0).map(r=>({size:r.size,count:Number(r.n.value)}))});
 const check=()=>{try{specifiedBoxes(row,value());message.textContent=`합계 ${row.scu} SCU · 적용할 수 있습니다.`;return true;}catch(e){message.textContent=e.message;return false;}};
 inputs.forEach(r=>r.n.oninput=check);
 const apply=el('button',pod?'포드 수량 적용':'이 상자 구성 적용'),reset=el('button','자동 구성으로 되돌리기');apply.type=reset.type='button';
 apply.onclick=()=>{if(!check())return;try{onApply(value());message.textContent=`사용자 지정 · ${row.scu} SCU 구성을 저장했습니다.`;}catch(e){message.textContent=e.message;}};
 reset.onclick=()=>{try{onApply(null);inputs.forEach(r=>r.n.value='0');message.textContent='직접 지정한 구성을 해제했습니다.';}catch(e){message.textContent=e.message;}};
 root.append(apply,reset);return root;
}
