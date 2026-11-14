import test from 'node:test';
import assert from 'node:assert/strict';
import {applyStoragePatch,recoverStorage,STORAGE_JOURNAL} from '../storage-transaction.mjs';
import {FLIGHT_KEYS,FLIGHT_OWNER,initializeOwner,readOwner,ownershipPatch,archivedFlight,ownerArchive} from '../flight-ownership.mjs';
const mem=(init={})=>{const m=new Map(Object.entries(init));let count=0,fail=0;return {getItem:k=>m.get(k)??null,setItem(k,v){if(++count===fail)throw Error('quota');m.set(k,v);},removeItem(k){if(++count===fail)throw Error('quota');m.delete(k);},failAt(n){count=0;fail=n;},dump:()=>Object.fromEntries(m)};};
const [flight,previous]=FLIGHT_KEYS;
test('multi-key storage change rolls back at every failing write, including journal removal',()=>{
 for(let i=1;i<=5;i++){const original={a:'old',b:'preserved',unrelated:'keep'},s=mem(original);s.failAt(i);assert.throws(()=>applyStoragePatch(s,{a:'new',b:null,c:'created'}),/quota/);assert.deepEqual(s.dump(),original);}
});
test('interrupted account transition recovers original bytes before any new transition',()=>{
 const s=mem({a:'partial',[STORAGE_JOURNAL]:JSON.stringify({version:1,before:[['a','original'],['b',null]]}),b:'partial'});recoverStorage(s);assert.deepEqual(s.dump(),{a:'original'});
 const broken=mem({a:'original',[STORAGE_JOURNAL]:'invalid'});assert.throws(()=>recoverStorage(broken));assert.equal(broken.getItem('a'),'original');
});
test('unowned flight is never silently assigned; explicit adoption retains both source backups',()=>{
 const s=mem({[flight]:'current',[previous]:'older'});assert.equal(initializeOwner(s),'unassigned');
 applyStoragePatch(s,ownershipPatch(s,'account:a',{adopt:true}));assert.equal(readOwner(s),'account:a');assert.deepEqual(archivedFlight(s,'unassigned'),{[flight]:'current',[previous]:'older'});
 assert.throws(()=>ownershipPatch(s,'account:b',{adopt:true}),/다른 계정/);
});
test('A → B → guest → A preserves every current and previous flight exactly',()=>{
 const s=mem({[FLIGHT_OWNER]:'guest',[flight]:'guest',[previous]:'guest-old'});initializeOwner(s);applyStoragePatch(s,ownershipPatch(s,'guest'));
 for(const owner of ['account:a','account:b']){applyStoragePatch(s,ownershipPatch(s,owner));s.setItem(flight,owner);s.setItem(previous,owner+'-old');}
 applyStoragePatch(s,ownershipPatch(s,'guest'));assert.equal(s.getItem(flight),'guest');assert.equal(s.getItem(previous),'guest-old');
 applyStoragePatch(s,ownershipPatch(s,'account:a'));assert.equal(s.getItem(flight),'account:a');assert.equal(s.getItem(previous),'account:a-old');assert.equal(archivedFlight(s,'account:b')[previous],'account:b-old');
});
test('target archive corruption or occupied adoption does not overwrite either flight',()=>{
 const s=mem({[FLIGHT_OWNER]:'guest',[flight]:'guest',[previous]:'backup',[ownerArchive('account:a')]:JSON.stringify({version:1,values:{[flight]:'A',[previous]:'A-old'}})}),original=s.dump();
 assert.throws(()=>ownershipPatch(s,'account:a',{adopt:true}),/보관된 운항/);assert.deepEqual(s.dump(),original);
 s.setItem(ownerArchive('account:a'),'broken');assert.throws(()=>ownershipPatch(s,'account:a'));assert.equal(s.getItem(flight),'guest');
});
