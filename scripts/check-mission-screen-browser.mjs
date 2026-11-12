import {chooseInitialPartner} from './browser-partner-choice.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import locations from '../data/locations.json' with {type:'json'};
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5186/';
const output=process.env.STAM_QA_OUTPUT||'/tmp/stam-mission-screen-qa';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const key='stam.control-room.flight.v1';
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const goto=async(page,screen)=>{await page.evaluate(hash=>location.hash=hash,'#/'+screen+'?lang=ko');};
try{
 const errors=[];
 const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#/mission?lang=ko');await chooseInitialPartner(page);await page.waitForSelector('.mission-screen');assert.equal(await page.locator('.console-heading>.return-link').count(),0,'space navigation belongs to the fixed sidebar');
 await page.getByRole('button',{name:'예시 계약 보기',exact:true}).click();
 await page.locator('.receipt-card').first().getByRole('checkbox').check();
 await page.locator('.receipt-card').nth(1).getByRole('checkbox').check();
 assert.equal((await state(page)).draft.jobs.length,2,'checking cards directly persists selection');
 assert.equal(await page.getByRole('button',{name:'이번 운송에 담기',exact:true}).count(),0);
 await page.locator('.dispatch-launch').click();
 await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key))?.plan,key);
 const simple=await state(page);assert.equal(simple.plan.mode,'simple');assert.equal(simple.plan.capacity,null);assert(simple.plan.visits.every(v=>v.packing.boxes.length===0));
 await goto(page,'mission');await page.waitForSelector('.mission-screen');
 assert.equal(await page.locator('.receipt-select input:checked').count(),2);
 await page.getByLabel('운항 파트너',{exact:true}).selectOption('navigator');
 assert.equal(await page.locator('.estimate-toggle').count(),0,'catalogue ceilings do not stand in for actual totals');
 await page.locator('.dispatch-launch').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key))?.plan?.mode==='detail',key);
 const detailed=await state(page);assert(detailed.plan.visits.some(v=>v.packing.boxes.length>0));assert.equal(detailed.draft.jobs.length,2);
 await goto(page,'mission');await page.waitForSelector('.mission-screen');await page.reload();await page.waitForSelector('.mission-screen');assert.equal((await state(page)).draft.jobs.length,2);
 await page.screenshot({path:output+'/mission-desktop.png'});
 // Both paths out of the monitor preserve the same plan, including keyboard focus in search.
 await page.getByRole('combobox',{name:'출발지',exact:true}).click();await page.keyboard.press('Escape');assert.match(page.url(),/#\/mission/);
 await page.locator('.space-group-button[href*="bridge"]').click();await page.waitForURL(/#\/bridge/);assert.deepEqual((await state(page)).plan,detailed.plan);
 await goto(page,'mission');await page.waitForSelector('.mission-screen');
 for(const lang of ['ko','mix','en']){
  await page.locator('.space-language select').selectOption(lang);
  for(const width of [390,1366]){
   await page.setViewportSize({width,height:844});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page horizontal overflow');
   assert(await page.locator('.console-display-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'no inner horizontal overflow');
   assert(await page.locator('.console-workspace').evaluate(e=>{const r=e.getBoundingClientRect(),host=document.querySelector('.persistent-console-content').getBoundingClientRect();return Math.abs(r.x-host.x)<1&&Math.abs(r.y-host.y)<1&&Math.abs(r.width-host.width)<1&&Math.abs(r.height-host.height)<1;}),'monitor fills the content space beside the fixed menus');
  }
 }
 await page.locator('.space-language select').selectOption('ko');await page.setViewportSize({width:390,height:844});await page.screenshot({path:output+'/mission-mobile.png'});
 // Import a real legacy-format manifest through the actual UI. This is synthetic test data.
 const from=name=>locations.locations.find(p=>p.name===name&&p.system==='stanton').id;
 const cargo=['Lorville','New Babbage'].map(name=>({commodity:'Ore',pickupId:from(name),dropoffId:from('Area18'),scu:null,boxes:[],maxBoxSize:4,_quantityBounds:{unit:'SCU',min:1,max:16}}));
 const other=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});other.on('pageerror',e=>errors.push(e.message));await other.goto(base+'#/mission?lang=ko');await chooseInitialPartner(other);await other.waitForSelector('.mission-screen');await other.getByLabel('운항 파트너',{exact:true}).selectOption('navigator');
 await other.getByText('계약 백업 · 불러오기',{exact:true}).click();await other.locator('input[type=file][accept=".json,application/json"]').setInputFiles({name:'synthetic-contract.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{id:'qa-pooled',title:'배송 총량 검증',cargo}]))});
 await other.waitForSelector('.quick-totals input');
 assert(await other.locator('.dispatch-launch').isEnabled());
 await other.locator('.dispatch-launch').click();await other.waitForFunction(key=>JSON.parse(localStorage.getItem(key))?.plan?.mode==='simple',key);
 assert.equal((await state(other)).draft.partner,'operator');assert.equal((await state(other)).plan.capacity,null);
 assert((await state(other)).plan.visits.every(v=>v.packing.boxes.length===0));
 await goto(other,'mission');await other.waitForSelector('.mission-screen');await other.getByLabel('운항 파트너',{exact:true}).selectOption('navigator');await other.waitForSelector('.quick-totals input');
 await other.locator('.quick-totals input').fill('22');await other.locator('.dispatch-launch').click();await other.waitForFunction(key=>JSON.parse(localStorage.getItem(key))?.plan?.peak===22&&JSON.parse(localStorage.getItem(key))?.plan?.mode==='detail',key);
 await goto(other,'mission');await other.waitForSelector('.quick-totals input');await other.locator('.quick-totals input').fill('0');await other.locator('.dispatch-launch').click();assert.match(await other.locator('.mission-error').innerText(),/1 이상의/);assert.equal((await state(other)).plan.peak,22);
 await other.locator('.quick-totals input').fill('22');await other.locator('.dispatch-launch').click();await other.waitForFunction(key=>JSON.parse(localStorage.getItem(key))?.plan?.peak===22,key);
 const corrected=await state(other);assert.deepEqual(corrected.draft.jobs[0].shipments.map(r=>r.scu),[0,0]);assert.equal(Object.values(corrected.draft.jobs[0].reservations)[0],22);assert(corrected.plan.visits.some(v=>v.locationId===from('New Babbage')));
 await goto(other,'mission');await other.waitForSelector('.quick-totals input');await other.reload();await other.waitForSelector('.quick-totals input');assert.equal(await other.locator('.quick-totals input').inputValue(),'22');
 await other.screenshot({path:output+'/mission-delivery-total.png'});
 // Running transport cannot be edited accidentally, including through the compact monitor UI.
 await other.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key));s.run.started=true;s.run.since=Date.now();localStorage.setItem(key,JSON.stringify(s));},key);await other.reload();await other.waitForSelector('.mission-screen');assert(await other.locator('.dispatch-launch').isDisabled());assert(await other.locator('.quick-totals input').isDisabled());
 assert.deepEqual(errors,[]);console.log('PASS: card selection, route-only operator, navigator cargo, same-plan navigation/reload, viewport fill, KO/mix/EN desktop/mobile, unknown SCU → operator without cargo, confirmed 22 SCU → navigator reservation with both pickups retained, invalid edit preservation and active-run lock.');
 console.log('Screenshots: '+output);
}finally{await browser.close();}
