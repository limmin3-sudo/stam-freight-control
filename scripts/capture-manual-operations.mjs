// Actual production UI with isolated sample flight states. No real user log or account.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {emptyDraft,samples} from '../apps/control-room/src/mission-trial.ts';
import {calculateFlight} from '../apps/control-room/src/flight-engine.mjs';
import {blankRun,startRun,completeStep} from '../apps/control-room/src/flight-session.ts';
import {observeReceipts,receiptBaseline} from '../apps/control-room/src/flight-receipts.ts';
const {chromium}=await import(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.STAM_MANUAL_URL||'http://127.0.0.1:5189/',out=process.env.STAM_MANUAL_ASSETS||'apps/control-room/src/assets/manual',F='stam.control-room.flight.v1';await mkdir(out,{recursive:true});
const jobs=[{...structuredClone(samples[0]),id:'manual-haul',signature:'original',state:'ready'}],draft={...emptyDraft(),partner:'navigator',partnerSelected:true,jobs},plan=calculateFlight(draft);
const session={version:1,draft,plan,run:completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000),receiptReview:receiptBaseline(draft,jobs)};session.run.since=null;
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});const records=[],errors=[];
try{
 for(const locale of ['ko','en','mix']){
  const en=locale==='en',page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));await page.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
  await page.addInitScript(({session,F})=>{if(!sessionStorage.getItem('manual-seeded')){localStorage.setItem(F,JSON.stringify(session));localStorage.setItem('stam.flight-owner.v1','guest');sessionStorage.setItem('manual-seeded','1');}localStorage.setItem('vh-map-quality','low');},{session,F});
  await page.goto(base+'#/operations?lang='+locale);await page.locator('.ops-progress').waitFor();
  const shot=async(step,selector)=>{const element=page.locator(selector);await element.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);await element.screenshot({path:`${out}/${locale}-${step}.png`});records.push({locale,step,selector,text:await element.innerText()});};
  await shot('operation-actions','.flight-actions');
  await page.locator('.flight-actions .manifest-primary').click();await page.getByRole('button',{name:en?'Undo last action':'직전 작업 되돌리기',exact:true}).click();
  assert.deepEqual(await page.evaluate(F=>JSON.parse(localStorage.getItem(F)).run.aboard,F),session.run.aboard);
  await page.locator('.ops-run-menu summary').click();await shot('operation-menu','.ops-run-menu');await page.locator('.ops-run-menu summary').click();
  await page.locator('.flight-route-editor>summary').click();await shot('operation-route','.flight-route-editor');
  const changed=observeReceipts(session,[{...jobs[0],state:'ended',signature:'cancelled'}]);await page.evaluate(({F,changed})=>localStorage.setItem(F,JSON.stringify(changed)),{F,changed});await page.reload();
  await page.getByRole('button',{name:en?'Review changes':'변경 확인',exact:true}).click();await shot('operation-change','.receipt-update-dialog:not(.held-cargo-dialog)');
  assert.deepEqual(await page.evaluate(F=>JSON.parse(localStorage.getItem(F)).run.aboard,F),session.run.aboard);
  await page.getByRole('button',{name:en?'Confirm and replan remaining route':'확인하고 남은 경로 재계산',exact:true}).click();await page.locator('.receipt-update-notice').waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(F=>JSON.parse(localStorage.getItem(F)).run.aboard,F),session.run.aboard);
  await page.getByRole('button',{name:en?'Confirm held cargo unloaded':'보류 화물 하역 확인',exact:true}).click();const held=page.locator('.held-cargo-dialog');
  await held.getByRole('checkbox').first().check();await held.getByRole('checkbox').last().check();await shot('operation-held','.held-cargo-dialog');
  await held.getByRole('button',{name:en?'Confirm selected crates unloaded':'선택한 상자 하역 확인',exact:true}).click();await held.waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(F=>JSON.parse(localStorage.getItem(F)).run.aboard,F),session.run.aboard.slice(1));
  await page.context().close();console.log(locale+' operations guide captured');
 }
 assert.deepEqual(errors,[]);await writeFile(process.env.STAM_CAPTURE_REPORT||'/tmp/stam-manual-operations-capture.json',JSON.stringify({sampleFlight:true,userDataUsed:false,checks:['complete then undo restores cargo','pending cancellation does not remove cargo','confirmed exclusion holds cargo','explicit physical unload removes only selected box'],records,errors},null,2));
}finally{await browser.close();}
