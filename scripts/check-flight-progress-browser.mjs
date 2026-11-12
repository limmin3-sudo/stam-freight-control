import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5186/';
const output=process.env.STAM_QA_OUTPUT||'/tmp/stam-flight-progress-qa';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const key='stam.control-room.flight.v1';
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
try {
 const errors=[];
 const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#/mission?lang=ko');
 await page.getByRole('button',{name:'예시 계약 보기',exact:true}).click();
 await page.locator('.receipt-card').first().getByRole('checkbox').check();
 await page.locator('.receipt-card').nth(1).getByRole('checkbox').check();
 await page.getByLabel('운항 파트너',{exact:true}).selectOption('navigator');
 await page.locator('.dispatch-launch').click();
 await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key))?.plan,key);
 await page.evaluate(()=>location.hash='#/operations?lang=ko');
 await page.waitForSelector('.ops-progress');
 assert.equal(await page.locator('.cargo-render-surface').count(),0,'cargo renderer must not dominate default operations');
 await page.getByRole('button',{name:'운항 시작',exact:true}).click();
 await page.getByRole('button',{name:/^출발 완료/}).click();
 assert.match(await page.locator('.ops-progress').innerText(),/광석/);
 assert.match(await page.locator('.ops-tasks').innerText(),/총량 확인/);
 assert.equal(await page.locator('.ops-partner .trial-task').count(),0,'cargo tasks belong to main progress');
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:output+'/operations-desktop.png'});console.log('PASS: progress-first desktop');
 const beforePreview=(await saved(page)).run;
 await page.getByRole('button',{name:'적재 3D 보기',exact:true}).click();
 await page.waitForSelector('.ops-cargo-dialog[open] .cargo-render-surface[data-ready=true]');
 const surface=page.locator('.ops-cargo-dialog .cargo-render-surface');
 assert.equal(Number(await surface.getAttribute('data-boxes')),beforePreview.aboard.length);
 await page.getByRole('button',{name:'작업 후 예상',exact:true}).click();
 await page.waitForFunction(()=>Number(document.querySelector('.ops-cargo-dialog .cargo-render-surface')?.getAttribute('data-boxes'))>0);
 await surface.click({position:{x:30,y:30}});await page.keyboard.press('Space');
 assert.deepEqual((await saved(page)).run,beforePreview,'3D keyboard and preview must not advance flight');
 await page.screenshot({path:output+'/operations-cargo.png'});console.log('PASS: cargo modal and keyboard isolation');
 await page.keyboard.press('Escape');
 await page.waitForSelector('.ops-cargo-dialog[open]',{state:'hidden'});
 assert.match(page.url(),/#\/operations/,'Escape closes cargo, not operations');
 assert.equal(await page.locator('.cargo-render-surface').count(),0,'closed detail frees renderer');
 await page.getByRole('button',{name:/^접수 완료/}).click();
 const loaded=(await saved(page)).run;assert(loaded.aboard.length>0);
 for(const lang of ['en','mix','ko']) {
  await page.getByRole('combobox',{name:/표시 언어|Display language/}).selectOption(lang);
  assert.deepEqual((await saved(page)).run,loaded,'locale must preserve flight');
 }
 await page.getByRole('button',{name:'적재 3D 보기',exact:true}).click();
 await page.waitForSelector('.ops-cargo-dialog[open] .cargo-render-surface[data-ready=true]');
 assert.equal(Number(await surface.getAttribute('data-boxes')),loaded.aboard.length,'default detail shows recorded cargo');
 await page.getByRole('link',{name:'적재 설정 · 작업 화면',exact:true}).click();
 await page.waitForURL(/mode=workspace/);
 assert.deepEqual((await saved(page)).run,loaded,'advanced workspace preserves the same recorded cargo');
 await page.getByRole('link',{name:'관제 콘솔 열기',exact:true}).click();
 await page.waitForSelector('.ops-progress');
 assert.equal(await page.locator('.ops-cargo-dialog[open]').count(),0);
 await page.reload();await page.waitForSelector('.ops-progress');
 assert.deepEqual((await saved(page)).run,loaded,'reload preserves cargo positions and ownership');
 await page.locator('.flight-actions .manifest-primary').click();
 await page.getByRole('button',{name:'직전 작업 되돌리기',exact:true}).click();
 assert.deepEqual((await saved(page)).run.aboard,loaded.aboard,'undo restores exact aboard positions');
 for(const width of [390,768,1366]) {
  await page.setViewportSize({width,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  if(width===390) {
   const p=await page.locator('.ops-progress').boundingBox(),m=await page.locator('.ops-map').boundingBox();
   assert(p.y<m.y,'mobile puts flight controls ahead of map');
   await page.screenshot({path:output+'/operations-mobile.png'});
  }
 }
 // An operator must retain route controls without any cargo preview requirement.
 const simple=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await simple.goto(base+'#/mission?lang=ko');await simple.getByRole('button',{name:'예시 계약 보기',exact:true}).click();
 await simple.locator('.receipt-card').first().getByRole('checkbox').check();
 await simple.locator('.dispatch-launch').click();await simple.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key))?.plan,key);
 await simple.evaluate(()=>location.hash='#/operations?lang=ko');await simple.waitForSelector('.ops-progress');
 assert.equal(await simple.getByRole('button',{name:'적재 3D 보기',exact:true}).count(),0);
 assert.equal(await simple.locator('.cargo-render-surface').count(),0);
 await simple.getByRole('button',{name:'운항 시작',exact:true}).click();await simple.getByRole('button',{name:/^출발 완료/}).click();
 assert.equal((await saved(simple)).plan.mode,'simple');
 assert.deepEqual(errors,[]);
 console.log('PASS: flight-first layout, optional recorded/planned cargo, keyboard isolation, locale, reload/undo, mobile and route-only operator');
}finally{await browser.close();}
