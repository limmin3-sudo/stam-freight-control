import test from 'node:test';import assert from 'node:assert/strict';
import {createBoxMemory} from '../integration/log/box-memory.mjs';import {boxBinding} from '../integration/log/reservations.mjs';import {ACCOUNT_META,SYNC_KEYS} from '../sync.mjs';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),values};};
const c={missionId:'runtime-a',definitionId:'definition-a',gameBuild:{status:'known',value:'12913470'}},row={key:'runtime-a:Hydrogen',commodity:'Hydrogen',scu:66,maxBoxSize:32,parts:[66],dropoffId:'destination-a'};
const value={binding:boxBinding(row),boxes:[{size:32,count:2},{size:2,count:1}]};
test('manual box counts survive reload only for the same contract and unchanged cargo',()=>{
 const s=memory(),a=createBoxMemory(s);a.set(c,row,value);const b=createBoxMemory(s);assert.deepEqual(b.lookup(c,row).value,value);
 assert.deepEqual(b.lookup({...c,missionId:'runtime-b'},{...row,key:'runtime-b:Hydrogen'}),{});
 for(const changed of [{...c,gameBuild:{status:'known',value:'new'}},{...c,definitionId:'new'}])assert.ok(b.lookup(changed,row).error);
 for(const changed of [{...row,scu:64},{...row,dropoffId:'other'},{...row,pickupId:'changed'},{...row,publicMaxBoxSize:2}])assert.ok(b.lookup(c,changed).error);
 assert.ok([...s.values.keys()].every(k=>!SYNC_KEYS.includes(k)));
 b.set(c,row,null);assert.deepEqual(createBoxMemory(s).lookup(c,row),{});
});
test('bad totals, failed writes and mutations cannot replace saved counts',()=>{
 const s=memory(),store=createBoxMemory(s);store.set(c,row,value);
 assert.throws(()=>store.set(c,row,{...value,boxes:[{size:32,count:1}]}),/부족/);
 const copy=store.lookup(c,row).value;copy.boxes[0].count=8;assert.deepEqual(store.lookup(c,row).value,value);
 s.setItem=()=>{throw Error('quota');};assert.throws(()=>store.set(c,row,null),/저장하지 못/);assert.deepEqual(store.lookup(c,row).value,value);
});
test('account switch isolates manual counts and prevents writes under the previous account',()=>{
 const s=memory(),guest=createBoxMemory(s);guest.set(c,row,value);s.setItem(ACCOUNT_META,JSON.stringify({uid:'account-a'}));
 assert.deepEqual(createBoxMemory(s).lookup(c,row),{});assert.ok(guest.lookup(c,row).error);assert.ok(guest.error());assert.throws(()=>guest.set(c,row,null),/계정이 바뀌었습니다/);
});
test('corrupt saved data requires explicit clearing and cannot become automatic counts',()=>{
 const s=memory();s.setItem('stam-log-box-memory-v1:guest','bad');const store=createBoxMemory(s);assert.ok(store.error());assert.ok(store.lookup(c,row).error);assert.throws(()=>store.set(c,row,value),/읽지 못/);store.clear();assert.deepEqual(store.lookup(c,row),{});store.set(c,row,value);assert.deepEqual(createBoxMemory(s).lookup(c,row).value,value);
});
