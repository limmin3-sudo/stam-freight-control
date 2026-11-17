import {blankSuiteBook,validateSuiteBook,expeditionSummary,type SuiteBook} from './trade-expedition.ts';
import {blankTradeBook,validateTradeBook,tradeSummary,type TradeBook} from './trade-operations.ts';
import {suiteBookKey,tradeKey} from './trade-storage.ts';
import {applyStoragePatch} from '../../../storage-transaction.mjs';
import type {CloudEncoding,CloudSnapshot} from './service-account.mjs';
export type TradeSnapshot={format:'stam-trade-cloud-v1';owner:string;suite:SuiteBook;legacy:TradeBook};
export const tradePreviousKey=(owner:string)=>'stam.trade-cloud-previous.v1:'+encodeURIComponent(owner);
export const tradeCloudLimit=20*1024*1024;
export async function tradeDigest(text:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function validateTradeSnapshot(value:unknown,owner:string):TradeSnapshot{
 const v=value as TradeSnapshot;if(!v||v.format!=='stam-trade-cloud-v1'||v.owner!==owner)throw Error('account');
 const suite=validateSuiteBook(v.suite,owner),legacy=validateTradeBook(v.legacy,owner);
 if(suite.runs.some(r=>expeditionSummary(r).status==='active')&&legacy.runs.some(r=>tradeSummary(r).status==='active'))throw Error('active');
 return {format:'stam-trade-cloud-v1',owner,suite,legacy};
}
export function readTradeSnapshot(storage:Pick<Storage,'getItem'>,owner:string):TradeSnapshot{
 const suite=storage.getItem(suiteBookKey(owner)),legacy=storage.getItem(tradeKey(owner));
 return validateTradeSnapshot({format:'stam-trade-cloud-v1',owner,suite:suite===null?blankSuiteBook(owner):JSON.parse(suite),legacy:legacy===null?blankTradeBook(owner):JSON.parse(legacy)},owner);
}
export function emptyTradeSnapshot(v:TradeSnapshot){return !v.suite.runs.length&&!v.suite.plans.length&&!v.suite.watches.length&&!v.suite.favorites.length&&!v.legacy.runs.length;}
// Called inside tradeOwnerLock. Backup and both ledger generations change together.
export function applyTradeSnapshot(storage:Storage,owner:string,expected:string,value:TradeSnapshot,guard:()=>string){
 if(guard()!==owner)throw Error('account');const current=JSON.stringify(readTradeSnapshot(storage,owner));if(current!==expected)throw Error('conflict');
 const next=validateTradeSnapshot(value,owner);if(new TextEncoder().encode(JSON.stringify(next)).length>tradeCloudLimit)throw Error('size');
 applyStoragePatch(storage,{[tradePreviousKey(owner)]:current,[suiteBookKey(owner)]:JSON.stringify(next.suite),[tradeKey(owner)]:JSON.stringify(next.legacy)});
}
export async function encodeTradeSnapshot(value:TradeSnapshot):Promise<CloudEncoding>{
 const text=JSON.stringify(validateTradeSnapshot(value,value.owner)),raw=new TextEncoder().encode(text);if(raw.length>tradeCloudLimit)throw Error('size');
 const packed=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());let binary='';for(let i=0;i<packed.length;i+=32768)binary+=String.fromCharCode(...packed.subarray(i,i+32768));const payload=btoa(binary);if(payload.length>8000000)throw Error('size');
 return {payload,digest:await tradeDigest(text),bytes:raw.length};
}
export async function decodeTradeSnapshot(snapshot:CloudSnapshot,owner:string):Promise<TradeSnapshot>{
 if(!snapshot.payload||snapshot.payload.length>8000000||snapshot.header.bytes>tradeCloudLimit)throw Error('size');
 const packed=Uint8Array.from(atob(snapshot.payload),c=>c.charCodeAt(0)),reader=new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),chunks:Uint8Array[]=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>tradeCloudLimit||length>snapshot.header.bytes)throw Error('size');chunks.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 if(length!==snapshot.header.bytes||await tradeDigest(text)!==snapshot.header.digest)throw Error('integrity');return validateTradeSnapshot(JSON.parse(text),owner);
}
