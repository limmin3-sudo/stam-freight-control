import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlanChoiceStore,checkedChoices} from '../integration/log/plan-choice-store.mjs';
import {createPlanSelection} from '../integration/log/preview-session.mjs';
import {snapshot as cloudSnapshot} from '../sync.mjs';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
function memory(){const values=new Map();return {values,getItem:k=>values.get(k)||null,setItem(k,v){values.set(k,v);}};}
const contract=id=>({missionId:id,status:'acceptance-observed'}),ready=new Set([a,b]);
test('deferred/excluded/awaiting choices restore only when that exact contract is observed, never from title or type',()=>{
 const storage=memory(),s=createPlanSelection(12,{store:createPlanChoiceStore(storage)});s.reconcile([contract(a)],ready);s.reconcile([contract(a),contract(b)],ready,{autoSelect:false});
 let r=createPlanSelection(12,{store:createPlanChoiceStore(storage)});assert.equal(r.selected.size,0);assert.ok(r.awaiting.has(b));r.reconcile([contract(a)],ready);assert.deepEqual([...r.selected],[a]);
 r.defer(b);r=createPlanSelection(12,{store:createPlanChoiceStore(storage)});r.reconcile([contract(a),contract(b)],ready);assert.ok(r.deferred.has(b));assert.deepEqual([...r.selected],[a]);
 r.set(b,true);r=createPlanSelection(12,{store:createPlanChoiceStore(storage)});r.reconcile([contract(a),{...contract(b),status:'end-observed'}],ready);assert.deepEqual([...r.selected],[a]);
 r.set(a,false);r=createPlanSelection(12,{store:createPlanChoiceStore(storage)});r.reconcile([contract(a)],ready);assert.equal(r.selected.size,0);
 assert.deepEqual(cloudSnapshot(storage),{});
});
test('choice records are account-scoped, storage failure is atomic and competing windows cannot overwrite choices',()=>{
 const storage=memory(),guest=createPlanChoiceStore(storage),other=createPlanChoiceStore(storage);guest.save([{id:a,choice:'deferred'}]);assert.throws(()=>other.save([{id:b,choice:'deferred'}]),/다른 창/);
 const s=createPlanSelection(12,{store:guest});const previous=storage.getItem('stam-plan-choices-v1:guest');storage.setItem=()=>{throw Error('quota');};assert.throws(()=>s.set(a,true),/저장하지/);assert.ok(s.deferred.has(a));assert.equal(storage.getItem('stam-plan-choices-v1:guest'),previous);
 storage.values.set('vh-account-meta',JSON.stringify({uid:'another-user'}));assert.match(guest.snapshot().error,/계정/);assert.throws(()=>guest.reset(),/계정/);assert.deepEqual(createPlanChoiceStore(storage).snapshot().choices,[]);
});
test('corrupt or oversized records block automatic selection until explicit reset without erasing cargo settings',()=>{
 const storage=memory();storage.setItem('stam-plan-choices-v1:guest','broken');storage.setItem('vh-settings','{"disabledGrids":{"ship":[0]}}');const s=createPlanSelection(12,{store:createPlanChoiceStore(storage)});s.reconcile([contract(a)],ready);assert.equal(s.selected.size,0);assert.ok(s.status().error);
 s.resetSaved();s.reconcile([contract(a)],ready);assert.ok(s.selected.has(a));assert.equal(storage.getItem('vh-settings'),'{"disabledGrids":{"ship":[0]}}');
 for(const rows of [[{id:[a],choice:'deferred'}],[{id:'bad',choice:'deferred'}],[{id:a,choice:'invented'}],[{id:a,choice:'deferred',log:'private'}],[{id:a,choice:'deferred'},{id:a,choice:'excluded'}],Array(2049).fill({id:a,choice:'deferred'})])assert.throws(()=>checkedChoices(rows));
});
test('offline replay and view clearing neither apply nor overwrite saved live choices',()=>{
 const storage=memory(),store=createPlanChoiceStore(storage);store.save([{id:a,choice:'deferred'}]);const raw=storage.getItem('stam-plan-choices-v1:guest');
 const s=createPlanSelection(12,{store,persistent:false});s.reconcile([contract(a)],ready);assert.ok(s.selected.has(a));s.set(a,true);s.defer(b);s.clear();assert.equal(storage.getItem('stam-plan-choices-v1:guest'),raw);
 s.useSaved(true);s.reconcile([contract(a),contract(b)],ready);assert.ok(s.deferred.has(a));assert.equal(s.selected.has(a),false);assert.ok(s.selected.has(b));
});

test('manual contract exclusions and deferred choices persist alongside log contracts',()=>{
 const storage=memory(),manual='manual:'+a,c={missionId:manual,status:'user-entered'},readyIds=new Set([manual]);
 let selection=createPlanSelection(12,{store:createPlanChoiceStore(storage)});selection.reconcile([c],readyIds);
 assert.ok(selection.selected.has(manual));selection.defer(manual);
 selection=createPlanSelection(12,{store:createPlanChoiceStore(storage)});selection.reconcile([c],readyIds);
 assert.equal(selection.selected.size,0);assert.ok(selection.deferred.has(manual));
 selection.set(manual,false);selection=createPlanSelection(12,{store:createPlanChoiceStore(storage)});
 selection.reconcile([c],readyIds);assert.equal(selection.selected.size,0);
 assert.deepEqual(createPlanChoiceStore(storage).snapshot().choices,[{id:manual,choice:'excluded'}]);
});
