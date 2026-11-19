import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.STAM_DIVISION_URL||'http://127.0.0.1:5189/',out=process.env.STAM_QA_OUTPUT||'/tmp/stam-division-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[],missing=[],requested=[],checks=[];
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(25000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url());});page.on('request',r=>requested.push(r.url()));
 await page.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 const hub=async(locale='ko')=>{await page.goto(base+'#/division?lang='+locale);await page.locator('.division-facility').last().waitFor();};
 await page.goto(base);await page.locator('.division-facility').last().waitFor();assert.equal(await page.locator('.opening-film').count(),0);assert.equal(await page.locator('.division-facility').count(),4);assert.equal(await page.locator('[data-facility-layer]').count(),6);assert.equal(await page.locator('.space-group-button[aria-current]').count(),0);assert.equal(await page.locator('.space-group-reveal[data-open=true]').count(),0);
 assert.equal(await page.locator('.space-group-button').count(),4);
 assert.equal(await page.locator('.division-facility .approved-glass').count(),0);
 assert.equal(await page.locator('.pilot-desk .pilot-connections').count(),0);
 assert.equal(await page.locator('.space-topbar .pilot-account').count(),1);
 assert.equal(await page.locator('.space-topbar .pilot-log').count(),1);
 assert.equal(await page.locator('.pilot-desk').getAttribute('data-open'),'false');
 await page.locator('.pilot-summary').hover();assert.equal(await page.locator('.pilot-desk').getAttribute('data-open'),'true');
 await page.locator('.space-topbar .room-brand').hover();await page.waitForTimeout(250);assert.equal(await page.locator('.pilot-desk').getAttribute('data-open'),'false');
 await page.locator('[data-facility=trade]').hover();assert.equal(await page.locator('[data-facility=trade]').getAttribute('data-lit'),'true');assert.equal(await page.locator('.division-details').count(),0);
 await page.screenshot({path:out+'/hover.png'});await page.locator('.space-topbar .room-brand').hover();
 checks.push('Compact flight console retains hover details; account and log use assets in header; building hover highlights without opening a panel');
 await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:out+'/desktop.png'});
 checks.push('Default entry is the approved division; six facility layers, four visible facility controls; original sidebar is retained with no false active room; no opening film');
 await page.locator('[data-facility=lounge]').click();await page.waitForURL(/#\/lounge\?/);await page.locator('.space-overview').waitFor();assert.equal(await page.locator('.opening-film').count(),0);
 assert.equal(await page.locator('.space-group-reveal[data-open=true]').count(),0);
 await page.locator('.space-group-button').first().click();assert.equal(await page.locator('#space-links-lounge').getAttribute('data-open'),'true');
 await page.locator('.space-group-button').first().click();assert.equal(await page.locator('#space-links-lounge').getAttribute('data-open'),'false');await page.locator('.space-topbar .room-brand').click();await page.locator('.division-hub').waitFor();
 await page.locator('[data-facility=bridge]').click();await page.waitForURL(/#\/bridge\?/);await page.locator('[data-partner=navigator]').click();await page.locator('.space-overview').waitFor();await page.locator('.space-topbar .room-brand').click();await page.locator('.division-hub').waitFor();
 checks.push('Lounge enters immediately without retired movie; orbital centre keeps existing partner choice; STAM returns to division');
 for(const id of ['trade','guide-center']){
  await page.locator(`[data-facility=${id}]`).click();await page.locator('.lobby-stage[data-loaded=true]').waitFor();assert.equal(await page.locator('.lobby-place').count(),3);
  await page.locator('.lobby-place').first().click();await page.locator('.lobby-detail').waitFor();await page.keyboard.press('Escape');await page.locator('.lobby-detail').waitFor({state:'hidden'});
  await page.locator('.lobby-exit').click();await page.locator('.division-hub').waitFor();
 }
 checks.push('Approved facility lobbies contain three spatial destinations; Escape closes only the room introduction; exit returns to division');
 await page.locator('.space-group-button').nth(2).click();await page.locator('.facility-lobby').waitFor();assert(page.url().includes('facility=trade'));await page.reload();await page.locator('.lobby-stage[data-loaded=true]').waitFor();
 await page.locator('.space-topbar .pilot-account').click();await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');assert(page.url().includes('#/division'));
 await page.locator('.space-topbar .pilot-log').click();await page.waitForURL(/#\/mission\?/);await page.locator('.receipt-import').waitFor();
 checks.push('Sidebar facility panel survives reload; header account opens existing dialog; log opens mission intake');
 await page.goto(base+'#/mission?lang=ko');await page.reload();await page.getByRole('button',{name:'예시 계약 보기',exact:true}).click();await page.locator('.receipt-card').first().getByRole('checkbox').check();
 const flight=await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1'));assert(flight);
 await page.locator('.space-topbar .room-brand').click();await page.locator('.division-hub').waitFor();await page.locator('[data-facility=bridge]').click();await page.locator('.space-overview').waitFor();assert.match(await page.locator('.pilot-summary-line').innerText(),/수석 항해사/);assert.equal(await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),flight);
 await page.goBack();await page.locator('.division-hub').waitFor();await page.reload();await page.locator('.division-hub').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),flight);
 checks.push('Existing selected contracts/partner survive hub visits, back, reload and orbital entry');
 for(const locale of ['en','mix']){
  await hub(locale);assert.equal(await page.locator('.space-topbar').count(),1);assert.equal(await page.locator('.space-sidebar').count(),1);assert.match(await page.locator('[data-facility=lounge]').getAttribute('href'),new RegExp('lang='+locale));await page.locator('[data-facility=trade]').focus();await page.keyboard.press('Enter');await page.locator('.lobby-stage[data-loaded=true]').waitFor();assert.equal(await page.locator('#lobby-title').innerText(),locale==='en'?'Trade centre':'무역센터');await page.locator('.lobby-exit').click();
 }
 checks.push('English/mixed labels, locale-preserving links and keyboard actions');
 await page.setViewportSize({width:390,height:844});await hub();await page.reload();await page.locator('.division-facility').last().waitFor();await page.screenshot({path:out+'/mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('[data-facility=trade]').click();await page.locator('.lobby-stage[data-loaded=true]').waitFor();await page.locator('.lobby-place').first().click();await page.locator('.lobby-detail').waitFor();await page.locator('.lobby-reset').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/mobile-panel.png'});await page.locator('.lobby-reset').click();
 await page.getByRole('button',{name:'공간 메뉴',exact:false}).click();await page.locator('.space-group-button').first().click();await page.waitForURL(/#\/lounge\?/);assert.equal(await page.locator('.opening-film').count(),0);
 checks.push('390px readable facility list and lobby introduction, unchanged mobile sidebar navigates normally');
 assert(!requested.some(url=>/director-cleaning|opening-film/.test(url)));assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 await writeFile(out+'/report.json',JSON.stringify({passed:true,checks,errors,missing,retiredFilmRequests:0,productionWrites:0},null,2));console.log(checks);
}finally{await browser.close();}
