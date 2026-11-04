import test from 'node:test';import assert from 'node:assert/strict';
import {flightSync,recoverCloudRestore} from '../integration/log/flight-sync.mjs';
import {createManualDrafts} from '../integration/log/manual-drafts.mjs';
import {ACCOUNT_META} from '../sync.mjs';
const memory=()=>{const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
const c={missionId:'11111111-1111-4111-8111-111111111111',definitionId:'type',gameBuild:{status:'known',value:1}};
test('cloud flight restores into destination account without moving guest or other account records',()=>{
 const a=memory(),b=memory();a.setItem(ACCOUNT_META,JSON.stringify({uid:'pilot'}));a.setItem('stam-local-log-pairing','secret');
 createManualDrafts(a).save(c,[{scu:64,pickupId:'p',dropoffId:'d'}]);
 const cloud=flightSync.snapshot(a);assert.ok(cloud['stam-flight-drafts']);assert.ok(!JSON.stringify(cloud).includes('secret'));
 createManualDrafts(b).save(c,[{scu:2,pickupId:'p',dropoffId:'d'}]);
 flightSync.apply(b,cloud,'pilot');assert.equal(createManualDrafts(b).lookup(c)[0].scu,2);
 b.setItem(ACCOUNT_META,JSON.stringify({uid:'pilot'}));assert.equal(createManualDrafts(b).lookup(c)[0].scu,64);
 assert.deepEqual(flightSync.changed(cloud,flightSync.snapshot(b)),[]);
 flightSync.apply(b,{},'guest');assert.equal(createManualDrafts(b).lookup(c)[0].scu,64,'sign out does not erase account storage');
});
test('invalid or failed cloud restore preserves settings and cargo; interrupted restore can recover before account changes',()=>{
 const s=memory();s.setItem('vh-ship-id','before');
 assert.throws(()=>flightSync.apply(s,{'vh-ship-id':'after','stam-flight-drafts':'{"version":1,"records":[{}]}'},'pilot'));
 assert.equal(s.getItem('vh-ship-id'),'before');
 const write=s.setItem;let fail=true;s.setItem=(k,v)=>{if(k==='vh-ship-id'&&v==='after'&&fail){fail=false;throw Error('quota');}write(k,v);};
 assert.throws(()=>flightSync.apply(s,{'vh-ship-id':'after'},'pilot'));
 assert.equal(s.getItem('vh-ship-id'),'before');
 s.setItem('vh-ship-id','interrupted');s.setItem('stam-cloud-restore-v1',JSON.stringify({version:1,owner:'pilot',before:{'vh-ship-id':'before'}}));
 recoverCloudRestore(s);assert.equal(s.getItem('vh-ship-id'),'before');assert.equal(s.getItem('stam-cloud-restore-v1'),null);
});
