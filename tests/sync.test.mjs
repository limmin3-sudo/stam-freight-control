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

test('edit history describes what changed in plain words', async ()=>{
  const {describeChanges}=await import('../sync.mjs');
  const m1={id:'M1',company:'레드 윈드',title:'중형 계약',reward:1},m2={id:'M2',company:'링 가문',title:'소량 화물'};
  const prev={'vh-missions':JSON.stringify([m1]),'vh-ship-id':'misc-hull-b','sfc-run':JSON.stringify({index:1,started:true})};
  const next={'vh-missions':JSON.stringify([{...m1,reward:2},m2]),'vh-ship-id':'drake-caterpillar','sfc-run':JSON.stringify({index:2,started:true}),'sfc-history':JSON.stringify([{id:'r1',ship:'MISC Hull B',missions:[{}],reward:476500}]),'vh-recipes':'{}'};
  const out=describeChanges(prev,next,{shipName:id=>({'misc-hull-b':'MISC Hull B','drake-caterpillar':'Drake Caterpillar'})[id]});
  assert.deepEqual(out,['미션 추가: 링 가문 소량 화물','미션 수정: 레드 윈드 중형 계약','상자 구성 저장·수정','함선 변경: MISC Hull B → Drake Caterpillar','운항 진행: 2번째 거점 완료','운항 기록 추가: MISC Hull B 계약 1건 (+476,500 aUEC)']);
  assert.deepEqual(describeChanges(next,next),[]);
});
