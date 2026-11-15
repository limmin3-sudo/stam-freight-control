import {exportFlight,importFlight,backupLimit} from './flight-backup.ts';
import type {Session} from './flight-session';
import type {CloudEncoding,CloudSnapshot} from './service-account.mjs';
export async function flightDigest(value:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function encodeCloudFlight(session:Session):Promise<CloudEncoding>{
 const text=exportFlight(session),raw=new TextEncoder().encode(text);if(raw.length>backupLimit)throw Error('운항 자료가 너무 큽니다. 파일 백업을 사용하세요.');
 // Validate outbound state too; a broken local cache must not replace a good cloud flight.
 importFlight(text);
 const packed=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
 let binary='';for(let i=0;i<packed.length;i+=32768)binary+=String.fromCharCode(...packed.subarray(i,i+32768));
 const payload=btoa(binary);if(payload.length>8000000)throw Error('압축한 운항이 계정 저장 한도를 넘습니다. 운항 백업 파일을 사용하세요.');
 return {payload,digest:await flightDigest(text),bytes:raw.length};
}
export async function decodeCloudFlight(snapshot:CloudSnapshot):Promise<Session>{
 if(!snapshot.payload)throw Error('운항 내용을 다시 불러오세요.');
 const bytes=Uint8Array.from(atob(snapshot.payload),c=>c.charCodeAt(0));
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),chunks:Uint8Array[]=[];let total=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>backupLimit||total>snapshot.header.bytes)throw Error('계정 운항 크기가 올바르지 않습니다.');chunks.push(value);}}finally{await reader.cancel();}
 const output=new Uint8Array(total);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length;}
 const text=new TextDecoder('utf-8',{fatal:true}).decode(output);if(total!==snapshot.header.bytes||await flightDigest(text)!==snapshot.header.digest)throw Error('계정 운항의 무결성을 확인할 수 없습니다. 기존 운항은 유지합니다.');
 return importFlight(text);
}
