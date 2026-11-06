import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startLogService} from '../integration/log/live-server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const dir=await mkdtemp(join(tmpdir(),'stam-partners-'));await writeFile(join(dir,'Game.log'),'');
const service=await startLogService({file:join(dir,'Game.log')});let browser;
const sizes=[{width:1699,height:937},{width:1366,height:768},{width:1280,height:640},{width:820,height:1180},{width:390,height:844},{width:360,height:740},{width:320,height:568}];
try{browser=await chromium.launch({...(process.env.STAM_CHROMIUM_PATH?{executablePath:process.env.STAM_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
for(const lang of ['ko','en'])for(const viewport of sizes){
 const page=await browser.newPage({viewport,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https:\/\/fonts\./,r=>r.abort());
 await page.route('**/__partners?*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/briefing.css"><body></body>'}));
 await page.goto(new URL(`__partners?lang=${lang}`,service.url).href);
 await page.evaluate(async()=>{const {createAssistant}=await import('/assistant.mjs');window.partnerFixture=createAssistant({missions:()=>[],voiceChanged(){},closed(){}});partnerFixture.open('choose');});
 for(const id of ['aide','standard','broker']){
  const tab=page.locator(`[data-partner-tab=${id}]`);if(await tab.isVisible())await tab.click();
  const card=page.locator(`[data-voice=${id}]`);await card.waitFor({state:'visible'});await card.locator('img').evaluate(n=>n.decode());
  const bounds=await page.locator('.aide-scroll').boundingBox();
  const metrics=await page.locator('.partner-picker .aide-scroll').evaluate(n=>({overflow:getComputedStyle(n).overflowY,scroll:n.scrollHeight,client:n.clientHeight}));
  assert.ok(!['auto','scroll'].includes(metrics.overflow),JSON.stringify({lang,viewport,id,metrics}));
  assert.ok(metrics.scroll<=metrics.client+2,'Picker content must fit: '+JSON.stringify({lang,viewport,id,metrics}));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const selector of ['.partner-photo','.partner-copy>b','.partner-copy>small','.partner-capabilities','.aide-choose-link']){
   if(!await card.locator(selector).isVisible())continue;const box=await card.locator(selector).boundingBox();assert.ok(box&&box.y>=bounds.y-1&&box.y+box.height<=bounds.y+bounds.height+2,'Clipped '+selector+' '+JSON.stringify({lang,viewport,id,bounds,box}));
  }
  const footer=await page.locator('.aide-actions').boundingBox();assert.ok(footer.y+footer.height<=viewport.height,'Footer outside viewport');
  assert.equal(await page.locator('.aide-actions').evaluate(n=>['auto','scroll'].includes(getComputedStyle(n).overflowY)),false);
  if(id==='aide'){
   assert.match(await card.locator('img').getAttribute('src'),/aide-portrait\.webp/);
   const alpha=await card.locator('img').evaluate(img=>{const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return [[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1]].map(([x,y])=>ctx.getImageData(x,y,1,1).data[3]);});assert.deepEqual(alpha,[255,255,255,255]);
  }
  await page.screenshot({path:`/tmp/stam-partner-picker-${lang}-${viewport.width}-${id}.png`});
  const before=await page.evaluate(()=>localStorage.getItem('sfc-voice'));await card.click();await page.waitForSelector('.partner-intro');assert.equal(await page.locator('.partner-functions li').count(),3,'Full partner details remain available');if(id==='broker')assert.equal(await page.evaluate(()=>localStorage.getItem('sfc-voice')),before,'Broker preview must not change the hauling policy');assert.equal(await page.locator('.aide-intro-portrait img').getAttribute('src'),await page.evaluate(async id=>(await import('/voice.mjs')).VOICE_PORTRAITS[id],id));
  await page.locator('#a-partner').click();
 }
 assert.deepEqual(errors,[]);console.log('PASS partner picker',lang,viewport.width,viewport.height,'all roles, readable content, no nested scroll or clipping, background portrait, unchanged preview policy');await page.close();
}
}finally{await browser?.close();await service.close();await rm(dir,{recursive:true,force:true});}
