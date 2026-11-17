import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=process.env.STAM_QA_OUTPUT||'/tmp/stam-tour-readability';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const results=[];
try{
 const p=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});p.setDefaultTimeout(30000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 async function check(kind,tag){
  const selector=kind==='guide'?'.guide-journey-speech':'.lounge-tour-caption';await p.locator(selector).waitFor();await p.evaluate(()=>document.fonts.ready);
  const sizes=await p.locator(selector).evaluate(el=>{const para=el.querySelector('p'),r=el.getBoundingClientRect();const buttons=[...el.querySelectorAll('button')].map(b=>{const box=b.getBoundingClientRect();return {font:parseFloat(getComputedStyle(b).fontSize),x:box.x,right:box.right,top:box.top,bottom:box.bottom,height:box.height};});return {font:parseFloat(getComputedStyle(para).fontSize),width:innerWidth,height:innerHeight,x:r.x,right:r.right,top:r.top,bottom:r.bottom,overflow:el.scrollWidth>el.clientWidth+1,buttons};});
  assert(sizes.font>=(sizes.width<=760?18:22),tag+' body font');assert(!sizes.overflow,tag+' caption horizontal overflow');assert(sizes.x>=-1&&sizes.right<=sizes.width+1&&sizes.top>=0&&sizes.bottom<=sizes.height+1,tag+' caption must stay within the viewport');for(const b of sizes.buttons){assert(b.font>=16&&b.height>=44,tag+' readable buttons');assert(b.top>=sizes.top&&b.bottom<=sizes.bottom+1,tag+' visible buttons');}
  await p.screenshot({path:out+'/'+tag+'.png'});results.push({tag,...sizes});
 }
 for(const lang of ['ko','en']){
  await p.goto('http://127.0.0.1:5189/#/guide?lang='+lang);await p.locator('.guide-desk .replies button').first().click();
  for(const [width,height] of [[1920,1080],[2560,1440],[1366,768],[390,844],[360,640],[844,390]]){await p.setViewportSize({width,height});await check('guide',`guide-${lang}-${width}`);}
  await p.keyboard.press('Escape');await p.setViewportSize({width:1920,height:1080});await p.locator('.lounge-tour-entry').click();await p.locator('.lounge-tour[data-phase=intro]').waitFor();
  for(const [width,height] of [[1920,1080],[2560,1440],[1366,768],[390,844],[360,640],[844,390]]){await p.setViewportSize({width,height});await check('lounge',`lounge-${lang}-${width}`);}
  await p.setViewportSize({width:390,height:844});for(let i=0;i<3;i++){await p.locator('.lounge-tour-caption button').click();await p.locator('.lounge-tour[data-phase=intro]').waitFor();await check('lounge',`lounge-${lang}-stop-${i+2}`);}
  await p.keyboard.press('Escape');
 }
 await p.setViewportSize({width:390,height:844});await p.goto('http://127.0.0.1:5189/#/guide?lang=ko');await p.locator('.guide-desk .actions button').first().click();for(let i=0;i<2;i++)await p.locator('.guide-journey').getByRole('button',{name:'다음 →',exact:true}).click();await p.getByRole('button',{name:'예시 계약 불러오기',exact:true}).click();
 const work=await p.locator('.guide-journey-work').boundingBox(),speech=await p.locator('.guide-journey-speech').boundingBox();assert(work.height>=120,'Practice retains a usable scroll area');assert(work.y+work.height<=speech.y,'Dialogue must not cover practice controls');await p.screenshot({path:out+'/practice-mobile.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({results,practiceAreaPreserved:true,errors},null,2));console.log('PASS: guide + all lounge stops, Korean/English, six viewport sizes, readable buttons, practice area');
}finally{await browser.close();}
