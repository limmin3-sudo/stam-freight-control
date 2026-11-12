import {chooseInitialPartner} from './browser-partner-choice.mjs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5186/';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const p=await b.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'?material=projection&typeface=air#/mission?lang=ko');await chooseInitialPartner(p);await p.waitForSelector('.mission-screen');
 await p.evaluate(()=>{window.__shellNodes=[document.querySelector('.space-topbar'),document.querySelector('.space-main>.space-sidebar')];});
 const bounds=async()=>({top:await p.locator('.space-topbar').boundingBox(),side:await p.locator('.space-main>.space-sidebar').boundingBox()});const expected=await bounds();
 async function fixed(){assert.equal(await p.locator('.space-topbar').count(),1);assert.equal(await p.locator('.space-main>.space-sidebar').count(),1);assert.deepEqual(await bounds(),expected);assert(await p.evaluate(()=>window.__shellNodes[0]===document.querySelector('.space-topbar')&&window.__shellNodes[1]===document.querySelector('.space-main>.space-sidebar')));assert(await p.evaluate(()=>scrollY===0&&document.documentElement.scrollWidth<=innerWidth));}
 await p.getByRole('button',{name:'예시 계약 보기',exact:true}).click();await p.getByLabel('운항 파트너',{exact:true}).selectOption('navigator');await p.locator('.receipt-card').first().getByRole('checkbox').check();await p.locator('.receipt-card').nth(2).getByRole('checkbox').check();
 await p.locator('.console-display-content').evaluate(e=>e.scrollTop=500);await fixed();await p.locator('.dispatch-launch').click();await p.waitForSelector('.chart-stop-events',{timeout:60000});await fixed();
 const canvas=p.locator('.chart-space canvas');const box=await canvas.boundingBox();assert(box.width>400&&box.height>400);await p.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await p.mouse.down();await p.mouse.move(box.x+box.width*.55,box.y+box.height*.55,{steps:5});await p.mouse.up();
 await p.locator('.space-nav-links a[href*="operations"]').click();await p.waitForSelector('.ops-itinerary');await fixed();
 await p.getByRole('button',{name:'운항 시작',exact:true}).click();await p.getByRole('button',{name:/^출발 완료/}).click();
 const run=await p.evaluate(()=>JSON.parse(localStorage.getItem('stam.control-room.flight.v1')).run);
 await p.locator('.space-language select').selectOption('en');await p.waitForURL(/lang=en/);assert.equal(await p.locator('.ops-mast h1').innerText(),'Control console');await fixed();
 await p.locator('.space-nav-links a[href*="mission"]').click();await p.waitForSelector('.mission-screen');await fixed();assert.equal(await p.locator('.dispatch-launch').isDisabled(),true);assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('stam.control-room.flight.v1')).run),run);
 await p.reload();await p.waitForSelector('.mission-screen');assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('stam.control-room.flight.v1')).run),run);
 await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.getByRole('button',{name:'Spaces',exact:true}).click();await p.locator('.space-nav-links a[href*="map"]').click();await p.waitForSelector('.chart-space canvas');assert(await p.locator('.space-topbar').isVisible());assert(await p.getByRole('button',{name:'Spaces',exact:true}).isVisible());assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('PASS: fixed shared header/sidebar DOM and geometry through mission → map → operations; content-only scroll, map drag, departure, shared language, running-state preservation, reload, mobile menu and overflow');
}finally{await b.close();}
