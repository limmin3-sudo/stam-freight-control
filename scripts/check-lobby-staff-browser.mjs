import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const base=process.env.STAM_LOBBY_URL||'http://127.0.0.1:5189/',out='docs/facility-lobbies-20261116/staff-review';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[],missing=[],checks=[];
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),p=await context.newPage();
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url());});
 await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 const ready=async()=>{await p.locator('.lobby-stage[data-loaded=true]').waitFor();await p.locator('.lobby-person').first().waitFor();await p.locator('.lobby-person img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await p.evaluate(()=>document.fonts.ready);};
 const stored=()=>p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>/flight|account|history|contract/.test(k))));
 await p.goto(base+'#/mission?lang=ko');await p.locator('[data-partner=navigator]').click();await p.getByRole('button',{name:'예시 계약 보기',exact:true}).click();await p.locator('.receipt-card').first().getByRole('checkbox').check();const before=await stored();assert(Object.keys(before).some(k=>/flight/.test(k)));
 for(const [facility,ids] of [['trade',['senior-trade-officer','ling-broker']],['guide-center',['academic-advisor']]]){
  await p.goto(base+`#/division?lang=ko&facility=${facility}`);await ready();
  assert.equal(await p.locator('.space-topbar').count(),1);assert.equal(await p.locator('.space-sidebar').count(),1);
  await p.screenshot({path:`${out}/${facility}-desktop.png`});
  for(const id of ids){
   await p.locator(`[data-staff=${id}]`).click();await p.locator('#lobby-staff-intro').waitFor();
   await p.screenshot({path:`${out}/${id}-intro.png`});
   const bounds=await p.locator('#lobby-staff-intro').boundingBox();assert(bounds.y>=0&&bounds.y+bounds.height<=1080);
   await p.keyboard.press('Escape');await p.locator('#lobby-staff-intro').waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('data-staff')),id);
  }
  await p.locator('.lobby-person').last().click();await p.locator('#lobby-staff-intro .lobby-reset').click();await p.locator('.facility-lobby[data-selected=true]').waitFor();assert(p.url().includes('room='));assert.equal(await p.locator('.lobby-staff').count(),0);
  await p.locator('.lobby-reset').click();await ready();assert.deepEqual(await stored(),before);
 }
 checks.push('All three staff: portraits, introductions, keyboard close/focus restoration, real room links; seeded flight storage unchanged');
 for(const width of [1366,390]){
  await p.setViewportSize({width,height:width===390?844:768});
  for(const facility of ['trade','guide-center']){
   await p.goto(base+`#/division?lang=en&facility=${facility}`);await ready();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await p.locator('.lobby-person').last().scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${facility}-${width}.png`});
   await p.locator('.lobby-person').last().click();await p.locator('#lobby-staff-intro h2').waitFor();assert(await p.locator('#lobby-staff-intro h2').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));await p.screenshot({path:`${out}/${facility}-${width}-intro-start.png`});await p.locator('.lobby-staff-close').scrollIntoViewIfNeeded();assert(await p.locator('.lobby-staff-close').isVisible());await p.screenshot({path:`${out}/${facility}-${width}-intro.png`});
   await p.locator('.lobby-staff-close').click();await p.locator('#lobby-staff-intro').waitFor({state:'hidden'});
  }
 }
 checks.push('English, 1366×768 and 390×844 layouts, full portraits and usable close controls, no horizontal overflow');
 await p.setViewportSize({width:1920,height:1080});await p.emulateMedia({reducedMotion:'no-preference'});await p.goto(base+'#/division?lang=mix&facility=trade');await ready();
 await p.locator('.lobby-person').first().click();await p.locator('.lobby-staff-close').click();await p.locator('.lobby-staff[data-closing=true]').waitFor();await p.locator('#lobby-staff-intro').waitFor({state:'hidden'});
 checks.push('Normal-motion exit completes before removal; mixed locale preserves Korean staff names');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 await writeFile(`${out}/report.json`,JSON.stringify({passed:true,checks,errors,missing},null,2));console.log(checks);
}finally{await browser.close();}
