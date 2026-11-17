import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyTradeSnapshot,decodeTradeSnapshot,encodeTradeSnapshot,readTradeSnapshot,tradePreviousKey} from '../src/trade-cloud-codec.ts';
import {suiteBookKey,tradeKey} from '../src/trade-storage.ts';
function storage(){const values=new Map<string,string>();return {values,getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k),clear:()=>values.clear(),key:()=>null,length:0};}
test('cloud bundle round-trips both trade generations, rejects another owner and corrupted digest',async()=>{
 const s=storage(),owner='account:a',v=readTradeSnapshot(s,owner);v.suite.favorites=[1,2];v.suite.watches=[{id:'watch',commodityId:1,terminalId:1,side:'buy',threshold:3}];const encoded=await encodeTradeSnapshot(v),header={format:1 as const,revision:1,updatedAt:1,device:'Test',parts:1,encoding:'gzip-base64' as const,encodedBytes:encoded.payload.length,bytes:encoded.bytes,digest:encoded.digest};
 assert.deepEqual(await decodeTradeSnapshot({header,payload:encoded.payload},owner),v);await assert.rejects(decodeTradeSnapshot({header,payload:encoded.payload},'account:b'),/account/);await assert.rejects(decodeTradeSnapshot({header:{...header,digest:'0'.repeat(64)},payload:encoded.payload},owner),/integrity/);await assert.rejects(decodeTradeSnapshot({header:{...header,bytes:1},payload:encoded.payload},owner),/size/);
});
test('restoring preserves a recoverable previous bundle, owner isolation and stale-tab guards',()=>{
 const s=storage(),owner='account:a',before=JSON.stringify(readTradeSnapshot(s,owner)),remote=readTradeSnapshot(s,owner);remote.suite.favorites=[5];s.setItem('stam.control-room.flight.v1','existing freight');
 applyTradeSnapshot(s,owner,before,remote,()=>owner);assert.equal(s.getItem(tradePreviousKey(owner)),before);assert.equal(s.getItem('stam.control-room.flight.v1'),'existing freight');assert.deepEqual(readTradeSnapshot(s,owner).suite.favorites,[5]);assert.throws(()=>applyTradeSnapshot(s,owner,before,remote,()=>owner),/conflict/);assert.throws(()=>applyTradeSnapshot(s,owner,JSON.stringify(remote),remote,()=> 'account:b'),/account/);assert.equal(s.getItem(suiteBookKey('account:b')),null);
});
test('partial multi-key restore fails atomically and leaves both original books readable',()=>{
 const s=storage(),owner='account:a',v=readTradeSnapshot(s,owner);s.setItem(suiteBookKey(owner),JSON.stringify(v.suite));s.setItem(tradeKey(owner),JSON.stringify(v.legacy));const before=new Map(s.values),remote=structuredClone(v);remote.suite.favorites=[9];remote.legacy.revision=3;const set=s.setItem;let failed=false;s.setItem=(k,v)=>{if(k===tradeKey(owner)&&!failed){failed=true;throw Error('quota');}return set(k,v);};
 assert.throws(()=>applyTradeSnapshot(s,owner,JSON.stringify(v),remote,()=>owner),/quota/);assert.deepEqual(s.values,before);assert.deepEqual(readTradeSnapshot(s,owner),v);
});
