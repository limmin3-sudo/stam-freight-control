import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile,appendFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startLogService} from '../integration/log/live-server.mjs';
import {fixture,data} from '../tests/helpers/log-preview.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const dir=await mkdtemp(join(tmpdir(),'stam-flight-deck-')),file=join(dir,'synthetic.log');
function lines(id){const {events}=fixture(id),pre='<2026-11-03T10:00:00.000Z> [Notice] ';return '<2026-11-03T10:00:00.000Z> [CIG] build_version[12913470]\n'+pre+`<SHUDEvent_OnNotification> Added notification "Contract Accepted: Synthetic cargo: " [1] to queue. MissionId: [${events[1].missionId}], ObjectiveId: []\n`+events.slice(2).map(e=>pre+`<CLocalMissionPhaseMarker::CreateMarker> missionId [${e.missionId}], contract [Test_HaulCargo_Large], contractDefinitionId[${e.definitionId}], objectiveId [${e.objectiveId}], zoneHostId [1], position [x: ${e.position[0]}, y: ${e.position[1]}, z: ${e.position[2]}]\n`).join('');}
await writeFile(file,lines());const service=await startLogService({file});let browser,page;
const errors=[],bad=[];
try{
 browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(new URL(r.url()).pathname);});
 await page.addInitScript(start=>{if(!sessionStorage.getItem('initialized')){localStorage.setItem('sfc-lang','ko');localStorage.setItem('vh-map-quality','normal');localStorage.setItem('vh-ship-id','misc-hull-b');localStorage.setItem('vh-start',start);localStorage.setItem('vh-missions','[]');localStorage.setItem('sfc-run','{"keep":true}');sessionStorage.setItem('initialized','1');}},'stanton:'+data.locations.find(p=>p.name==='New Babbage').id);
 const url=new URL(service.url);url.pathname='/flight-deck.html';await page.goto(url.href);
 await page.waitForSelector('.aide-choose');assert.equal(await page.locator('[data-voice]').count(),3);
 console.log('Partner popup ready');if(process.env.STAM_CAPTURE_GUIDE==='1')await page.locator('.aide-card').screenshot({path:'assets/onboarding/partner-ready.jpg',type:'jpeg',quality:88});
 await page.locator('#a-skip').click();
 await page.waitForFunction(()=>document.querySelector('#mission-count')?.textContent==='1',null,{timeout:60000});
 assert.ok(await page.locator('#itinerary .stop').count()>2);assert.equal(await page.locator('canvas').count(),2);
 assert.equal(await page.evaluate(()=>localStorage.getItem('vh-missions')),'[]');
 assert.equal(await page.evaluate(()=>localStorage.getItem('sfc-run')),'{"keep":true}');
 const missions=await page.evaluate(()=>JSON.parse(localStorage.getItem('stam-flight-deck-missions-v1:guest')));
 assert.equal(missions[0].cargo.reduce((n,c)=>n+c.scu,0),168);assert.equal(missions[0].cargo.reduce((n,c)=>n+c.boxes.reduce((v,b)=>v+b.count,0),0),28);
 assert.equal(await page.locator('.brand-name br').count(),0);assert.match(await page.locator('.brand img').getAttribute('src'),/stam-logo/);
 assert.equal(await page.locator('.lang-switch button').count(),2);
 await page.locator('#log-reception-open').click();assert.match(await page.locator('#log-reception').innerText(),/항로에 연결됨/);
 if(process.env.STAM_CAPTURE_GUIDE==='1')await page.locator('#log-reception').screenshot({path:'assets/onboarding/contract-reception.jpg',type:'jpeg',quality:88});
 await page.locator('#contracts-dialog [data-desk-close]').click();
 const pop=page.waitForEvent('popup');await page.locator('#updates-open').click();const notes=await pop;
 await notes.locator('#releases article').first().waitFor();assert.match(await notes.locator('#draft').innerText(),/아직 배포하지/);assert.equal(await notes.locator('#return-control').getAttribute('href'),'flight-deck.html');await notes.close();
 await page.screenshot({path:'/tmp/stam-flight-deck.png',fullPage:true});
 if(process.env.STAM_CAPTURE_GUIDE==='1')await page.screenshot({path:'assets/onboarding/flight-deck.jpg',type:'jpeg',quality:88});
 if(process.env.STAM_CAPTURE_GUIDE==='1'){
  await page.locator('#map-wrap').screenshot({path:'assets/onboarding/route-map.jpg',type:'jpeg',quality:88});
  await page.locator('#itinerary [data-stop="1"]').click();await page.locator('#cargo-phase').selectOption('after');
  await page.locator('#cargo-view').screenshot({path:'assets/onboarding/cargo-layout.jpg',type:'jpeg',quality:88});
 }
 console.log('Route, cargo and notes checked');
 await page.reload();await page.waitForSelector('.aide-choose');await page.locator('#a-skip').click();await page.waitForFunction(()=>document.querySelector('#mission-count')?.textContent==='1');
 await appendFile(file,lines());await page.waitForTimeout(1200);assert.equal(await page.locator('#mission-count').innerText(),'1');
 await page.locator('#run-done').click();await page.locator('#run-done').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('stam-flight-deck-run-v1:guest')));assert.equal(before.aboard.length,28);
 const second='22222222-2222-4222-8222-222222222222';await appendFile(file,lines(second));
 await page.locator('#log-reception-open').click();await page.locator(`[data-contract-id="${second}"]`).waitFor();assert.equal(await page.locator('#mission-count').innerText(),'1');
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('stam-flight-deck-run-v1:guest')));assert.equal(after.index,before.index);assert.deepEqual(after.aboard,before.aboard);
 await page.locator(`[data-contract-id="${second}"]`).getByRole('button',{name:'다음 계획으로',exact:true}).click();assert.match(await page.locator(`[data-contract-id="${second}"]`).innerText(),/다음 계획에 보관/);
 await page.locator(`[data-contract-id="${second}"]`).getByRole('button',{name:'현재 항로에 합류',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#mission-count').textContent==='2');
 const merged=await page.evaluate(()=>JSON.parse(localStorage.getItem('stam-flight-deck-run-v1:guest')));assert.deepEqual(merged.aboard,before.aboard);
 await page.locator('#contracts-dialog [data-desk-close]').click();
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 console.log('PASS: pre-existing log contract → original planner, 168 SCU/28 boxes, reload dedupe, original data untouched, partner popup, branding, 2 languages, separate patch notes, mobile.');
}catch(e){console.error({errors,bad,notice:await page?.locator('#notice').allTextContents()});throw e;}finally{await browser?.close();await service.close();await rm(dir,{recursive:true,force:true});}
