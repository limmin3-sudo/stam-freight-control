import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile,appendFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startLogService} from '../integration/log/live-server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const dir=await mkdtemp(join(tmpdir(),'stam-payout-history-')),file=join(dir,'synthetic.log');await writeFile(file,'');
const service=await startLogService({file});let browser;
try{
 browser=await chromium.launch({...(process.env.STAM_CHROMIUM_PATH?{executablePath:process.env.STAM_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(new URL(r.url()).pathname);});
 await page.addInitScript(()=>{
  const id='11111111-1111-4111-8111-111111111111';
  const records=Array.from({length:121},(_,n)=>({at:new Date(2026,10,n<60?3:4,12,0,n%60).toISOString(),amount:n+1,notificationId:String(n),missionId:n%3===0?id:null,linkedMissionId:n%3===1?id:null}));
  localStorage.setItem('stam-rewards-v1:guest',JSON.stringify({version:1,records}));
  localStorage.setItem('sfc-history',JSON.stringify([{id:'synthetic-old-run',at:'2026-11-01T12:00:00.000Z',ship:'MISC Hull B',reward:1000,scu:32,seconds:600,missions:[{id:'synthetic-old',reward:1000,scu:32}]}]));
 });
 await page.goto(service.url);await page.locator('#workspace-history').click();
 const dialog=page.locator('.history-dialog'),ledger=dialog.locator('.payout-history');
 await ledger.getByRole('status').waitFor();assert.match(await ledger.innerText(),/전체 보관 121건 · 7,381 aUEC/);
 assert.equal(await ledger.locator('.payout-list li').count(),50);await ledger.getByRole('button',{name:'다음 기록',exact:true}).click();await ledger.getByRole('button',{name:'다음 기록',exact:true}).click();assert.equal(await ledger.locator('.payout-list li').count(),21);
 await ledger.getByLabel('지급 기록 분류').selectOption('manual');await ledger.getByRole('button',{name:'조회',exact:true}).click();assert.equal(await ledger.locator('.payout-list li').count(),40);
 await ledger.getByLabel('지급 조회 시작일').fill('2026-11-04');await ledger.getByRole('button',{name:'조회',exact:true}).click();assert.equal(await ledger.locator('.payout-list li').count(),20);
 // Unsubmitted date edits survive unrelated updates and new payouts; applied filters stay separate.
 await ledger.getByLabel('지급 조회 종료일').fill('2026-11-05');
 await appendFile(file,'<2026-11-04T12:30:00.000Z> [Notice] <SHUDEvent_OnNotification> Added notification "Awarded 100 aUEC: " [999] to queue. MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: []\n');
 await page.waitForFunction(()=>document.querySelector('.payout-totals')?.textContent.includes('전체 보관 122건'));
 assert.equal(await ledger.getByLabel('지급 조회 종료일').inputValue(),'2026-11-05');assert.equal(await ledger.locator('.payout-list li').count(),20);
 const pending=page.waitForEvent('download');await ledger.getByRole('button',{name:'지급 기록 내보내기'}).click();const download=await pending;
 const exported=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(exported.records.length,122);assert.equal(exported.currency,'aUEC');assert.ok(!JSON.stringify(exported).includes('synthetic-old'));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sfc-history'))[0].reward),1000);
 await dialog.locator('[data-close]').click();
 await appendFile(file,'<2026-11-04T12:31:00.000Z> [Notice] <SHUDEvent_OnNotification> Added notification "Awarded 200 aUEC: " [1000] to queue. MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: []\n');
 await page.waitForFunction(()=>document.querySelector('#reward-observations summary')?.textContent==='지급 알림 123건');
 assert.match(await ledger.locator('.payout-totals').textContent(),/전체 보관 122건/);
 await page.locator('#workspace-history').click();assert.match(await ledger.locator('.payout-totals').textContent(),/전체 보관 123건/);
 await ledger.getByLabel('지급 조회 종료일').fill('2026-11-05');
 await page.setViewportSize({width:390,height:844});assert.equal(await dialog.evaluate(n=>n.scrollWidth>n.clientWidth+1),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await ledger.getByLabel('지급 조회 시작일').fill('2026-11-06');await ledger.getByRole('button',{name:'조회',exact:true}).click();assert.match(await ledger.getByRole('alert').innerText(),/시작일과 종료일/);
 await page.evaluate(()=>localStorage.setItem('vh-account-meta',JSON.stringify({uid:'other'})));await ledger.getByRole('button',{name:'조회',exact:true}).click();assert.match(await ledger.getByRole('alert').innerText(),/계정/);assert.equal(await ledger.locator('.payout-list li').count(),0);assert.equal(await ledger.getByRole('button',{name:'지급 기록 내보내기'}).count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 console.log(JSON.stringify({passed:true,allPagesAccessible:true,dateAndAttributionFilters:true,unsubmittedFiltersPreserved:true,fullStructuredExport:true,noDoubleIncome:true,accountGuard:true,noClosedDialogRendering:true,mobileOverflow:false,errors,bad}));
}finally{await browser?.close();await service.close();await rm(dir,{recursive:true,force:true});}
