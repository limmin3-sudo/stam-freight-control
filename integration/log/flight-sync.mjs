import {SYNC_KEYS,ACCOUNT_META,snapshot,describeChanges} from '../../sync.mjs';
import {flightStoreDefinitions,exportFlightBackup,validateFlightBackup,restoreFlightBackup,BACKUP_JOURNAL,recoverFlightBackup} from './flight-backup.mjs';

// Separate cloud documents keep each store below Firestore's document limit.
// Only the already validated backup fields travel; no source log, pairing token,
// screenshots or player identity are included.
const prefix='stam-flight-', names=flightStoreDefinitions.map(([name])=>name);
const keys=[...SYNC_KEYS,...names.map(name=>prefix+name)];
const cloudJournal='stam-cloud-restore-v1';
const asOwner=(storage,uid)=>({getItem:key=>key===ACCOUNT_META?JSON.stringify({uid}):storage.getItem(key===BACKUP_JOURNAL?cloudJournal:key),setItem:(key,value)=>storage.setItem(key===BACKUP_JOURNAL?cloudJournal:key,value),removeItem:key=>storage.removeItem(key===BACKUP_JOURNAL?cloudJournal:key)});
export function recoverCloudRestore(storage){
 const raw=storage.getItem(cloudJournal);if(!raw)return;
 const journal=JSON.parse(raw);
 if(typeof journal.owner!=='string'||!journal.owner||journal.owner.length>256)throw Error('중단된 계정 복원을 확인해 주세요.');
 recoverFlightBackup(asOwner(storage,journal.owner));
}
export const flightSync={
 keys,
 snapshot(storage){
  recoverCloudRestore(storage);
  const backup=exportFlightBackup(storage),result={...backup.settings};
  for(const [name,value] of Object.entries(backup.flight)){
   const raw=JSON.stringify(value);
   if(new TextEncoder().encode(raw).length>900000)throw Error('운송 기록이 계정 저장 한도를 넘었습니다. 백업 후 기록을 정리해 주세요.');
   result[prefix+name]=raw;
  }
  return result;
 },
 apply(storage,data,uid){
  recoverCloudRestore(storage);
  if(typeof uid!=='string'||!uid||uid.length>256)throw Error('복원할 계정을 확인해 주세요.');
  const settings={},flight={};
  for(const [key,value] of Object.entries(data)){
   if(!keys.includes(key))continue;
   if(typeof value!=='string')throw Error('계정 저장 형식이 올바르지 않습니다.');
   if(SYNC_KEYS.includes(key))settings[key]=value;
   else flight[key.slice(prefix.length)]=JSON.parse(value);
  }
  const clean=validateFlightBackup(JSON.stringify({format:'stam-flight-backup',version:1,settings,flight}));
  restoreFlightBackup(asOwner(storage,uid),clean,uid);
 },
 changed:(prev={},next={})=>keys.filter(key=>prev[key]!==next[key]),
 describe(prev,next,options){
  const changed=names.filter(name=>prev[prefix+name]!==next[prefix+name]);
  return [...describeChanges(prev,next,options),...(changed.length?['계약·적재·운항 상태 저장']:[])];
 },
};
