import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {emptyDraft,samples} from '../apps/control-room/src/mission-trial.ts';
import {calculateFlight} from '../apps/control-room/src/flight-engine.mjs';
import {blankRun,startRun,completeStep} from '../apps/control-room/src/flight-session.ts';
import {receiptBaseline,observeReceipts} from '../apps/control-room/src/flight-receipts.ts';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5188/',key='stam.control-room.flight.v1',out=process.env.STAM_QA_OUTPUT||'/tmp/stam-flight-receipts';
await mkdir(out,{recursive:true});
function fixture(partner){
 const jobs=samples.slice(0,2).map((j,i)=>({...structuredClone(j),id:'race-'+i,signature:'raw-'+i,state:'ready'}));
 const draft={...emptyDraft(),jobs,partner,partnerSelected:true},plan=calculateFlight(draft);
 const run=completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000);run.since=null;
 return observeReceipts({version:1,draft,plan,run,receiptReview:receiptBaseline(draft,jobs)},[{...jobs[0],state:'ended',signature:'end'}]);
}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const errors=[];
 for(const partner of ['operator','navigator']){
  const session=JSON.parse(JSON.stringify(fixture(partner))),page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
  await page.addInitScript(({key,session})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(session));localStorage.setItem('vh-map-quality','normal');},{key,session});
  await page.goto(base+'#/mission?lang=ko');await page.getByRole('button',{name:'변경 확인',exact:true}).click();
  // Hold the actual Worker response until another tab has changed the persisted session.
  await page.evaluate(()=>{const Original=window.Worker;window.__OriginalWorker=Original;window.Worker=class extends Original{set onmessage(callback){super.onmessage=event=>{window.__release=()=>callback(event);};}};});
  await page.getByRole('button',{name:'확인하고 남은 경로 재계산',exact:true}).click();await page.waitForFunction(()=>typeof window.__release==='function');
  const external={...session,run:{...session.run,elapsed:99}};
  await page.evaluate(({key,external})=>{localStorage.setItem(key,JSON.stringify(external));window.__release();},{key,external});
  await page.locator('.receipt-update-error').filter({hasText:/계산 중 운항이나 수신 내용이 바뀌었습니다|계정 자료가 변경되었거나 확인 중입니다/}).waitFor();
  assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),external);
  // Reload resolves the external version; the still-pending review can now commit safely.
  await page.reload();await page.getByRole('button',{name:'변경 확인',exact:true}).click();
  await page.getByRole('button',{name:'확인하고 남은 경로 재계산',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.receipt-update-notice'));
  const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  assert.deepEqual(after.run.aboard,session.run.aboard);assert.equal(after.run.elapsed,99);assert(after.plan.visits.every(v=>v.events.every(e=>e.missionId!=='race-0')));
  await page.evaluate(()=>location.hash='#/operations?lang=ko');await page.locator('.ops-progress').waitFor();
  if(partner==='operator'){assert.equal(await page.locator('.cargo-render-surface').count(),0);assert(await page.locator('.ops-itinerary').isVisible());}
  else await page.locator('.ops-live-cargo .cargo-render-surface[data-ready=true]').waitFor();
  await page.close();
 }
 assert.deepEqual(errors,[]);const report={passed:true,checks:['real Worker stale result cannot overwrite another tab session','pending review survives conflict and reload','operator route replan retains progress and no cargo renderer','navigator retained cargo survives confirmed replan'],pageErrors:errors};
 await writeFile(out+'/race-report.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await browser.close();}
