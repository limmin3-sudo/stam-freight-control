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
test('planning preferences persist while unconfirmed allocation drafts stay in memory', () => {
  const values=new Map();
  const storage = {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  const a = createPreviewSession(storage);
  a.setPreferences({shipId:'ship',startId:'start',partner:'operator'});
  a.setDisabled('ship',['grid-2']);
  a.observe({missionId:'private-id'}); a.saveDraft('private-id',{confirmed:true,rows:[{scu:12}]});
  const b = createPreviewSession(storage);
  assert.deepEqual(b.preferences,a.preferences);
  assert.equal(b.draft('private-id').confirmed,false);
  assert.ok(!JSON.stringify([...values]).includes('private-id'));
  b.setDisabled('other',['grid-1']); assert.deepEqual(b.preferences.disabled.ship,['grid-2']);
  const denied = createPreviewSession({getItem(){throw Error();},setItem(){throw Error();}});
  assert.doesNotThrow(()=>denied.setPreferences({startId:'p'}));
});

test('account preferences restore independently of device quality and never leak across account snapshots',async()=>{
 const {snapshot,applySnapshot}=await import('../sync.mjs');
 const {PLANNING_KEY}=await import('../planning-preferences.mjs');
 const values=new Map([['vh-ship-id','legacy-ship'],['vh-start','legacy-start'],['sfc-voice','aide'],['vh-settings',JSON.stringify({disabledGrids:{'legacy-ship':['g2']}})],['sfc-history','[{"id":"old-run"}]']]);
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const guest=snapshot(storage),session=createPreviewSession(storage);
 assert.equal(session.preferences.shipId,'legacy-ship');assert.equal(session.preferences.partner,'operator');
 assert.deepEqual(session.preferences.disabled,{'legacy-ship':['g2']});
 session.setPreferences({shipId:'new-ship',mapQuality:'high'});
 session.observe({missionId:'SECRET'});session.saveDraft('SECRET',{rows:[{secret:true}],confirmed:true});
 const cloud=snapshot(storage);assert.equal(cloud['sfc-history'],guest['sfc-history']);assert.equal(cloud['vh-ship-id'],'legacy-ship');
 assert.ok(!JSON.stringify(cloud).includes('SECRET'));assert.ok(!cloud[PLANNING_KEY].includes('mapQuality'));
 applySnapshot(storage,{[PLANNING_KEY]:JSON.stringify({shipId:'account-B',partner:'navigator'})});
 assert.equal(createPreviewSession(storage).preferences.shipId,'account-B');
 applySnapshot(storage,guest);
 const restored=createPreviewSession(storage);assert.equal(restored.preferences.shipId,'legacy-ship');assert.equal(restored.preferences.mapQuality,'high');
 applySnapshot(storage,{});assert.equal(createPreviewSession(storage).preferences.shipId,'');
});
test('untrusted planning cloud fields are allowlisted on restore and upload',async()=>{
 const {PLANNING_KEY}=await import('../planning-preferences.mjs');const {cleanValue}=await import('../sync.mjs');
 const clean=JSON.parse(cleanValue(PLANNING_KEY,JSON.stringify({shipId:'valid',rawLog:'SECRET',token:'SECRET',mapQuality:'high',disabled:{ship:['g'],invalid:[{}]}})));
 assert.deepEqual(clean,{shipId:'valid',startId:'',partner:'navigator',disabled:{ship:['g']}});
 assert.equal(cleanValue(PLANNING_KEY,'broken'),null);
});
