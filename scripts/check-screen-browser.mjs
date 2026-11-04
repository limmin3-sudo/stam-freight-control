import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {mkdtemp,writeFile,appendFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startLogService} from '../integration/log/live-server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const dir=await mkdtemp(join(tmpdir(),'stam-screen-')),file=join(dir,'synthetic.log');await writeFile(file,'');
const service=await startLogService({file});let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.STAM_CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(service.origin))external.push(r.url());});
 await page.addInitScript(()=>{
  const mockCapture=async()=>{const canvas=document.createElement('canvas');canvas.width=960;canvas.height=240;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,960,240);ctx.fillStyle='black';ctx.font='36px Arial';ctx.fillText('Contract Accepted: Cargo Test',40,110);const stream=canvas.captureStream(2);window.testCapture={canvas,stream};return stream;};
  Object.defineProperty(navigator.mediaDevices,'getDisplayMedia',{value:mockCapture});
 });
 await page.goto(service.url);await page.waitForFunction(()=>document.querySelector('#live-status')?.textContent.includes('실시간 감시 중'));
 assert.equal(await page.locator('script[src*=tesseract]').count(),0);
 await page.locator('#screen-watch summary').click();await page.getByRole('button',{name:'게임 화면 연결',exact:true}).click();
 const canvas=page.locator('.screen-region');await canvas.waitFor();await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();
 await page.mouse.move(box.x+2,box.y+2);await page.mouse.down();await page.mouse.move(box.x+box.width-2,box.y+box.height-2);await page.mouse.up();
 await page.getByRole('button',{name:'선택한 영역 감시',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.screen-observation')?.textContent.includes('Cargo Test'),null,{timeout:90000});
 assert.equal(await page.locator('.screen-region').count(),0);assert.equal(await page.locator('.planning-contract').count(),0);
 const id='11111111-1111-4111-8111-111111111111';await appendFile(file,`<${new Date().toISOString()}> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Accepted: Cargo Test: " [1] to queue. MissionId: [${id}], ObjectiveId: []\n`);
 await page.waitForSelector('.screen-observation[data-state=corroborated]');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await page.evaluate(()=>window.testCapture.stream.getTracks().every(t=>t.readyState==='live')),true);
 await page.evaluate(()=>{window.testCapture.canvas.width=1280;window.testCapture.canvas.getContext('2d').fillRect(0,0,1280,240);});
 await page.waitForFunction(()=>window.testCapture.stream.getTracks().every(t=>t.readyState==='ended'),null,{timeout:20000});
 assert.match(await page.locator('#screen-watch > details > p[role=status]').innerText(),/화면 크기가 바뀌었습니다/);
 await page.getByRole('button',{name:'게임 화면 연결',exact:true}).click();await page.locator('.screen-region').waitFor();
 await page.getByRole('button',{name:'화면 감시 끄기',exact:true}).click();await page.waitForFunction(()=>window.testCapture.stream.getTracks().every(t=>t.readyState==='ended'));
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log(JSON.stringify({passed:true,realLocalOCR:true,syntheticScreen:true,lateLogCorroboration:true,noAutomaticContractCreation:true,captureStopped:true,browserResizePreservesCapture:true,sourceResizeStopsCapture:true,externalBrowserRequests:0,errors}));
}finally{await browser?.close();await service.close();await rm(dir,{recursive:true,force:true});}
