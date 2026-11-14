// A recoverable localStorage transaction. The journal is removed only after all writes succeed.
export const STORAGE_JOURNAL='stam.account-storage-journal.v1';
const write=(s,k,v)=>v===null?s.removeItem(k):s.setItem(k,v);
export function recoverStorage(s){
 const raw=s.getItem(STORAGE_JOURNAL);if(raw===null)return;
 const journal=JSON.parse(raw);
 if(journal.version!==1||!Array.isArray(journal.before)||journal.before.some(p=>!Array.isArray(p)||p.length!==2||typeof p[0]!=='string'||p[0]===STORAGE_JOURNAL||!(p[1]===null||typeof p[1]==='string')))throw Error('저장 복구 기록을 확인하세요. 원본을 유지합니다.');
 for(const [k,v]of journal.before)write(s,k,v);
 s.removeItem(STORAGE_JOURNAL);
}
export function applyStoragePatch(s,patch){
 recoverStorage(s);
 const entries=Object.entries(patch).filter(([k,v])=>s.getItem(k)!==v);
 if(entries.some(([k,v])=>k===STORAGE_JOURNAL||!(v===null||typeof v==='string')))throw Error('Invalid storage patch');
 if(!entries.length)return;
 const before=entries.map(([k])=>[k,s.getItem(k)]);
 s.setItem(STORAGE_JOURNAL,JSON.stringify({version:1,before}));
 try{for(const [k,v]of entries)write(s,k,v);s.removeItem(STORAGE_JOURNAL);}
 catch(error){try{recoverStorage(s);}catch{/* Journal remains for recovery on reload. */}throw error;}
}
