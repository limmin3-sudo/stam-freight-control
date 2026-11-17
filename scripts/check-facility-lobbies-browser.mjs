import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const base=process.env.STAM_LOBBY_URL||'http://127.0.0.1:5189/',out='docs/facility-lobbies-20261116/runtime-review';
await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[],missing=[],checks=[];
try{
 const context=await b.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(20000);
 await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url());});
 const ready=async()=>{await p.locator('.lobby-stage[data-loaded=true]').waitFor();await p.evaluate(()=>document.fonts.ready);};
 const storage=()=>p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>/flight|account|history|contract/.test(k))));
 await p.goto(base+'#/mission?lang=ko');await p.locator('[data-partner=navigator]').click();await p.getByRole('button',{name:'예시 계약 보기',exact:true}).click();await p.locator('.receipt-card').first().getByRole('checkbox').check();const before=await storage();assert(Object.keys(before).some(k=>/flight/.test(k)));
 await p.locator('.space-topbar .room-brand').click();await p.locator('.division-facility').last().waitFor();
 for(const [id,rooms] of [['trade',['market','planning','trade-operations']],['guide-center',['freight-information','education','operations-study']]]){
  await p.locator(`[data-facility=${id}]`).click();await ready();assert.equal(await p.locator('.lobby-place').count(),3);assert.equal(await p.locator('.space-topbar').count(),1);assert.equal(await p.locator('.space-sidebar').count(),1);
  await p.mouse.move(700,80);await p.screenshot({path:`${out}/${id}-desktop.png`});
  for(const room of rooms){await p.locator(`[data-place=${room}]`).click();await p.locator('.lobby-detail').waitFor();assert(p.url().includes('room='+room));assert.equal(await p.locator('.facility-lobby').getAttribute('data-room'),room);assert.equal(await p.locator('.lobby-camera').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
   const panel=await p.locator('.lobby-detail').boundingBox();assert(panel.y>=0&&panel.y+panel.height<=1080,JSON.stringify(panel));
   if(room===rooms[2])await p.screenshot({path:`${out}/${id}-detail.png`});
   await p.keyboard.press('Escape');await p.locator('.lobby-detail').waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('data-place')),room);
  }
  await p.locator('.space-group-button').nth(id==='trade'?2:3).click();await p.locator(`#space-links-${id}[data-open=true]`).waitFor();await p.locator(`#space-links-${id} a`).first().click();await p.locator('.lobby-detail').waitFor();
  await p.reload();await ready();assert.equal(await p.locator('.lobby-detail').count(),1);await p.locator('.lobby-reset').click();await p.locator('.lobby-detail').waitFor({state:'hidden'});
  await p.locator('.lobby-exit').click();await p.locator('.division-hub').waitFor();
  await p.goBack();await ready();await p.locator('.space-topbar .room-brand').click();await p.locator('.division-hub').waitFor();
 }
 assert.deepEqual(await storage(),before);checks.push('Two approved lobbies: six rooms, spotlight/detail, sidebar shortcuts, reload, back, STAM/exit return; seeded flight/account/history storage preserved');
 for(const locale of ['en','mix']){
  await p.goto(base+`#/division?lang=${locale}&facility=guide-center&room=education`);await ready();assert.match(await p.locator('.lobby-detail h2').innerText(),locale==='en'?/Education/:/교육실/);await p.locator('.lobby-reset').click();await p.locator('.lobby-place').first().waitFor();assert(!p.url().includes('room='));
 }
 checks.push('English/mixed locale, valid deep links and reduced-motion');
 await p.setViewportSize({width:1366,height:768});await p.goto(base+'#/division?lang=en&facility=trade&room=trade-operations');await ready();const short=await p.locator('.lobby-detail').boundingBox();assert(short.y+short.height<=768);await p.screenshot({path:out+'/trade-1366.png'});
 for(const id of ['trade','guide-center']){
  await p.setViewportSize({width:390,height:844});await p.goto(base+`#/division?lang=ko&facility=${id}`);await ready();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:`${out}/${id}-mobile.png`});
  await p.locator('.lobby-place').last().click();await p.locator('.lobby-reset').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${id}-mobile-detail.png`});assert(await p.locator('.lobby-reset').isVisible());await p.locator('.lobby-reset').click();await p.locator('.lobby-detail').waitFor({state:'hidden'});
  await p.getByRole('button',{name:'공간 메뉴',exact:false}).click();await p.locator('.space-group-button').first().click();await p.waitForURL(/#\/lounge/);await p.locator('.space-overview').waitFor();
 }
 checks.push('1366px short desktop panel, 390px mobile layout with no horizontal overflow, readable detail/reset and original lounge navigation');
 await p.emulateMedia({reducedMotion:'no-preference'});await p.setViewportSize({width:1920,height:1080});await p.goto(base+'#/division?lang=ko&facility=trade');await ready();
 // Click the visible planning-room doorway beside the foreground staff.
 const scene=await p.locator('.lobby-stage').boundingBox();await p.mouse.click(scene.x+scene.width*.49,scene.y+scene.height*.55);await p.locator('.lobby-detail').waitFor();assert(p.url().includes('room=planning'));assert.notEqual(await p.locator('.lobby-camera').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 await p.locator('.lobby-reset').click();await p.locator('.lobby-detail[data-closing=true]').waitFor();await p.locator('.lobby-detail').waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('data-place')),'planning');
 checks.push('Normal motion: direct scene region activates room, zoom enabled, panel exits before removal, focus restored');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await writeFile(out+'/report.json',JSON.stringify({passed:true,checks,errors,missing},null,2));console.log(checks);
}finally{await b.close();}
