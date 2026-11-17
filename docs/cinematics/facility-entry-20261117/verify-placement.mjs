import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const base=process.env.STAM_FACILITY_URL||'http://127.0.0.1:5201/stam-freight-control/',out=new URL('./placement-review/',import.meta.url).pathname;
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const checks=[],errors=[];
try{
 const p=await b.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>errors.push(e.message));await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 const go=async(hash)=>{await p.goto(base+'#/'+hash);await p.evaluate(()=>document.fonts.ready);};
 const lobby=async(facility)=>{await go('division?lang=ko&facility='+facility);await p.locator('.lobby-stage[data-loaded=true]').waitFor();await p.locator('.lobby-person img').evaluateAll(es=>Promise.all(es.map(e=>e.decode())));await p.mouse.move(0,0);await p.waitForTimeout(350);};
 const idle=()=>p.waitForFunction(()=>document.querySelector('.facility-lobby')?.dataset.travel==='idle');
 for(const width of [1440,1366,390]){
  await p.setViewportSize({width,height:width===1366?768:width===390?844:900});
  for(const facility of ['trade','guide-center']){
   await lobby(facility);await p.screenshot({path:out+facility+'-'+width+'.png'});
   assert.equal(await p.locator('.lobby-person-label small').count(),0);
   const bounds=await p.locator('.lobby-person').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),n=e.querySelector('.lobby-person-label').getBoundingClientRect(),i=e.querySelector('img').getBoundingClientRect();return {nameBottom:n.bottom,head:r.top,left:n.left,right:n.right,ratio:i.width/i.height};}));
   for(const r of bounds){assert(r.nameBottom<r.head);assert(r.left>=0&&r.right<=width);assert(Math.abs(r.ratio-2/3)<.01);}
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(!(await p.locator('body').innerText()).includes('교역'));
   checks.push(`${facility} ${width}px: original image ratio, name-only labels above heads, no overflow or old terminology`);
  }
 }
 await p.setViewportSize({width:1440,height:900});
 for(const screen of ['lounge','bridge']){
  await go(screen+'?lang=ko');await p.locator('.space-division-button').waitFor();await p.waitForTimeout(800);await p.screenshot({path:out+screen+'-division-button.png'});
  const link=p.locator('.space-division-button');assert((await link.boundingBox()).y<(await p.locator('.space-group-button').first().boundingBox()).y);await link.click();await p.waitForURL('**#/division?lang=ko');await p.locator('.division-world').waitFor();checks.push(`${screen}: division asset button above lounge navigates to division overview`);
 }
 await lobby('trade');await p.locator('[data-staff=senior-trade-officer]').click();await p.waitForURL('**advisor=intrasystem');await idle();await p.getByLabel('함선',{exact:true}).waitFor();await p.screenshot({path:out+'planning-console.png'});assert(!(await p.locator('body').innerText()).includes('교역'));
 await p.keyboard.press('Escape');await p.waitForFunction(()=>!location.hash.includes('room='));await idle();await p.locator('[data-staff=ling-broker]').click();await p.waitForURL('**advisor=interstellar');await idle();checks.push('Both relocated people retain the correct trade scope; planning copy renamed');
 await lobby('guide-center');await p.locator('[data-staff=academic-advisor]').click();await p.waitForTimeout(500);await p.screenshot({path:out+'professor-selected.png'});assert.equal(await p.locator('.lobby-staff-rooms button').count(),3);
 for(const [facility,rooms] of [['trade',['market','planning','trade-operations']],['guide-center',['freight-information','education','operations-study']]])for(const room of rooms){await go(`division?lang=ko&facility=${facility}&room=${room}`);await p.locator('.market-room').waitFor();await p.waitForTimeout(300);assert(!(await p.locator('body').innerText()).includes('교역'));}
 await p.setViewportSize({width:390,height:844});await go('lounge?lang=ko');await p.locator('.space-menu-toggle').click();await p.screenshot({path:out+'mobile-navigation.png'});await p.locator('.space-division-button').click();await p.waitForURL('**#/division?lang=ko');checks.push('All six room copies and mobile division navigation checked');
 assert.deepEqual(errors,[]);await writeFile(out+'checks.json',JSON.stringify({passed:true,checks,errors},null,2));
}finally{await b.close();}
