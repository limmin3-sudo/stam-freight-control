import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startLogService} from '../integration/log/live-server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const dir=await mkdtemp(join(tmpdir(),'stam-account-browser-'));
const file=join(dir,'synthetic.log');await writeFile(file,'');
const service=await startLogService({file});
const browser=await chromium.launch({...(process.env.STAM_CHROMIUM_PATH?{executablePath:process.env.STAM_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],remote=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!==new URL(service.url).origin)remote.push(r.url());});
 await page.goto(service.url);await page.waitForFunction(()=>document.querySelector('#workspace-login b'));
 await page.getByRole('button',{name:'운항 기록 · 누적 통계',exact:true}).click();
 assert.match(await page.locator('.history-dialog[open]').innerText(),/예상 이동은 완료 기록이나 수입으로 저장되지 않습니다/);
 await page.locator('.history-dialog[open] [data-close]').click();assert.deepEqual(remote,[]);
 // Supply a Firebase-shaped mock. No requests or writes to a real account.
 const result=await page.evaluate(async()=>{
  const {createAccount}=await import('/account-core.mjs');const {createHistory}=await import('/history-core.mjs');
  const {snapshot}=await import('/sync.mjs');
  const {flightSync}=await import('/integration/log/flight-sync.mjs');
  document.querySelectorAll('.account-dialog,.history-dialog').forEach(d=>d.remove());
  const sleep=()=>new Promise(r=>setTimeout(r,30));
  const results=[];const check=(condition,label)=>{if(!condition)throw Error(label);results.push(label);};
  function fixture({local={},cloud={},stamp=10,meta=null,failRead=false,race=false,adapter=null}={}){
   localStorage.clear();for(const [key,value] of Object.entries(local))localStorage.setItem(key,value);
   if(meta)localStorage.setItem('vh-account-meta',JSON.stringify(meta));
   let authChanged,readsFail=failRead,remoteStamp=stamp,reloads=0,commits=0,transactionStarted=false,release,hold=false;
   const data={...cloud},deleted=[],notes=[];
   const f={auth:{},db:{},doc:(...parts)=>parts.filter(x=>typeof x==='string').join('/'),collection:(...parts)=>parts.filter(x=>typeof x==='string').join('/'),
    onAuthStateChanged:(auth,cb)=>{authChanged=cb;return()=>{authChanged=null;}},
    getDocFromServer:async()=>{if(readsFail)throw Error('offline');return {data:()=>({updatedAt:remoteStamp})};},
    getDocsFromServer:async ref=>{if(readsFail)throw Error('offline');return {forEach:fn=>{if(ref.endsWith('/state'))Object.entries(data).forEach(([id,value])=>fn({id,data:()=>({value,updatedAt:stamp})}));}};},
    runTransaction:async(db,fn)=>{transactionStarted=true;if(hold)await new Promise(r=>release=r);if(race)remoteStamp+=100;
     const ops=[];const tx={get:async()=>({data:()=>({updatedAt:remoteStamp})}),set:(ref,value)=>ops.push(['set',ref,value]),delete:ref=>ops.push(['delete',ref])};
     const out=await fn(tx);for(const [op,ref,value] of ops){if(ref.includes('/state/')){const key=ref.split('/').at(-1);if(op==='delete'){delete data[key];deleted.push(key);}else data[key]=value.value;}else if(ref==='users/A')remoteStamp=value.updatedAt;}commits++;return out;},
    signOut:async()=>authChanged?.(null),query:ref=>ref,orderBy:()=>{},limit:()=>{}};
   f.getDocs=f.getDocsFromServer;
   const button=document.createElement('button');document.body.append(button);
   const api=createAccount(button,{syncAdapter:adapter,loadFirebase:async()=>f,reloadPage:()=>reloads++,notify:t=>notes.push(t)});
   return {button,api,data,deleted,notes,signIn:async()=>{await button.onclick();await authChanged({uid:'A',displayName:'Test Captain'});},
    fail:v=>readsFail=v,hold:()=>hold=true,release:()=>release?.(),get commits(){return commits},get reloads(){return reloads},get started(){return transactionStarted},
    dispose:()=>{api.dispose();button.remove();}};
  }
  let extra=fixture({adapter:flightSync,cloud:{'stam-flight-completions':JSON.stringify({version:1,records:[{missionId:'11111111-1111-4111-8111-111111111111',at:'2026-11-04T10:00:00.000Z'}]})}});await extra.signIn();check(extra.reloads===1&&JSON.parse(localStorage.getItem('stam-completions-v1:A')).records.length===1,'new flight state restores to signed-in scope');extra.dispose();
  const old={'vh-ship-id':'misc-hull-b','vh-start':'legacy-place','sfc-voice':'aide','vh-recipes':'{"keep":true}','sfc-history':'[{"id":"old","reward":322500,"ship":"Hull B","missions":[{}],"scu":50}]'};
  let x=fixture({cloud:old});await x.signIn();check(x.reloads===1,'cloud restore reload requested');
  check(localStorage.getItem('sfc-history')===old['sfc-history']&&localStorage.getItem('vh-recipes')===old['vh-recipes'],'old history and recipes preserved');check(x.commits===0,'restore does not write cloud');x.dispose();
  x=fixture({local:old,cloud:{...old,'future-key':'KEEP'},meta:{uid:'A',lastSyncedAt:10,lastSnap:old},failRead:true});await x.signIn();
  check(x.button.textContent.includes('연결 확인 필요')&&!x.button.textContent.includes('동기화됨'),'read failure never shown as synced');
  check(x.commits===0,'read failure cannot upload');x.fail(false);await x.signIn();check(x.button.textContent.includes('동기화됨'),'retry restores sync state');
  localStorage.setItem('stam-log-account-settings-v1',JSON.stringify({shipId:'ship-new',rawLog:'PRIVATE',token:'PRIVATE',partner:'operator'}));
  await x.signIn();check(x.commits===1,'changed planning preferences uploaded');
  check(!JSON.stringify(x.data).includes('PRIVATE')&&x.data['future-key']==='KEEP','allowlist excludes log and token and preserves unknown cloud keys');
  check(x.data['sfc-history']===old['sfc-history'],'preference upload leaves history intact');x.dispose();
  x=fixture({local:{...old,'vh-start':'local-change'},cloud:{...old,'vh-start':'remote-change'},stamp:20,meta:{uid:'A',lastSyncedAt:10,lastSnap:old}});await x.signIn();
  check(x.button.textContent.includes('동기화 멈춤')&&x.commits===0,'two-device conflict pauses without overwrite');
  document.querySelector('.account-dialog [data-act=use-cloud]').click();await sleep();check(localStorage.getItem('vh-start')==='remote-change','explicit remote selection restores');x.dispose();
  x=fixture({local:{...old,'vh-start':'local-change'},cloud:old,meta:{uid:'A',lastSyncedAt:10,lastSnap:old},race:true});await x.signIn();
  check(x.commits===0&&x.button.textContent.includes('동기화 멈춤'),'transaction prevents write after concurrent device update');x.dispose();
  // A delete of the last state document is still visible through the root stamp.
  x=fixture({local:old,cloud:{},stamp:20,meta:{uid:'A',lastSyncedAt:10,lastSnap:old}});await x.signIn();check(!localStorage.getItem('sfc-history')&&x.reloads===1,'root stamp detects remote deletion');x.dispose();
  // Reopening an unresolved first-login choice must not enable periodic uploads.
  x=fixture({local:old});await x.signIn();check(x.commits===0&&x.button.textContent.includes('동기화 멈춤'),'first login waits for choice');
  document.querySelector('.account-dialog').close();await x.button.onclick();check(!!document.querySelector('.account-dialog [data-act=use-local]'),'closing dialog preserves pending choice');
  document.querySelector('.account-dialog [data-act=use-local]').click();await sleep();check(x.commits===1,'explicit first upload succeeds');
  localStorage.setItem('vh-start','changed-after-login');await x.signIn();await x.button.onclick();document.querySelector('.account-dialog [data-act=sign-out]').click();await sleep();
  check(localStorage.getItem('vh-start')===old['vh-start']&&!localStorage.getItem('vh-account-meta'),'logout restores guest snapshot');x.dispose();
  // A deferred write cannot overlap another save/logout.
  x=fixture({local:old,cloud:old,meta:{uid:'A',lastSyncedAt:10,lastSnap:old}});await x.signIn();x.hold();localStorage.setItem('vh-start','slow');
  const task=x.signIn();await sleep();check(x.started&&x.button.textContent.includes('저장 중'),'in-flight write shown as saving');x.release();await task;x.dispose();
  localStorage.clear();localStorage.setItem('sfc-history',old['sfc-history']);localStorage.setItem('vh-recipes',old['vh-recipes']);
  const history=createHistory(null);history.open();check(document.querySelector('.history-dialog:last-of-type').textContent.includes('322,500'),'history totals render existing records');
  window.confirm=()=>false;check(history.reset()===false&&localStorage.getItem('sfc-history')===old['sfc-history'],'reset cancellation preserves history');
  window.confirm=()=>true;check(history.reset()===true&&localStorage.getItem('sfc-history')==='[]'&&localStorage.getItem('vh-recipes')===old['vh-recipes'],'reset affects completed history only');
  return results;
 });
 await page.locator('dialog[open]').evaluateAll(nodes=>nodes.forEach(n=>n.close()));
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);

 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);console.log(JSON.stringify({passed:true,checks:result,guestExternalRequests:remote.length,errors,mobileOverflow:false}));
}finally{await browser.close();await service.close();await rm(dir,{recursive:true,force:true});}
