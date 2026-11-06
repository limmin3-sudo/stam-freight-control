import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startLogService} from '../integration/log/live-server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const dir=await mkdtemp(join(tmpdir(),'stam-partners-'));await writeFile(join(dir,'Game.log'),'');
const service=await startLogService({file:join(dir,'Game.log')});let browser;
const sizes=[{width:1920,height:1080},{width:1368,height:1222},{width:1422,height:1269},{width:1699,height:937},{width:1366,height:768},{width:1280,height:640},{width:820,height:1180},{width:390,height:844},{width:360,height:740},{width:320,height:568}];
try{browser=await chromium.launch({...(process.env.STAM_CHROMIUM_PATH?{executablePath:process.env.STAM_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
for(const lang of ['ko','en'])for(const viewport of sizes){
 const page=await browser.newPage({viewport,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https:\/\/fonts\./,r=>r.abort());
 await page.route('**/__partners?*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/briefing.css"><body></body>'}));
 await page.goto(new URL(`__partners?lang=${lang}`,service.url).href);
 await page.evaluate(async()=>{const {createAssistant}=await import('/assistant.mjs');window.partnerFixture=createAssistant({missions:()=>[],voiceChanged(){},closed(){},showTutorial(){location.href='/tutorial.html'+location.search;}});partnerFixture.open('choose');});
 assert.equal(await page.locator('[data-voice]').first().getAttribute('data-voice'),'tutorial');
 if(viewport.width>900&&viewport.height>850){
  const frame=await page.locator('.aide-card').boundingBox();assert.ok(frame.width>=Math.min(1760,viewport.width-48)-2,'Use available horizontal space');
  await page.locator('.partner-photo').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));
  const heads=await page.locator('[data-voice]').evaluateAll(cards=>{const marks={aide:[32,350],standard:[17,250],tutorial:[35,238],broker:[48,270]};return cards.map(card=>{const img=card.querySelector('img'),photo=card.querySelector('.partner-photo-frame').getBoundingClientRect(),box=img.getBoundingClientRect(),[top,bottom]=marks[card.dataset.voice];return {id:card.dataset.voice,head:(bottom-top)/img.naturalHeight*box.height,top:box.y+top/img.naturalHeight*box.height-photo.y,photo:{width:photo.width,height:photo.height},ratio:box.width/box.height,sourceRatio:img.naturalWidth/img.naturalHeight};});});
  for(const h of heads){assert.ok(h.photo.height<=h.photo.width*1.25+1,'Photo must not grow into a long strip: '+JSON.stringify(h));assert.ok(h.top+h.head<=h.photo.height+1,'Keep the whole head visible: '+JSON.stringify(h));assert.ok(h.top>=0&&h.top<h.photo.width*.08,'Keep full heads at a shared top margin: '+JSON.stringify(h));assert.ok(Math.abs(h.ratio-h.sourceRatio)<.002,'Preserve image proportions');}
  assert.ok(Math.max(...heads.map(h=>h.head))/Math.min(...heads.map(h=>h.head))<1.06,'Match portrait camera distance: '+JSON.stringify(heads));
 }

 for(const id of ['tutorial','aide','standard','broker']){
  const tab=page.locator(`[data-partner-tab=${id}]`);if(await tab.isVisible())await tab.click();
  const card=page.locator(`[data-voice=${id}]`);await card.waitFor({state:'visible'});await card.locator('img').evaluate(n=>n.decode());
  const bounds=await page.locator('.aide-scroll').boundingBox();
  const metrics=await page.locator('.partner-picker .aide-scroll').evaluate(n=>({overflow:getComputedStyle(n).overflowY,scroll:n.scrollHeight,client:n.clientHeight}));
  assert.ok(!['auto','scroll'].includes(metrics.overflow),JSON.stringify({lang,viewport,id,metrics}));
  assert.ok(metrics.scroll<=metrics.client+2,'Picker content must fit: '+JSON.stringify({lang,viewport,id,metrics}));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const selector of ['.partner-photo-frame','.partner-copy>b','.partner-copy>small','.partner-capabilities','.aide-choose-link']){
   if(!await card.locator(selector).isVisible())continue;const box=await card.locator(selector).boundingBox();assert.ok(box&&box.y>=bounds.y-1&&box.y+box.height<=bounds.y+bounds.height+2,'Clipped '+selector+' '+JSON.stringify({lang,viewport,id,bounds,box}));
  }
  const footer=await page.locator('.aide-actions').boundingBox();assert.ok(footer.y+footer.height<=viewport.height,'Footer outside viewport');
  assert.equal(await page.locator('.aide-actions').evaluate(n=>['auto','scroll'].includes(getComputedStyle(n).overflowY)),false);
  if(id==='aide'){
   assert.match(await card.locator('img').getAttribute('src'),/aide-portrait\.webp/);
   const alpha=await card.locator('img').evaluate(img=>{const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return [[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1]].map(([x,y])=>ctx.getImageData(x,y,1,1).data[3]);});assert.deepEqual(alpha,[255,255,255,255]);
  }
  await page.screenshot({path:`/tmp/stam-partner-picker-${lang}-${viewport.width}-${id}.png`});
  const before=await page.evaluate(()=>localStorage.getItem('sfc-voice'));if(id==='tutorial'){await card.click();await page.waitForURL('**/tutorial.html?*');assert.equal(await page.locator('#tutorial-start').isDisabled(),true);assert.equal(await page.evaluate(()=>localStorage.getItem('sfc-voice')),before);assert.match(await page.locator('#tutorial-description').innerText(),lang==='ko'?/준비 중/:/prepared/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.goto(new URL(`__partners?lang=${lang}`,service.url).href);await page.evaluate(async()=>{const {createAssistant}=await import('/assistant.mjs');window.partnerFixture=createAssistant({missions:()=>[],voiceChanged(){},closed(){},showTutorial(){location.href='/tutorial.html'+location.search;}});partnerFixture.open('choose');});continue;}await card.click();await page.waitForSelector('.partner-intro');assert.equal(await page.locator('.partner-functions li').count(),3,'Full partner details remain available');if(id==='broker')assert.equal(await page.evaluate(()=>localStorage.getItem('sfc-voice')),before,'Broker preview must not change the hauling policy');assert.equal(await page.locator('.aide-intro-portrait img').getAttribute('src'),await page.evaluate(async id=>(await import('/voice.mjs')).VOICE_PORTRAITS[id],id));
  await page.locator('#a-partner').click();
 }
 assert.deepEqual(errors,[]);console.log('PASS partner picker',lang,viewport.width,viewport.height,'all roles, readable content, no nested scroll or clipping, background portrait, unchanged preview policy');await page.close();
}
}finally{await browser?.close();await service.close();await rm(dir,{recursive:true,force:true});}
