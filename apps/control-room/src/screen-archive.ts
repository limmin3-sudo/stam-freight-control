import type {Frame} from './contract-screen';

let opening:Promise<IDBDatabase>|undefined;
function database(){
 if(!opening)opening=new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open('stam.contract-screens',1);
  request.onupgradeneeded=()=>{
   const store=request.result.createObjectStore('frames',{keyPath:['jobId','key']});
   store.createIndex('contract','jobId');
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>{opening=undefined;reject(request.error);};
 });
 return opening;
}
export async function saveFrame(jobId:string,frame:Frame){
 const db=await database();
 await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('frames','readwrite');
  tx.objectStore('frames').put({...frame,jobId,at:Date.now()});
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);
 });
}
export async function loadFrames(jobId:string){
 const db=await database();
 return new Promise<Frame[]>((resolve,reject)=>{
  const req=db.transaction('frames').objectStore('frames').index('contract').getAll(jobId);
  req.onsuccess=()=>resolve(req.result.sort((a,b)=>a.at-b.at));
  req.onerror=()=>reject(req.error);
 });
}

// Pending captures are scoped to this browser tab and its original receipts.
// A later flight cannot inherit an unmatched screenshot as a new contract.
export type PendingFrame={key:string;frame:Frame;ids:string[]};
function pendingOwner(){
 const key='stam.contract-screen.reader';
 let id=sessionStorage.getItem(key);
 if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id);}
 return 'pending:'+id;
}
export async function pendingFrames():Promise<PendingFrame[]>{
 const db=await database(),owner=pendingOwner();
 return new Promise((resolve,reject)=>{
  const req=db.transaction('frames').objectStore('frames').index('contract').getAll(owner);
  req.onsuccess=()=>resolve(req.result.sort((a,b)=>a.at-b.at).map(r=>({key:r.key,frame:r.frame,ids:r.ids})));
  req.onerror=()=>reject(req.error);
 });
}
export async function stageFrame(frame:Frame,ids:string[]){
 const db=await database(),jobId=pendingOwner();
 await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('frames','readwrite'),store=tx.objectStore('frames');
  // The same objective text can belong to a different set of accepted instances.
  const key=JSON.stringify([frame.key,[...ids].sort()]);
  const check=store.getKey([jobId,key]);
  check.onsuccess=()=>{if(!check.result)store.put({jobId,key,frame,ids,at:Date.now()});};
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);
 });
}
export async function clearPending(entry:PendingFrame){
 const db=await database(),owner=pendingOwner();
 await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('frames','readwrite');
  tx.objectStore('frames').delete([owner,entry.key]);
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);
 });
}
