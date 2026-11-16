import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.STAM_MANUAL_URL||'http://127.0.0.1:5189/',out=process.env.STAM_QA_OUTPUT||'/tmp/stam-troubleshooting-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});const errors=[],missing=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url());});await page.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 await page.goto(base+'#/mission?lang=ko');await page.locator('[data-partner=navigator]').click();await page.getByRole('button',{name:'예시 계약 보기',exact:true}).click();await page.locator('.receipt-card').first().getByRole('checkbox').check();const stored=await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1'));
 const open=async locale=>{await page.goto(base+'#/service?lang='+locale+'&section=manual&topic=trouble');await page.locator('.manual-troubleshooting').waitFor();};
 for(const locale of ['ko','en','mix']){
  await open(locale);assert.equal(await page.locator('.manual-issue').count(),4);if(locale==='ko')assert.equal(await page.locator('.manual-issue[open]').count(),1);
  assert.equal(await page.locator('.manual-troubleshooting img, .manual-troubleshooting video, .manual-troubleshooting iframe').count(),0);
  for(let i=0;i<4;i++){
   const item=page.locator('.manual-issue').nth(i);if(await item.getAttribute('open')===null){await item.locator('summary').focus();await page.keyboard.press('Enter');}
   await item.locator('.manual-issue-content').waitFor({state:'visible'});assert.equal(await item.locator('h3').count(),2);
   for(const a of await item.getByRole('link').all())assert((await a.getAttribute('href')).includes('lang='+locale));
  }
  assert.equal(await page.locator('.space-topbar').count(),1);assert.equal(await page.locator('.space-sidebar').count(),1);
 }
 checks.push('four symptom sections, keyboard disclosure, three locales, no repeated screenshots, persistent shell');
 await open('ko');for(const item of await page.locator('.manual-issue').all()){const first=await item.locator('.manual-issue-number').innerText()==='01';if((await item.getAttribute('open')!==null)!==first)await item.locator('summary').click();}await page.evaluate(()=>document.fonts.ready);await page.locator('.space-room').evaluate(el=>el.scrollTo({top:0}));await page.screenshot({path:out+'/troubleshooting-desktop.png'});
 const targets=['mission','mission','operations','service'];
 for(let i=0;i<4;i++){
  await open('ko');const item=page.locator('.manual-issue').nth(i);if(i)await item.locator('summary').click();
  await item.locator('.manual-inline-link').click();await page.locator('.manual-article-heading').waitFor();assert(!page.url().includes('topic=trouble'));
  await page.goBack();await page.locator('.manual-troubleshooting').waitFor();const itemAgain=page.locator('.manual-issue').nth(i);if(await itemAgain.getAttribute('open')===null)await itemAgain.locator('summary').click();
  await itemAgain.locator('.manual-action').click();await page.waitForURL(url=>url.hash.startsWith('#/'+targets[i]+'?')&&!url.hash.includes('section=manual'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),stored);
 }
 checks.push('all guide links and direct screen links work without changing selected flight');
 await open('ko');await page.locator('.manual-ready a').click();await page.locator('.service-feedback').waitFor();assert.equal(await page.locator('.service-feedback textarea').inputValue(),'');assert.equal(await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),stored);
 checks.push('feedback opens without submission or changes to the flight');
 await page.setViewportSize({width:390,height:844});await open('ko');for(const item of await page.locator('.manual-issue').all()){if(await item.getAttribute('open')===null)await item.locator('summary').click();await item.scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.locator('.space-room').evaluate(el=>el.scrollTo({top:0}));await page.screenshot({path:out+'/troubleshooting-mobile.png'});checks.push('390px expanded sections do not overflow');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await writeFile(out+'/report.json',JSON.stringify({passed:true,checks,errors,missing,productionWrites:0},null,2));console.log(checks);
}finally{await browser.close();}
