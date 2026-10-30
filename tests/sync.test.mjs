import test from 'node:test';
import assert from 'node:assert/strict';
import {SYNC_KEYS,snapshot,decideOnLogin,changedKeys,remoteIsNewer,applySnapshot,usernameProblem,usernameEmail,cleanValue} from '../sync.mjs';

const mem=(init={})=>{const m=new Map(Object.entries(init));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),dump:()=>Object.fromEntries(m)};};

test('only player data is synced; device settings and screenshot thumbnails stay local', ()=>{
  const s=mem({'vh-missions':JSON.stringify([{id:'M1',_sourcePreview:'data:image/jpeg;base64,AAAA',cargo:[]}]),'vh-map-quality':'ultra','vh-api':'https://x','vh-recipes':'{}'});
  const snap=snapshot(s);
  assert.deepEqual(Object.keys(snap).sort(),['vh-missions','vh-recipes']);
  assert.ok(!snap['vh-missions'].includes('_sourcePreview'));
  assert.equal(cleanValue('vh-recipes','x'.repeat(950000)),null,'oversized values are not uploaded');
});

test('first sign-in never overwrites silently', ()=>{
  const a={'vh-missions':'[1]'},b={'vh-missions':'[2]'};
  assert.equal(decideOnLogin({},{}),'same');
  assert.equal(decideOnLogin(a,{}),'offer-upload');
  assert.equal(decideOnLogin({},b),'pull');
  assert.equal(decideOnLogin({'sfc-voice':'aide'},b),'pull','a partner choice alone is not data worth keeping');
  assert.equal(decideOnLogin(a,b),'ask');
  assert.equal(decideOnLogin(a,{...a}),'same');
});

test('changes, remote newer check and applying a snapshot', ()=>{
  assert.deepEqual(changedKeys({'vh-mode':'simple'},{'vh-mode':'detail','vh-start':'x'}),['vh-start','vh-mode'].sort((a,b)=>SYNC_KEYS.indexOf(a)-SYNC_KEYS.indexOf(b)));
  assert.equal(remoteIsNewer(200,100),true);assert.equal(remoteIsNewer(100,100),false);
  const s=mem({'vh-missions':'[old]','vh-map-quality':'ultra'});applySnapshot(s,{'vh-recipes':'{}'});
  assert.deepEqual(s.dump(),{'vh-map-quality':'ultra','vh-recipes':'{}'},'account switch replaces player data but keeps device settings');
});

test('ID sign-up rules', ()=>{
  assert.equal(usernameProblem('Captain_01'),'');assert.match(usernameProblem('ab'),/3~20/);assert.match(usernameProblem('한글아이디'),/영문/);
  assert.equal(usernameEmail(' Captain_01 '),'captain_01@id.stam-freight-control.app');
});
