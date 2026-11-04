import {ACCOUNT_META} from '../../sync.mjs';
import {specifiedBoxes,boxBinding} from './reservations.mjs';
const scope=c=>JSON.stringify([c.missionId,c.definitionId||null,c.gameBuild?.status||null,c.gameBuild?.value||null]);
const checked=r=>{
 if(!r||typeof r.key!=='string'||r.key.length>600||typeof r.scope!=='string'||r.scope.length>800||typeof r.value?.binding!=='string'||r.value.binding.length>2400||!Array.isArray(r.value.boxes)||!r.value.boxes.length||r.value.boxes.length>7)throw Error();
 if(r.value.boxes.some(b=>![1,2,4,8,16,24,32].includes(b.size)||!Number.isSafeInteger(b.count)||b.count<1||b.count>2048))throw Error();
 return {key:r.key,scope:r.scope,value:{binding:r.value.binding,boxes:r.value.boxes.map(({size,count})=>({size,count}))}};
};
export function createBoxMemory(storage){
 const owner=()=>{try{return JSON.parse(storage?.getItem(ACCOUNT_META)||'null')?.uid||'guest';}catch{return 'guest';}};
 const initialOwner=owner(),key='stam-log-box-memory-v1:'+encodeURIComponent(initialOwner);let records=[],error=null;
 try{const raw=storage?.getItem(key);if(raw){if(raw.length>512000)throw Error();const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.records)||data.records.length>512)throw Error();records=data.records.map(checked);if(new Set(records.map(r=>r.key)).size!==records.length)throw Error();}}
 catch{error='저장된 상자 구성을 읽지 못했습니다. 기록을 확인하거나 지운 뒤 다시 계산해 주세요.';}
 const commit=next=>{
  if(owner()!==initialOwner)throw Error('계정이 바뀌었습니다. 화면을 새로 열어 주세요.');
  const raw=JSON.stringify({version:1,records:next});if(next.length>512||raw.length>512000)throw Error('저장된 상자 구성이 많습니다. 사용하지 않는 구성을 해제해 주세요.');
  try{if(!storage)throw Error();storage.setItem(key,raw);}catch{throw Error('상자 구성을 저장하지 못했습니다. 이전 구성은 유지합니다.');}
  records=next;error=null;
 };
 return {
  exportData(){if(error)throw Error(error);return {version:1,records:records.map(checked)};},
  error:()=>error||(owner()!==initialOwner?'계정이 바뀌었습니다. 화면을 새로 열어 주세요.':null),
  lookup(contract,row){
   if(owner()!==initialOwner)return {error:'계정이 바뀌었습니다. 화면을 새로 열어 주세요.'};
   if(error)return {error};
   const r=records.find(r=>r.key===row.key);if(!r)return {};
   try{if(r.scope!==scope(contract)||r.value.binding!==boxBinding(row))throw Error();specifiedBoxes(row,r.value);return {value:structuredClone(r.value)};}
   catch{return {saved:structuredClone(r.value),error:'이전에 지정한 상자 구성과 화물 정보가 달라졌습니다. 다시 확인하거나 자동 구성으로 되돌려 주세요.'};}
  },
  set(contract,row,value){
   if(error)throw Error(error);
   if(value)specifiedBoxes(row,value);
   const next=records.filter(r=>r.key!==row.key);if(value)next.push(checked({key:row.key,scope:scope(contract),value}));commit(next);
  },
  clear(){commit([]);}
 };
}
