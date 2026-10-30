// Account sync rules, independent of the backend so they can be tested without a server.
// Only player data is synced; device settings (map quality, AI server address, guide-seen flag) stay per browser.
export const SYNC_KEYS=['vh-missions','vh-recipes','vh-ships','vh-ship-id','vh-ship-performance','vh-settings','vh-start','vh-mode','sfc-run','sfc-voice','sfc-location-overrides-v1','vh-storage-note','sfc-history'];
export const GUEST_BACKUP='vh-guest-backup';
export const ACCOUNT_META='vh-account-meta';
const MAX_VALUE=900000;// Firestore documents are limited to 1 MiB.

// Screenshot thumbnails can be hundreds of KB each; they stay in this browser only.
export function cleanValue(key,value){
 if(value==null)return null;
 if(key==='vh-missions'){try{const ms=JSON.parse(value);if(Array.isArray(ms))value=JSON.stringify(ms.map(({_sourcePreview,...m})=>m));}catch{}}
 return value.length>MAX_VALUE?null:value;
}
export function snapshot(storage){const out={};for(const k of SYNC_KEYS){const v=cleanValue(k,storage.getItem(k));if(v!=null)out[k]=v;}return out;}
export const isEmpty=snap=>!Object.keys(snap||{}).some(k=>k!=='sfc-voice'&&k!=='vh-mode');
export function sameData(a,b){const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);for(const k of keys)if((a||{})[k]!==(b||{})[k])return false;return true;}

// What to do right after signing in. Never overwrite silently when both sides hold different data.
export function decideOnLogin(local,cloud){
 if(sameData(local,cloud))return 'same';
 if(isEmpty(cloud))return isEmpty(local)?'same':'offer-upload';
 if(isEmpty(local))return 'pull';
 return 'ask';
}
// Keys changed in this browser since the last successful sync.
export function changedKeys(prev,next){return SYNC_KEYS.filter(k=>(prev||{})[k]!==(next||{})[k]);}
// Another PC saved after our last sync: do not overwrite it.
export const remoteIsNewer=(cloudUpdatedAt,lastSyncedAt)=>Number(cloudUpdatedAt||0)>Number(lastSyncedAt||0);

export function applySnapshot(storage,snap){for(const k of SYNC_KEYS){if(snap[k]==null)storage.removeItem(k);else storage.setItem(k,snap[k]);}}

// Usernames for ID sign-up: lowercase letters, digits and underscore, 3–20 characters.
export const USERNAME_RE=/^[a-z0-9_]{3,20}$/;
export function normalizeUsername(raw){return String(raw||'').trim().toLowerCase();}
export function usernameProblem(raw){const u=normalizeUsername(raw);if(!u)return '아이디를 입력해 주세요.';if(!USERNAME_RE.test(u))return '아이디는 영문 소문자·숫자·밑줄(_) 3~20자로 만들어 주세요.';return '';}
// Firebase email/password needs an email shape; the address is never mailed.
export const usernameEmail=u=>`${normalizeUsername(u)}@id.stam-freight-control.app`;
