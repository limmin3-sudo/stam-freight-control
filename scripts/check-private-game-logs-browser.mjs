// Opt-in replay of locally supplied private logs. Never copy raw input into QA output.
// Requires the control-room Vite development server (the Worker URL is a source module).
import assert from 'node:assert/strict';
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseLogLine} from '../integration/log/parser.mjs';
import {chooseInitialPartner} from './browser-partner-choice.mjs';
const root=process.env.STAM_PRIVATE_LOG_ROOT;
assert(root,'Set STAM_PRIVATE_LOG_ROOT to your private log directory; raw logs must stay outside the repository.');
async function logs(dir){const entries=await readdir(dir,{withFileTypes:true}),result=[];for(const e of entries){const p=join(dir,e.name);if(e.isDirectory())result.push(...await logs(p));else if(e.isFile()&&e.name.toLowerCase().endsWith('.log'))result.push(p);}return result;}
const files=await logs(root);assert(files.length,'No .log files found');
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5186/',out=process.env.STAM_QA_OUTPUT||'/tmp/stam-private-log-qa';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[],summary=[];
 p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('vh-map-quality','normal'));
 await p.goto(base+'#/mission?lang=ko');
 async function readWorker(raw){return p.evaluate(raw=>new Promise((resolve,reject)=>{
  const w=new Worker('/src/receipt-log.worker.mjs?worker_file&type=module',{type:'module'});
  const timer=setTimeout(()=>{w.terminate();reject(Error('private log Worker timed out'));},90000);
  w.onmessage=e=>{clearTimeout(timer);w.terminate();resolve(e.data);};w.onerror=()=>{clearTimeout(timer);w.terminate();reject(Error('private log Worker failed'));};
  w.postMessage(new File([raw],'private-replay.log'));
 }),raw);}
 let readyInput=null,endedInput=null;
 for(let i=0;i<files.length;i++){
  const raw=await readFile(files[i],'utf8'),r=await readWorker(raw);assert.equal(r.phase,'loaded','private file '+i+' must be readable');
  const counts={file:i,cards:r.cards.length,ready:0,incomplete:0,ended:0,conflict:0};
  for(const c of r.cards){assert(Object.hasOwn(counts,c.state));counts[c.state]++;}
  summary.push(counts);console.log(JSON.stringify(counts));
  if(!readyInput&&counts.ready)readyInput={raw,cards:r.cards};
  if(!endedInput&&counts.ended){
   const lines=raw.split(/\r?\n/),accepted=new Set();
   for(let n=0;n<lines.length;n++){
    const e=parseLogLine(lines[n],{file:'private-replay',line:n+1}).event;
    if(e?.type==='accepted')accepted.add(e.missionId);
    if(e?.type==='ended'&&accepted.has(e.missionId)){
     const prefix=lines.slice(0,n).join('\n')+'\n',before=await readWorker(prefix);
     if(before.cards.some(c=>c.id===e.missionId&&c.state!=='ended')){endedInput={prefix,raw,before:before.cards.length};break;}
    }
   }
  }
 }
 assert(readyInput,'This input set has no active, quantified hauling receipt for the end-to-end check.');
 await chooseInitialPartner(p,'navigator');
 const key='stam.control-room.flight.v1',saved=()=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 await p.locator('.receipt-import input[type=file]').setInputFiles({name:'private-replay.log',mimeType:'text/plain',buffer:Buffer.from(readyInput.raw)});
 await p.waitForFunction(()=>document.querySelector('.mission-source-footer [role=status]')?.textContent.includes('수신 계약'));
 assert.equal((await saved()).draft.jobs.length,0,'receiving must never automatically accept or select missions');
 assert.equal(await p.locator('.pilot-log').getAttribute('data-log-state'),'file');
 const card=readyInput.cards.find(c=>c.state==='ready');
 const boxes=p.locator('.receipt-card input[type=checkbox]');
 // Other ended receipts are hidden by default; compare against the active receipt order.
 const active=readyInput.cards.filter(c=>c.state!=='ended');await boxes.nth(active.findIndex(c=>c.id===card.id)).check();
 assert.equal((await saved()).draft.jobs.length,1);
 await p.locator('.dispatch-launch').click();await p.waitForSelector('.navigation-chart[data-ready=true]');
 const plan=(await saved()).plan;assert.equal(plan.mode,'detail');
 await p.evaluate(()=>location.hash='#/operations?lang=ko');await p.waitForSelector('.ops-live-cargo .cargo-render-surface[data-ready=true]');
 await p.getByRole('button',{name:'운항 시작',exact:true}).click();let actions=0;
 while(!(await saved()).run.finished&&actions<200){await p.locator('.ops-progress .flight-actions .manifest-primary').click();actions++;}
 const finished=(await saved()).run;assert(finished.finished);assert.equal(finished.aboard.length,0);
 const workflow={contracts:1,shipments:card.shipments.length,visits:plan.visits.length,actions,finished:true,boxesRemaining:0};
 // Browser file-handle polling, append, duplicate polling and stop. This is a
 // saved-log replay, not a claim about native Windows permissions or the live game.
 let polling=null;
 if(endedInput){
  const q=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});q.setDefaultTimeout(90000);q.on('pageerror',e=>errors.push(e.message));
  await q.addInitScript(prefix=>{
   window.__privateReplay={raw:prefix,stamp:1,calls:0};
   window.showOpenFilePicker=async()=>[{getFile:async()=>{const s=window.__privateReplay;s.calls++;return new File([s.raw],'private-replay.log',{lastModified:s.stamp});}}];
  },endedInput.prefix);
  await q.goto(base+'#/mission?lang=ko');await chooseInitialPartner(q,'navigator');await q.getByRole('button',{name:'Game.log 자동 수신',exact:true}).click();
  await q.waitForFunction(n=>document.querySelector('.mission-source-footer [role=status]')?.textContent.includes(`수신 계약 ${n}건`),endedInput.before);
  assert.equal((await q.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).draft.jobs.length,0);
  assert.equal(await q.locator('.pilot-log').getAttribute('data-log-state'),'live');
  await q.evaluate(raw=>{window.__privateReplay.raw=raw;window.__privateReplay.stamp++;},endedInput.raw);
  await q.waitForSelector('.receipt-manage');await q.locator('.receipt-manage summary').click();await q.getByRole('button',{name:/^종료된 계약 보기/}).waitFor();
  const count=await q.locator('.receipt-card').count(),calls=await q.evaluate(()=>window.__privateReplay.calls);
  await q.evaluate(()=>window.__privateReplay.stamp++);await q.waitForFunction(old=>window.__privateReplay.calls>old,calls);await q.waitForTimeout(250);
  assert.equal(await q.locator('.receipt-card').count(),count,'unchanged bytes must not duplicate receipts');
  await q.getByRole('button',{name:'자동 수신 중지',exact:true}).click();const stopped=await q.evaluate(()=>window.__privateReplay.calls);await q.waitForTimeout(2300);
  assert.equal(await q.evaluate(()=>window.__privateReplay.calls),stopped,'stopping must stop file polling');assert.equal(await q.locator('.pilot-log').getAttribute('data-log-state'),'file');polling={append:true,duplicateSafe:true,endedObserved:true,stopped:true};await q.close();
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/private-log-summary.json',JSON.stringify({files:summary,workflow,polling},null,2));
 console.log('PASS private saved-log replay',JSON.stringify({files:summary.length,workflow,polling}));
}finally{await browser.close();}
