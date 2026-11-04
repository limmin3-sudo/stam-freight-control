import test from 'node:test';
import assert from 'node:assert/strict';
import {createRewardStore,rewardKey,rewardCandidates} from '../integration/log/reward-store.mjs';
import {snapshot as cloudSnapshot} from '../sync.mjs';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',key='stam-rewards-v1:guest';
const award=(n='1',id=null)=>({at:'2026-11-03T10:00:00.000Z',amount:50250,notificationId:n,missionId:id});
const done=id=>({missionId:id,title:'Same title',acceptanceObservations:[{}],progress:{outcome:'completed'}});
function memory(){const values=new Map();return {values,getItem:k=>values.get(k)||null,setItem(k,v){values.set(k,v);}};}
test('reward ledger restores and deduplicates observations without persisting titles, sources or account income',()=>{
 const s=memory();s.setItem('sfc-history','[{"id":"old","reward":50250}]');const ledger=createRewardStore(s);ledger.observe([{...award(),title:'private',source:{input:'private.log'}},award()]);
 const restored=createRewardStore(s);restored.observe([award(),award('2')]);assert.equal(restored.snapshot().records.length,2);
 assert.ok(!s.getItem(key).includes('private'));assert.equal(s.getItem('sfc-history'),'[{"id":"old","reward":50250}]');assert.deepEqual(cloudSnapshot(s),{'sfc-history':'[{"id":"old","reward":50250}]'});
});
test('unknown-ID rewards need explicit completed-instance selection; exact IDs cannot be reassigned',()=>{
 const ledger=createRewardStore(memory());ledger.observe([award(),award('2',a)]);assert.equal(ledger.snapshot().records[0].linkedMissionId,null);
 const candidates=[done(a),done(b),{...done('33333333-3333-4333-8333-333333333333'),progress:{outcome:'failed'}}];
 assert.equal(rewardCandidates(candidates).length,2);ledger.link(rewardKey(award()),b,candidates);assert.equal(ledger.snapshot().records[0].linkedMissionId,b);
 ledger.observe([award()]);assert.equal(ledger.snapshot().records[0].linkedMissionId,b);
 assert.throws(()=>ledger.link(rewardKey(award('2',a)),b,candidates),/계약 ID/);
 for(const c of [{...done(a),progress:{outcome:'unconfirmed'}},{...done(a),conflicts:['conflict']},{...done(a),acceptanceObservations:[]}])assert.throws(()=>ledger.link(rewardKey(award()),a,[c]),/완료/);
 ledger.link(rewardKey(award()),null,[]);assert.equal(ledger.snapshot().records[0].linkedMissionId,null);
});
test('reward writes are atomic; other tabs and account changes cannot overwrite or leak records',()=>{
 const s=memory(),ledger=createRewardStore(s),other=createRewardStore(s);ledger.observe([award()]);assert.throws(()=>other.observe([award('2')]),/다른 창/);
 const raw=s.getItem(key);s.setItem=()=>{throw Error('quota');};assert.throws(()=>ledger.link(rewardKey(award()),a,[done(a)]),/저장하지/);assert.equal(s.getItem(key),raw);assert.equal(ledger.snapshot().records[0].linkedMissionId,null);
 s.values.set('vh-account-meta',JSON.stringify({uid:'other'}));assert.equal(ledger.snapshot().records.length,0);assert.match(ledger.snapshot().error,/계정/);assert.throws(()=>ledger.observe([award('2')]),/계정/);assert.equal(createRewardStore(s).snapshot().records.length,0);
});
test('malformed, overflowing and oversized rewards never erase previously saved evidence',()=>{
 const s=memory(),ledger=createRewardStore(s);ledger.observe([award()]);const raw=s.getItem(key);
 for(const invalid of [{...award(),amount:-1},{...award(),amount:0.1},{...award(),at:'invalid'},{...award(),missionId:'bad'},{...award(),notificationId:1},{...award(),amount:Number.MAX_SAFE_INTEGER}])assert.throws(()=>ledger.observe([invalid]));
 assert.throws(()=>ledger.observe(Array.from({length:2049},(_,i)=>award(String(i)))));assert.equal(s.getItem(key),raw);
 for(const invalid of ['broken',JSON.stringify({version:1,records:[{...award(),linkedMissionId:null,log:'private'}]}),JSON.stringify({version:1,records:[{...award(),linkedMissionId:null},{...award(),linkedMissionId:null}]})]){s.values.set(key,invalid);const broken=createRewardStore(s);assert.ok(broken.snapshot().error);assert.throws(()=>broken.observe([]));assert.equal(s.getItem(key),invalid);}
});
