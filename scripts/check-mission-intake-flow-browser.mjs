import {chooseInitialPartner} from './browser-partner-choice.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5186/';
const output=process.env.STAM_QA_OUTPUT||'/tmp/stam-mission-intake-review';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#/mission?lang=ko');await chooseInitialPartner(page);await page.waitForSelector('.mission-intake');await page.evaluate(()=>document.fonts.ready);
 const get=name=>page.getByRole('button',{name,exact:true});
 assert((await page.locator('.mission-intake').boundingBox()).y<(await page.locator('.manifest-inbox').boundingBox()).y);
 for(const name of ['Game.log 선택','스크린샷 여러 장 선택','+ 직접 입력'])assert(await get(name).isVisible());
 await page.screenshot({path:output+'/mission-empty.png'});
 const chooser=page.waitForEvent('filechooser');await get('Game.log 선택').click();await(await chooser).setFiles({name:'synthetic-empty.log',mimeType:'text/plain',buffer:Buffer.from('No contracts in synthetic UI fixture\n')});
 await page.waitForFunction(()=>document.querySelector('.mission-source-footer [role=status]')?.textContent?.includes('수신 계약 0건'));
 await get('예시 계약 보기').click();assert.equal(await page.locator('.receipt-card').count(),4);assert(await get('Game.log 선택').isVisible());
 await page.locator('.receipt-card').first().getByRole('checkbox').check();
 const key='stam.control-room.flight.v1';const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).draft.jobs,key);
 await get('+ 직접 입력').click();await page.waitForSelector('.mission-contract-editor');
 assert(await page.locator('.dispatch-launch').isDisabled());
 await page.locator('.mission-contract-editor').getByLabel('계약명',{exact:true}).fill('작성 후 취소');await page.locator('.mission-contract-editor').getByRole('button',{name:'취소',exact:true}).click();
 assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).draft.jobs,key),saved);
 await get('텍스트 가져오기').click();assert.equal(await page.locator('#mission-text-import').evaluate(e=>e.open),true);assert(await page.getByLabel('계약 원문',{exact:true}).evaluate(e=>e===document.activeElement));
 await page.locator('#mission-text-import summary').click();
 // The existing OCR component is mounted at the visible entry point; selecting
 // an image opens its review dialog. Recognition accuracy is a separate check.
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1cAAAAASUVORK5CYII=','base64');
 const shot=page.waitForEvent('filechooser');await get('스크린샷 여러 장 선택').click();await(await shot).setFiles({name:'synthetic-pixel.png',mimeType:'image/png',buffer:image});
 await page.waitForSelector('.shot-review[open]');assert(await page.locator('.shot-original').isVisible());await page.locator('.shot-review').getByRole('button',{name:'닫기',exact:true}).click();
 await page.locator('.console-display-content').evaluate(e=>e.scrollTop=0);await page.screenshot({path:output+'/mission-contracts.png'});
 for(const lang of ['en','mix','ko']){
  await page.locator('.space-language select').selectOption(lang);
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('.console-display-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  assert.equal(await page.locator('.mission-source-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),1);
 }
 await page.locator('.console-display-content').evaluate(e=>e.scrollTop=0);await page.screenshot({path:output+'/mission-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS: visible intake before inbox, Game.log file chooser/read, sample and selection preservation, manual editor/cancel, text focus, screenshot upload/review, KO/mix/EN mobile overflow');
}finally{await browser.close();}
