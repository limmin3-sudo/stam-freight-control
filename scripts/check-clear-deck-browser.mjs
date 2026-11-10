// Regression for the simplified deck. Synthetic contracts only; no account or paid APIs.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {startLogService} from '../integration/log/live-server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const output=process.env.STAM_QA_OUTPUT||'/tmp/stam-clear-deck-qa';await mkdir(output,{recursive:true});
const data=JSON.parse(await readFile('data/locations.json','utf8'));
const a=data.locations.find(x=>x.name==='Everus Harbor'),b=data.locations.find(x=>x.name==='Seraphim Station');
const contract={id:'layout-qa-manual',title:'Layout QA',company:'',reward:10000,cargo:[{commodity:'Hydrogen',scu:8,pickupId:a.id,dropoffId:b.id,boxes:[{size:8,count:1}]}]};
const id='11111111-1111-4111-8111-111111111111';
const dir=await mkdtemp(join(tmpdir(),'stam-layout-log-')),file=join(dir,'Game.log');
const notice=(content,n)=>`<2026-11-09T10:00:00.000Z> [Notice] <SHUDEvent_OnNotification> Added notification "${content}: " [${n}] to queue. MissionId: [${id}], ObjectiveId: [dropoff_test_1]\n`;
await writeFile(file,notice('Contract Accepted: Synthetic hydrogen haul',1)+notice('New Objective: Deliver 0/4 SCU of Hydrogen to Canard View',2));
const service=await startLogService({file});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[];let page;
const snap=async name=>{await page.waitForTimeout(500);await page.screenshot({path:join(output,name+'.png')});console.log('captured',name);};
const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'page must not overflow');
try{
 for(const lang of (process.env.STAM_QA_LANGS||'ko,mix,en').split(',')){
  const context=await browser.newContext({viewport:{width:1536,height:900},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({lang,start,contract})=>{if(sessionStorage.getItem('layout-seed'))return;sessionStorage.setItem('layout-seed','1');localStorage.setItem('sfc-lang',lang);localStorage.setItem('sfc-aide-seen','1');localStorage.setItem('sfc-voice','standard');localStorage.setItem('vh-ship-id','misc-hull-b');localStorage.setItem('vh-start',start);localStorage.setItem('vh-missions',JSON.stringify([contract]));},{lang,start:a.id,contract});
  await page.goto(service.url.replace('/index.html#','/index.html?debug#'));await page.waitForSelector('.clear-deck');await page.waitForSelector('#itinerary [data-stop]');
  await page.waitForFunction(()=>document.querySelector('.inbox-launch-count')?.textContent==='1');
  assert.equal(await page.locator('main > .route-pane').count(),0);assert.equal(await page.locator('.deck-operations > .route-pane').count(),1);
  assert.equal(await page.locator('#execution').isVisible(),false);assert.equal(await page.locator('#deck-start-run').isVisible(),true);
  await overflow();await snap('intro-'+lang);
  await page.locator('#ship-panel').click();await page.waitForSelector('#flight-dialog[open]');assert.equal(await page.locator('#start-location').inputValue(),a.id);await page.locator('#flight-dialog [data-desk-close]').click();
  await page.locator('#flight-open').click();await page.locator('#map-wrap').scrollIntoViewIfNeeded();await page.waitForTimeout(1200);await snap('map-'+lang);
  await page.locator('#contracts-open').click();await page.waitForFunction(()=>window.__map._debug().renderLoop.visible===false);const pausedFrames=await page.evaluate(()=>window.__map._debug().renderLoop.frames);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__map._debug().renderLoop.frames),pausedFrames);if(await page.locator('.inbox-card-extra').getAttribute('open')===null)await page.locator('.inbox-card-extra summary').click();
  // Opening details must not silently select or insert the contract.
  assert.equal(await page.locator('.inbox-check').isChecked(),false);
  await page.locator('#contracts-dialog .inbox-review').click();await page.waitForSelector('#mission-editor[open]');await page.locator('#edit-cancel').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vh-missions')).length),1);
  await page.locator('#contracts-dialog .inbox-review').click();await page.locator('.edit-cargo-row .pickup').selectOption(a.id);await page.locator('.edit-cargo-row .dropoff').selectOption(b.id);await page.locator('#edit-form button[type=submit]').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vh-missions')).length),1);
  await page.locator('.inbox-select-label input').check();await snap('contracts-'+lang);
  await page.locator('#contracts-dialog .inbox-plan').click();await page.waitForFunction(()=>!document.querySelector('#contracts-dialog').open);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vh-missions')).length),2);
  assert.equal(parseInt(await page.locator('#peak').innerText()),12);
  await page.locator('#contracts-open').click();await page.locator('#deck-planned-tab').click();await page.locator('#deck-manifest>summary').click();assert.equal(await page.locator('#manifest-workbench').isVisible(),true);await snap('manifest-'+lang);
  await page.locator('#contracts-dialog [data-desk-close]').click();
  await page.locator('#itinerary [data-stop="1"]').click();assert.ok((await page.locator('.deck-cargo-place').innerText()).endsWith(await page.locator('.deck-current h3').innerText()));
  await page.locator('#deck-operations').scrollIntoViewIfNeeded();await page.waitForTimeout(1000);await snap('cargo-'+lang);
  await page.locator('#cargo-expand').click();await page.waitForSelector('dialog.cargo-large[open]');await page.locator('dialog.cargo-large>button').click();await page.waitForSelector('.cargo-section #cargo-view');
  await page.locator('.deck-map-options>summary').click();await page.locator('#map-ui-toggle').click();assert.equal(await page.locator('.map-solo').count(),1);await page.locator('#map-ui-toggle').click();assert.equal(await page.locator('.map-solo').count(),0);
  await page.locator('#deck-start-run').click();await page.waitForSelector('body.deck-running');await snap('run-'+lang);
  await page.locator('#run-done').click();if(await page.evaluate(()=>JSON.parse(localStorage.getItem('sfc-run')).picked.length)===0)await page.locator('#run-done').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sfc-run')));assert.equal(saved.picked.length,2);assert.equal(saved.aboard.reduce((n,c)=>n+c.scu,0)>0||saved.aboard.length>0,true);
  await page.locator('#run-undo').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sfc-run')).picked.length),0);
  await page.locator('#run-done').click();const aboard=await page.evaluate(()=>JSON.parse(localStorage.getItem('sfc-run')).aboard);
  await page.reload();await page.waitForSelector('body.clear-deck.deck-running');assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('sfc-run')).aboard),aboard);
  await page.locator('#run-view').click();await page.waitForSelector('body.map-fullscreen');assert.equal(await page.locator('#run-desk-cargo #cargo-view').count(),1);await page.locator('#run-desk-close').click();await page.waitForSelector('.cargo-section #cargo-view');
  for(const [width,height]of [[1366,768],[1024,768],[768,1024],[390,844]]){await page.setViewportSize({width,height});await overflow();await page.locator('#deck-operations').scrollIntoViewIfNeeded();await snap(`run-${lang}-${width}`);await page.locator('#contracts-open').click();await overflow();await snap(`contracts-${lang}-${width}`);await page.locator('#contracts-dialog [data-desk-close]').click();}
  if(lang==='ko'){
   const previous=await page.evaluate(()=>({missions:JSON.parse(localStorage.getItem('vh-missions')),run:JSON.parse(localStorage.getItem('sfc-run'))}));
   const baseline='66bbccddf5daf4e6dfcb3947f6654588e8636342',files=['index.html','app.mjs','assistant.mjs','execution.mjs','starmap.mjs','integration/inbox-view.mjs'];
   const original=new Map(files.map(file=>[file,execFileSync('git',['show',baseline+':'+file],{encoding:'utf8'})]));
   await page.route('**/*',route=>{const path=new URL(route.request().url()).pathname.slice(1);if(original.has(path))return route.fulfill({status:200,contentType:path.endsWith('.html')?'text/html':'text/javascript',body:original.get(path)});return route.continue();});
   await page.reload();await page.waitForSelector('body.run-active');assert.equal(await page.locator('body.clear-deck').count(),0);
   const restored=await page.evaluate(()=>({missions:JSON.parse(localStorage.getItem('vh-missions')),run:JSON.parse(localStorage.getItem('sfc-run'))}));assert.deepEqual(restored.missions,previous.missions);assert.deepEqual(restored.run.aboard,previous.run.aboard);assert.deepEqual(restored.run.picked,previous.run.picked);assert.deepEqual(restored.run.delivered,previous.run.delivered);
   console.log('PASS rollback to beta 1.2.0: same contracts, picked/delivered and aboard coordinates');
  }
  console.log('PASS',lang,'intake/selection, original plan retained, 12 SCU, manifest, cargo, map solo, run/undo, reload/aboard, full control, desktop/tablet/mobile');await context.close();
 }
 const context=await browser.newContext({viewport:{width:1536,height:730},reducedMotion:'reduce'});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(service.url.replace('/index.html#','/index.html?lang=ko#'));await page.waitForSelector('.aide-overlay:not([hidden])');await page.locator('[data-voice=standard]').click();await page.locator('#a-go').click();await page.waitForFunction(()=>document.querySelector('.aide-overlay').hidden);assert.equal(await page.locator('#flight-open').innerText(),'계약 선택하기');assert.equal(await page.locator('#deck-start-run').isVisible(),false);await overflow();await snap('first-visit');
 await page.locator('#flight-open').click();await page.locator('.deck-contract-input>summary').click();assert.equal(await page.locator('#dropzone').isVisible(),true);await page.locator('.ocr-options>summary').click();await page.locator('#manual-add').click();await page.waitForSelector('#mission-editor[open]');await page.locator('#edit-cancel').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vh-missions')).length),0);await context.close();
 assert.deepEqual(errors,[]);console.log('PASS fresh partner introduction -> deck; manual entry/cancel; no tutorial added; JS errors 0');
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:join(output,'failure.png')}).catch(()=>{});throw error;}finally{await browser.close();await service.close();await rm(dir,{recursive:true,force:true});}
