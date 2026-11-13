import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.STAM_PLAYWRIGHT_MODULE||'playwright-core');import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const out=fileURLToPath(new URL('./',import.meta.url));
const preview=process.env.STAM_PREVIEW_URL||'http://127.0.0.1:5185/';
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});const errors=[],checks=[];
try{
 const ctx=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'no-preference',recordVideo:{dir:'/tmp/stam-archive-recording',size:{width:1366,height:768}}});ctx.setDefaultTimeout(15000);
 await ctx.addInitScript(()=>sessionStorage.setItem('stam:director-opening:v1','1'));
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 const go=async(hash)=>{await page.goto(preview+hash,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);};
 await go('#/information?lang=ko');
 const before=await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1'));
 const chrome=await page.locator('.space-topbar').boundingBox();
 assert.equal(await page.locator('#archive-subnavigation').getAttribute('data-open'),'true');
 assert.match(await page.locator('#archive-subnavigation').textContent(),/미션 자료/);
 const link=page.locator('.room-reference-library>a').filter({has:page.getByRole('heading',{name:'미션 자료',exact:true})});assert.equal(await link.getAttribute('target'),null);
 await page.evaluate(()=>{window.__pulseDurations=[];const root=document.querySelector('.space-main');new MutationObserver(()=>{const n=document.querySelector('.archive-view-pulse');if(n&&!n.dataset.seen){n.dataset.seen='1';window.__pulseDurations.push(getComputedStyle(n).animationDuration);}}).observe(root,{childList:true,subtree:true});});
 await link.click();await page.waitForURL('**/#/information?lang=ko&view=missions');await page.waitForSelector('.archive-card');
 assert.equal(ctx.pages().length,1);assert.deepEqual(await page.evaluate(()=>window.__pulseDurations),['0.25s']);
 assert.equal(await page.locator('.space-experience').getAttribute('data-entry'),null);assert.equal(await page.locator('.space-topbar').boundingBox().then(b=>b.height),chrome.height);
 assert.equal(await page.locator('#archive-subnavigation a').getAttribute('aria-current'),'page');
 assert.match(await page.locator('.archive-result-bar p').innerText(),/1,274.*1,274.*1,396/);assert.equal(await page.locator('.archive-card').count(),24);
 await page.screenshot({path:out+'missions-desktop.png'});
 await page.locator('.archive-more').click();assert.equal(await page.locator('.archive-card').count(),48);
 await page.locator('.archive-search input').fill('__no_matching_catalogue_19874__');await page.waitForSelector('.archive-load-state');assert.equal(await page.locator('.archive-card').count(),0);
 await page.getByRole('button',{name:'필터 초기화',exact:true}).click();await page.waitForSelector('.archive-card');
 await page.locator('.archive-filters select').nth(3).selectOption('reward');await page.waitForFunction(()=>document.querySelector('.archive-card')?.getAttribute('data-definition')==='3851d869-8eb9-4117-9aef-05757e90c631');
 await page.locator('.archive-card').first().locator('details>summary').first().click();await page.screenshot({path:out+'mission-details.png'});
 const firstCompany=await page.locator('.archive-filters select').nth(0).locator('option').nth(1).getAttribute('value');await page.locator('.archive-filters select').nth(0).selectOption(firstCompany);assert.ok(await page.locator('.archive-card').count()>0);
 await page.getByRole('button',{name:'필터 초기화',exact:true}).click();
 await page.reload({waitUntil:'networkidle'});await page.waitForSelector('.archive-card');assert.match(page.url(),/view=missions/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),before);
 await page.keyboard.press('Escape');await page.waitForURL('**/#/information?lang=ko');await page.waitForSelector('.room-reference-library');assert.match(await page.locator('.space-topbar').innerText(),/STAM/);
 await page.locator('#archive-subnavigation a').click();await page.waitForSelector('.archive-card');await page.goBack();await page.waitForSelector('.room-reference-library');await page.goForward();await page.waitForSelector('.archive-card');
 checks.push('Native same-tab route; 250ms content-only pulse; fixed chrome/FLIGHT CONSOLE; child menu; 1274 types/1396 definitions; paging/search/empty/reset/company/reward parity/details; reload/history/Escape; flight storage unchanged');
 for(const lang of ['mix','en']){await go('#/information?lang='+lang+'&view=missions');await page.waitForSelector('.archive-card');assert.equal(await page.locator('.space-group-button strong').first().innerText(),'SPACEPORT LOUNGE');assert.equal(await page.locator('#archive-subnavigation a').getAttribute('aria-current'),'page');if(lang==='mix')assert.match(await page.locator('.archive-goods').first().innerText(),/[A-Za-z]/);checks.push(lang+': subpage/locale round-trip and English fixed brands; English game commodities');}
 await page.setViewportSize({width:390,height:844});await go('#/information?lang=ko&view=missions');await page.waitForSelector('.archive-card');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.waitForTimeout(650);assert.ok((await page.locator('#space-navigation').boundingBox()).x + (await page.locator('#space-navigation').boundingBox()).width <= 0);await page.screenshot({path:out+'missions-mobile.png'});
 await page.getByRole('button',{name:/공간 메뉴/}).click();await page.waitForTimeout(650);await page.screenshot({path:out+'submenu-mobile.png'});await page.locator('.space-room-link>a[href="#/information?lang=ko"]').click();await page.waitForSelector('.room-reference-library');await page.getByRole('button',{name:/공간 메뉴/}).click();await page.locator('#archive-subnavigation a').click();await page.waitForSelector('.archive-card');assert.equal(await page.locator('#space-navigation').getAttribute('data-mobile-open'),'false');checks.push('390px: no page overflow; nested menu available; child selection closes mobile drawer');
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(preview+'#/information?lang=ko');await page.waitForSelector('.room-reference-library');await page.locator('#archive-subnavigation a').evaluate(n=>n.click());await page.waitForSelector('.archive-card');assert.equal(await page.locator('.archive-view-pulse').count(),0);checks.push('Reduced motion skips body pulse');
 assert.deepEqual(errors,[]);await writeFile(out+'checks.json',JSON.stringify({checks,errors},null,2)+'\n');console.log(checks.join('\n'));const video=page.video();await ctx.close();await video.saveAs(out+'archive-navigation.webm');
 // Cold data failure: sidebar remains available; retry uses the same bundled reference files.
 const bad=await browser.newContext({viewport:{width:1366,height:768}});await bad.addInitScript(()=>sessionStorage.setItem('stam:director-opening:v1','1'));const p=await bad.newPage();
 await p.route('**/assets/mission-details-*.json',route=>route.abort());await p.goto(preview+'#/information?lang=ko&view=missions',{waitUntil:'networkidle'});await p.waitForSelector('.archive-load-state[role=alert]');assert.ok(await p.locator('.space-group-button').count());await p.unroute('**/assets/mission-details-*.json');await p.getByRole('button',{name:'다시 시도',exact:true}).click();await p.waitForSelector('.archive-card');await writeFile(out+'failure-retry.json',JSON.stringify({dataFailureKeepsNavigation:true,retryRecovers:true},null,2)+'\n');await bad.close();console.log('PASS failed reference fetch preserves shell; retry recovers');
}finally{await browser.close();}
