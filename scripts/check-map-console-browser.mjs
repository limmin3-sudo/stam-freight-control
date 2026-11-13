import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {chooseInitialPartner} from './browser-partner-choice.mjs';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5186/',out=process.env.STAM_QA_OUTPUT||'/tmp/stam-map-console';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>localStorage.setItem('vh-map-quality','normal'));
 await p.goto(base+'#/mission?lang=ko');await chooseInitialPartner(p,'navigator');await p.getByRole('button',{name:'예시 계약 보기',exact:true}).click();
 for(const i of [0,2])await p.locator('.receipt-card').nth(i).getByRole('checkbox').check();await p.locator('.dispatch-launch').click();
 const canvas=p.locator('.chart-space canvas'),settle=async()=>{await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await p.waitForSelector('.chart-space canvas[data-settled=true]',{timeout:60000});};await settle();
 const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('stam.control-room.flight.v1'))),before=await state();
 assert.equal(await p.locator('.chart-space .navigation-chart').getAttribute('tabindex'),'0');
 const rects=await p.locator('.chart-space,.chart-itinerary').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));assert(rects[0].right<=rects[1].x);assert.equal(rects[0].y,rects[1].y);assert.equal(rects[0].bottom,rects[1].bottom);
 assert.match(await p.locator('.map-monitor').evaluate(n=>getComputedStyle(n).fontFamily),/BarlowAirReview/);
 await p.locator('.chart-stop-select').nth(2).click();await settle();assert.equal(await p.locator('.chart-stop-details:visible').count(),1);await p.getByRole('button',{name:'전체 보기',exact:true}).click();await settle();await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:out+'/overview.png'});
 await p.locator('.chart-explore-toggle').click();const search=p.getByRole('combobox',{name:'거점 검색',exact:true});
 await search.fill('Lorville');await p.locator('.chart-explore [role=option]').first().click();await settle();assert.equal(await p.locator('.chart-stop-select').first().getAttribute('aria-expanded'),'true','search synchronizes the itinerary');
 await p.locator('.chart-stop-select').nth(1).click();await settle();await search.fill('Lorville');await p.locator('.chart-explore [role=option]').first().click();assert.equal(await p.locator('.chart-stop-select').nth(1).getAttribute('aria-expanded'),'true','same place retains the selected repeated visit');
 await p.locator('.chart-stop-select').nth(2).click();await settle();await p.waitForFunction(()=>document.querySelector('.chart-space canvas')?.dataset.focus==='stanton:c6535844-c615-494e-9dc1-c2d0c6e7190a');await p.locator('.chart-space .navigation-chart').press('f');await p.waitForFunction(()=>document.querySelector('.map-crumbs')?.textContent.includes('아크콥'));await settle();assert.match(await p.locator('.map-crumbs').innerText(),/ArcCorp|아크콥/,'F follows the selected route visit');
 await search.fill('microTech');await p.locator('.chart-explore [role=option]').first().click();await settle();await p.locator('.chart-explore-toggle').click();await p.screenshot({path:out+'/planet.png'});
 await p.locator('.chart-space .navigation-chart').focus();await p.keyboard.press('Escape');await settle();assert.equal(await canvas.getAttribute('data-level'),'system');await p.keyboard.press('Escape');await settle();assert.equal(await canvas.getAttribute('data-level'),'galaxy');assert.match(p.url(),/#\/map/);
 await p.getByRole('button',{name:'위에서',exact:true}).click();await settle();assert.equal(await canvas.getAttribute('data-level'),'system');assert(Math.abs(JSON.parse(await canvas.getAttribute('data-view'))[4]-.04)<.003,'top view works from all-systems view');
 await p.locator('.chart-current-stop').click();await settle();assert.equal(await p.locator('.chart-stop-select').first().getAttribute('aria-expanded'),'true');assert.deepEqual(await state(),before,'map exploration does not alter contracts, cargo, or flight progress');
 await p.setViewportSize({width:390,height:844});await settle();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:out+'/mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS aligned map/itinerary; shared font; one expanded stop; search/duplicate-visit selection; keyboard focus/Escape; top view from galaxy; return to departure; unchanged flight data; mobile overflow. Screenshots: '+out);
}finally{await browser.close()}
