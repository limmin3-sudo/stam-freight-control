import test from 'node:test';
import assert from 'node:assert/strict';
import {samples} from '../src/mission-trial.ts';
import type {Job} from '../src/mission-trial.ts';
import {correctReceipt,decodeReceiptCache,effectiveReceipts,receiveReceipts} from '../src/receipt-cache.ts';
const raw=():Job=>({...structuredClone(samples[0]!),id:'accepted-A',state:'incomplete',signature:'evidence-A',shipments:[{...samples[0]!.shipments[0]!,scu:0}]});
const reviewed=(source:Job):Job=>({...source,state:'ready',reviewedReceipt:true,pay:12345,shipments:source.shipments.map(r=>({...r,scu:22,boxes:[{size:2,count:11}]}))});

test('tab snapshot preserves raw evidence and explicitly saved corrections without turning them into raw quantities',()=>{
 const source=raw(),before=JSON.stringify(source),card=reviewed(source);
 const initial=receiveReceipts({phase:'loaded',cards:[source]},null,1000);
 const saved=correctReceipt(initial,card),restored=decodeReceiptCache(JSON.stringify(saved))!;
 assert.deepEqual(effectiveReceipts(restored),[card]);assert.equal(restored.cards[0]!.shipments[0]!.scu,0);
 assert.equal(restored.savedAt,1000);assert.equal(JSON.stringify(source),before);
 assert.deepEqual(effectiveReceipts(receiveReceipts({phase:'loaded',cards:[source]},restored,2000)),[card]);
});

test('corrections cannot transfer to another instance, changed evidence, ended or conflicting receipts',()=>{
 const source=raw(),saved=correctReceipt(receiveReceipts({phase:'loaded',cards:[source]},null),reviewed(source));
 for(const changed of [{...source,id:'accepted-B'},{...source,signature:'changed'},{...source,pay:999},{...source,title:['Changed','Changed'] as [string,string]},
  {...source,state:'ended' as const},{...source,state:'conflict' as const}]){
  const next=receiveReceipts({phase:'loaded',cards:[changed]},saved);
  assert.deepEqual(effectiveReceipts(next),[changed]);assert.deepEqual(next.corrections,{});
 }
 assert.throws(()=>correctReceipt(saved,{...reviewed(source),signature:'old'}));
 const empty=receiveReceipts({phase:'loaded',cards:[]},saved);
 assert.deepEqual(effectiveReceipts(empty),[]);assert.deepEqual(empty.corrections,{});
});

test('invalid snapshots fail closed; stale stored corrections are not revived',()=>{
 assert.equal(decodeReceiptCache(null),null);
 for(const value of ['{','null','{}',JSON.stringify({version:2,cards:[],savedAt:1,corrections:{},phase:'loaded'})])assert.throws(()=>decodeReceiptCache(value));
 const saved=correctReceipt(receiveReceipts({phase:'loaded',cards:[raw()]},null),reviewed(raw()));
 const stale=structuredClone(saved);stale.cards[0]!.signature='latest';
 assert.deepEqual(decodeReceiptCache(JSON.stringify(stale))!.corrections,{});
 const broken=JSON.parse(JSON.stringify(saved));broken.cards[0].shipments=null;
 assert.throws(()=>decodeReceiptCache(JSON.stringify(broken)));
 assert.throws(()=>receiveReceipts({phase:'loaded',cards:[raw(),raw()]},null));
 const unusual={...raw(),id:'constructor'};
 assert.deepEqual(effectiveReceipts(receiveReceipts({phase:'loaded',cards:[unusual]},null)),[unusual]);
});
