import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {chooseInitialPartner} from './browser-partner-choice.mjs';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5188/';
const points=JSON.parse(await readFile(new URL('../data/log-location-index.json',import.meta.url),'utf8')).locations;
const out=process.env.STAM_QA_OUTPUT||'/tmp/stam-receipt-continuity';await mkdir(out,{recursive:true});
const cacheKey='stam.receipt-inbox.v1',flightKey='stam.control-room.flight.v1';
 const id='77777777-7777-4777-8777-777777777777',definition='ad7fe12b-b1fb-48f9-8347-8c12f8dcad79',objective='00cd527c-257a-43d0-9f7a-74272c528d21',stamp='<2026-11-05T10:00:00.000Z> [Notice] ';
 const lines=[stamp+`<SHUDEvent_OnNotification> Added notification "Contract Accepted: Junior small haul | from Ashland" [1] to queue. MissionId: [${id}], ObjectiveId: [pickup_${objective}_0]`];
 for(const [i,name]of ['Ashland',"Seer's Canyon",'Rustville','Last Landings'].entries()){const point=points.find(p=>p.name===name),role=i?'dropoff':'pickup',index=i?i-1:0,parent=points.find(p=>p.id===point.parentId),relative=point.position.map((n,i)=>n-parent.position[i]);lines.push(stamp+`<CLocalMissionPhaseMarker::CreateMarker> missionId [${id}], contract [Unrecognised_Template], contractDefinitionId[${definition}], objectiveId [${role}_${objective}_${index}], zoneHostId [42], position [x: ${relative[0]}, y: ${relative[1]}, z: ${relative[2]}]`);}
 for(const [i,name]of ["Seer's Canyon",'Rustville','Last Landings'].entries())lines.push(stamp+`<SHUDEvent_OnNotification> Added notification "New Objective: Deliver 0/${i?4:8} SCU of Processed Food to ${name}" [${i+2}] to queue. MissionId: [${id}], ObjectiveId: [dropoff_${objective}_${i}]`);
const raw=lines.join('\n')+'\n';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(30000);
 const cache=()=>page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),cacheKey);
 const flight=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),flightKey);
 async function read(text){await page.locator('.receipt-import input[type=file]').setInputFiles({name:'synthetic-game.log',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>document.querySelector('.pilot-log')?.getAttribute('data-log-state')==='file');}
 async function edit(pay){
  await page.locator('.receipt-correct').first().click();
  await page.locator('.manifest-editor').getByLabel('보상 · aUEC',{exact:true}).fill(String(pay));
  await page.getByRole('button',{name:'보완한 카드 저장',exact:true}).click();
 }
 await page.goto(base+'#/mission?lang=ko');await chooseInitialPartner(page,'navigator');
 await read(raw);assert.equal(await page.locator('.receipt-card').count(),1);
 await page.locator('.receipt-correct').click();
 const editor=page.locator('.manifest-editor');
 await editor.getByLabel('계약명',{exact:true}).fill('Reviewed receipt');
 await editor.getByLabel('보상 · aUEC',{exact:true}).fill('12345');
 await editor.getByLabel('SCU',{exact:true}).first().fill('10');
 await editor.locator('fieldset').first().getByText('상자 규격 · 개수',{exact:true}).click();
 await editor.locator('fieldset').first().getByLabel('2 SCU',{exact:true}).fill('5');
 await page.getByRole('button',{name:'보완한 카드 저장',exact:true}).click();
 assert.equal((await flight())?.draft.jobs.length||0,0,'correcting inbox must not select the contract');
 let saved=await cache();assert.equal(saved.cards[0].shipments[0].scu,8);assert.equal(saved.corrections[id].card.shipments[0].scu,10);
 await page.reload();await page.locator('.receipt-card').waitFor();
 assert.match(await page.locator('.receipt-card').innerText(),/Reviewed receipt/);assert.match(await page.locator('.receipt-bottom>b').innerText(),/18 SCU/);
 assert.equal(await page.locator('.pilot-log').getAttribute('data-log-state'),'cached');
 assert.equal((await cache()).corrections[id].card.pay,12345);
 await read(raw);assert.equal((await cache()).corrections[id].card.pay,12345);
 // Dismissal/restore also stays in the tab; selected flight contracts are separate.
 await page.locator('.receipt-manage summary').click();await page.getByRole('button',{name:'수신함 비우기',exact:true}).click();
 await page.reload();await page.locator('.receipt-manage summary').click();assert.equal(await page.locator('.receipt-card').count(),0);
 await page.getByRole('button',{name:/삭제 카드 복원/}).click();assert.equal(await page.locator('.receipt-card').count(),1);
 await page.locator('.receipt-manage summary').click();
 // A failed read retains the previous cache and visible corrections.
 await page.evaluate(()=>{window.__Worker=window.Worker;window.Worker=class{constructor(){throw Error('QA worker unavailable');}};});
 await page.locator('.receipt-import input[type=file]').setInputFiles({name:'failure.log',mimeType:'text/plain',buffer:Buffer.from(raw)});
 await page.waitForFunction(()=>document.querySelector('.pilot-log')?.getAttribute('data-log-state')==='error');
 assert.match(await page.locator('.receipt-card').innerText(),/Reviewed receipt/);
 await page.evaluate(()=>window.Worker=window.__Worker);await page.reload();
 await page.waitForFunction(()=>document.querySelector('.pilot-log')?.getAttribute('data-log-state')==='cached');
 // Quota failure does not erase on-screen corrections or silently replace stored data.
 await page.evaluate(key=>{window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Full','QuotaExceededError');return window.__setItem.call(this,k,v);};},cacheKey);
 await edit(54321);await page.getByRole('alert').filter({hasText:'수신함을 이 탭에 저장하지 못했습니다'}).waitFor();
 assert.equal((await cache()).corrections[id].card.pay,12345);
 await page.locator('.receipt-card input[type=checkbox]').check();assert.equal((await flight()).draft.jobs[0].pay,54321);
 await page.reload();await page.locator('.receipt-card').waitFor();assert.equal((await flight()).draft.jobs[0].pay,54321);
 assert.equal((await cache()).corrections[id].card.pay,12345);
 await page.getByRole('button',{name:'선택 해제',exact:true}).click();
 // Changed evidence and another accepted instance cannot inherit manual edits.
 await read(raw.replace('0/8 SCU','0/12 SCU'));assert.deepEqual((await cache()).corrections,{});
 assert.match(await page.locator('.receipt-bottom>b').innerText(),/20 SCU/);
 await read(raw.replaceAll(id,'88888888-8888-4888-8888-888888888888'));assert.deepEqual((await cache()).corrections,{});
 // Live handle is explicitly reselected; it must never be serialized or auto-resumed.
 await page.addInitScript(raw=>{window.__watch={raw,calls:0};window.showOpenFilePicker=async()=>[{getFile:async()=>{window.__watch.calls++;return new File([window.__watch.raw],'Game.log',{lastModified:1});}}];},raw);
 await page.reload();await page.getByRole('button',{name:'Game.log 자동 수신',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.pilot-log')?.getAttribute('data-log-state')==='live');
 assert((await page.evaluate(()=>window.__watch.calls))>0);
 await page.reload();await page.waitForFunction(()=>document.querySelector('.pilot-log')?.getAttribute('data-log-state')==='cached');
 assert.equal(await page.evaluate(()=>window.__watch.calls),0);
 await page.screenshot({path:out+'/restored-inbox-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('.mission-source-footer').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/restored-inbox-mobile.png'});
 // Corruption does not crash or overwrite the stored bytes, and selected jobs survive.
 await page.locator('.receipt-card input[type=checkbox]').check();const selected=await flight();
 await page.evaluate(key=>sessionStorage.setItem(key,'{'),cacheKey);await page.reload();
 await page.getByRole('alert').filter({hasText:'저장된 수신함을 읽지 못했습니다'}).waitFor();
 assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),cacheKey),'{');assert.deepEqual(await flight(),selected);
 await page.close();const reopened=await context.newPage();await reopened.goto(base+'#/mission?lang=ko');await reopened.locator('.mission-screen').waitFor();
 assert.equal(await reopened.evaluate(key=>sessionStorage.getItem(key),cacheKey),null);
 assert.equal(await reopened.evaluate(()=>sessionStorage.getItem('stam-inbox-dismissed')),null);
 assert.deepEqual(await reopened.evaluate(key=>JSON.parse(localStorage.getItem(key)),flightKey),selected);
 assert.equal(await reopened.locator('.pilot-log').getAttribute('data-log-state'),'off');
 assert.deepEqual(errors,[]);
 const report={passed:true,checks:['actual log Worker import','unselected corrected quantities, boxes, reward persist across reload','same evidence re-import retains correction','tab-local dismissal and restore','read failure retains inbox','quota failure is visible; last saved cache and selected flight independent','changed evidence and different instance reject old correction','live watcher reload restores offline cache only','390px layout','corrupt cache preserves bytes and selected contracts','closed tab clears inbox, flight survives'],pageErrors:errors};
 await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
