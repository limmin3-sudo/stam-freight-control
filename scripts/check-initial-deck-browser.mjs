import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startLogService} from '../integration/log/live-server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const dir=await mkdtemp(join(tmpdir(),'stam-first-')),file=join(dir,'Game.log');await writeFile(file,'');
const service=await startLogService({file});let browser;
try{
 browser=await chromium.launch({...(process.env.STAM_CHROMIUM_PATH?{executablePath:process.env.STAM_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(service.origin+'/index.html');
 await page.waitForSelector('.preview-map-canvas canvas');await page.waitForSelector('.preview-canvas canvas');
 assert.equal(await page.locator('.workspace-standby').count(),0);assert.equal(await page.locator('#connection-dialog').isVisible(),false);
 assert.equal(await page.locator('.preview-operations').isVisible(),true);
 const map=await page.locator('.preview-map-viewport').boundingBox(),rail=await page.locator('.preview-operations').boundingBox();
 await page.screenshot({path:'/tmp/stam-initial-debug.png',fullPage:true});console.log(JSON.stringify(await page.evaluate(()=>[...document.querySelector('.preview-center').children,...document.querySelector('.preview-map-section').children].map(n=>({c:n.className,y:n.getBoundingClientRect().y,h:n.getBoundingClientRect().height,display:getComputedStyle(n).display})))));await page.screenshot({path:'/tmp/stam-first-viewport.png'});
 assert.ok(map.y<280);assert.ok(map.width>1000);assert.ok(map.height>=700);assert.ok(rail.x>map.x+map.width);
 await page.screenshot({path:'/tmp/stam-initial-1920.png',fullPage:true});
 await page.locator('#workspace-connection').click();assert.equal(await page.locator('#connection-dialog').isVisible(),true);assert.equal(await page.locator('#replay-controls').isVisible(),true);
 await page.locator('#connection-close').click();assert.equal(await page.locator('canvas').count(),2);
 await page.locator('#flight-ready-action').click();assert.equal(await page.locator('.ready-settings-dialog').isVisible(),true);await page.locator('.ready-settings-dialog header button').click();
 await page.locator('.preview-desk-launch').click();assert.equal(await page.locator('.preview-control-mode').isVisible(),true);assert.equal(await page.locator('canvas').count(),2);await page.screenshot({path:'/tmp/stam-control-idle.png',fullPage:true});await page.keyboard.press('Escape');
 for(const width of [2560,1366,390]){await page.setViewportSize({width,height:width===2560?1440:width===390?844:900});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`/tmp/stam-initial-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:1920,height:1080});await page.goto(service.origin+'/guide.html#connect');await page.waitForSelector('.presenter-body');
 await page.waitForFunction(()=>document.querySelector('.guide-presenter')?.dataset.gesture==='4');assert.equal(await page.locator('.presenter-target.pointed').count(),1);
 await page.screenshot({path:'/tmp/stam-guide-presenter.png',fullPage:true});
 await page.locator('[data-guide-partner=navigator]').click();assert.equal(await page.locator('.guide-presenter').getAttribute('data-partner'),'navigator');await page.locator('.gesture-toggle').click();assert.equal(await page.locator('.guide-presenter').evaluate(n=>n.classList.contains('gestures-paused')),true);
 assert.deepEqual(errors,[]);console.log('PASS: first visit without logs has full map, route rail and equipment cards; modal connection; original control layout; full-body guide gestures and pause.');
}finally{await browser?.close();await service.close();await rm(dir,{recursive:true,force:true});}
