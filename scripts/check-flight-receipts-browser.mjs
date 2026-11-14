import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {chooseInitialPartner} from './browser-partner-choice.mjs';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5188/';
const points=JSON.parse(await readFile(new URL('../data/log-location-index.json',import.meta.url),'utf8')).locations;
const out=process.env.STAM_QA_OUTPUT||'/tmp/stam-flight-receipts';await mkdir(out,{recursive:true});
const cacheKey='stam.receipt-inbox.v1',flightKey='stam.control-room.flight.v1';
 const id='77777777-7777-4777-8777-777777777777',definition='ad7fe12b-b1fb-48f9-8347-8c12f8dcad79',objective='00cd527c-257a-43d0-9f7a-74272c528d21',stamp='<2026-11-05T10:00:00.000Z> [Notice] ';
 const lines=[stamp+`<SHUDEvent_OnNotification> Added notification "Contract Accepted: Junior small haul | from Ashland" [1] to queue. MissionId: [${id}], ObjectiveId: [pickup_${objective}_0]`];
 for(const [i,name]of ['Ashland',"Seer's Canyon",'Rustville','Last Landings'].entries()){const point=points.find(p=>p.name===name),role=i?'dropoff':'pickup',index=i?i-1:0,parent=points.find(p=>p.id===point.parentId),relative=point.position.map((n,i)=>n-parent.position[i]);lines.push(stamp+`<CLocalMissionPhaseMarker::CreateMarker> missionId [${id}], contract [Unrecognised_Template], contractDefinitionId[${definition}], objectiveId [${role}_${objective}_${index}], zoneHostId [42], position [x: ${relative[0]}, y: ${relative[1]}, z: ${relative[2]}]`);}
 for(const [i,name]of ["Seer's Canyon",'Rustville','Last Landings'].entries())lines.push(stamp+`<SHUDEvent_OnNotification> Added notification "New Objective: Deliver 0/${i?4:8} SCU of Processed Food to ${name}" [${i+2}] to queue. MissionId: [${id}], ObjectiveId: [dropoff_${objective}_${i}]`);
const raw=lines.join('\n')+'\n';

const second='88888888-8888-4888-8888-888888888888',both=raw+raw.replaceAll(id,second);
const ended=mission=>stamp+`<SHUDEvent_OnNotification> Added notification "Contract Complete: Junior small haul" [9] to queue. MissionId: [${mission}], ObjectiveId: [dropoff_${objective}_0]`;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[];
 page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 const flight=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),flightKey);
 const nav=async route=>{await page.evaluate(route=>location.hash='#/'+route+'?lang=ko',route);};
 const read=async text=>{await page.locator('.active-flight-log input[type=file],.receipt-import:not([hidden]) input[type=file]').setInputFiles({name:'Game.log',mimeType:'text/plain',buffer:Buffer.from(text+'\n')});};
 const open=()=>page.getByRole('button',{name:'변경 확인',exact:true}).click();
 const confirm=()=>page.getByRole('button',{name:'확인하고 남은 경로 재계산',exact:true}).click();
 await page.addInitScript(()=>localStorage.setItem('vh-map-quality','normal'));
 await page.goto(base+'#/mission?lang=ko');await chooseInitialPartner(page,'navigator');
 await read(both);await page.waitForFunction(()=>document.querySelectorAll('.receipt-card').length===2);
 for(const box of await page.locator('.receipt-card input[type=checkbox]').all())await box.check();
 await page.locator('.dispatch-launch').click();await page.waitForFunction(k=>!!JSON.parse(localStorage.getItem(k))?.plan,flightKey);
 await nav('operations');await page.getByRole('button',{name:'운항 시작',exact:true}).click();
 for(let i=0;i<20&&!(await flight()).run.aboard.length;i++)await page.locator('.flight-actions .manifest-primary').click();
 console.log('loaded cargo');const loaded=await flight();assert.equal(loaded.run.aboard.reduce((n,b)=>n+b.size,0),32);
 await nav('mission');await read(both+ended(id));await page.locator('.receipt-update-notice').waitFor();
 let pending=await flight();assert.deepEqual(pending.plan,loaded.plan);assert.deepEqual(pending.run,loaded.run);
 await open();await page.getByRole('button',{name:'나중에 확인',exact:true}).click();assert.deepEqual((await flight()).run,loaded.run);
 await page.reload();await page.locator('.receipt-update-notice').waitFor();
 assert.equal(await page.locator('.pilot-log').getAttribute('data-log-state'),'cached');
 await open();await page.keyboard.press('Escape');assert.match(page.url(),/#\/mission/);
 // A later observation invalidates a dialog opened against older evidence.
 await open();await page.evaluate(()=>document.querySelector('dialog').close());
 await read(both+ended(id)+'\n'+ended(second));
 await page.waitForFunction(()=>document.querySelector('.receipt-update-notice')?.textContent.includes('2건'));
 await page.evaluate(()=>document.querySelector('.receipt-update-dialog').showModal());await confirm();
 await page.locator('.receipt-update-error').filter({hasText:'바뀌었습니다'}).waitFor();assert.deepEqual((await flight()).run,loaded.run);
 await page.getByRole('button',{name:'나중에 확인',exact:true}).click();
 // Return to just the first ended signal; the second's current evidence is explicitly acknowledged.
 await read(both+ended(id));await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).receiptReview.observed.find(j=>j.id.startsWith('888')).state==='ready',flightKey);
 console.log('stale review passed');await open();pending=await flight();
 await page.evaluate(key=>{window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Full','QuotaExceededError');return window.__setItem.call(this,k,v);};},flightKey);
 await confirm();await page.locator('.receipt-update-error').filter({hasText:'저장하지 못해'}).waitFor();assert.deepEqual(await flight(),pending);
 await page.evaluate(()=>Storage.prototype.setItem=window.__setItem);
 await page.screenshot({path:out+'/review-desktop.png'});
 await page.setViewportSize({width:390,height:844});const rect=await page.locator('.receipt-update-dialog').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=390&&rect.y>=0&&rect.y+rect.height<=844);
 await page.screenshot({path:out+'/review-mobile.png'});
 await confirm();await page.waitForFunction(()=>!document.querySelector('.receipt-update-notice'));
 const updated=await flight();assert.deepEqual(updated.run.aboard,loaded.run.aboard);assert.deepEqual(updated.run.delivered,loaded.run.delivered);assert.deepEqual(updated.run.log,loaded.run.log);
 assert(updated.plan.visits.every(v=>v.events.every(e=>e.missionId!==id)));assert(updated.plan.visits.some(v=>v.events.some(e=>e.missionId===second)));
 await page.setViewportSize({width:1920,height:1080});await nav('operations');
 await page.locator('.ops-live-cargo .cargo-render-surface[data-ready=true]').waitFor();
 for(let i=0;i<20&&(await flight()).run.index<(await flight()).plan.visits.length;i++)await page.locator('.flight-actions .manifest-primary').click();
 const held=await flight();assert.equal(held.run.finished,false);assert.equal(held.run.aboard.reduce((n,b)=>n+b.size,0),16);assert(held.run.aboard.every(b=>b.missionId===id));
 assert(await page.getByText('남은 배송 없음 · 보류 화물 있음',{exact:true}).isVisible());
 await page.screenshot({path:out+'/held-cargo-desktop.png'});
 await page.reload();await page.locator('.ops-progress').waitFor();assert.deepEqual((await flight()).run,held.run);
 // A second cancellation produces a valid zero-visit route; no delivery is invented.
 await nav('mission');await read(both+ended(id)+'\n'+ended(second));await page.locator('.receipt-update-notice').waitFor();await open();await confirm();await page.waitForFunction(()=>!document.querySelector('.receipt-update-notice'));
 const empty=await flight();assert.equal(empty.plan.visits.length,0);assert.deepEqual(empty.run.aboard,held.run.aboard);assert.deepEqual(empty.run.delivered,held.run.delivered);
 await nav('operations');await page.locator('.ops-progress').waitFor();assert(await page.getByText('남은 배송 없음 · 보류 화물 있음',{exact:true}).isVisible());
 assert(await page.locator('.space-sidebar:visible').isVisible());assert(await page.locator('.space-topbar:visible').isVisible());
 assert.deepEqual(errors,[]);
 const report={passed:true,checks:['real receipt Worker imports two contracts','load both via flight controls','notification leaves route and cargo unchanged','pending review survives reload','active-flight log reconnect remains usable','later/Escape preserve flight','stale review rejected','storage failure preserves old session','390px review fits screen','confirmed cancellation preserves exact aboard boxes and completed log','other deliveries complete while held boxes retain space','held cargo prevents false completion','zero-visit route remains readable','fixed header/sidebar retained'],pageErrors:errors};
 await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
