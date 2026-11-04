import {createUserContracts} from './user-contracts.mjs';
import {createManualDrafts} from './manual-drafts.mjs';
import {snapshot,SYNC_KEYS,cleanValue,ACCOUNT_META} from '../../sync.mjs';
import {createCargoContinuity} from './cargo-continuity.mjs';
import {createRetainedCargo} from './retained-cargo.mjs';
import {createBoxMemory} from './box-memory.mjs';
import {createGuidanceStore} from './guidance-store.mjs';
import {createPlanChoiceStore} from './plan-choice-store.mjs';
import {createRewardStore} from './reward-store.mjs';
export const BACKUP_JOURNAL='stam-flight-restore-journal-v1';
const definitions=[['userContracts','stam-user-contracts-v1:',createUserContracts,'records'],['drafts','stam-manual-drafts-v1:',createManualDrafts,'records'],['cargo','stam-cargo-continuity-v1:',createCargoContinuity,'records'],['retained','stam-retained-cargo-v1:',createRetainedCargo,'records'],['boxes','stam-log-box-memory-v1:',createBoxMemory,'records'],['guidance','stam-guidance-v1:',createGuidanceStore,'record'],['choices','stam-plan-choices-v1:',createPlanChoiceStore,'choices'],['rewards','stam-rewards-v1:',createRewardStore,'records']];
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const owner=s=>{const raw=s.getItem(ACCOUNT_META);if(!raw)return 'guest';const a=JSON.parse(raw);if(typeof a?.uid!=='string'||!a.uid)throw Error('현재 계정을 확인해 주세요.');return a.uid;};
const memory=entries=>({getItem:k=>entries[k]??null,setItem:(k,v)=>{entries[k]=v;},removeItem:k=>{delete entries[k];}});
function normalize(name,value){
 const def=definitions.find(d=>d[0]===name);if(!def)throw Error('지원하지 않는 운송 기록입니다.');
 const [,,factory,field]=def;
 const raw=JSON.stringify(value);if(raw.length>1800000)throw Error('운송 기록의 크기를 확인해 주세요.');
 const store=factory(memory({[def[1]+'guest']:raw}));
 if(name==='boxes'){if(store.error())throw Error(store.error());return store.exportData();}
 const checked=store.snapshot();if(checked.error)throw Error(checked.error);
 return {version:1,[field]:checked[field]};
}
export function exportFlightBackup(storage){
 if(storage.getItem(BACKUP_JOURNAL))throw Error('중단된 복원을 먼저 정리해 주세요.');
 const account=owner(storage),flight={};
 for(const [name,prefix] of definitions){const raw=storage.getItem(prefix+encodeURIComponent(account));if(raw)flight[name]=normalize(name,JSON.parse(raw));}
 return {format:'stam-flight-backup',version:1,createdAt:new Date().toISOString(),settings:snapshot(storage),flight};
}
export function validateFlightBackup(raw){
 if(typeof raw!=='string'||raw.length>6000000)throw Error('백업 파일은 6 MB 이내여야 합니다.');
 const data=JSON.parse(raw);
 if(data?.format!=='stam-flight-backup'||data.version!==1||!plain(data.settings)||!plain(data.flight)||Object.keys(data).some(k=>!['format','version','createdAt','settings','flight'].includes(k)))throw Error('STAM 운송 백업 파일을 선택해 주세요.');
 const settings={};for(const [key,value] of Object.entries(data.settings)){if(!SYNC_KEYS.includes(key)||typeof value!=='string')throw Error('백업 설정 형식을 확인해 주세요.');const clean=cleanValue(key,value);if(clean===null)throw Error('설정이 저장 한도를 넘었습니다.');settings[key]=clean;}
 const flight={};for(const [name,value] of Object.entries(data.flight))flight[name]=normalize(name,value);
 return {format:data.format,version:1,createdAt:data.createdAt,settings,flight};
}
export function restoreFlightBackup(storage,input,expectedOwner=owner(storage)){
 if(owner(storage)!==expectedOwner)throw Error('계정이 바뀌었습니다. 백업 창을 다시 열어 주세요.');
 if(storage.getItem(BACKUP_JOURNAL))throw Error('이전에 중단된 복원을 먼저 되돌려 주세요.');
 const data=validateFlightBackup(JSON.stringify(input)),account=owner(storage),values={...Object.fromEntries(SYNC_KEYS.map(k=>[k,data.settings[k]??null]))};
 for(const [name,prefix] of definitions)values[prefix+encodeURIComponent(account)]=data.flight[name]?JSON.stringify(data.flight[name]):null;
 const before=Object.fromEntries(Object.keys(values).map(k=>[k,storage.getItem(k)]));
 // A journal is written before any change. Account metadata and pairing keys are never imported.
 const journal=JSON.stringify({version:1,owner:account,before});
 if(journal.length>6000000)throw Error('현재 기록이 커서 안전하게 복원할 수 없습니다. 기존 기록을 유지합니다.');
 storage.setItem(BACKUP_JOURNAL,journal);
 try{for(const [key,value] of Object.entries(values)){if(owner(storage)!==account)throw Error('계정이 바뀌었습니다.');value===null?storage.removeItem(key):storage.setItem(key,value);}storage.removeItem(BACKUP_JOURNAL);}
 catch{try{recoverFlightBackup(storage);}catch{}throw Error(storage.getItem(BACKUP_JOURNAL)?'복원이 중단됐습니다. 이전 기록 복구를 눌러 주세요.':'저장 공간이 부족하거나 복원하지 못했습니다. 이전 기록을 유지했습니다.');}
}
export function recoverFlightBackup(storage){
 const raw=storage.getItem(BACKUP_JOURNAL);if(!raw)return;
 if(raw.length>6000000)throw Error('복구 기록을 확인해 주세요.');const j=JSON.parse(raw),account=owner(storage);
 if(j.version!==1||j.owner!==account||!j.before)throw Error('복원을 시작한 계정에서 다시 열어 주세요.');
 const allowed=new Set([...SYNC_KEYS,...definitions.map(d=>d[1]+encodeURIComponent(account))]);
 if(Object.entries(j.before).some(([k,v])=>!allowed.has(k)||(v!==null&&typeof v!=='string')))throw Error('복구 기록 형식을 확인해 주세요.');
 for(const [key,value] of Object.entries(j.before))value===null?storage.removeItem(key):storage.setItem(key,value);
 storage.removeItem(BACKUP_JOURNAL);
}
