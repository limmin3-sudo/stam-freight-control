import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,writeFile,appendFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startLogService} from '../integration/log/live-server.mjs';
import {fixture,data} from '../tests/helpers/log-preview.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const dir=await mkdtemp(join(tmpdir(),'stam-ready-')),file=join(dir,'synthetic.log');await writeFile(file,'');
let service=await startLogService({file});let browser;
try{
 browser=await chromium.launch({...(process.env.STAM_CHROMIUM_PATH?{executablePath:process.env.STAM_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(new URL(r.url()).pathname);});
 await page.addInitScript(start=>{if(location.protocol!=='http:'||location.hostname!=='127.0.0.1')return;localStorage.setItem('vh-ship-id','misc-hull-b');localStorage.setItem('vh-start',start);},data.locations.find(p=>p.name==='New Babbage').id);
 await page.goto(service.url);await page.waitForSelector('#flight-ready-action');
 assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.locator('#flight-ready-action').isDisabled(),true);
 await page.locator('#flight-ready .ready-partners button').first().click();
 assert.match(await page.locator('#flight-ready').innerText(),/계약 수신 대기/);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('stam-log-account-settings-v1')).partner),'operator');
 const {events}=fixture(),pre='<2026-11-03T10:00:00.000Z> [Notice] ';
 await appendFile(file,'<2026-11-03T10:00:00.000Z> [CIG] build_version[12913470]\n'+pre+`<SHUDEvent_OnNotification> Added notification "Contract Accepted: Synthetic cargo: " [1] to queue. MissionId: [${events[1].missionId}], ObjectiveId: []\n`+events.slice(2).map(e=>pre+`<CLocalMissionPhaseMarker::CreateMarker> missionId [${e.missionId}], contract [Test_HaulCargo_Large], contractDefinitionId[${e.definitionId}], objectiveId [${e.objectiveId}], zoneHostId [1], position [x: ${e.position[0]}, y: ${e.position[1]}, z: ${e.position[2]}]\n`).join(''));
 await page.waitForFunction(()=>document.querySelector('#flight-ready-action').textContent==='함선·출발지 확인');
 assert.equal(await page.locator('canvas').count(),0); // no renderer until the user starts planning
 await page.locator('#flight-ready-action').click();await page.getByRole('button',{name:'이 설정으로 준비',exact:true}).click();
 assert.equal(await page.locator('#flight-ready-action').innerText(),'항로 계산·안내 시작');
 await page.locator('#flight-ready-action').click();await page.waitForFunction(()=>document.querySelector('.preview-tracking')?.dataset.state==='estimated',null,{timeout:60000}).catch(async e=>{console.error(JSON.stringify({stage:'start-guidance',errors,bad,status:await page.locator('.preview-calculation-status').allTextContents(),ready:await page.locator('#flight-ready').innerText()}));throw e;});
 await page.waitForFunction(()=>document.querySelector('#flight-ready-action').textContent==='운송 중 · 다음 구간');
 if(process.env.STAM_CAPTURE_BRIEFING)await page.screenshot({path:process.env.STAM_CAPTURE_BRIEFING,type:'jpeg',quality:90});
 assert.equal(await page.locator('canvas').count(),2);assert.match(await page.locator('.preview-calculation-status').innerText(),/28개 \/ 168 SCU/);

 await page.locator('.preview-stage-bar select').selectOption('all');
 await page.locator('#workspace-language [data-lang=en]').click();
 await page.setViewportSize({width:1920,height:1080});
 await page.waitForTimeout(700);
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:'assets/onboarding/control-demo.jpg',type:'jpeg',quality:95});
 const canvases=page.locator('canvas');
 await canvases.nth(0).screenshot({path:'assets/onboarding/map-demo.jpg',type:'jpeg',quality:95});
 await canvases.nth(1).scrollIntoViewIfNeeded();
 await page.waitForTimeout(500);
 await canvases.nth(1).screenshot({path:'assets/onboarding/cargo-demo.jpg',type:'jpeg',quality:95});
 console.log('Captured real STAM views using synthetic contracts.');
}finally{await browser?.close();await service.close();await rm(dir,{recursive:true,force:true});}
