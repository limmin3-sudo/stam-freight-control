import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5186/';
const out=process.env.STAM_QA_OUTPUT||'/tmp/stam-room-optics';await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const p=await b.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});const errors=[],videoRequests=[];p.on('console',m=>{if(m.text().startsWith('OVERFLOW'))console.log(m.text());});p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().endsWith('.mp4'))videoRequests.push(r.url());});
 await p.goto(base+'#/information?lang=ko');await p.waitForSelector('.room-reference-library');await p.evaluate(()=>document.fonts.ready);
 const shell=async()=>({top:await p.locator('.space-topbar').boundingBox(),side:await p.locator('.space-main>.space-sidebar').boundingBox(),font:await p.locator('.space-group-button strong').first().evaluate(e=>({family:getComputedStyle(e).fontFamily,weight:getComputedStyle(e).fontWeight}))});const initial=await shell();
 for(const screen of ['information','service','cinema']){
  await p.locator(`.space-nav-links a[href*="${screen}"]`).click();await p.waitForSelector('.room-'+screen);await p.evaluate(()=>document.fonts.ready);
  assert.deepEqual(await shell(),initial);assert.equal(await p.locator('.space-room-heading a').count(),0,'room navigation belongs to the fixed sidebar');assert.equal(await p.locator('.space-nav-group').count(),2);assert.equal(await p.locator('.space-nav-links a[aria-current=page]').innerText().then(s=>s.includes({information:'정보실',service:'서비스센터',cinema:'영상관'}[screen])),true);
  const font=await p.locator('.space-room h1').evaluate(e=>({family:getComputedStyle(e).fontFamily,weight:getComputedStyle(e).fontWeight}));assert.match(font.family,/BarlowAirReview/);assert.equal(font.weight,'500');
  await p.screenshot({path:out+'/'+screen+'.png'});
  if(screen==='information'){assert.equal(await p.locator('.room-reference-library>a').count(),3);assert.match(await p.getByRole('link',{name:/미션 자료/}).getAttribute('href'),/operations-intel.html$/);}
  if(screen==='service'){await p.locator('.service-account-control button').click();await p.waitForSelector('dialog.account-dialog[open]');assert.match(await p.locator('.account-dialog').evaluate(e=>getComputedStyle(e).fontFamily),/BarlowAirReview/);await p.keyboard.press('Escape');assert.match(p.url(),/#\/service/,'closing account dialog stays in service');await p.getByRole('button',{name:/전체 운송기록/}).click();await p.waitForSelector('dialog.history-dialog[open]');assert.match(await p.locator('.history-dialog').evaluate(e=>getComputedStyle(e).fontFamily),/BarlowAirReview/);await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);assert.match(p.url(),/#\/service/,'closing history stays in service');}
 }
 assert.equal(videoRequests.length,0,'cinema loads no video before explicit play');
 await p.getByRole('button',{name:'STAM 소개영상 재생',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.space-screen video')?.currentTime>0,{timeout:30000});assert(videoRequests.length>0);await p.locator('.space-nav-links a[href*="information"]').click();assert.equal(await p.locator('video').count(),0,'leaving cinema removes playback');
 for(const lang of ['en','mix','ko']){await p.locator('.space-language select').selectOption(lang);for(const screen of ['information','service','cinema']){await p.locator(`.space-nav-links a[href*="${screen}"]`).click();await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await p.locator('.space-room').evaluate(e=>{if(e.scrollWidth>e.clientWidth+1)console.log('OVERFLOW '+location.hash+' '+e.scrollWidth+'/'+e.clientWidth);return e.scrollWidth<=e.clientWidth+1;}));assert.match(await p.locator('.space-room h1').evaluate(e=>getComputedStyle(e).fontFamily),/BarlowAirReview/);await p.screenshot({path:out+'/'+screen+'-mobile.png'});await p.setViewportSize({width:1920,height:1080});}}
 assert.deepEqual(errors,[]);console.log('PASS: information/service/cinema share Barlow 500 + fixed accordion sidebar/header; reference links, account/history dialogs, click-only video playback/cleanup, KO/mix/EN mobile overflow');
}finally{await b.close();}
