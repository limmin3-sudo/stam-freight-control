import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const out=new URL('./review/',import.meta.url).pathname;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1595,height:858}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
await page.goto((process.env.STAM_PREVIEW_URL??'http://127.0.0.1:5173/')+'#/division?lang=ko');
await page.evaluate(()=>document.fonts.ready);
async function check(state){
 await page.waitForTimeout(700);
 const result=await page.evaluate(()=>{
  const rect=s=>document.querySelector(s).getBoundingClientRect();
  return {consoleBottom:rect('.pilot-desk').bottom,step:rect('.shell-connector').bottom,captionTop:rect('.space-sidebar-caption').top,buttonTop:rect('.space-division-button').top};
 });
 assert(result.step>result.consoleBottom&&result.step<result.captionTop&&result.step<result.buttonTop,JSON.stringify({state,...result}));
 checks.push({state,...result});
}
await check('collapsed');
await page.locator('.pilot-summary').click();await page.mouse.move(700,300);
await check('expanded');await page.screenshot({path:out+'housing-expanded.png'});
await page.setViewportSize({width:1024,height:500});await page.waitForTimeout(300);
await page.locator('.space-sidebar').evaluate(e=>e.scrollTop=45);
assert(await page.locator('.space-sidebar').evaluate(e=>e.scrollTop>0),'sidebar actually scrolled');
await check('scrolled');
await page.locator('.space-sidebar').evaluate(e=>e.scrollTop=0);
await page.setViewportSize({width:1595,height:858});
await page.locator('.pilot-summary').click();await page.mouse.move(700,300);
await check('collapsed-again');
await page.screenshot({path:out+'housing-final.png'});
assert.deepEqual(errors,[]);
await writeFile(out+'housing-checks.json',JSON.stringify({passed:true,checks,errors},null,2));
await browser.close();
