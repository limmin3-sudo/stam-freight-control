import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs';
import {blankSuiteBook,changeSuiteBook} from '../../../apps/control-room/src/trade-expedition.ts';
import {calculateSuite,defaultSuiteOptions} from '../../../apps/control-room/src/trade-suite.ts';
import {suiteContext} from '../../../apps/control-room/src/trade-suite-runtime.mjs';
const base=process.env.STAM_FACILITY_URL||'http://127.0.0.1:5201/stam-freight-control/',out=new URL('./review/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const data=JSON.parse(await readFile(new URL('../../../data/trade-market.json',import.meta.url),'utf8'));
const origin=data.terminals.find(t=>t.location==='Everus Harbor').id;
const options={...defaultSuiteOptions,shipId:'drake-cutlass-black',capacity:46,budget:1000000,originId:origin,risk:'all',maxAgeHours:720};
const route=calculateSuite(data,options,suiteContext(options)).routes[0];assert(route);
let book=changeSuiteBook(blankSuiteBook('guest'),{kind:'start',id:'cinematic-check',options,route});
book=changeSuiteBook(book,{kind:'event',runId:'cinematic-check',event:{id:'bought',at:new Date().toISOString(),kind:'buy',lotId:'lobby-check-lot',commodityId:route.legs[0].lines[0].commodityId,quantity:4,boxSize:1,amount:40,terminalId:origin,ownership:'owned',note:'Synthetic lobby regression',tags:[]}});
const key='stam.trade-suite.v1:guest',raw=JSON.stringify(book),checks=[],errors=[],missing=[];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('cinematic-seeded')){localStorage.setItem(key,raw);sessionStorage.setItem('cinematic-seeded','yes');}},{key,raw});
 const p=await context.newPage();p.setDefaultTimeout(25000);p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url());});
 await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com|api.uexcorp.uk)\//,r=>r.abort());
 const go=async(facility='trade',room='',lang='ko')=>{await p.goto(`${base}#/division?lang=${lang}&facility=${facility}${room?'&room='+room:''}`);await p.locator('.facility-lobby').waitFor();await p.evaluate(()=>document.fonts.ready);if(!room){await p.locator('.lobby-stage[data-loaded=true]').waitFor();await p.locator('.lobby-person img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));}};
 const idle=()=>p.waitForFunction(()=>document.querySelector('.facility-lobby')?.getAttribute('data-travel')==='idle');
 const shot=async(name)=>{await p.mouse.move(10,10);await p.waitForTimeout(400);await p.screenshot({path:out+name+'.png'});};
 const stored=()=>p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>/trade|flight|contract|history|account/.test(k))));
 await go();const before=await stored();await shot('trade-lobby-desktop');
 assert.equal(await p.locator('.space-topbar').count(),1);assert.equal(await p.locator('.space-sidebar').count(),1);
 await p.locator('[data-place=market]').hover();assert.equal(await p.locator('.lobby-spotlight').getAttribute('data-active'),'true');await p.waitForTimeout(350);await p.screenshot({path:out+'market-highlight.png'});
 for(const [person,scope] of [['senior-trade-officer','intrasystem'],['ling-broker','interstellar']]){
  await p.locator(`[data-staff=${person}]`).click();assert.equal(await p.locator('.facility-lobby').getAttribute('data-travel'),'approach');assert(!p.url().includes('room='));
  await p.waitForURL('**advisor='+scope);await idle();await p.getByLabel('함선',{exact:true}).waitFor();assert.equal(await p.locator('.trade-advisors [aria-pressed=true]').count(),1);
  assert((await p.locator('.trade-advisors [aria-pressed=true]').innerText()).includes(scope==='intrasystem'?'수석':'링'));
  assert.equal(await p.locator('.trade-suite').count(),1);await shot('planning-'+scope);
  await p.getByRole('button',{name:'로비 전체 보기',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.facility-lobby')?.getAttribute('data-travel')==='return');await idle();
  assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('data-staff')),person);
 }
 checks.push('Both approved traders -> distinct scope in existing single TradeWorkspace, approach/return and character focus restoration');
 for(const room of ['market','planning','trade-operations']){
  await p.locator(`[data-place=${room}]`).click();await p.waitForURL('**room='+room);await idle();await p.locator('.market-room').waitFor();assert.equal(await p.evaluate(()=>document.activeElement?.tagName),'H2');
  if(room==='trade-operations'){await p.locator('.trade-price-console').waitFor();assert.equal(await p.locator('.trade-map-canvas').count(),0);assert.equal(await p.locator('[data-suite-aboard]').innerText(),'4 SCU');await shot('trade-control-existing');}
  await p.keyboard.press('Escape');await idle();await p.waitForFunction(()=>!location.hash.includes('room='));
  assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('data-place')),room);
 }
 checks.push('Three trade places preserve existing market/planner/price-first control, 4 SCU ledger, Escape return');
 await p.locator('[data-place=market]').click();await p.waitForTimeout(100);await p.keyboard.press('Escape');await p.waitForTimeout(850);assert(!p.url().includes('room='));await idle();
 await p.locator('[data-staff=ling-broker]').click();await p.locator('.space-sidebar a[href*="facility=trade"]').first().click();await p.waitForTimeout(1050);assert(!p.url().includes('room='));assert.equal(await p.locator('.lobby-person:visible').count(),2);
 await p.locator('[data-place=market]').click();await p.locator('.space-sidebar a[href*="facility=guide-center"]').first().click();await p.waitForTimeout(1050);assert(p.url().includes('facility=guide-center'));assert(!p.url().includes('room='));
 checks.push('Escape cancels pending route; sidebar same-lobby and other-facility clicks cancel timers without a delayed reroute');
 await go('guide-center');await shot('academy-lobby-desktop');await p.locator('[data-staff=academic-advisor]').click();await p.locator('#lobby-staff-intro').waitFor();await shot('academy-advisor-desktop');assert.equal(await p.locator('.lobby-staff-rooms button').count(),3);
 for(const [room,label] of [['freight-information','운송 정보실'],['education','교육실'],['operations-study','작전 연구실']]){
  if(!await p.locator('#lobby-staff-intro').count())await p.locator('[data-staff=academic-advisor]').click();
  await p.locator('.lobby-staff-rooms').getByRole('button',{name:label,exact:true}).click();await p.waitForURL('**room='+room);await idle();await p.locator('.market-room').waitFor();assert.equal(await p.evaluate(()=>document.activeElement?.tagName),'H2');
  if(room==='education'){await p.locator('.academy-lesson').first().waitFor();await shot('academy-education-existing');}
  if(room==='operations-study')await p.getByText('6 계약 · 363 SCU',{exact:true}).waitFor();
  await p.getByRole('button',{name:'로비 전체 보기',exact:true}).click();await p.waitForFunction(()=>!location.hash.includes('room='));await idle();assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('data-staff')),'academic-advisor');
 }
 checks.push('Professor introduces and selects all three existing academy rooms; lessons, archive and six-contract study remain reachable');
 await p.locator('[data-place=education]').click();await p.waitForURL('**room=education');await idle();await p.goBack();await idle();assert(!p.url().includes('room='));await p.goForward();await p.locator('.academy-lesson').first().waitFor();await idle();await p.reload();await p.locator('.academy-lesson').first().waitFor();await idle();
 checks.push('Browser back/forward and deep-link reload retain route without replaying camera travel');
 await go('trade','trade-operations');await p.locator('.trade-price-console').waitFor();await p.getByLabel('기록 종류',{exact:true}).selectOption('expense');await p.getByLabel('실제 총액 · aUEC',{exact:true}).fill('2');await p.getByLabel('메모 · 손실·비용은 사유 필수',{exact:true}).fill('Synthetic uncommitted review');await p.getByRole('button',{name:'기록 내용 확인',exact:true}).click();await p.locator('dialog[open]').waitFor();await p.keyboard.press('Escape');assert(p.url().includes('room=trade-operations'));assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),raw);assert.deepEqual(await stored(),before);
 checks.push('Actual transaction dialog retains Escape priority; unconfirmed review and all lobby navigation preserve seeded ledger/flight/account storage');
 await p.setViewportSize({width:1366,height:768});await go();await shot('trade-lobby-1366');for(const img of await p.locator('.lobby-person img').all()){const b=await img.boundingBox();assert(b.y>=0&&b.y+b.height<768);}
 await p.setViewportSize({width:390,height:844});await go();await shot('trade-lobby-mobile');await p.locator('[data-staff=ling-broker]').click();await p.waitForURL('**advisor=interstellar');await idle();await p.getByLabel('함선',{exact:true}).waitFor();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot('trade-planning-mobile');
 await go('guide-center');await shot('academy-lobby-mobile');await p.locator('[data-staff=academic-advisor]').click();await p.locator('#lobby-staff-intro').waitFor();await shot('academy-advisor-mobile');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.locator('.lobby-staff-rooms').getByRole('button',{name:'교육실',exact:true}).click();await p.waitForURL('**room=education');await idle();await p.locator('.academy-lesson').first().waitFor();await shot('academy-education-mobile');
 checks.push('1366 short desktop and 390px mobile: full-body proportions preserved, readable room selection, no horizontal overflow');
 await p.emulateMedia({reducedMotion:'reduce'});await go('trade','','en');await p.locator('[data-staff=senior-trade-officer]').click();await p.waitForURL('**advisor=intrasystem');await idle();assert.equal(await p.locator('.facility-arrival').evaluate(e=>getComputedStyle(e).opacity),'0');await p.getByRole('button',{name:'Lobby overview',exact:true}).click();await p.waitForFunction(()=>!location.hash.includes('room='));await idle();await go('guide-center','','mix');await p.locator('[data-staff=academic-advisor]').click();await p.locator('.lobby-staff-rooms').getByRole('button',{name:'교육실',exact:true}).click();await p.waitForURL('**room=education');await idle();
 checks.push('English/mixed-language routes and reduced-motion immediate navigation without flash');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 await writeFile(out+'checks.json',JSON.stringify({passed:true,base,checks,errors,missing,liveAccount:false,liveGame:false},null,2));console.log(JSON.stringify(checks,null,2));
}finally{await browser.close();}
