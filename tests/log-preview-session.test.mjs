import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewSession,createPlanSelection} from '../integration/log/preview-session.mjs';

test('unrelated log changes preserve order confirmation, changed evidence keeps inputs but revokes confirmation', () => {
  const session = createPreviewSession();
  const a = {missionId:'a', markerObservations:[{position:[1,2,3]}]};
  session.observe(a);
  session.saveDraft('a',{confirmed:true,rows:[{scu:12,pickupId:'p',dropoffId:'d'}]});
  session.observe({missionId:'b'});
  assert.equal(session.observe(structuredClone(a)), false);
  assert.equal(session.draft('a').confirmed, true);
  assert.equal(session.observe({...a,quantityObservations:[{total:24}]}), true);
  assert.equal(session.draft('a').confirmed, false);
  assert.deepEqual(session.draft('a').rows,[{scu:12,pickupId:'p',dropoffId:'d'}]);
});
test('ready contracts auto-select once, manual exclusion survives polling and same types stay separate',()=>{
 const selection=createPlanSelection();
 const contracts=['a','b','c'].map(missionId=>({missionId,status:'acceptance-observed',conflicts:[],participation:{state:'acceptance-observed'}}));
 selection.reconcile(contracts,new Set(['a','b']));
 assert.deepEqual([...selection.selected],['a','b']);
 selection.set('a',false);selection.reconcile(contracts,new Set(['a','b','c']));
 assert.deepEqual([...selection.selected],['b','c']);
 // Changed evidence must block the selected set, not silently drop a contract.
 selection.reconcile(contracts,new Set(['c']));assert.ok(selection.selected.has('b'));
 contracts[1].status='end-observed';selection.reconcile(contracts,new Set(['b','c']));
 assert.deepEqual([...selection.selected],['c']);
 selection.set('b',true);selection.reconcile(contracts,new Set(['b','c']));
 assert.ok(selection.selected.has('b')); // explicitly chosen historical demand
});
test('auto-selection excludes candidates, ended, left and conflicted records and obeys the worker limit',()=>{
 const selection=createPlanSelection(2);
 const contracts=[{missionId:'candidate',status:'acceptance-unconfirmed'},
 {missionId:'ended',status:'end-observed'},
 {missionId:'left',status:'acceptance-observed',participation:{state:'left-observed'}},
 {missionId:'conflict',status:'acceptance-observed',conflicts:['definition-conflict']},
 ...['a','b','c'].map(missionId=>({missionId,status:'participation-observed'}))];
 selection.reconcile(contracts,new Set(contracts.map(c=>c.missionId)));
 assert.deepEqual([...selection.selected],['a','b']);
 selection.reconcile(contracts.filter(c=>c.missionId!=='a'),new Set(['b','c']));
 assert.deepEqual([...selection.selected],['b','c']);
 selection.clear();assert.equal(selection.selected.size,0);
});
test('only ship, grids, partner and start persist; contract drafts never enter storage', () => {
  let saved;
  const storage = {getItem:()=>saved,setItem:(k,v)=>{saved=v;}};
  const a = createPreviewSession(storage);
  a.setPreferences({shipId:'ship',startId:'start',partner:'operator'});
  a.setDisabled('ship',['grid-2']);
  a.observe({missionId:'private-id'}); a.saveDraft('private-id',{confirmed:true,rows:[{scu:12}]});
  const b = createPreviewSession(storage);
  assert.deepEqual(b.preferences,a.preferences);
  assert.equal(b.draft('private-id').confirmed,false);
  assert.ok(!saved.includes('private-id'));
  b.setDisabled('other',['grid-1']); assert.deepEqual(b.preferences.disabled.ship,['grid-2']);
  const denied = createPreviewSession({getItem(){throw Error();},setItem(){throw Error();}});
  assert.doesNotThrow(()=>denied.setPreferences({startId:'p'}));
});
