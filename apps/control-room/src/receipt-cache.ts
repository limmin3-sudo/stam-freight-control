import type {Job} from './mission-trial';

// Tab-local receipts only. Never serialize the raw log, file handle or watcher.
export const receiptCacheKey='stam.receipt-inbox.v1';
export type ReceiptResult={phase:'loaded'|'mixed';cards:Job[]};
export type Correction={source:string;card:Job};
export type ReceiptCache=ReceiptResult & {version:1;savedAt:number;corrections:Record<string,Correction>};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:unknown)=>Array.isArray(v)&&v.every(s=>typeof s==='string');
const pair=(v:unknown)=>strings(v)&&(v as unknown[]).length===2;
const amount=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const optional=(v:unknown,check:(v:unknown)=>boolean)=>v===undefined||check(v);
function cardValid(v:unknown):v is Job{
 if(!record(v)||typeof v.id!=='string'||!v.id||typeof v.signature!=='string'||!v.signature||!pair(v.title)||!amount(v.pay)||
  !['ready','incomplete','ended','conflict'].includes(String(v.state))||!Array.isArray(v.shipments))return false;
 if(!v.shipments.every(r=>record(r)&&typeof r.id==='string'&&pair(r.cargo)&&typeof r.from==='string'&&typeof r.to==='string'&&amount(r.scu)&&
  optional(r.boxes,b=>Array.isArray(b)&&b.every(x=>record(x)&&amount(x.size)&&amount(x.count)))))return false;
 if(!optional(v.reservations,r=>record(r)&&Object.values(r).every(amount))||
  !optional(v.hints,h=>Array.isArray(h)&&h.every(x=>record(x)&&typeof x.cargo==='string'&&(x.place===undefined||typeof x.place==='string')&&amount(x.scu))))return false;
 if(!optional(v.mission,m=>record(m)&&Array.isArray(m.cargo)&&m.cargo.every(record)))return false;
 if(!optional(v.referenceInfo,r=>record(r)&&record(r.values)&&record(r.provenance)&&Object.values(r.provenance).every(strings)&&record(r.sources)&&
  Object.values(r.sources).every(s=>record(s)&&typeof s.name==='string'&&typeof s.version==='string')))return false;
 return true;
}
// Match all received evidence, not just a reusable definition ID or cargo total.
// Catalogue display metadata does not establish accepted-instance evidence.
export function receiptEvidence({referenceInfo:_reference,...raw}:Job){return JSON.stringify(raw);}
function applicable(raw:Job,correction:Correction|undefined):correction is Correction{
 return !!correction?.card&&(raw.state==='ready'||raw.state==='incomplete')&&correction.card.id===raw.id&&
  correction.card.signature===raw.signature&&correction.source===receiptEvidence(raw);
}
export function effectiveReceipts(cache:ReceiptCache|null):Job[]{
 return cache?.cards.map(raw=>{const corrected=cache.corrections[raw.id];return applicable(raw,corrected)?corrected.card:raw;})||[];
}
export function receiveReceipts(result:ReceiptResult,previous:ReceiptCache|null,now=Date.now()):ReceiptCache{
 if(!['loaded','mixed'].includes(result.phase)||!Array.isArray(result.cards)||!result.cards.every(cardValid)||new Set(result.cards.map(c=>c.id)).size!==result.cards.length)throw Error('Invalid receipt result');
 return {version:1,...result,savedAt:now,corrections:Object.fromEntries(result.cards.flatMap(raw=>{
  const corrected=previous?.corrections[raw.id];return applicable(raw,corrected)?[[raw.id,corrected]]:[];
 }))};
}
export function correctReceipt(cache:ReceiptCache,card:Job):ReceiptCache{
 const raw=cache.cards.find(c=>c.id===card.id);
 if(!raw||!cardValid(card)||!['ready','incomplete'].includes(raw.state!)||!['ready','incomplete'].includes(card.state!)||raw.signature!==card.signature)
  throw Error('수신 기록이 바뀌었습니다. 수신함에서 계약을 다시 확인하세요.');
 return {...cache,corrections:{...cache.corrections,[card.id]:{source:receiptEvidence(raw),card}}};
}
export function decodeReceiptCache(text:string|null):ReceiptCache|null{
 if(text===null)return null;
 const v:unknown=JSON.parse(text);
 if(!record(v)||v.version!==1||!amount(v.savedAt)||!record(v.corrections))throw Error('Invalid receipt cache');
 const base=receiveReceipts(v as unknown as ReceiptResult,null,v.savedAt as number);
 const corrections:Record<string,Correction>={};
 for(const [id,value] of Object.entries(v.corrections)){
  if(!record(value)||typeof value.source!=='string'||!cardValid(value.card))throw Error('Invalid receipt correction');
  const raw=base.cards.find(c=>c.id===id),corrected=value as unknown as Correction;
  if(raw&&applicable(raw,corrected))Object.defineProperty(corrections,id,{value:corrected,enumerable:true});
 }
 return {...base,corrections};
}
