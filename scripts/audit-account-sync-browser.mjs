// Read-only product audit using synthetic accounts and an intercepted Firebase SDK.
// No Firebase request reaches a real account or backend. Not a passing-sync claim.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {emptyDraft,samples} from '../apps/control-room/src/mission-trial.ts';
import {calculateFlight} from '../apps/control-room/src/flight-engine.mjs';
import {blankRun,startRun,completeStep} from '../apps/control-room/src/flight-session.ts';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5188/',out=process.env.STAM_QA_OUTPUT||'/tmp/stam-account-audit';await mkdir(out,{recursive:true});
const flightKey='stam.control-room.flight.v1',metaKey='vh-account-meta';
const draft={...emptyDraft(),partner:'navigator',partnerSelected:true,jobs:[samples[0]]},plan=calculateFlight(draft);
const run=completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000);run.since=null;
const flight=JSON.parse(JSON.stringify({version:1,draft,plan,run}));
const sdk=`
export const getApps=()=>[{}],initializeApp=()=>({}),getAuth=()=>({}),getFirestore=()=>({});
export function onAuthStateChanged(a,cb){window.__qaAuth=cb;queueMicrotask(()=>cb(window.__qaUid?{uid:window.__qaUid,email:window.__qaUid+'@id.stam-freight-control.app'}:null));return ()=>{};}
export async function signOut(){window.__qaUid=null;window.__qaAuth?.(null);}
export const collection=(root,...path)=>({path:[...(root.path||[]),...path]});
export const doc=(root,...path)=>({path:[...(root.path||[]),...(path.length?path:['change-'+Math.random()])]});
export const query=r=>r,orderBy=()=>null,limit=()=>null;
export async function getDocs(ref){const rows=await window.qaDb({kind:'list',path:ref.path});return {forEach:cb=>rows.forEach(row=>cb({id:row.id,data:()=>row.data}))};}
export async function getDoc(ref){const data=await window.qaDb({kind:'get',path:ref.path});return {data:()=>data,exists:()=>!!data};}
export function writeBatch(){const ops=[];return {set:(ref,value)=>ops.push({kind:'set',path:ref.path,value}),delete:ref=>ops.push({kind:'delete',path:ref.path}),commit:()=>window.qaDb({kind:'commit',ops})};}
`;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const errors=[],requests=[];let commits=[];
 const cloud=new Map([['qa-b',{stamp:100,data:{'vh-missions':'[{"id":"legacy-b","cargo":[]}]'}}]]);
 async function backend(request){
  const uid=request.path?.[1],account=cloud.get(uid)||{stamp:0,data:{}};
  if(request.kind==='list')return request.path[2]==='state'?Object.entries(account.data).map(([id,value])=>({id,data:{value,updatedAt:account.stamp}})):[];
  if(request.kind==='get')return {updatedAt:account.stamp};
  if(request.kind==='commit'){
   commits.push(request.ops);
   for(const op of request.ops){const who=op.path[1],record=cloud.get(who)||{stamp:0,data:{}};cloud.set(who,record);
    if(op.path.length===2)record.stamp=op.value.updatedAt;
    if(op.path[2]==='state'){if(op.kind==='delete')delete record.data[op.path[3]];else record.data[op.path[3]]=op.value.value;}
   }
  }
 }
 async function setup(page,seed,uid,handler=backend){
  page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.exposeFunction('qaDb',handler);
  await page.route('https://www.gstatic.com/firebasejs/**',route=>{requests.push(route.request().url());return route.fulfill({contentType:'text/javascript',body:sdk});});
  await page.route(/https:\/\/.*(googleapis\.com|firebaseio\.com).*/,route=>route.abort());
  await page.addInitScript(({seed,uid})=>{window.__qaUid=uid;if(!sessionStorage.getItem('qa-seeded')){for(const [k,v]of Object.entries(seed))localStorage.setItem(k,v);sessionStorage.setItem('qa-seeded','1');}localStorage.setItem('vh-map-quality','normal');},{seed,uid});
  await page.goto(base+'#/mission?lang=ko');
 }
 const page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'reduce'});
 const local={'vh-missions':'[{"id":"legacy-a","cargo":[]}]'};
 await setup(page,{...local,[flightKey]:JSON.stringify(flight),[metaKey]:JSON.stringify({uid:'qa-a',lastSyncedAt:100,lastSnap:local})},'qa-b');
 await page.getByRole('button',{name:'계정 데이터 불러오기',exact:true}).click();
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.uid==='qa-b',metaKey);
 await page.locator('.mission-screen').waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vh-missions'))[0].id),'legacy-b');
 assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),flightKey),flight,'old account flight is retained even after choosing the new account data');
 const guest=await page.evaluate(()=>JSON.parse(localStorage.getItem('vh-guest-backup')));assert(!Object.hasOwn(guest,flightKey));
 await page.screenshot({path:out+'/account-switch-retained-flight.png'});
 await page.locator('.pilot-account').click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();
 await page.waitForFunction(k=>localStorage.getItem(k)===null,metaKey);
 assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),flightKey),flight);
 await page.close();
 // Both devices read the same head before either batch writes: no transaction catches it.
 cloud.set('qa-race',{stamp:100,data:{'vh-missions':'[]'}});commits=[];
 let reads=[];
 const raceBackend=async request=>{
  if(request.kind==='get'&&request.path.length===2){return new Promise(resolve=>{reads.push(resolve);if(reads.length===2)for(const release of reads)release({updatedAt:100});});}
  return backend(request);
 };
 const pages=await Promise.all(['left','right'].map(async device=>{
  const p=await browser.newPage({viewport:{width:1000,height:800},reducedMotion:'reduce'});
  await setup(p,{'vh-missions':JSON.stringify([{id:device,cargo:[]}]),[metaKey]:JSON.stringify({uid:'qa-race',lastSyncedAt:100,lastSnap:{'vh-missions':'[]'}})},'qa-race',raceBackend);return p;
 }));
 await Promise.all(pages.map(p=>p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).lastSyncedAt>100,metaKey)));
 assert.equal(commits.length,2);assert.equal(reads.length,2);
 const acknowledged=await Promise.all(pages.map(p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).lastSnap['vh-missions'],metaKey)));
 const winner=cloud.get('qa-race').data['vh-missions'];assert(acknowledged.every(v=>v.includes('left')||v.includes('right')));assert.equal(acknowledged.filter(v=>v===winner).length,1);
 await Promise.all(pages.map(p=>p.close()));assert.deepEqual(errors,[]);
 const result={reproduced:true,syntheticBackend:true,realAccountRequests:0,findings:['choosing account B data leaves account A active console flight unchanged','guest backup excludes console flight; logout also retains it','two simultaneous devices both acknowledge saving but one overwrites the other'],concurrentAcceptedWrites:commits.length,acknowledgedDevices:2,survivingDeviceSnapshots:1,interceptedSdkRequests:requests.length,pageErrors:errors};
 await writeFile(out+'/browser-audit.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await browser.close();}
