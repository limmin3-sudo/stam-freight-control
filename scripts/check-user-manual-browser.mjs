import assert from 'node:assert/strict';import {mkdir,writeFile,readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');

const out=process.env.STAM_QA_OUTPUT||'/tmp/stam-user-manual-review',base=process.env.STAM_MANUAL_URL||'http://127.0.0.1:5174/';await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});const checks=[],errors=[],missing=[];
try{const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url());});await page.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
await page.goto(base+'#/mission?lang=ko');await page.locator('[data-partner=navigator]').click();await page.getByRole('button',{name:'예시 계약 보기',exact:true}).click();await page.locator('.receipt-card').first().getByRole('checkbox').check();const stored=await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1'));
await page.goto(base+'#/service?lang=ko');await page.locator('.service-catalogue>a').filter({has:page.getByRole('heading',{name:'이용안내',exact:true})}).click();await page.locator('.user-manual').waitFor();await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('.space-topbar').count(),1);assert.equal(await page.locator('.space-sidebar').count(),1);assert.equal(await page.locator('.manual-topics>a').count(),4);await page.screenshot({path:out+'/home-desktop.png'});checks.push('service guide entry, five topics, persistent topbar/sidebar');
await page.locator('.manual-feature').click();await page.locator('.manual-step').last().waitFor();assert.equal(await page.locator('.manual-step').count(),5);for(const img of await page.locator('.manual-shot img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}await page.locator('.space-room').evaluate(el=>el.scrollTo({top:0}));const urls=await page.locator('.manual-shot img').evaluateAll(imgs=>imgs.map(i=>i.src));assert.equal(new Set(urls).size,5);assert(urls.every(u=>u.includes('ko-')));assert.equal(await page.locator('.user-manual .ops-portrait,.user-manual video,.user-manual iframe').count(),0);await page.screenshot({path:out+'/first-flight-desktop.png'});
await page.locator('.manual-step-index button').nth(2).click();await page.screenshot({path:out+'/contract-step.png'});assert.equal(await page.locator('#manual-step-3').evaluate(el=>document.activeElement===el),true);checks.push('five unique matching real screenshots, step jumps, no people/video/iframe');
await page.reload();await page.locator('.manual-step').last().waitFor();assert.equal(await page.locator('.manual-step').count(),5);await page.locator('.manual-page-controls').first().getByRole('link').last().click();await page.locator('.manual-import-guide').waitFor();await page.goBack();await page.locator('.manual-step').last().waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),stored);checks.push('reload/back navigation and selected flight preserved');
for(const locale of ['en','mix']){await page.locator('.space-language select').selectOption(locale);await page.waitForFunction(locale=>document.querySelector('.manual-shot-prepare img')?.getAttribute('src')?.includes(locale+'-'),locale);for(const img of await page.locator('.manual-shot img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());const step=await img.evaluate(i=>i.closest('figure').className.match(/manual-shot-(\w+)/)[1]);const actual=await (await page.request.get(await img.getAttribute('src'))).body();const expected=await readFile('apps/control-room/src/assets/manual/'+locale+'-'+step+'.png');assert.equal(createHash('sha256').update(actual).digest('hex'),createHash('sha256').update(expected).digest('hex'));}assert.equal(await page.locator('.manual-step').count(),5);}checks.push('English and mixed mode use their own actual UI screenshots');
await page.setViewportSize({width:390,height:844});await page.goto(base+'#/service?lang=ko&section=manual');await page.locator('.manual-feature').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:out+'/home-mobile.png'});await page.locator('.manual-feature').click();await page.locator('.manual-step').last().waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:out+'/first-flight-mobile.png'});await page.locator('.manual-ready a').click();await page.locator('.mission-screen').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),stored);checks.push('mobile no overflow; actual-screen link keeps selected contracts');
await page.setViewportSize({width:1600,height:1000});await page.goto(base+'#/information?lang=ko');const manual=page.locator('.room-reference-library>a').filter({has:page.getByRole('heading',{name:'운송 이용안내',exact:true})});assert.equal(await manual.getAttribute('target'),null);await manual.click();await page.locator('.user-manual').waitFor();checks.push('archive manual opens within same persistent shell');
await page.goto(base+'#/service?lang=ko&section=manual&topic=import');await page.locator('.manual-import-guide').waitFor();
const release=JSON.parse(await readFile('data/desktop-release.json','utf8'));
assert.equal(await page.locator('.manual-installer-link').getAttribute('href'),release.installer?.url||release.url);
assert.equal(await page.locator('.manual-installer-link').getAttribute('href'),await page.locator('.space-download').getAttribute('href'));
assert.equal(await page.locator('.manual-import-guide .manual-step').count(),4);
for(const locale of ['ko','en','mix']){
 await page.locator('.space-language select').selectOption(locale);
 await page.waitForFunction(locale=>location.hash.includes('lang='+locale),locale);
 for(const img of await page.locator('.manual-shot img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
 assert.equal(await page.locator('.manual-shot img').count(),3);
 const urls=await page.locator('.manual-shot img').evaluateAll(imgs=>imgs.map(i=>i.src));assert.equal(new Set(urls).size,3);
}
await page.locator('.space-language select').selectOption('ko');
await page.locator('.space-room').evaluate(el=>el.scrollTo({top:0}));await page.screenshot({path:out+'/log-app-desktop.png'});
await page.setViewportSize({width:390,height:844});
for(const img of await page.locator('.manual-shot img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await page.locator('.space-room').evaluate(el=>el.scrollTo({top:0}));await page.screenshot({path:out+'/log-app-mobile.png'});
assert.equal(await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),stored);
checks.push('log app: four setup steps, three relevant screenshots, matching installer link, three languages/mobile and stored flight preserved');
await page.setViewportSize({width:1600,height:1000});
await page.goto(base+'#/service?lang=ko&section=manual&topic=save');await page.locator('.manual-save-guide').waitFor();
assert.equal(await page.locator('.manual-save-guide .manual-step').count(),4);
for(const locale of ['ko','en','mix']){
 await page.locator('.space-language select').selectOption(locale);
 await page.waitForFunction(locale=>location.hash.includes('lang='+locale),locale);
 for(const img of await page.locator('.manual-save-guide .manual-shot img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
 assert.equal(await page.locator('.manual-save-guide .manual-shot img').count(),3);
 const urls=await page.locator('.manual-save-guide .manual-shot img').evaluateAll(imgs=>imgs.map(i=>i.src));assert.equal(new Set(urls).size,3);
}
await page.locator('.space-language select').selectOption('ko');await page.locator('.space-room').evaluate(el=>el.scrollTo({top:0}));
await page.screenshot({path:out+'/account-guide-desktop.png'});
await page.locator('.manual-save-guide .manual-step').nth(2).scrollIntoViewIfNeeded();await page.screenshot({path:out+'/account-load-step.png'});
await page.setViewportSize({width:390,height:844});
for(const img of await page.locator('.manual-save-guide .manual-shot img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await page.locator('.space-room').evaluate(el=>el.scrollTo({top:0}));await page.screenshot({path:out+'/account-guide-mobile.png'});
await page.locator('.manual-save-guide a[href*="section=account"]').click();await page.locator('.flight-cloud-panel').waitFor();
assert.equal(await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),stored);
checks.push('account guide: save/load direction, four stages, three distinct screenshots, languages/mobile and account link preserve local flight');
await page.setViewportSize({width:1600,height:1000});
await page.goto(base+'#/service?lang=ko&section=manual&topic=flight');await page.locator('.manual-operations-guide').waitFor();
assert.equal(await page.locator('.manual-operations-guide .manual-step').count(),5);
for(const locale of ['ko','en','mix']){
 await page.locator('.space-language select').selectOption(locale);
 await page.waitForFunction(locale=>location.hash.includes('lang='+locale),locale);
 for(const img of await page.locator('.manual-operations-guide .manual-shot img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
 assert.equal(await page.locator('.manual-operations-guide .manual-shot img').count(),5);
 const urls=await page.locator('.manual-operations-guide .manual-shot img').evaluateAll(imgs=>imgs.map(i=>i.src));assert.equal(new Set(urls).size,5);
}
await page.locator('.space-language select').selectOption('ko');await page.locator('.space-room').evaluate(el=>el.scrollTo({top:0}));
await page.screenshot({path:out+'/operations-guide-desktop.png'});
await page.locator('.manual-operations-guide .manual-step').last().scrollIntoViewIfNeeded();await page.screenshot({path:out+'/operations-held-step.png'});
await page.setViewportSize({width:390,height:844});for(const img of await page.locator('.manual-operations-guide .manual-shot img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await page.locator('.space-room').evaluate(el=>el.scrollTo({top:0}));await page.screenshot({path:out+'/operations-guide-mobile.png'});
assert.equal(await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),stored);
assert.equal(await page.locator('.manual-operations-guide .manual-ready a').getAttribute('href'),'#/operations?lang=ko');
checks.push('operations guide: five distinct real controls, three languages, mobile and selected flight preserved');


assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await writeFile(out+'/browser-report.json',JSON.stringify({passed:true,checks,errors,missing,fixture:'isolated sample contracts; no production account writes'},null,2));console.log(checks);
}finally{await browser.close();}
