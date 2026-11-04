import {ACCOUNT_META} from '../../sync.mjs';
const UUID=/^(?:manual:)?[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const STATES=new Set(['awaiting','deferred','excluded']);
export function checkedChoices(rows){
 if(!Array.isArray(rows)||rows.length>2048)throw Error('계약 선택 기록이 너무 많거나 손상됐습니다.');
 const ids=new Set();return rows.map(r=>{if(!r||typeof r.id!=='string'||!UUID.test(r.id)||!STATES.has(r.choice)||ids.has(r.id)||Object.keys(r).some(k=>!['id','choice'].includes(k)))throw Error('계약 선택 기록을 읽지 못했습니다.');ids.add(r.id);return {id:r.id,choice:r.choice};}).sort((a,b)=>a.id.localeCompare(b.id));
}
// Local and account-scoped, outside SYNC_KEYS. No title, log text, cargo or identity fields.
export function createPlanChoiceStore(storage){
 const owner=()=>{const raw=storage.getItem(ACCOUNT_META);if(!raw)return 'guest';const value=JSON.parse(raw);if(!value||typeof value.uid!=='string'||!value.uid||value.uid.length>256)throw Error('계정 정보를 확인하지 못했습니다. 화면을 다시 열어 주세요.');return value.uid;};
 let initial,key,raw=null,rows=[],error=null;
 try{initial=owner();key='stam-plan-choices-v1:'+encodeURIComponent(initial);raw=storage.getItem(key);if(raw){if(raw.length>200000)throw Error();const data=JSON.parse(raw);if(data.version!==1||Object.keys(data).some(k=>!['version','choices'].includes(k)))throw Error();rows=checkedChoices(data.choices);}}
 catch{error='저장된 계약 선택을 읽지 못했습니다. 자동 선택을 보류합니다.';}
 function check(){if(!key||owner()!==initial)throw Error('계정이 바뀌었거나 확인되지 않습니다. 화면을 다시 열어 주세요.');if(storage.getItem(key)!==raw)throw Error('다른 창에서 계약 선택이 변경됐습니다. 새로고침해 주세요.');}
 return {
  snapshot(){try{check();if(error)throw Error(error);return {choices:structuredClone(rows),error:null};}catch(e){return {choices:[],error:e.message};}},
  save(next){check();if(error)throw Error(error);const clean=checkedChoices(next),text=JSON.stringify({version:1,choices:clean});if(text.length>200000)throw Error('계약 선택 저장 공간이 부족합니다.');if(JSON.stringify(clean)===JSON.stringify(rows))return;
   try{storage.setItem(key,text);}catch{throw Error('계약 선택을 저장하지 못했습니다. 이전 선택을 유지합니다.');}rows=clean;raw=text;
  },
  reset(){if(!key||owner()!==initial)throw Error('현재 계정을 확인한 뒤 다시 시도해 주세요.');const text=JSON.stringify({version:1,choices:[]});try{storage.setItem(key,text);}catch{throw Error('계약 선택을 초기화하지 못했습니다.');}rows=[];raw=text;error=null;},
 };
}
