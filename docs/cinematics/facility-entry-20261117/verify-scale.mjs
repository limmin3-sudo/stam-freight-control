import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const base=process.env.STAM_FACILITY_URL||'http://127.0.0.1:5201/stam-freight-control/',out=new URL('./scale-review/',import.meta.url).pathname;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const errors=[],checks=[];
try{
 const p=await browser.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>errors.push(e.message));await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 const go=async(facility)=>{await p.goto(base+`#/division?lang=ko&facility=${facility}`);await p.locator('.lobby-stage[data-loaded=true]').waitFor();await p.locator('.lobby-person img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await p.evaluate(()=>document.fonts.ready);};
 const idle=()=>p.waitForFunction(()=>document.querySelector('.facility-lobby')?.getAttribute('data-travel')==='idle');
 for(const width of [1440,1366,390]){
  await p.setViewportSize({width,height:width===1366?768:width===390?844:900});
  for(const facility of ['trade','guide-center']){
   await go(facility);await p.waitForTimeout(300);const sizes=await p.locator('.lobby-person').evaluateAll(es=>es.map(e=>({height:getComputedStyle(e).height,parent:getComputedStyle(e.parentElement).height,ratio:e.querySelector('img').getBoundingClientRect().width/e.querySelector('img').getBoundingClientRect().height})));
   for(const size of sizes){assert(Math.abs(parseFloat(size.height)/parseFloat(size.parent)-.34)<.002);assert(Math.abs(size.ratio-2/3)<.01);}
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:out+facility+'-'+width+'.png'});
   if(width===1440&&facility==='trade'){await p.locator('[data-staff=ling-broker]').click();await p.waitForURL('**advisor=interstellar');await idle();await p.getByLabel('함선',{exact:true}).waitFor();await p.getByRole('button',{name:'로비 전체 보기',exact:true}).click();await p.waitForFunction(()=>!location.hash.includes('room='));await idle();assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('data-staff')),'ling-broker');await p.locator('[data-place=planning]').click();await p.waitForURL('**room=planning');await idle();}
   if(width===1440&&facility==='guide-center'){await p.locator('[data-staff=academic-advisor]').click();await p.waitForTimeout(550);await p.screenshot({path:out+'professor-selected.png'});assert.equal(await p.locator('.lobby-staff-rooms button').count(),3);}
   checks.push(`${facility} ${width}px: 34% scene height, original 2:3 image ratio, no horizontal overflow`);
  }
 }
 assert.deepEqual(errors,[]);await writeFile(out+'checks.json',JSON.stringify({passed:true,checks,errors,interaction:'Broker scope/return focus/direct planner label and professor room selection passed'},null,2));
}finally{await browser.close();}
