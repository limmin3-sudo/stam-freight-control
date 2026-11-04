import test from 'node:test';import assert from 'node:assert/strict';
import {exportFlightBackup,restoreFlightBackup,validateFlightBackup,recoverFlightBackup,BACKUP_JOURNAL} from '../integration/log/flight-backup.mjs';
import {createManualDrafts} from '../integration/log/manual-drafts.mjs';
import {createPreviewSession} from '../integration/log/preview-session.mjs';
const memory=()=>{const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
const contract={missionId:'11111111-1111-4111-8111-111111111111',definitionId:'definition',gameBuild:{status:'known',value:1}};
test('backup restores current owner only and excludes account credentials and pairing keys',()=>{
 const a=memory(),b=memory();a.setItem('vh-ship-id','misc-hull-b');a.setItem('stam-local-log-pairing','private');a.setItem('vh-account-meta',JSON.stringify({uid:'alice'}));
 const drafts=createManualDrafts(a);drafts.save(contract,[{scu:32,pickupId:'a',dropoffId:'b'}]);
 const file=exportFlightBackup(a);assert.ok(!JSON.stringify(file).includes('alice'));assert.ok(!JSON.stringify(file).includes('private'));
 b.setItem('vh-account-meta',JSON.stringify({uid:'bob'}));b.setItem('stam-cargo-continuity-v1:alice','untouched');restoreFlightBackup(b,file,'bob');
 assert.equal(b.getItem('vh-ship-id'),'misc-hull-b');assert.equal(createManualDrafts(b).lookup(contract)[0].scu,32);assert.equal(b.getItem('stam-cargo-continuity-v1:alice'),'untouched');assert.equal(b.getItem(BACKUP_JOURNAL),null);
 assert.throws(()=>restoreFlightBackup(b,file,'alice'),/계정/);
});
test('invalid backups fail before changing data; failed restore rolls back the previous snapshot',()=>{
 const s=memory();s.setItem('vh-ship-id','before');const file=exportFlightBackup(s);file.settings['vh-ship-id']='after';
 assert.throws(()=>validateFlightBackup(JSON.stringify({...file,flight:{unknown:{}}})),/지원/);
 const write=s.setItem;let failed=false;s.setItem=(k,v)=>{if(k==='vh-ship-id'&&v==='after'&&!failed){failed=true;throw Error('quota');}return write(k,v);};
 assert.throws(()=>restoreFlightBackup(s,file),/이전 기록/);assert.equal(s.getItem('vh-ship-id'),'before');assert.equal(s.getItem(BACKUP_JOURNAL),null);
 s.setItem(BACKUP_JOURNAL,JSON.stringify({version:1,owner:'guest',before:{'stam-local-log-pairing':'bad'}}));assert.throws(()=>recoverFlightBackup(s),/형식/);
});
test('manual drafts persist entered fields but never restore a confirmation or another definition',()=>{
 const s=memory(),draft=createManualDrafts(s);draft.save(contract,[{scu:4,pickupId:'x',dropoffId:'y'}]);const restored=createManualDrafts(s);
 assert.equal(restored.lookup(contract)[0].scu,4);assert.deepEqual(restored.lookup({...contract,definitionId:'changed'}),[]);
 assert.ok(!JSON.stringify(restored.snapshot()).includes('confirmed'));assert.throws(()=>draft.save(contract,[{scu:Infinity,pickupId:'x',dropoffId:'y'}]));
});
test('saved-log replay cannot read or change a live allocation draft',()=>{
 const s=memory(),live=createPreviewSession(s);live.guidanceEnabled=true;live.observe(contract);
 live.saveDraft(contract.missionId,{rows:[{scu:4,pickupId:'x',dropoffId:'y'}],confirmed:true});
 const before=s.getItem('stam-manual-drafts-v1:guest'),replay=createPreviewSession(s);
 replay.observe(contract);assert.deepEqual(replay.draft(contract.missionId).rows,[]);
 replay.saveDraft(contract.missionId,{rows:[{scu:8,pickupId:'a',dropoffId:'b'}],confirmed:true});
 assert.equal(s.getItem('stam-manual-drafts-v1:guest'),before);
 const resumed=createPreviewSession(s);resumed.guidanceEnabled=true;resumed.observe(contract);
 assert.equal(resumed.draft(contract.missionId).rows[0].scu,4);assert.equal(resumed.draft(contract.missionId).confirmed,false);
});
