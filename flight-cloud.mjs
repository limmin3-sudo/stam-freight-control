// Versioned account flight snapshots. Separate from legacy settings synchronisation.
export const CLOUD_CHUNK_SIZE=600000,CLOUD_MAX_ENCODED=8000000;
const conflict=()=>Object.assign(Error('다른 기기의 운항이 변경됐습니다. 다시 비교하세요.'),{code:'stam/flight-conflict'});
const scopeName=scope=>{if(!['flight','trade'].includes(scope))throw Error('Unknown cloud namespace');return scope;};
const headerRef=(f,uid,scope)=>f.doc(f.db,'users',uid,scopeName(scope),'current');
const partRef=(f,uid,index,scope)=>f.doc(f.db,'users',uid,scopeName(scope),'current','parts',String(index));
export function validateCloudHeader(h){
 if(!h||h.format!==1||h.encoding!=='gzip-base64'||!Number.isSafeInteger(h.revision)||h.revision<1||!Number.isFinite(h.updatedAt)||!Number.isSafeInteger(h.parts)||h.parts<1||h.parts>14||!Number.isSafeInteger(h.bytes)||h.bytes<1||h.bytes>20*1024*1024||!Number.isSafeInteger(h.encodedBytes)||h.encodedBytes<1||h.encodedBytes>CLOUD_MAX_ENCODED||typeof h.digest!=='string'||!/^[a-f0-9]{64}$/.test(h.digest)||typeof h.device!=='string'||h.device.length>120)throw Error('계정 운항의 저장 형식을 확인할 수 없습니다.');
 return h;
}
export async function readCloudFlight(f,uid,{assertCurrent=()=>{},knownRevision,scope='flight'}={}){
 assertCurrent();const before=(await f.getDoc(headerRef(f,uid,scope))).data();assertCurrent();if(!before)return null;validateCloudHeader(before);
 if(knownRevision===before.revision)return {header:before,unchanged:true};
 const chunks=await Promise.all(Array.from({length:before.parts},(_,i)=>f.getDoc(partRef(f,uid,i,scope))));assertCurrent();
 const after=(await f.getDoc(headerRef(f,uid,scope))).data();assertCurrent();if(after?.revision!==before.revision)throw conflict();
 const payload=chunks.map(c=>{const d=c.data();if(d?.revision!==before.revision||typeof d.value!=='string'||d.value.length>CLOUD_CHUNK_SIZE)throw Error('계정 운항 일부를 읽지 못했습니다. 기존 운항은 유지됩니다.');return d.value;}).join('');
 if(payload.length!==before.encodedBytes||!/^[A-Za-z0-9+/]+={0,2}$/.test(payload))throw Error('계정 운항 자료가 손상됐습니다.');
 return {header:before,payload};
}
export async function writeCloudFlight(f,uid,expected,encoded,{assertCurrent=()=>{},device='Browser',now=Date.now(),scope='flight'}={}){
 const {payload,digest,bytes}=encoded;
 if(typeof payload!=='string'||payload.length>CLOUD_MAX_ENCODED||!payload.length||!/^[A-Za-z0-9+/]+={0,2}$/.test(payload))throw Error('계정 운항 저장 크기를 초과했습니다. 운항 백업 파일을 사용하세요.');
 const parts=Math.ceil(payload.length/CLOUD_CHUNK_SIZE),head=headerRef(f,uid,scope);
 return f.runTransaction(f.db,async tx=>{
  assertCurrent();const old=(await tx.get(head)).data();assertCurrent();if(old)validateCloudHeader(old);
  if((old?.revision||0)!==expected)throw conflict();
  const next=validateCloudHeader({format:1,revision:expected+1,updatedAt:Math.max(now,(old?.updatedAt||0)+1),device:String(device).slice(0,120),parts,digest,bytes,encodedBytes:payload.length,encoding:'gzip-base64'});
  for(let i=0;i<parts;i++)tx.set(partRef(f,uid,i,scope),{revision:next.revision,value:payload.slice(i*CLOUD_CHUNK_SIZE,(i+1)*CLOUD_CHUNK_SIZE)});
  for(let i=parts;i<(old?.parts||0);i++)tx.delete(partRef(f,uid,i,scope));
  tx.set(head,next);return next;
 });
}
