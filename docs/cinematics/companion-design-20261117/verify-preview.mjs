import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:5201/stam-freight-control/docs/cinematics/companion-design-20261117/',out=new URL('./review/',import.meta.url).pathname;
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1000,height:900}}),errors=[],failures=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)failures.push([r.status(),r.url()]);});
try{
 await p.goto(base+'index.html');await p.evaluate(()=>document.fonts.ready);await p.locator('.brand img').evaluate(e=>e.decode());
 const size=await p.locator('main').boundingBox();assert.equal(size.width,920);assert.equal(size.height,710);
 for(const lang of ['ko','en']){
  await p.locator(`[data-language=${lang}]`).click();
  for(const state of ['idle','watching','waiting-file','error','stopped']){
   await p.locator('#preview-state').selectOption(state);assert.equal(await p.locator('main').getAttribute('data-phase'),state);await p.locator('main').screenshot({path:out+`${lang}-${state}.png`});
   const clipped=await p.locator('.status h2,.actions a,.actions button,.metrics strong').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent));assert.deepEqual(clipped,[],`${lang} ${state} clipped text`);
  }
 }
 await p.locator('[data-language=ko]').click();await p.locator('#preview-state').selectOption('watching');await p.locator('#disconnect').click();assert.equal(await p.locator('#disconnect').innerText(),'다시 연결');await p.locator('#disconnect').click();assert.equal(await p.locator('main').getAttribute('data-phase'),'watching');
 await p.screenshot({path:out+'full-preview.png'});
 await p.setViewportSize({width:868,height:900});assert(await p.locator('main').evaluate(e=>e.getBoundingClientRect().width===820));await p.locator('[data-language=en]').click();await p.locator('#preview-state').selectOption('waiting-file');await p.locator('main').screenshot({path:out+'minimum-width-en.png'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.setViewportSize({width:390,height:1000});await p.screenshot({path:out+'review-mobile.png'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);await writeFile(out+'checks.json',JSON.stringify({passed:true,scope:'HTML design preview only; not a native Windows app or real log connection test',checks:['920x710 client layout','Korean/English × five preview states','No clipped action/status text','Example stop/reconnect toggle','820px minimum width and 390px review layout','Approved local image assets and fonts load'],errors,failures},null,2));
}finally{await b.close();}
