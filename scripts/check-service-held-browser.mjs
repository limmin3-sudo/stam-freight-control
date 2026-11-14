// Local synthetic records and mocked Firebase only; never sends a report to production.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {emptyDraft,samples} from '../apps/control-room/src/mission-trial.ts';
import {calculateFlight} from '../apps/control-room/src/flight-engine.mjs';
import {blankRun,startRun,completeStep} from '../apps/control-room/src/flight-session.ts';
import {observeReceipts,receiptBaseline,pendingReceiptChanges,receiptChangeToken,replanReceiptUpdate} from '../apps/control-room/src/flight-receipts.ts';
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5188/',out='/tmp/stam-service-held-check',F='stam.control-room.flight.v1';await mkdir(out,{recursive:true});
const jobs=[{...structuredClone(samples[0]),id:'held-test',signature:'original',state:'ready'}],draft={...emptyDraft(),partner:'navigator',partnerSelected:true,jobs},plan=calculateFlight(draft);
let session={version:1,draft,plan,run:completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000),receiptReview:receiptBaseline(draft,jobs)};
session.run.since=null;session=observeReceipts(session,[{...jobs[0],state:'ended',signature:'cancelled'}]);session=replanReceiptUpdate(session,{'held-test':'exclude'},receiptChangeToken(pendingReceiptChanges(session)),4000);
const sdk=`export const getApps=()=>[{}],initializeApp=()=>({}),getAuth=()=>({}),getFirestore=()=>({}),collection=()=>({}),serverTimestamp=()=>0;export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{};}export async function addDoc(r,data){if(window.__failFeedback)throw Error('synthetic offline');window.__report=data;}`;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const errors=[],checks=[],page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://www.gstatic.com/firebasejs/**',r=>r.fulfill({contentType:'text/javascript',body:sdk}));await page.route(/https:\/\/.*(googleapis\.com|firebaseio\.com).*/,r=>r.abort());
 await page.addInitScript(({session,F})=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(F,JSON.stringify(session));localStorage.setItem('stam.flight-owner.v1','guest');localStorage.setItem('vh-map-quality','normal');sessionStorage.setItem('seeded','1');}},{session,F});
 await page.goto(base+'#/service?lang=ko&section=account');await page.locator('.service-inline-host .account-dialog[open]').waitFor();assert.equal(await page.locator('dialog:modal').count(),0);checks.push('account opens inside service screen');
 await page.getByRole('link',{name:'운송기록',exact:true}).click();await page.locator('.service-inline-host .history-dialog[open]').waitFor();checks.push('history opens inside service screen');
 await page.getByRole('link',{name:'피드백 · 오류 신고',exact:true}).click();await page.locator('.service-feedback textarea').fill('검증용 의견 — 실제 전송하지 않음');
 await page.getByRole('link',{name:'업데이트',exact:true}).click();await page.locator('.service-release-layout article h3').waitFor();await page.getByRole('searchbox').fill('no-such-release');await page.getByText('일치하는 업데이트가 없습니다.',{exact:true}).waitFor();await page.getByRole('searchbox').fill('');checks.push('packaged release history and search');
 await page.getByRole('link',{name:'피드백 · 오류 신고',exact:true}).click();assert.match(await page.locator('.service-feedback textarea').inputValue(),/검증용/);
 await page.evaluate(()=>window.__failFeedback=true);await page.getByRole('button',{name:'보내기',exact:true}).click();await page.getByText(/전송하지 못했습니다. 입력 내용은 유지/).waitFor();assert.match(await page.locator('.service-feedback textarea').inputValue(),/검증용/);
 await page.evaluate(()=>window.__failFeedback=false);await page.getByRole('button',{name:'보내기',exact:true}).click();await page.getByText('의견을 보냈습니다. 감사합니다.',{exact:true}).waitFor();assert.match(await page.evaluate(()=>window.__report.text),/검증용/);checks.push('draft survives internal navigation and failed send; mock send succeeds');
 await page.getByRole('link',{name:'업데이트',exact:true}).click();await page.locator('.service-release-layout article h3').waitFor();await page.screenshot({path:out+'/service-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/service-mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks.push('390px service screen fits');await page.setViewportSize({width:1366,height:900});
 await page.evaluate(()=>location.hash='#/operations?lang=ko');
 await page.getByRole('button',{name:'보류 화물 하역 확인',exact:true}).click();const dialog=page.locator('.held-cargo-dialog');await dialog.waitFor({state:'visible'});await dialog.getByRole('button',{name:'취소',exact:true}).click();assert.equal(JSON.parse(await page.evaluate(k=>localStorage.getItem(k),F)).run.aboard.length,session.run.aboard.length);
 await page.getByRole('button',{name:'보류 화물 하역 확인',exact:true}).click();await dialog.getByRole('checkbox').first().check();await dialog.getByRole('checkbox').last().check();await dialog.getByRole('button',{name:'선택한 상자 하역 확인',exact:true}).click();await dialog.waitFor({state:'hidden'});
 let saved=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),F));assert.equal(saved.run.aboard.length,session.run.aboard.length-1);assert.deepEqual(saved.run.aboard,session.run.aboard.slice(1));assert.equal(saved.heldDischarges.length,1);checks.push('cancel preserves boxes; partial physical unload preserves other placements');
 await page.reload();await page.getByRole('button',{name:'보류 화물 하역 확인',exact:true}).click();for(const box of await dialog.getByRole('checkbox').all())await box.check();await dialog.getByRole('button',{name:'선택한 상자 하역 확인',exact:true}).click();await dialog.waitFor({state:'hidden'});saved=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),F));assert.equal(saved.run.aboard.length,0);assert.equal(saved.run.finished,true);assert.deepEqual(saved.run.delivered,session.run.delivered);assert.equal(await page.evaluate(()=>localStorage.getItem('sfc-history')),null);checks.push('last unload finishes without cancelled delivery or reward; ledger survives reload');
 await page.screenshot({path:out+'/held-finished.png'});assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,checks,errors},null,2));console.log(JSON.stringify({passed:true,checks},null,2));
}finally{await browser.close();}
