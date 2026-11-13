import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.STAM_PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.STAM_PREVIEW_URL||'http://127.0.0.1:5196/';
const path='docs/cinematics/desk-cinema-25d-20261113/';
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1280,height:980},recordVideo:{dir:'/tmp/stam-walk-clean-recording',size:{width:1280,height:980}}});const page=await context.newPage();
 await page.goto(base+path+'walk-study/index.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__walk.ready);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(600);
 for(let pass=0;pass<2;pass++){await page.locator('#walk-reset').click();await page.locator('#walk-play').click();await page.waitForFunction(()=>window.__walk.state.finished===true);await page.waitForTimeout(500);}
 await page.locator('#walk-reset').click();await page.locator('#walk-backdrop').click();await page.waitForTimeout(400);await page.locator('#walk-play').click();await page.waitForFunction(()=>window.__walk.state.finished===true);await page.waitForTimeout(800);
 const intervals=await page.evaluate(()=>window.__walk.frameIntervals);intervals.sort((a,b)=>a-b);const median=intervals[Math.floor(intervals.length/2)];
 await writeFile(fileURLToPath(new URL('./playback-metrics.json',import.meta.url)),JSON.stringify({medianFrameMs:Math.round(median*10)/10,approxMedianFps:Math.round(1000/median),environment:'Headless Chromium/SwiftShader with screen recording; hardware performance not measured',durationPerWalk:2.04,steps:3},null,2)+'\n');
 const first=page.video();await context.close();await first.saveAs('/tmp/stam-photo-walk-study.webm');
 const tourContext=await browser.newContext({viewport:{width:1280,height:980},recordVideo:{dir:'/tmp/stam-walk-tour-recording',size:{width:1280,height:980}}});const tour=await tourContext.newPage();
 await tour.goto(base+path+'index.html?walk=1',{waitUntil:'networkidle'});await tour.waitForFunction(()=>window.__tour.ready);await tour.evaluate(()=>document.fonts.ready);await tour.waitForTimeout(400);await tour.locator('#play').click();await tour.waitForFunction(()=>window.__tour.time>=16,{timeout:45000});await tour.frameLocator('#live-cinema').locator('.space-cinema').waitFor();await tour.waitForTimeout(1000);const second=tour.video();await tourContext.close();await second.saveAs('/tmp/stam-photo-walk-tour.webm');
 console.log('Recorded close-up walk and optional 2.5D tour.');
}finally{await browser.close();}
