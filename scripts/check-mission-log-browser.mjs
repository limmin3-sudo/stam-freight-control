import {chooseInitialPartner} from './browser-partner-choice.mjs';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5186/';
const points=JSON.parse(await readFile(new URL('../data/log-location-index.json',import.meta.url),'utf8')).locations;
const out=process.env.STAM_QA_OUTPUT||'/tmp/stam-log-final';await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const p=await b.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'#/mission?lang=ko');await chooseInitialPartner(p);await p.waitForSelector('.mission-screen');await p.getByLabel('운항 파트너',{exact:true}).selectOption('navigator');
 const id='77777777-7777-4777-8777-777777777777',definition='ad7fe12b-b1fb-48f9-8347-8c12f8dcad79',objective='00cd527c-257a-43d0-9f7a-74272c528d21',stamp='<2026-11-05T10:00:00.000Z> [Notice] ';
 const lines=[stamp+`<SHUDEvent_OnNotification> Added notification "Contract Accepted: Junior small haul | from Ashland" [1] to queue. MissionId: [${id}], ObjectiveId: [pickup_${objective}_0]`];
 for(const [i,name]of ['Ashland',"Seer's Canyon",'Rustville','Last Landings'].entries()){const point=points.find(p=>p.name===name),role=i?'dropoff':'pickup',index=i?i-1:0,parent=points.find(p=>p.id===point.parentId),relative=point.position.map((n,i)=>n-parent.position[i]);lines.push(stamp+`<CLocalMissionPhaseMarker::CreateMarker> missionId [${id}], contract [Unrecognised_Template], contractDefinitionId[${definition}], objectiveId [${role}_${objective}_${index}], zoneHostId [42], position [x: ${relative[0]}, y: ${relative[1]}, z: ${relative[2]}]`);}
 for(const [i,name]of ["Seer's Canyon",'Rustville','Last Landings'].entries())lines.push(stamp+`<SHUDEvent_OnNotification> Added notification "New Objective: Deliver 0/${i?4:8} SCU of Processed Food to ${name}" [${i+2}] to queue. MissionId: [${id}], ObjectiveId: [dropoff_${objective}_${i}]`);
 async function read(text){const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'Game.log 선택',exact:true}).click();await(await chooser).setFiles({name:'synthetic-game.log',mimeType:'text/plain',buffer:Buffer.from(text+'\n')});await p.waitForFunction(()=>document.querySelector('.mission-source-footer [role=status]')?.textContent?.includes('수신 계약 1건'));}
 await read(lines.join('\n'));assert.equal(await p.locator('.receipt-card').count(),1);const card=p.locator('.receipt-card');
 await card.locator('details.receipt-reference summary').click();assert.match(await card.locator('.receipt-reference').innerText(),/SCMDB.*Wiki/s);assert.match(await card.locator('.receipt-reference').innerText(),/Hauling - Stellar/);
 await card.locator('details.shipment-details summary').click();assert.match(await card.innerText(),/16 SCU/);await card.getByRole('checkbox').check();
 const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('stam.control-room.flight.v1')));let s=await state();assert.deepEqual(s.draft.jobs[0].shipments.map(r=>r.scu),[8,4,4]);assert.equal(s.draft.jobs[0].id,id);assert.equal(s.draft.jobs[0].referenceInfo.definitionId,definition);assert.equal(s.draft.jobs[0].rewardUnknown,true,'catalogue payout does not become an accepted reward');assert.equal(s.draft.jobs[0].pay,0);
 await read(lines.join('\n'));assert.equal(await p.locator('.receipt-card').count(),1);assert.equal((await state()).draft.jobs.length,1);
 await p.locator('.dispatch-launch').click();await p.waitForSelector('.chart-stop-events',{timeout:60000});s=await state();assert.equal(s.plan.mode,'detail');assert.equal(s.plan.visits.flatMap(v=>v.events).filter(e=>e.type==='delivery').reduce((n,e)=>n+e.scu,0),16);
 await p.locator('.space-room-link > a[href^="#/mission?"]').click();await p.waitForSelector('.mission-screen');
 const ended=stamp+`<SHUDEvent_OnNotification> Added notification "Contract Complete: Junior small haul" [9] to queue. MissionId: [${id}], ObjectiveId: [dropoff_${objective}_0]`;
 await read([...lines,ended].join('\n'));const beforeBlocked=await state();await p.locator('.dispatch-launch').click();await p.getByRole('alert').filter({hasText:'바뀌었습니다'}).waitFor();assert.deepEqual(await state(),beforeBlocked,'ended receipt is rejected before changing the existing plan or manifest');assert.equal((await state()).draft.jobs.length,1);
 await p.screenshot({path:out+'/ended-receipt-blocked.png'});assert.deepEqual(errors,[]);console.log('PASS actual log Worker + current SCMDB ID enrichment: 8/4/4 destinations, repeated import remains one mission, navigator delivery total 16, ended selected receipt blocked without deleting manifest');
}finally{await b.close();}
