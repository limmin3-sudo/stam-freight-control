import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startLogService} from '../integration/log/live-server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const dir=await mkdtemp(join(tmpdir(),'stam-guide-'));const file=join(dir,'Game.log');await writeFile(file,'');const service=await startLogService({file});let browser;
try{
 browser=await chromium.launch({...(process.env.STAM_CHROMIUM_PATH?{executablePath:process.env.STAM_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(45000);const errors=[],bad=[];context.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(new URL(r.url()).pathname);});});
 await page.goto(service.url);await page.waitForFunction(()=>document.querySelector('#workspace-connection')?.dataset.state==='watching');
 await page.locator('#workspace-help').click();await page.waitForSelector('.workspace-page[open] iframe');const guide=await page.locator('.workspace-page iframe').elementHandle().then(n=>n.contentFrame());await guide.waitForSelector('#slide-title');assert.equal(context.pages().length,1);
 assert.equal(await guide.locator('#chapters button').count(),13);assert.equal(await guide.locator('#previous').isDisabled(),true);
 assert.equal(await guide.locator('video').evaluate(v=>v.paused&&v.preload==='none'&&!v.autoplay),true);
 for(let i=1;i<13;i++){await guide.locator('#next').click();assert.equal(await guide.locator('#counter').innerText(),`${i+1} / 13`);assert.equal(await guide.locator('#steps li').count(),i===6?4:3);}
 assert.equal(await guide.locator('#next').isDisabled(),true);await page.keyboard.press('ArrowLeft');assert.equal(await guide.locator('#counter').innerText(),'12 / 13');
 await guide.evaluate(()=>location.reload());await guide.waitForSelector('#slide-title');assert.equal(await guide.locator('#counter').innerText(),'12 / 13');
 await page.setViewportSize({width:390,height:844});assert.equal(await guide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1440,height:1000});await guide.locator('#chapters button').first().click();await page.screenshot({path:'/tmp/stam-guide-desktop.png',fullPage:true});
 await guide.locator('#chapters button').nth(2).click();
 assert.equal(await guide.locator('#guide-log-name').innerText(),'Game');assert.equal(await guide.locator('.presenter-body').isVisible(),true);assert.equal(await guide.locator('.presenter-pose').count(),2);
 await guide.locator('#guide-extensions').click();assert.equal(await guide.locator('#guide-log-name').innerText(),'Game.log');assert.equal(await guide.locator('#guide-extensions').getAttribute('aria-pressed'),'true');
 await page.screenshot({path:'/tmp/stam-log-file-guide.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await guide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await guide.locator('#guide-extensions').isVisible(),true);
 await page.screenshot({path:'/tmp/stam-log-file-guide-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
 for(const width of [1920,2560]){await page.setViewportSize({width,height:width===2560?1440:1080});const rect=await guide.locator('main').boundingBox();assert.ok(rect.width>=width-2);const slide=await guide.locator('#slide').boundingBox();assert.ok(slide.width>width*.8);assert.equal(await guide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`/tmp/stam-guide-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:1440,height:1000});
 await guide.locator('video').evaluate(v=>Promise.race([v.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Video playback did not start within 15 seconds')),15000))]));await guide.waitForFunction(()=>document.querySelector('video').currentTime>0.5);assert.ok(await guide.locator('video').evaluate(v=>v.duration>=23&&v.duration<=25));await guide.locator('video').evaluate(v=>v.pause());
 await guide.locator('#return-main').click();await page.waitForSelector('.workspace-page',{state:'hidden'});assert.equal(await page.locator('#workspace-connection').getAttribute('data-state'),'watching');
 await page.locator('#workspace-updates').click();await page.waitForSelector('.workspace-page[open]');await page.evaluate(()=>history.back());await page.waitForSelector('.workspace-page',{state:'hidden'});assert.equal(context.pages().length,1);assert.equal(await page.locator('#workspace-connection').getAttribute('data-state'),'watching');
 await page.goto(service.origin+'/download.html');await page.waitForSelector('#app-download');await page.waitForFunction(()=>document.querySelector('#app-download').textContent==='Windows 앱 다운로드');assert.match(await page.locator('#app-download').getAttribute('href'),/github.com\/limmin3-sudo\/stam-freight-control\/releases\//);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.goto(service.origin+'/guide.html#cargo');await page.waitForSelector('#slide-title');assert.match(await page.locator('#slide-title').innerText(),/배송지/);await page.goBack();assert.equal(new URL(page.url()).pathname,'/download.html');

 await page.goto(service.origin+'/guide.html?lang=en#connect');await page.waitForSelector('.presenter-body');assert.equal(await page.locator('html').getAttribute('lang'),'en');
 for(let i=0;i<13;i++){await page.locator('#chapters button').nth(i).click();assert.equal(/[가-힣]/.test(await page.locator('#slide').innerText()),false,'English chapter '+i);}
 await page.locator('#chapters button').nth(2).click();await page.locator('#guide-extensions').click();assert.equal(await page.locator('#guide-log-name').innerText(),'Game.log');
 await page.locator('[data-guide-partner=navigator]').click();assert.match(await page.locator('.presenter-speech').innerText(),/Captain, select/);
 await page.reload();await page.waitForSelector('#slide-title');assert.equal(await page.locator('#counter').innerText(),'3 / 13');assert.equal(await page.locator('html').getAttribute('lang'),'en');
 assert.match(await page.locator('#return-main').getAttribute('href'),/lang=en/);
 await page.goto(service.origin+'/patch-notes.html');await page.waitForSelector('#releases article');assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(/[가-힣]/.test(await page.locator('#releases').innerText()),false);const versions=await page.locator('#releases article').count();assert.ok(versions>=72);
 await page.locator('.page-language [data-lang=ko]').click();await page.waitForSelector('#releases article');assert.equal(await page.locator('#releases article').count(),versions);assert.equal(await page.locator('html').getAttribute('lang'),'ko');
 await page.goto(service.origin+'/download.html?lang=en');await page.waitForFunction(()=>document.querySelector('#app-download')?.textContent==='Download for Windows');assert.equal(/[가-힣]/.test(await page.locator('main').innerText()),false);
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log(JSON.stringify({passed:true,slides:13,keyboard:true,deepLink:true,backToMainWithoutDisconnect:true,noAutoAudio:true,videoDuration:24,mobileOverflow:false,errors,bad}));
}finally{await browser?.close();await service.close();await rm(dir,{recursive:true,force:true});}
