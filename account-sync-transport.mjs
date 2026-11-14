import {SYNC_KEYS,cleanValue} from './sync.mjs';
export const sameStamp=(a,b)=>Number(a?.revision||0)===Number(b?.revision||0)&&Number(a?.updatedAt||0)===Number(b?.updatedAt||0);
const stamp=d=>({revision:Number(d?.revision||0),updatedAt:Number(d?.updatedAt||0)});
export const syncConflict=()=>Object.assign(new Error('다른 기기에서 저장 내용이 바뀌었습니다. 다시 비교해 주세요.'),{code:'stam/conflict'});
export async function readAccount(f,uid){
 const ref=f.doc(f.db,'users',uid);
 for(let i=0;i<3;i++){
  const before=stamp((await f.getDoc(ref)).data()),rows=await f.getDocs(f.collection(f.db,'users',uid,'state')),snap={};
  rows.forEach(d=>{if(SYNC_KEYS.includes(d.id)){const v=d.data().value;if(typeof v!=='string')throw Error('계정 저장 형식을 확인하세요.');snap[d.id]=cleanValue(d.id,v);}});
  const after=stamp((await f.getDoc(ref)).data());if(sameStamp(before,after))return {snap,stamp:after};
 }
 throw syncConflict();
}
export async function writeAccount(f,uid,expected,keys,snap,{assertCurrent=()=>{},items=[],device='Browser',now=Date.now()}={}){
 const allowed=keys.filter(k=>SYNC_KEYS.includes(k)),values=Object.fromEntries(allowed.map(k=>[k,cleanValue(k,snap[k])]));
 const head=f.doc(f.db,'users',uid),change=items.length?f.doc(f.collection(f.db,'users',uid,'changes')):null;
 try{return await f.runTransaction(f.db,async tx=>{
  assertCurrent();const current=stamp((await tx.get(head)).data());assertCurrent();if(!sameStamp(current,expected))throw syncConflict();
  const next={revision:current.revision+1,updatedAt:Math.max(now,current.updatedAt+1)};
  for(const key of allowed){const ref=f.doc(f.db,'users',uid,'state',key);if(values[key]===null)tx.delete(ref);else tx.set(ref,{value:values[key],updatedAt:next.updatedAt});}
  if(change)tx.set(change,{at:now,device,items});tx.set(head,next,{merge:true});return next;
 });}catch(error){
  // Rules may reject a stale commit before the SDK retries it. Re-read only to classify;
  // never retry with a newer revision or overwrite data automatically.
  if(error?.code==='permission-denied'){
   assertCurrent();const current=stamp((await f.getDoc(head)).data());assertCurrent();
   if(!sameStamp(current,expected))throw syncConflict();
  }
  throw error;
 }
}
