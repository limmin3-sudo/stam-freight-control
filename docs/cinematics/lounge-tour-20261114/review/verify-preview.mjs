import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.STAM_PLAYWRIGHT_MODULE||'playwright-core');
const out=fileURLToPath(new URL('./',import.meta.url));
const recording=process.env.STAM_RECORDING_DIR||'/tmp/stam-lounge-tour-recording';
await mkdir(recording,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const url=process.env.STAM_PREVIEW_URL||'http://127.0.0.1:5197/';
const errors=[],badResponses=[],discarded=[],loaded=new Set(),checks=[];
try{
 const context=await browser.newContext({viewport:{width:1280,height:1000},recordVideo:{dir:recording,size:{width:1280,height:1000}}});
 await context.addInitScript(()=>sessionStorage.setItem('stam:director-opening:v1','1'));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()});});page.on('request',r=>{if(/\/lounge-original\.png(?:$|\?)/.test(r.url()))discarded.push(r.url());if(/guide-(escort|cinema|archive|service|waiting)\.png$/.test(r.url()))loaded.add(r.url().split('/').pop());});
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__tour?.ready);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:out+'desktop-desk.png'});
 const app=page.frameLocator('#app');assert.equal(await app.locator('.space-topbar').count(),1);assert.equal(await app.locator('.space-sidebar').count(),1);
 await page.locator('#play').click();await page.waitForTimeout(500);await page.locator('#pause').click();const paused=await page.evaluate(()=>__tour.time);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>__tour.time),paused);checks.push('Start and pause work; pause freezes the timeline.');
 await page.locator('#replay').click();await page.locator('#skip').click();await page.waitForFunction(()=>__tour.menuReady&&document.getElementById('travel').hidden);assert.equal(await app.locator('.space-cinema').count(),1);checks.push('Direct arrival skip waits for the real cinema DOM and does not stay on a frozen standby image.');
 await page.screenshot({path:out+'desktop-cinema-screen.png'});
 for(const [index,selector,name] of [[1,'.room-reference-library','archive'],[2,'.space-service','service']]){
  await page.locator('#next').click();assert.equal(await page.evaluate(()=>__tour.stop),index);await page.locator('#skip').click();await page.waitForFunction(()=>__tour.menuReady&&document.getElementById('travel').hidden);assert.equal(await app.locator(selector).count(),1);await page.screenshot({path:out+`desktop-${name}-screen.png`});
 }
 await page.locator('#next').click();assert.equal(await page.evaluate(()=>__tour.stop),3);await page.locator('#skip').click();assert.equal(await page.evaluate(()=>__tour.phase),'gate');assert.equal(await page.evaluate(()=>__tour.activeRoute),'lounge');await page.screenshot({path:out+'desktop-gate.png'});await page.locator('#next').click();assert.match(await page.locator('#status').innerText(),/투어 완료/);checks.push('Cinema → Archive → Service Center → Gate advances in order. The gate stops before boarding; existing shuttle playback is not started.');
 const aspects=await page.evaluate(()=>__tour.guideAssets);for(const asset of Object.values(aspects))assert.ok(Math.abs(asset.source-asset.rendered)<1e-6);assert.equal(loaded.size,5);assert.equal(await page.locator('#travel video').count(),0);checks.push('All five new transparent guide assets load and retain their source aspect ratio. Travel has no video element. This is not a likeness or walking-quality guarantee.');
 await page.evaluate(()=>__tour.seek(12,1));await page.waitForFunction(()=>__tour.menuReady&&document.getElementById('travel').hidden);await app.locator('.space-sidebar a[href="#/service?lang=ko"]').click();await page.waitForTimeout(700);assert.equal(await page.locator('#travel').isHidden(),true);assert.equal(await page.locator('#caption').isHidden(),true);assert.equal(await app.locator('.space-topbar').count(),1);checks.push('Using the real sidebar exits the preview overlay and preserves normal app navigation/chrome.');
 await page.setViewportSize({width:390,height:844});await page.locator('#replay').click();await page.screenshot({path:out+'mobile-desk.png',fullPage:true});
 for(const i of [0,1,2,3]){await page.evaluate(i=>__tour.seek(12,i),i);if(i<3)await page.waitForFunction(()=>__tour.menuReady&&document.getElementById('travel').hidden);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await page.locator('#caption').evaluate(n=>parseFloat(getComputedStyle(n).fontSize))>=12);await page.screenshot({path:out+`mobile-${['cinema','archive','service','gate'][i]}.png`,fullPage:true});}
 checks.push('All four stops work at 390px without page horizontal overflow; captions remain readable outside the small photographic view.');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#replay').click();await page.locator('#play').click();await page.waitForFunction(()=>__tour.time>=9.3);assert.equal(await page.locator('#plasma').evaluate(n=>n.style.opacity),'0');await page.locator('#pause').click();checks.push('Reduced-motion skips camera travel and disables the plasma flash.');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1280,height:1000});await page.locator('#replay').click();await page.locator('#auto').check();
 // The continuous recording is taken from the real running browser, with no
 // synthetic frame interpolation or raster stretching.
 const clean=await context.newPage();await clean.goto(url,{waitUntil:'networkidle'});await clean.waitForFunction(()=>window.__tour?.ready);await clean.locator('#auto').check();await clean.locator('#play').click();
 for(let i=0;i<4;i++){await clean.waitForFunction(i=>__tour.stop>i||(__tour.stop===i&&__tour.time>=14),i,{timeout:180000});console.log('Recorded stop',i+1);}
 assert.equal(await clean.evaluate(()=>__tour.stop),3);assert.equal(await clean.evaluate(()=>__tour.phase),'gate');const metrics=await clean.evaluate(()=>__tour.metrics());assert.equal(metrics.playing,false);assert.deepEqual(metrics.menuSeen.sort(),['cinema','information','service']);checks.push('Continuous real-time playback reaches all four destinations and finishes at the gate.');
 const video=clean.video();await clean.close();await video.saveAs(recording+'/lounge-tour-realtime-original.webm');
 await page.goto(new URL('docs/cinematics/lounge-tour-20261114/assets.html',url).href,{waitUntil:'networkidle'});await page.screenshot({path:out+'guide-assets-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);assert.deepEqual(discarded,[]);checks.push('No page errors, failed HTTP responses or discarded kiosk-background requests in tested flow.');
 const samples=metrics.frames.filter(n=>n>0).sort((a,b)=>a-b),median=samples[Math.floor(samples.length/2)];
 await writeFile(out+'checks.json',JSON.stringify({checks,errors,badResponses,discarded,newAssets:[...loaded],sourceAspects:aspects,softwareBrowser:{medianTimelineCallbackIntervalMs:median,approxMedianTimelineHz:Math.round(1000/median),note:'Headless Chromium with SwiftShader and recording. Timeline callbacks include menu holds; not measured moving-render FPS or a hardware FPS guarantee'},continuousRecording:'lounge-tour-realtime-original.webm',menuSeen:metrics.menuSeen},null,2)+'\n');
 console.log(JSON.stringify({checks,errors,badResponses},null,2));await context.close();
}finally{await browser.close();}
