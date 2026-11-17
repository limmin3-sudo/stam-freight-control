import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=process.env.STAM_QA_OUTPUT||'/tmp/stam-guide-camera-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});page.setDefaultTimeout(30000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 const next=()=>page.locator('.guide-journey').getByRole('button',{name:'다음 →',exact:true}).click();
 const settled=()=>page.locator('.guide-scene[data-moving=false][data-ready=true]').waitFor();
 const screenshot=async name=>{await settled();assert(await page.locator('.guide-scene-world').evaluate(el=>el.getBoundingClientRect().width>=el.parentElement.clientWidth-1),'Camera must fill the scene after opening a dialog');await page.screenshot({path:out+'/'+name+'.png'});};
 await page.goto('http://127.0.0.1:5189/#/guide?lang=ko');await page.locator('.guide-desk .replies button').first().click();await settled();
 const initial=await page.locator('.guide-scene-world').getAttribute('style');await next();await next();await page.locator('.guide-scene[data-moving=true]').waitFor();
 const moving=await page.locator('.guide-scene-world').getAttribute('style');await screenshot('academy');assert.equal(await page.locator('.guide-scene').getAttribute('data-target'),'guide-center');assert.notEqual(await page.locator('.guide-scene-world').getAttribute('style'),initial);assert.notEqual(await page.locator('.guide-scene-world').getAttribute('style'),moving);
 const dialog=await page.locator('.guide-journey').boundingBox(),sidebar=await page.locator('.space-sidebar').boundingBox();assert(dialog.x>=sidebar.x+sidebar.width-1,'Sidebar must remain visible');
 const frames=[];for(const target of ['trade','lounge']){await next();await settled();assert.equal(await page.locator('.guide-scene').getAttribute('data-target'),target);frames.push(await page.locator('.guide-scene-world').getAttribute('style'));await screenshot(target);}
 assert.notEqual(frames[0],frames[1]);
 // Existing lounge tour and its gate connector remain the path into orbital guidance.
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'라운지 투어 이어가기',exact:true}).click();
 for(let i=0;i<3;i++){await page.locator('.lounge-tour[data-phase=intro]').waitFor();await page.locator('.lounge-tour-caption button').click();}
 await page.locator('.lounge-tour[data-stop=gate][data-phase=intro]').waitFor();await page.getByRole('button',{name:'셔틀 타고 관제센터로',exact:true}).click();await page.locator('.guide-journey[data-topic=bridge]').waitFor();await settled();
 assert.equal(await page.locator('.guide-scene-people image').count(),2);await screenshot('bridge-partners');
 for(const target of ['mission','map','operations']){await next();await settled();assert.equal(await page.locator('.guide-scene').getAttribute('data-target'),target);assert.equal(await page.locator('.guide-scene-shade').count(),1);await screenshot('bridge-'+target);if(target==='operations'){const dot=await page.locator('.guide-scene-marker circle').first().boundingBox(),guide=await page.locator('.guide-journey-portrait').boundingBox();assert(dot.x>guide.x+guide.width,'Guide must not cover the right console');}}
 await page.getByRole('button',{name:'예시 운송 연습',exact:true}).click();await page.locator('.guide-journey[data-topic=practice]').waitFor();await next();assert.equal(await page.locator('.guide-scene').count(),0);await page.keyboard.press('Escape');
 // The in-app transition preference must also work when the OS permits motion.
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.space-settings>summary').click();await page.getByRole('button',{name:'이동 연출 켜짐',exact:true}).click();
 await page.evaluate(()=>{location.hash='#/guide?lang=ko';});await page.locator('.guide-desk .replies button').first().click();await next();await next();await settled();assert.equal(await page.locator('.guide-scene').getAttribute('data-motion'),'false');await page.keyboard.press('Escape');
 // Mobile image framing and reduced motion must stay bounded.
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:390,height:844});
 for(const lang of ['ko','en','mix']){
  await page.goto('http://127.0.0.1:5189/#/guide?lang='+lang);await page.locator('.guide-desk .replies button').first().click();
  const advance=()=>page.locator('.guide-journey').getByRole('button',{name:/^(다음|Next) →$/}).click();await advance();await advance();await settled();
  assert(await page.locator('.guide-journey').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  const a=await page.locator('.guide-scene-world').getAttribute('style');await page.waitForTimeout(120);assert.equal(await page.locator('.guide-scene-world').getAttribute('style'),a,'Reduced motion must stay still');await screenshot('mobile-academy-'+lang);await page.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({cameraMoves:true,targetSpotlights:['guide-center','trade','lounge','mission','map','operations'],fixedSidebarVisible:true,partnerSprites:2,chainToPractice:true,reducedMotion:true,appMotionOff:true,mobileLocales:['ko','en','mix'],errors},null,2));console.log('PASS: scene camera, spotlights, fixed sidebar, tour chain, reduced motion, mobile locales');
}finally{await browser.close();}
