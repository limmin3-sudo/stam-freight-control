import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewSession} from '../integration/log/preview-session.mjs';

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
