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
