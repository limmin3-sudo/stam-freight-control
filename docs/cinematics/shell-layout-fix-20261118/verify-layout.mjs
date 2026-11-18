import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const out=new URL('./review/',import.meta.url).pathname;
const base=process.env.STAM_PREVIEW_URL??'http://127.0.0.1:5173/';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const checks=[],errors=[];
const p=await b.newPage();p.on('pageerror',e=>errors.push(e.message));await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
const rect=async s=>p.locator(s).first().evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}});
for(const [width,height] of [[1595,858],[1920,1080],[2560,1440],[1024,768],[768,1024],[390,844]]){
 await p.setViewportSize({width,height});await p.goto(base+'#/division?lang=ko');await p.waitForTimeout(900);
 const dims=await p.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,root:document.querySelector('.space-experience').getBoundingClientRect().toJSON()}));
 assert(dims.scroll<=width+1,`overflow ${width} ${JSON.stringify(dims)}`);
 const header=await rect('.space-topbar');if(width>760)assert.equal(header.h,67);
 const brand=await rect('.room-brand');assert(brand.x>=0&&brand.x+brand.w<=width,`brand clipped ${width}`);
 if([1595,2560,390].includes(width))await p.screenshot({path:out+`division-${width}.png`});
 await p.goto(base+'#/lounge?lang=ko');await p.locator('.space-background').evaluate(e=>e.decode());await p.waitForTimeout(400);
 const before=await rect('.space-artwork');await p.locator('[data-partner=director]').click();await p.waitForSelector('.guide-desk .stage');const after=await rect('.guide-desk .stage');
 for(const key of ['x','y','w','h'])assert(Math.abs(before[key]-after[key])<1,`lounge/guide ${width} ${key}: ${before[key]} != ${after[key]}`);
 assert(await p.locator('.space-sidebar').isVisible());
 await p.screenshot({path:out+`guide-travel-${width}.png`});
 const state=await p.locator('.guide-desk .stage').getAttribute('data-state');
 checks.push({viewport:{width,height},header,lounge:before,guide:after,state,documentWidth:dims.scroll});
}
for(const [width,height,lang] of [[1595,858,'ko'],[768,1024,'ko'],[390,844,'en']]){
 await p.setViewportSize({width,height});await p.goto(base+'#/lounge?lang='+lang);await p.locator('.space-background').evaluate(e=>e.decode());
 const lounge=await rect('.space-artwork');await p.locator('[data-partner=director]').click();await p.waitForSelector('.stage[data-state=playing]');await p.locator('#skip').click();await p.waitForSelector('.stage[data-state=arrived]');await p.waitForTimeout(650);
 await p.screenshot({path:out+`guide-arrived-${width}-${lang}.png`});
 assert(await p.locator('#return-to-lounge').isVisible());
 await p.locator('#return-to-lounge').click();await p.waitForSelector('.stage[data-state=returning]');
 const returning=await rect('.guide-desk .stage');for(const key of ['x','y','w','h'])assert(Math.abs(lounge[key]-returning[key])<1,`return geometry ${width} ${key}`);
 await p.locator('#skip').click();await p.waitForURL('**#/lounge?lang='+lang);const restored=await rect('.space-artwork');for(const key of ['x','y','w','h'])assert(Math.abs(lounge[key]-restored[key])<1);
 await p.screenshot({path:out+`lounge-restored-${width}-${lang}.png`});
 checks.push({viewport:{width,height},lang,roundTrip:true,lounge,returning,restored});
}
await p.setViewportSize({width:1595,height:858});await p.goto(base+'#/lounge?lang=ko');await p.locator('[data-partner=director]').click();await p.waitForSelector('.stage[data-state=playing]');await p.locator('.space-division-button').click();await p.waitForURL('**#/division?lang=ko');checks.push({sidebarDuringVideo:true});
await p.goto(base+'#/lounge?lang=ko');await p.locator('[data-partner=director]').click();await p.waitForSelector('.stage[data-state=playing]');await p.goBack();await p.waitForURL('**#/lounge?lang=ko');checks.push({browserBackDuringVideo:true});
await p.emulateMedia({reducedMotion:'reduce'});await p.goto(base+'#/lounge?lang=en');await p.locator('[data-partner=director]').click();await p.waitForSelector('.stage[data-state=arrived]');checks.push({reducedMotion:true});
assert.deepEqual(errors,[]);await writeFile(out+'geometry-checks.json',JSON.stringify({passed:true,checks,errors},null,2));await b.close();
