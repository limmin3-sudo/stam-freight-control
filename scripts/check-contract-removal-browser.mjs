import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {mkdtemp,writeFile,appendFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startLogService} from '../integration/log/live-server.mjs';import {mediumFixture} from '../tests/helpers/log-reservations.mjs';import {data} from '../tests/helpers/log-preview.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const dir=await mkdtemp(join(tmpdir(),'stam-removal-')),file=join(dir,'synthetic.log'),a=mediumFixture(),b=JSON.parse(JSON.stringify(a).replaceAll(a.missionId,'22222222-2222-4222-8222-222222222222'));
const pre='<2026-11-03T10:00:00.000Z> [Notice] ';
function lines(c){return pre+`<SHUDEvent_OnNotification> Added notification "Contract Accepted: Contract ${c===a?'A':'B'}: " [1] to queue. MissionId: [${c.missionId}], ObjectiveId: []\n`+c.markerObservations.map(e=>pre+`<CLocalMissionPhaseMarker::CreateMarker> missionId [${c.missionId}], contract [Test_HaulCargo_Medium], contractDefinitionId[${e.definitionId}], objectiveId [${e.objectiveId}], zoneHostId [1], position [x: ${e.position[0]}, y: ${e.position[1]}, z: ${e.position[2]}]\n`).join('');}
await writeFile(file,'<2026-11-03T10:00:00.000Z> [CIG] build_version[12913470]\n'+lines(a)+lines(b));const service=await startLogService({file});let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.STAM_CHROMIUM_PATH||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(start=>{localStorage.setItem('vh-ship-id','misc-hull-b');localStorage.setItem('vh-start',start);},data.locations.find(p=>p.name==='New Babbage').id);
 await page.goto(service.url);await page.waitForFunction(()=>document.querySelector('#planning-count')?.textContent.includes('선택한 계약 2개'));
 await page.locator('#flight-ready-action').click();await page.getByRole('button',{name:'이 설정으로 준비',exact:true}).click();await page.locator('#flight-ready-action').click();
 await page.waitForFunction(()=>document.querySelector('.preview-calculation-status')?.textContent.includes('100 SCU'),null,{timeout:60000});
 await page.locator(`[data-remove-mission="${a.missionId}"]`).click();const d=page.getByRole('dialog',{name:'계약 제외',exact:true});
 assert.match(await d.locator('.partner-dialogue').innerText(),/수석 항해사[\s\S]*아직 실려 있습니까/);
 await d.getByRole('button',{name:'취소',exact:true}).click();await page.locator('#flight-ready .ready-partners button').first().click();
 await page.waitForFunction(()=>document.querySelector('.preview-calculation-status')?.textContent.includes('100 SCU'),null,{timeout:60000});
 await page.locator(`[data-remove-mission="${a.missionId}"]`).click();assert.match(await d.locator('.partner-dialogue').innerText(),/브리지 오퍼레이터[\s\S]*배에 남아 있나요/);
 assert.match(await d.locator('.partner-dialogue img').getAttribute('src'),/aide\.jpg$/);
 await d.getByLabel('남아 있습니다',{exact:true}).check();await d.locator('input[data-box]').first().check();
 await d.getByRole('button',{name:'운송 계획에서 제외',exact:true}).click();assert.match(await d.locator('[role=status]').innerText(),/현재 위치/);
 await d.getByLabel('선택한 화물이 적재도에 표시된 위치에 있습니다.',{exact:true}).check();await d.getByRole('button',{name:'운송 계획에서 제외',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.preview-calculation-status')?.textContent.includes('공간 예약 · 50 SCU'));
 assert.equal(await page.locator('#retained-cargo .retained-card').count(),1);assert.equal(await page.locator(`#planning-contracts input[data-mission="${a.missionId}"]`).isDisabled(),true);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('stam-retained-cargo-v1:guest')));assert.equal(saved.records[0].boxes.length,1);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#planning-count')?.textContent.includes('선택한 계약 1개'));assert.equal(await page.locator('#retained-cargo .retained-card').count(),1);
 await page.locator('#flight-ready-action').click();await page.getByRole('button',{name:'이 설정으로 준비',exact:true}).click();await page.locator('#flight-ready-action').click();await page.waitForFunction(()=>document.querySelector('.preview-calculation-status')?.textContent.includes('공간 예약 · 50 SCU'),null,{timeout:60000});
 await appendFile(file,pre+`<EndMission> Ending mission for player. MissionId[${b.missionId}] Player[TEST] PlayerId[123] CompletionType[Abandon] Reason[test]\n`);
 await d.waitFor({timeout:10000}).catch(async e=>{console.error(JSON.stringify({errors,planning:await page.locator('#planning').innerText(),status:await page.locator('.preview-calculation-status').innerText()}));throw e;});assert.match(await d.innerText(),/Contract B/);assert.equal(await page.locator('#retained-cargo .retained-card').count(),2);
 await page.reload();await d.waitFor({timeout:10000});
 await d.getByLabel('없습니다',{exact:true}).check();await d.getByRole('button',{name:'운송 계획에서 제외',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#planning-count')?.textContent.includes('선택한 계약 0개'));
 assert.equal(await page.locator('#retained-cargo .retained-card').count(),1);
 await page.locator('#retained-cargo').getByRole('button',{name:'화물 정리',exact:true}).click();await page.getByRole('dialog',{name:'남은 화물 정리'}).getByRole('button',{name:'화물이 없습니다',exact:true}).click();assert.equal(await page.locator('#retained-cargo .retained-card').count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('sfc-history')),null);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,partialCargoRetained:true,selectedPartnerDialogue:true,positionConfirmationRequired:true,excludedNotAutoReadded:true,reloadPreservesCargo:true,abandonmentNeedsCargoDecision:true,lastContractDoesNotClearOtherCargo:true,explicitRelease:true,noFakeHistory:true,errors}));
}finally{await browser?.close();await service.close();await rm(dir,{recursive:true,force:true});}
