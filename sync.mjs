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

// Human-readable change log entries for the account's edit history ("수정 기록").
const parse=v=>{try{return JSON.parse(v??'null');}catch{return null;}};
const missionName=m=>[m.company,m.title].filter(Boolean).join(' ')||m.id;
const won=n=>Math.round(Number(n)||0).toLocaleString('ko-KR');
const SIMPLE={'vh-ships':'함선·그리드 설정 수정','vh-ship-performance':'드라이브·속도 설정 수정','vh-recipes':'상자 구성 저장·수정','vh-settings':'계산 설정 수정','vh-start':'출발 위치 변경','vh-mode':'간편/상세 모드 변경','sfc-voice':'운항 파트너 변경','sfc-location-overrides-v1':'개인 장소 수정','vh-storage-note':'적재 메모 수정'};
export function describeChanges(prev={},next={},{shipName=id=>id}={}){
 const out=[];
 for(const k of changedKeys(prev,next)){
  if(k==='vh-missions'){const a=new Map((parse(prev[k])||[]).map(m=>[m.id,m])),b=new Map((parse(next[k])||[]).map(m=>[m.id,m]));
   for(const [id,m] of b)if(!a.has(id))out.push('미션 추가: '+missionName(m));
   for(const [id,m] of a)if(!b.has(id))out.push('미션 삭제: '+missionName(m));
   for(const [id,m] of b)if(a.has(id)&&JSON.stringify(a.get(id))!==JSON.stringify(m))out.push('미션 수정: '+missionName(m));}
  else if(k==='vh-ship-id'){if(prev[k]&&next[k])out.push(`함선 변경: ${shipName(prev[k])} → ${shipName(next[k])}`);else if(next[k])out.push('함선 선택: '+shipName(next[k]));}
  else if(k==='sfc-history'){const a=new Set((parse(prev[k])||[]).map(r=>r.id)),added=(parse(next[k])||[]).filter(r=>!a.has(r.id)),removed=(parse(prev[k])||[]).length+added.length-(parse(next[k])||[]).length;
   for(const r of added)out.push(`운항 기록 추가: ${r.ship||''} 계약 ${r.missions?.length||0}건 (+${won(r.reward)} aUEC)`);if(removed>0)out.push(`운항 기록 삭제 ${removed}건`);}
  else if(k==='sfc-run'){const a=parse(prev[k])||{},b=parse(next[k])||{};if(b.finished&&!a.finished)out.push('운항 완료');else if((b.index||0)>(a.index||0))out.push(`운항 진행: ${b.index}번째 거점 완료`);else if((b.index||0)<(a.index||0))out.push('운항 진행 되돌리기');else if(!b.started&&a.started)out.push('운항 종료');}
  else if(SIMPLE[k])out.push(SIMPLE[k]);
 }
 return [...new Set(out)].slice(0,40);
}
