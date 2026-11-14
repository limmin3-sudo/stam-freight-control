import test from 'node:test';
import assert from 'node:assert/strict';
import {writeAccount,readAccount} from '../account-sync-transport.mjs';
function backend(){
 const data=new Map([['users/a',{updatedAt:100,revision:1}],['users/a/state/vh-missions',{value:'[]'}],['users/a/state/future-key',{value:'preserve'}]]);let writes=0;
 const f={db:{},doc:(root,...parts)=>({path:[...(root.path||[]),...(parts.length?parts:['change'])]}),collection:(root,...parts)=>({path:parts}),getDoc:async r=>({data:()=>structuredClone(data.get(r.path.join('/')))}),getDocs:async()=>({forEach:cb=>{for(const [key,value]of data)if(key.includes('/state/'))cb({id:key.split('/').at(-1),data:()=>value});}}),
 async runTransaction(db,fn){for(let i=0;i<5;i++){let seen;const ops=[];const result=await fn({get:async r=>{const value=structuredClone(data.get(r.path.join('/')));seen=value.revision;return{data:()=>value};},set:(r,v)=>ops.push([r.path.join('/'),v]),delete:r=>ops.push([r.path.join('/'),null])});if(data.get('users/a').revision!==seen)continue;for(const [key,value]of ops)value===null?data.delete(key):data.set(key,value);writes++;return result;}throw Error('retry limit');}};
 return{f,data,writes:()=>writes};
}
test('concurrent devices with the same revision accept exactly one write, irrespective of device clock',async()=>{
 const {f,data,writes}=backend(),expected={revision:1,updatedAt:100};
 const outcomes=await Promise.allSettled([writeAccount(f,'a',expected,['vh-missions'],{'vh-missions':'["left"]'},{now:1}),writeAccount(f,'a',expected,['vh-missions'],{'vh-missions':'["right"]'},{now:99999})]);
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.find(r=>r.status==='rejected').reason.code,'stam/conflict');assert.equal(writes(),1);assert.equal(data.get('users/a').revision,2);assert.ok(data.get('users/a').updatedAt>100);
});
test('explicit replacement cannot delete future keys, and reads ignore unsupported documents',async()=>{
 const {f,data}=backend();await writeAccount(f,'a',{revision:1,updatedAt:100},['future-key','vh-missions'],{});assert.equal(data.get('users/a/state/future-key').value,'preserve');assert(!data.has('users/a/state/vh-missions'));assert.deepEqual((await readAccount(f,'a')).snap,{});
});
test('oversized UTF-8 or stale authentication aborts without server mutation',async()=>{
 const {f,data,writes}=backend(),expected={revision:1,updatedAt:100};
 await assert.rejects(writeAccount(f,'a',expected,['vh-missions'],{'vh-missions':'한'.repeat(310000)}),/용량/);
 let checks=0;await assert.rejects(writeAccount(f,'a',expected,['vh-missions'],{}, {assertCurrent(){if(++checks===2)throw Error('auth changed');}}),/auth changed/);
 assert.equal(writes(),0);assert.equal(data.get('users/a/state/vh-missions').value,'[]');
});
test('legacy updatedAt change without revision also stops a stale writer',async()=>{
 const {f}=backend();await assert.rejects(writeAccount(f,'a',{revision:1,updatedAt:99},['vh-missions'],{}),{code:'stam/conflict'});
});
