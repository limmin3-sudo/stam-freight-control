import {ACCOUNT_META} from '../../sync.mjs';
const scope=c=>JSON.stringify([c.missionId,c.definitionId||null,c.gameBuild?.status||null,c.gameBuild?.value||null]);
function checked(records){if(!Array.isArray(records)||records.length>128)throw Error('입력 초안 보관 한도를 넘었습니다.');const seen=new Set();return records.map(r=>{if(typeof r.id!=='string'||r.id.length>160||seen.has(r.id)||typeof r.scope!=='string'||r.scope.length>800||!Array.isArray(r.rows)||r.rows.length>64)throw Error('입력 초안 형식을 확인해 주세요.');seen.add(r.id);return {id:r.id,scope:r.scope,rows:r.rows.map(row=>{if(!Number.isFinite(row.scu)||Math.abs(row.scu)>10000||typeof row.pickupId!=='string'||row.pickupId.length>160||typeof row.dropoffId!=='string'||row.dropoffId.length>160)throw Error('입력한 수량과 지점을 확인해 주세요.');return {scu:row.scu,pickupId:row.pickupId,dropoffId:row.dropoffId};})};});}
export function createManualDrafts(storage){
 const owner=()=>JSON.parse(storage?.getItem(ACCOUNT_META)||'null')?.uid||'guest';let initial,key,raw,records=[],error;
 try{initial=owner();key='stam-manual-drafts-v1:'+encodeURIComponent(initial);raw=storage?.getItem(key)||null;if(raw){if(raw.length>512000)throw Error();const data=JSON.parse(raw);if(data.version!==1)throw Error();records=checked(data.records);}}catch{error='이전에 입력한 초안을 읽지 못했습니다. 백업을 확인해 주세요.';}
 const check=()=>{if(error)throw Error(error);if(owner()!==initial)throw Error('계정이 바뀌었습니다. 화면을 다시 열어 주세요.');if(storage&&(storage.getItem(key)||null)!==raw)throw Error('다른 창에서 입력 초안이 바뀌었습니다. 화면을 다시 열어 주세요.');};
 return {snapshot(){try{check();return {records:structuredClone(records),error:null};}catch(e){return {records:[],error:e.message};}},
 lookup(contract){check();const r=records.find(r=>r.id===contract.missionId&&r.scope===scope(contract));return r?structuredClone(r.rows):[];},
 save(contract,rows){check();if(!storage)return;const next=checked([...records.filter(r=>r.id!==contract.missionId),{id:contract.missionId,scope:scope(contract),rows}]);const text=JSON.stringify({version:1,records:next});if(text.length>512000)throw Error('입력 초안 보관 공간이 부족합니다.');if(raw===text)return;try{storage.setItem(key,text);}catch{throw Error('입력 초안을 저장하지 못했습니다. 현재 입력은 유지됩니다.');}raw=text;records=next;}
 };
}
