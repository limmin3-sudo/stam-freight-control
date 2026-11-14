import {applyStoragePatch,recoverStorage} from './storage-transaction.mjs';
export const FLIGHT_OWNER='stam.flight-owner.v1';
export const FLIGHT_KEYS=['stam.control-room.flight.v1','stam.control-room.flight.previous.v1'];
export const ownerFor=uid=>uid?'account:'+uid:'guest';
export const ownerArchive=owner=>'stam.flight-archive.v1:'+encodeURIComponent(owner);
const validOwner=o=>o==='guest'||o==='unassigned'||typeof o==='string'&&/^account:[^\s]{1,200}$/.test(o);
const snapshot=s=>Object.fromEntries(FLIGHT_KEYS.map(k=>[k,s.getItem(k)]));
export function readOwner(s){const o=s.getItem(FLIGHT_OWNER);if(o!==null&&!validOwner(o))throw Error('운항 소유자 정보를 확인하세요.');return o??(FLIGHT_KEYS.some(k=>s.getItem(k)!==null)?'unassigned':'guest');}
export function initializeOwner(s){recoverStorage(s);const owner=readOwner(s);if(s.getItem(FLIGHT_OWNER)===null)applyStoragePatch(s,{[FLIGHT_OWNER]:owner,[ownerArchive(owner)]:JSON.stringify({version:1,values:snapshot(s)})});return owner;}
export function archivedFlight(s,owner){
 if(!validOwner(owner))throw Error('Invalid flight owner');
 const raw=s.getItem(ownerArchive(owner));if(raw===null)return Object.fromEntries(FLIGHT_KEYS.map(k=>[k,null]));
 const archive=JSON.parse(raw);if(archive.version!==1||!archive.values||FLIGHT_KEYS.some(k=>archive.values[k]!==null&&typeof archive.values[k]!=='string'))throw Error('보관된 운항을 읽지 못했습니다. 기존 운항을 유지합니다.');
 return Object.fromEntries(FLIGHT_KEYS.map(k=>[k,archive.values[k]]));
}
export function ownershipPatch(s,target,{adopt=false}={}){
 const from=readOwner(s);if(!validOwner(target))throw Error('Invalid flight owner');if(from===target)return {[FLIGHT_OWNER]:target};
 if(adopt&&!['guest','unassigned'].includes(from))throw Error('다른 계정의 운항은 자동 연결할 수 없습니다.');
 const current=snapshot(s),next=adopt?{...current}:archivedFlight(s,target);
 // A target with a saved flight must be reviewed through the existing backup/restore flow.
 if(adopt){const old=archivedFlight(s,target);if(FLIGHT_KEYS.some(k=>old[k]!==null&&old[k]!==current[k]))throw Error('이 계정에 보관된 운항이 있습니다. 따로 보관하고 계속한 뒤 운항 백업에서 로그인 전 운항을 확인해 복원하세요.');}
 return {[ownerArchive(from)]:JSON.stringify({version:1,values:current}),...next,[ownerArchive(target)]:JSON.stringify({version:1,values:next}),[FLIGHT_OWNER]:target};
}
let boundary={phase:'idle',uid:null,epoch:0};
try{if(typeof localStorage!=='undefined'&&(localStorage.getItem('vh-account-meta')||readOwner(localStorage).startsWith('account:')))boundary.phase='checking';}catch{boundary.phase='error';}
export const accountBoundary=()=>boundary;
export function setAccountBoundary(phase,uid=null){boundary={phase,uid,epoch:boundary.epoch+1};if(typeof window!=='undefined')window.dispatchEvent(new Event('stam-account-boundary'));return boundary;}
