import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_SHUTTLE_URL||'http://127.0.0.1:5184/';
const output=process.env.STAM_QA_OUTPUT||'/tmp/stam-shuttle-review';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[],key='stam.control-room.flight.v1';
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:.75});
 await context.addInitScript(()=>sessionStorage.setItem('stam:director-opening:v1','1'));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#/lounge?lang=ko');
 // A real calculated, partially completed flight remains byte-for-byte intact.
 if(!process.env.STAM_SHUTTLE_PUBLIC){await page.evaluate(async key=>{
  const {emptyDraft,samples}=await import('/src/mission-trial.ts');const {calculateFlight}=await import('/src/flight-engine.mjs');
  const {blankRun,startRun,completeStep,pauseRun}=await import('/src/flight-session.ts');
  const draft={...emptyDraft(),partner:'navigator',jobs:[samples[0]],reviewed:true};const plan=calculateFlight(draft);
  const run=pauseRun(completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000),4000);
  localStorage.setItem(key,JSON.stringify({version:1,draft,plan,run}));
 },key);await page.reload();}
 const saved=await page.evaluate(key=>localStorage.getItem(key),key);
 const gate=()=>page.locator('#space-marker-gate');
 const enter=async()=>{await page.waitForFunction(()=>{const image=document.querySelector('.space-background');return image?.complete&&image.naturalWidth>0;});await gate().click();await page.waitForSelector('.shuttle-boarding[open]');};
 await enter();let video=page.locator('.shuttle-boarding video');
 await page.waitForFunction(()=>{const v=document.querySelector('.shuttle-boarding video');return v?.currentTime>.4&&!v.paused;});
 assert(Math.abs(await video.evaluate(v=>v.duration)-23.833333)<.03);
 assert.match(await video.evaluate(v=>v.currentSrc),/lounge-to-shuttle-boarding/);
 assert(await video.evaluate(v=>v.playsInline&&v.muted));
 await page.getByRole('button',{name:'소리 꺼짐',exact:true}).click();assert.equal(await video.evaluate(v=>v.muted),false);
 assert.equal(await video.evaluate(v=>v.volume),.2);
 await page.screenshot({path:output+'/boarding-desktop.png'});
 // Follow real playback across both restored segments and into boarding.
 // The old 9.2s boarding duration must not send us to bridge mid-journey.
 for(const [time,name] of [[7,'gate-exit'],[12,'shuttle-landing'],[16,'shuttle-boarding']]){
  await page.waitForFunction(t=>document.querySelector('.shuttle-boarding video')?.currentTime>=t,time,{timeout:15000});
  assert.match(page.url(),/#\/lounge/);assert.equal(await page.locator('.shuttle-boarding[open]').count(),1);
  await page.screenshot({path:output+'/'+name+'-desktop.png'});
 }
 // Wait for the actual ended event; never synthesize it for the natural path.
 await page.waitForFunction(()=>location.hash.includes('/bridge?'),{},{timeout:30000});assert.equal(await page.locator('.shuttle-boarding').count(),0);
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved);console.log('PASS: natural 23.833s gate approach → exit/landing → boarding playback, audio controls, destination and flight preservation');
 await page.evaluate(()=>location.hash='#/lounge?lang=ko');await enter();
 await page.getByRole('button',{name:'취소',exact:true}).click();assert.match(page.url(),/#\/lounge/);assert.equal(await page.locator('.shuttle-boarding').count(),0);
 await enter();await page.keyboard.press('Escape');assert.equal(await page.locator('.shuttle-boarding').count(),0);assert.match(page.url(),/#\/lounge/);
 // Cancel remains usable in both restored travel and the original boarding tail.
 for(const time of [7,17]){
  await enter();await page.waitForFunction(()=>document.querySelector('.shuttle-boarding video')?.readyState>=2);
  await page.locator('.shuttle-boarding video').evaluate((v,t)=>{v.currentTime=t;},time);
  await page.getByRole('button',{name:'취소',exact:true}).click();assert.match(page.url(),/#\/lounge/);
  assert.equal(await page.locator('.shuttle-boarding').count(),0);
 }
 await enter();await page.getByRole('button',{name:'관제센터로 바로 이동',exact:true}).click();await page.waitForURL(/#\/bridge/);
 await page.evaluate(()=>location.hash='#/lounge?lang=ko');await page.locator('.space-dock a[href*="/bridge"]').click();await page.waitForURL(/#\/bridge/);assert.equal(await page.locator('.shuttle-boarding').count(),0);
 await page.evaluate(()=>location.hash='#/lounge?lang=ko');await enter();await page.evaluate(()=>location.hash='#/information?lang=ko');await page.waitForSelector('[data-screen=information]');assert.equal(await page.locator('.shuttle-boarding').count(),0);
 console.log('PASS: cancel, Escape, skip, shortcut and external navigation clean up playback');
 // Failed network remains escapable and keeps the working destination.
 await page.route('**/*shuttle-boarding*.mp4',route=>route.abort());await page.evaluate(()=>location.hash='#/lounge?lang=ko');await enter();
 await page.getByRole('status').filter({hasText:'영상을 불러오지 못했습니다'}).waitFor();await page.getByRole('button',{name:'관제센터로 바로 이동',exact:true}).click();await page.waitForURL(/#\/bridge/);await page.unroute('**/*shuttle-boarding*.mp4');
 const mobile=await context.newPage();mobile.on('pageerror',e=>errors.push(e.message));await mobile.setViewportSize({width:390,height:844});
 await mobile.goto(base+'#/lounge?lang=en');await mobile.waitForFunction(()=>{const i=document.querySelector('.space-background');return i?.complete&&i.naturalWidth>0;});await mobile.locator('#space-marker-gate').click();await mobile.waitForSelector('.shuttle-boarding[open]');
 await mobile.waitForFunction(()=>document.querySelector('.shuttle-boarding video')?.currentTime>.3);
 assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const r of await mobile.locator('.shuttle-boarding button').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,bottom:r.bottom,h:r.height};})))assert(r.x>=0&&r.right<=390&&r.bottom<=844&&r.h>=44);
 await mobile.screenshot({path:output+'/boarding-mobile.png'});
 await mobile.locator('.shuttle-boarding video').evaluate(v=>{v.currentTime=16;});
 await mobile.waitForFunction(()=>{const v=document.querySelector('.shuttle-boarding video');return v&&!v.seeking&&v.currentTime>=16;});
 await mobile.screenshot({path:output+'/shuttle-boarding-mobile.png'});
 await mobile.getByRole('button',{name:'Cancel',exact:true}).click();
 await mobile.emulateMedia({reducedMotion:'reduce'});await mobile.locator('#space-marker-gate').click();await mobile.waitForURL(/#\/bridge/);assert.equal(await mobile.locator('.shuttle-boarding').count(),0);
 console.log('PASS: load failure fallback, 390px controls, English and reduced-motion bypass');
 // Browser autoplay refusal exposes a working user-gesture retry.
 await page.evaluate(()=>location.hash='#/lounge?lang=ko');await page.evaluate(()=>{const original=HTMLMediaElement.prototype.play;window.__restorePlay=()=>{HTMLMediaElement.prototype.play=original;};HTMLMediaElement.prototype.play=function(){if(this.currentSrc.includes('shuttle-boarding')||this.src.includes('shuttle-boarding')){this.autoplay=false;this.pause();return Promise.reject(new DOMException('Blocked','NotAllowedError'));}return original.call(this);};});
 await enter();await page.getByRole('button',{name:'영상 재생',exact:true}).waitFor();await page.evaluate(()=>window.__restorePlay());await page.getByRole('button',{name:'영상 재생',exact:true}).click();await page.waitForFunction(()=>{const v=document.querySelector('.shuttle-boarding video');return v?.currentTime>.2&&!v.paused;});
 await page.getByRole('button',{name:'취소',exact:true}).click();assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved);
 assert.deepEqual(errors,[]);console.log('PASS: autoplay retry, no page errors, stored flight unchanged');
}finally{await browser.close();}
