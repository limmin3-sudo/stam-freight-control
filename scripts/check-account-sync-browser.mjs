// Synthetic Firebase interception: no real account/backend calls.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {emptyDraft,samples} from '../apps/control-room/src/mission-trial.ts';
import {calculateFlight} from '../apps/control-room/src/flight-engine.mjs';
import {blankRun,startRun,completeStep} from '../apps/control-room/src/flight-session.ts';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5188/',out=process.env.STAM_QA_OUTPUT||'/tmp/stam-account-check';await mkdir(out,{recursive:true});
const F='stam.control-room.flight.v1',P='stam.control-room.flight.previous.v1',O='stam.flight-owner.v1',M='vh-account-meta';
const archive=o=>'stam.flight-archive.v1:'+encodeURIComponent(o),pack=(flight,previous)=>JSON.stringify({version:1,values:{[F]:flight,[P]:previous}});
function fixture(i){const draft={...emptyDraft(),partner:'navigator',partnerSelected:true,jobs:[samples[i]]},plan=calculateFlight(draft);const run=completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000);run.since=null;return JSON.stringify({version:1,draft,plan,run});}
const flights=[fixture(0),fixture(1),fixture(2)];
const sdk=`
export const getApps=()=>[{}],initializeApp=()=>({}),getAuth=()=>({}),getFirestore=()=>({});
export function onAuthStateChanged(a,cb){window.__qaAuth=cb;queueMicrotask(()=>{const uid=sessionStorage.getItem('qa-uid');cb(uid?{uid,email:uid+'@id.stam-freight-control.app'}:null)});return ()=>{};}
export async function signOut(){sessionStorage.removeItem('qa-uid');window.__qaAuth?.(null);}
export const collection=(root,...path)=>({path:[...(root.path||[]),...path]});
export const doc=(root,...path)=>({path:[...(root.path||[]),...(path.length?path:['change-'+Math.random()])]});
export const query=r=>r,orderBy=()=>null,limit=()=>null;
export async function getDocs(ref){const rows=await window.qaDb({kind:'list',path:ref.path});return {forEach:cb=>rows.forEach(row=>cb({id:row.id,data:()=>row.data}))};}
export async function getDoc(ref){const data=await window.qaDb({kind:'get',path:ref.path});return {data:()=>data,exists:()=>!!data};}
export async function runTransaction(db,fn){for(let i=0;i<5;i++){const ops=[];let expected,path;const result=await fn({get:async ref=>{const d=await window.qaDb({kind:'transaction-read',path:ref.path});expected=d;path=ref.path;return{data:()=>d,exists:()=>!!d};},set:(r,value)=>ops.push({path:r.path,value}),delete:r=>ops.push({path:r.path,value:null})});if(await window.qaDb({kind:'cas',path,expected,ops}))return result;}throw Error('retry limit');}
`;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const errors=[],cloud=new Map(),writes=[];let delayedUid=null,releaseRead=null,race=false,raceReaders=[],commitDelayUid=null,releaseCommit=null;
 const record=(uid,data={})=>cloud.set(uid,{revision:1,updatedAt:100,data});
 for(const uid of ['a','b','adopt'])record(uid,{'vh-missions':JSON.stringify([{id:uid,cargo:[]}])});
 async function backend(req){
  const uid=req.path?.[1],r=cloud.get(uid)||{revision:0,updatedAt:0,data:{}};
  if(req.kind==='get'&&uid===delayedUid){delayedUid=null;await new Promise(resolve=>releaseRead=resolve);}
  if(req.kind==='get'||req.kind==='transaction-read'){
   const head={revision:r.revision,updatedAt:r.updatedAt};
   if(req.kind==='transaction-read'&&race&&uid==='race'&&raceReaders.length<2){await new Promise(resolve=>{raceReaders.push(resolve);if(raceReaders.length===2)raceReaders.forEach(fn=>fn());});}
   return head;
  }
  if(req.kind==='list')return req.path[2]==='state'?Object.entries(r.data).map(([id,value])=>({id,data:{value,updatedAt:r.updatedAt}})):[];
  if(req.kind==='cas'){
   if(uid===commitDelayUid){commitDelayUid=null;await new Promise(resolve=>releaseCommit=resolve);}
   if(req.expected.revision!==r.revision||req.expected.updatedAt!==r.updatedAt)return false;
   for(const op of req.ops){if(op.path.length===2){r.revision=op.value.revision;r.updatedAt=op.value.updatedAt;}else if(op.path[2]==='state'){if(op.value===null)delete r.data[op.path[3]];else r.data[op.path[3]]=op.value.value;}}
   cloud.set(uid,r);writes.push(uid);return true;
  }
 }
 async function setup(seed,uid,fault=false){
  const page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.exposeFunction('qaDb',backend);
  await page.route('https://www.gstatic.com/firebasejs/**',r=>r.fulfill({contentType:'text/javascript',body:sdk}));await page.route(/https:\/\/.*(googleapis\.com|firebaseio\.com).*/,r=>r.abort());
  await page.addInitScript(({seed,uid,fault})=>{if(!sessionStorage.getItem('qa-seeded')){for(const [k,v]of Object.entries(seed))localStorage.setItem(k,v);if(uid)sessionStorage.setItem('qa-uid',uid);sessionStorage.setItem('qa-seeded','1');}localStorage.setItem('vh-map-quality','normal');if(fault){const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===localStorage&&k==='vh-account-meta'&&!sessionStorage.getItem('qa-fault-hit')){sessionStorage.setItem('qa-fault-hit','1');throw Error('synthetic quota');}return original.call(this,k,v);};}},{seed,uid,fault});
  await page.goto(base+'#/mission?lang=ko');return page;
 }
 const metadata=(uid,data)=>JSON.stringify({uid,revision:1,lastSyncedAt:100,lastSnap:data});
 const get=(p,key)=>p.evaluate(k=>localStorage.getItem(k),key);
 const waitOwner=(p,owner)=>p.waitForFunction(({O,owner})=>localStorage.getItem(O)===owner,{O,owner});
 async function auth(p,uid){await p.evaluate(uid=>{if(uid)sessionStorage.setItem('qa-uid',uid);else sessionStorage.removeItem('qa-uid');window.__qaAuth?.(uid?{uid,email:uid+'@id.stam-freight-control.app'}:null);},uid);}
 const a=cloud.get('a').data;
 const page=await setup({...a,[O]:'account:a',[M]:metadata('a',a),[F]:flights[0],[P]:'A previous',[archive('account:b')]:pack(flights[1],'B previous'),[archive('guest')]:pack(flights[2],'guest previous')},'b');
 await waitOwner(page,'account:b');await page.waitForLoadState('domcontentloaded');assert.equal(await get(page,F),flights[1]);assert.equal(await get(page,P),'B previous');assert.equal(JSON.parse(await get(page,archive('account:a'))).values[F],flights[0]);
 await page.locator('.pilot-account').click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await waitOwner(page,'guest');await page.waitForLoadState('domcontentloaded');assert.equal(await get(page,F),flights[2]);assert.equal(await get(page,P),'guest previous');
 await page.evaluate(()=>sessionStorage.setItem('qa-uid','a'));await page.locator('.pilot-account').click();await page.getByRole('button',{name:'따로 보관하고 계속',exact:true}).click();
 const cloudChoice=page.getByRole('button',{name:'계정 데이터 불러오기',exact:true});if(await cloudChoice.isVisible())await cloudChoice.click();await waitOwner(page,'account:a');assert.equal(await get(page,F),flights[0]);assert.equal(await get(page,P),'A previous');
 await page.screenshot({path:out+'/account-a-restored.png'});await page.close();
 // Storage failure must roll back both current/previous flight and account metadata.
 const failure=await setup({...a,[O]:'account:a',[M]:metadata('a',a),[F]:flights[0],[P]:'quota previous'},'b',true);
 await failure.waitForFunction(()=>sessionStorage.getItem('qa-fault-hit')==='1');
 assert.equal(await get(failure,F),flights[0]);assert.equal(await get(failure,P),'quota previous');assert.equal(await get(failure,O),'account:a');assert.equal(JSON.parse(await get(failure,M)).uid,'a');assert.equal(await get(failure,'stam.account-storage-journal.v1'),null);await failure.close();
 // Migration cannot claim a pre-existing, unowned flight without an explicit choice.
 const migration=await setup({[F]:flights[0],[P]:'unassigned previous',[M]:metadata('adopt',cloud.get('adopt').data),...cloud.get('adopt').data},'adopt');
 await migration.getByRole('button',{name:'이 운항을 계정에 연결',exact:true}).waitFor();assert.equal(await get(migration,O),'unassigned');assert.equal(await get(migration,F),flights[0]);
 await migration.getByRole('button',{name:'이 운항을 계정에 연결',exact:true}).click();await waitOwner(migration,'account:adopt');assert.equal(await get(migration,F),flights[0]);assert.equal(JSON.parse(await get(migration,archive('unassigned'))).values[P],'unassigned previous');await migration.close();
 // A delayed read for B cannot apply after authentication has already returned to A.
 delayedUid='b';const delayed=await setup({...a,[O]:'account:a',[M]:metadata('a',a),[F]:flights[0],[P]:'late previous'},'b');
 await delayed.waitForFunction(()=>typeof window.__qaAuth==='function');
 for(let n=0;n<200&&!releaseRead;n++)await new Promise(r=>setTimeout(r,20));assert(releaseRead);
 await delayed.getByText('계정 자료가 변경되었거나 확인 중입니다. 확인을 마친 뒤 새로고침하세요. 현재 화면의 운항은 백업할 수 있습니다.',{exact:true}).waitFor();
 await auth(delayed,'a');releaseRead();await delayed.waitForFunction(()=>document.querySelector('.pilot-account')?.textContent.includes('a'));
 await delayed.waitForTimeout(150);assert.equal(await get(delayed,O),'account:a');assert.equal(await get(delayed,F),flights[0]);assert.equal(JSON.parse(await get(delayed,M)).uid,'a');await delayed.close();
 // A submitted write can finish for its original UID, but may not acknowledge into a new login.
 record('late',{'vh-missions':'[]'});commitDelayUid='late';
 const late=await setup({[O]:'account:late',[M]:metadata('late',{'vh-missions':'[]'}),'vh-missions':'[{"id":"unsaved","cargo":[]}]',[F]:flights[0]},'late');
 for(let n=0;n<200&&!releaseCommit;n++)await new Promise(r=>setTimeout(r,20));assert(releaseCommit);
 releaseRead=null;delayedUid='b';await auth(late,'b');
 for(let n=0;n<200&&!releaseRead;n++)await new Promise(r=>setTimeout(r,20));assert(releaseRead);releaseCommit();
 for(let n=0;n<200&&!writes.includes('late');n++)await new Promise(r=>setTimeout(r,20));await late.waitForTimeout(150);
 assert.equal(JSON.parse(await get(late,M)).revision,1,'late save must not acknowledge during another login');releaseRead();await waitOwner(late,'account:b');assert.equal(JSON.parse(await get(late,M)).uid,'b');await late.close();
 // A confirmed cloud choice is stale if another device changes the head while the dialog is open.
 record('choice',{'vh-missions':'[{"id":"remote","cargo":[]}]'});
 const choice=await setup({[O]:'account:choice',[M]:JSON.stringify({uid:'choice',revision:0,lastSyncedAt:50,lastSnap:{'vh-missions':'[]'}}),'vh-missions':'[{"id":"local","cargo":[]}]',[F]:flights[0]},'choice');
 await choice.getByRole('button',{name:'다른 기기 데이터 불러오기',exact:true}).waitFor();cloud.get('choice').revision=2;cloud.get('choice').updatedAt=101;
 await choice.getByRole('button',{name:'다른 기기 데이터 불러오기',exact:true}).click();await choice.locator('.account-msg').filter({hasText:'다른 기기에서 저장 내용이 바뀌었습니다'}).waitFor();assert.equal(await get(choice,'vh-missions'),'[{"id":"local","cargo":[]}]');assert.equal(await get(choice,F),flights[0]);await choice.close();
 // Real account controller, two independent browsers, shared optimistic transaction backend.
 record('race',{'vh-missions':'[]'});race=true;
 const pages=await Promise.all(['left','right'].map(side=>setup({[O]:'account:race',[M]:metadata('race',{'vh-missions':'[]'}),'vh-missions':JSON.stringify([{id:side,cargo:[]}])},'race')));
 await Promise.all(pages.map(p=>p.waitForFunction(()=>/확인 필요|동기화 연결됨/.test(document.querySelector('.pilot-account')?.getAttribute('title')||''))));
 for(let n=0;n<200&&writes.filter(uid=>uid==='race').length===0;n++)await new Promise(r=>setTimeout(r,20));
 await Promise.all(pages.map(p=>p.waitForTimeout(200)));assert.equal(writes.filter(uid=>uid==='race').length,1);
 const metas=await Promise.all(pages.map(p=>get(p,M).then(JSON.parse)));assert.equal(metas.filter(m=>m.revision===2).length,1);assert.equal(metas.filter(m=>m.revision===1).length,1);
 assert((await Promise.all(pages.map(p=>p.locator('.pilot-account').getAttribute('title')))).some(t=>t.includes('확인 필요')));await Promise.all(pages.map(p=>p.close()));
 assert.deepEqual(errors,[]);const result={passed:true,syntheticBackend:true,realAccountRequests:0,checks:['A → B → guest → A current/previous flight isolation','failed account transition rolls back both flights and metadata','flight writes locked while account read is pending','explicit unowned flight adoption and original backup retention','late account read ignored after UID change','late save cannot acknowledge into a changed login','stale confirmed cloud choice preserves local data','two devices: exactly one concurrent transaction accepted'],pageErrors:errors};await writeFile(out+'/browser-check.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await browser.close();}
