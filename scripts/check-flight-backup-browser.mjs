import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {emptyDraft,samples} from '../apps/control-room/src/mission-trial.ts';
import {calculateFlight} from '../apps/control-room/src/flight-engine.mjs';
import {blankRun,startRun,completeStep,sessionKey} from '../apps/control-room/src/flight-session.ts';
import {exportFlight,previousFlightKey} from '../apps/control-room/src/flight-backup.ts';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5188/';
const output=process.env.STAM_QA_OUTPUT||'/tmp/stam-flight-backup-qa';await mkdir(output,{recursive:true});
function fixture(partner='navigator'){
 const draft={...emptyDraft(),partner,partnerSelected:true,jobs:[samples[0]],reviewed:true},plan=calculateFlight(draft);
 const run=completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000);run.since=null;run.elapsed=7;
 return JSON.parse(JSON.stringify({version:1,draft,plan,run}));
}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const nav=fixture();await page.addInitScript(({key,session})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(session));localStorage.setItem('vh-map-quality','normal');},{key:sessionKey,session:nav});
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),sessionKey);
 await page.goto(base+'#/operations?lang=ko');await page.waitForSelector('.ops-progress');
 await page.locator('.flight-backup summary').click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'운항 백업 저장',exact:true}).click();const file=await download;
 const text=await readFile(await file.path(),'utf8');assert.deepEqual(JSON.parse(text).session.run.aboard,nav.run.aboard);
 const choose=async(content=text)=>{await page.locator('.flight-backup input').setInputFiles({name:'flight.json',mimeType:'application/json',buffer:Buffer.from(content)});};
 const confirm=()=>page.getByRole('button',{name:'이 백업으로 복원',exact:true}).click();
 await page.getByRole('button',{name:/^배송 완료/}).click();const finished=await saved();assert.equal(finished.run.finished,true);
 await choose();await page.waitForSelector('.flight-restore-dialog[open]');
 await page.screenshot({path:output+'/restore-preview-desktop.png'});
 await page.getByRole('button',{name:'취소',exact:true}).click();assert.deepEqual(await saved(),finished);
 await choose();await confirm();assert.deepEqual((await saved()).run.aboard,nav.run.aboard);assert.equal((await saved()).run.since,null);
 await page.waitForFunction(n=>Number(document.querySelector('.ops-live-cargo .cargo-render-surface')?.dataset.boxes)===n,nav.run.aboard.length);
 await page.reload();await page.waitForSelector('.ops-progress');assert.deepEqual((await saved()).run.aboard,nav.run.aboard);
 await page.locator('.flight-backup summary').click();
 await page.getByRole('button',{name:'복원 전 운항 확인',exact:true}).click();await confirm();assert.equal((await saved()).run.finished,true);
 await choose();await confirm();await page.getByRole('button',{name:'직전 작업 되돌리기',exact:true}).click();assert.equal((await saved()).run.index,1);assert.equal((await saved()).run.since,null);
 const before=await saved();await choose('{');await page.getByRole('status').filter({hasText:'JSON 파일을 읽지 못했습니다'}).waitFor();assert.deepEqual(await saved(),before);
 const broken=JSON.parse(text);broken.session.run.aboard[0].cell=[99,99,99];await choose(JSON.stringify(broken));await page.getByRole('status').filter({hasText:'형식·경로·적재'}).waitFor();assert.deepEqual(await saved(),before);
 // A pending preview must not overwrite progress changed while the preview was open.
 await choose();await page.waitForSelector('.flight-restore-dialog[open]');
 await page.getByRole('button',{name:'직전 작업 되돌리기',exact:true}).evaluate(b=>b.click());const moved=await saved();assert.notDeepEqual(moved,before);
 await confirm();await page.getByRole('status').filter({hasText:'현재 운항이 변경'}).waitFor();assert.deepEqual(await saved(),moved);
 // A second tab's saved update must not be overwritten by an older preview.
 await choose();await page.waitForSelector('.flight-restore-dialog[open]');
 const other={...moved,draft:{...moved.draft,reviewed:!moved.draft.reviewed}};
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:sessionKey,value:other});
 await confirm();await page.getByRole('status').filter({hasText:'현재 운항이 변경'}).waitFor();assert.deepEqual(await saved(),other);
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:sessionKey,value:moved});
 // Both storage failure points leave the live and persisted flight unchanged.
 for(const failedKey of [previousFlightKey,sessionKey]){
  await page.evaluate(key=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Full','QuotaExceededError');return window.originalSetItem.call(this,k,v);};},failedKey);
  await choose();await confirm();await page.getByRole('status').filter({hasText:'저장하지 못했습니다'}).waitFor();assert.deepEqual(await saved(),moved);
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});
 }
 await choose(exportFlight(fixture('operator')));await confirm();assert.equal((await saved()).draft.partner,'operator');assert.equal(await page.locator('.ops-live-cargo,.cargo-render-surface').count(),0);
 await page.locator('.space-language select').selectOption('en');
 await page.setViewportSize({width:390,height:844});
 await page.locator('.flight-backup input').setInputFiles({name:'navigator.json',mimeType:'application/json',buffer:Buffer.from(text)});await page.waitForSelector('.flight-restore-dialog[open]');
 const bounds=await page.locator('.flight-restore-dialog').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y>=0&&bounds.y+bounds.height<=844);
 await page.screenshot({path:output+'/restore-preview-mobile.png'});await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);assert(page.url().includes('/operations'));
 // A corrupt local save can be explicitly recovered, with the original raw text retained.
 await page.evaluate(key=>localStorage.setItem(key,'{broken-save'),sessionKey);await page.goto(base+'#/mission?lang=ko');await page.reload();
 await page.waitForSelector('.flight-backup summary');await page.locator('.flight-backup summary').click();await choose();await confirm();
 assert.deepEqual((await saved()).run.aboard,nav.run.aboard);assert.equal(await page.evaluate(key=>localStorage.getItem(key),previousFlightKey),'{broken-save');
 await page.evaluate(()=>location.hash='#/operations?lang=ko');await page.waitForSelector('.ops-progress');
 await page.getByRole('button',{name:/^배송 완료/}).click();assert.equal((await saved()).run.finished,true,'successful recovery unblocks flight actions');
 assert.deepEqual(errors,[]);const result={status:'PASS',checks:['download','preview/cancel','exact cargo restore','reload','previous-flight recovery','undo stays paused','invalid JSON and cells','stale preview and cross-tab update','both storage failure points','operator has no cargo','mobile English and Escape','corrupt local save recovery'],pageErrors:errors};
 await writeFile(output+'/report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
