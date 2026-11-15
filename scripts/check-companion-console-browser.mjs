// Actual Chromium + actual loopback API + built React worker. Only the game log is synthetic.
import assert from 'node:assert/strict';
import {readFile,writeFile,appendFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {startLogService} from '../integration/log/live-server.mjs';
import {chooseInitialPartner} from './browser-partner-choice.mjs';import {mime} from './web-files.mjs';
const site='https://limmin3-sudo.github.io/stam-freight-control/',out=process.env.STAM_QA_OUTPUT||'/tmp/stam-companion-console';await mkdir(out,{recursive:true});
const dir=await mkdtemp(join(tmpdir(),'stam-companion-console-')),file=join(dir,'Game.log');
const points=JSON.parse(await readFile('data/log-location-index.json','utf8')).locations;
const id='77777777-7777-4777-8777-777777777777',second='88888888-8888-4888-8888-888888888888',definition='ad7fe12b-b1fb-48f9-8347-8c12f8dcad79',objective='00cd527c-257a-43d0-9f7a-74272c528d21',stamp='<2026-11-05T10:00:00.000Z> [Notice] ';
function fixture(id){const lines=[stamp+`<SHUDEvent_OnNotification> Added notification "Contract Accepted: Junior small haul | from Ashland" [1] to queue. MissionId: [${id}], ObjectiveId: [pickup_${objective}_0]`];
 for(const [i,name]of ['Ashland',"Seer's Canyon",'Rustville','Last Landings'].entries()){const point=points.find(p=>p.name===name),parent=points.find(p=>p.id===point.parentId),relative=point.position.map((n,i)=>n-parent.position[i]);lines.push(stamp+`<CLocalMissionPhaseMarker::CreateMarker> missionId [${id}], contract [Unrecognised_Template], contractDefinitionId[${definition}], objectiveId [${i?'dropoff':'pickup'}_${objective}_${i?i-1:0}], zoneHostId [42], position [x: ${relative[0]}, y: ${relative[1]}, z: ${relative[2]}]`);}
 for(const [i,name]of ["Seer's Canyon",'Rustville','Last Landings'].entries())lines.push(stamp+`<SHUDEvent_OnNotification> Added notification "New Objective: Deliver 0/${i?4:8} SCU of Processed Food to ${name}" [${i+2}] to queue. MissionId: [${id}], ObjectiveId: [dropoff_${objective}_${i}]`);
 return lines.join('\n')+'\n';}
let service,browser,page;const checks=[],errors=[],leaks=[];
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',permissions:['local-network-access']});
 await context.route(site+'**',async route=>{const name=decodeURIComponent(new URL(route.request().url()).pathname.slice(new URL(site).pathname.length))||'index.html';if(name.split('/').includes('..'))return route.abort();try{await route.fulfill({body:await readFile(join('apps/control-room/dist',name)),contentType:mime(name)||'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Not found'});}});
 page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().startsWith(site)&&r.headers().authorization)leaks.push(r.url());});
 await page.goto(site+'#/mission?lang=ko');await chooseInitialPartner(page,'navigator');await page.locator('.mission-screen').waitFor();await page.getByText('로그 앱을 실행하세요. 실행하면 자동 연결됩니다.',{exact:true}).waitFor();
 const original=await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1'));
 service=await startLogService({file,port:23458,apiOnly:true});await page.getByText('앱 연결됨 · 게임 로그 생성 대기',{exact:true}).waitFor();
 await writeFile(file,fixture(id));await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('stam.receipt-inbox.v1'))?.cards.length===1);
 assert.equal(await page.locator('.receipt-card').count(),1);let cache=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('stam.receipt-inbox.v1')));assert.deepEqual(cache.cards[0].shipments.map(r=>r.scu),[8,4,4]);assert.equal(cache.cards[0].referenceInfo.definitionId,definition);
 checks.push('tab opened before app → authenticated automatic pairing → waits for missing Game.log → actual Worker enriches 8/4/4 SCU');
 await appendFile(file,fixture(second));await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('stam.receipt-inbox.v1'))?.cards.length===2);
 assert.equal(await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),original);checks.push('appended second accepted contract appears without changing selected flight');
 await page.screenshot({path:out+'/mission-app-connected.png',fullPage:true});
 const oldToken=service.token;await service.close();service=null;await page.getByText('로그 앱을 실행하세요. 실행하면 자동 연결됩니다.',{exact:true}).waitFor();assert.equal(await page.locator('.receipt-card').count(),2);
 await writeFile(file,'');
 await page.evaluate(()=>{window.__receiptSizes=[];const save=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='stam.receipt-inbox.v1')window.__receiptSizes.push(JSON.parse(v).cards.length);return save.call(this,k,v);};});
 service=await startLogService({file,port:23458,apiOnly:true});await page.waitForFunction(old=>sessionStorage.getItem('stam-local-log-pairing')!==old&&!!sessionStorage.getItem('stam-local-log-pairing'),oldToken);await page.getByText('앱 자동 수신 중',{exact:true}).waitFor();
 await page.waitForTimeout(1000);assert.equal((await page.evaluate(()=>JSON.parse(sessionStorage.getItem('stam.receipt-inbox.v1')))).cards.length,2);
 await writeFile(file,fixture(id)+fixture(second));await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>window.__receiptSizes.includes(0)),false);checks.push('revision zero on an empty restarted log never clears saved receipts');
 await page.reload();await page.getByText('앱 자동 수신 중',{exact:true}).waitFor();await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('stam.receipt-inbox.v1'))?.cards.length===2);assert.equal(new URL(page.url()).hash,'#/mission?lang=ko');checks.push('offline receipts retained; process token rotation and reload recover without changing route');
 await page.getByRole('button',{name:'앱 연결 중지',exact:true}).click();await appendFile(file,fixture('99999999-9999-4999-8999-999999999999'));await page.waitForTimeout(1500);assert.equal((await page.evaluate(()=>JSON.parse(sessionStorage.getItem('stam.receipt-inbox.v1')))).cards.length,2);
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Game.log 선택',exact:true}).click();await(await chooser).setFiles({name:'synthetic-game.log',mimeType:'text/plain',buffer:Buffer.from(fixture(id))});await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('stam.receipt-inbox.v1'))?.cards.length===1);checks.push('explicit disconnect stops reception; manual file import still works without racing app');
 await page.getByRole('button',{name:'로그 앱 연결',exact:true}).click();await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('stam.receipt-inbox.v1'))?.cards.length===3);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>location.hash='#/mission?lang=en');await page.getByText('Receiving from app',{exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/mission-app-mobile.png',fullPage:true});checks.push('reconnect button restores receiving; English mobile layout fits');
 assert.deepEqual(errors,[]);assert.deepEqual(leaks,[]);await writeFile(out+'/report.json',JSON.stringify({passed:true,syntheticLog:true,realLoopback:true,checks,errors,tokenLeaks:leaks},null,2));console.log(checks);
}catch(error){if(page){await page.screenshot({path:out+'/failure.png',fullPage:true});console.error((await page.locator('body').innerText()).slice(0,4000));}throw error;}finally{await browser?.close();await service?.close();await rm(dir,{recursive:true,force:true});}
