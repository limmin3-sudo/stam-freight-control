import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='docs/trade-planning-20261116/runtime-review',base='http://127.0.0.1:5189/';await mkdir(out,{recursive:true});
const snapshot=JSON.parse(await readFile('data/trade-market.json','utf8'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const checks=[],errors=[];let refreshMode='failure',page;
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),p=await context.newPage();page=p;p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));
 await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 await p.route('https://api.uexcorp.uk/2.0/**',async route=>{
  if(refreshMode==='failure')return route.fulfill({status:503,body:'unavailable'});
  const url=new URL(route.request().url());if(url.pathname.endsWith('game_versions'))return route.fulfill({json:{status:'ok',data:{live:snapshot.liveVersion}}});
  const id=Number(url.searchParams.get('id_commodity'));return route.fulfill({json:{status:'ok',data:snapshot.quotes.filter(q=>q.commodityId===id).map(q=>({id:q.id,id_commodity:id,id_terminal:q.terminalId,price_buy:q.buy===null?0:q.buy+1,price_sell:q.sell??0,scu_buy:q.stock,scu_sell:q.demand,game_version:q.version,date_modified:Math.floor(Date.now()/1000),container_sizes:q.containers.join(',')}))}});
 });
 const store=()=>p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>/flight|contract|account|history/.test(k)))));
 await p.goto(base+'#/mission?lang=ko');await p.locator('[data-partner=navigator]').click();await p.getByRole('button',{name:'예시 계약 보기',exact:true}).click();await p.locator('.receipt-card').first().getByRole('checkbox').check();const before=await store();
 for(const [staff,scope] of [['senior-trade-officer','intrasystem'],['ling-broker','interstellar']]){
  await p.goto(base+'#/division?lang=ko&facility=trade');await p.locator(`[data-staff=${staff}]`).click();await p.locator('#lobby-staff-intro .lobby-reset').click();await p.locator('.trade-inputs').waitFor();assert(p.url().includes('advisor='+scope));assert.equal(await p.locator(`[data-advisor=${scope}]`).getAttribute('aria-pressed'),'true');
 }
 checks.push('Both lobby advisors open the correct internal/interstellar planning scope');
 await p.locator('[data-advisor=intrasystem]').click();await p.getByLabel('함선',{exact:true}).selectOption('misc-hull-b');await p.getByLabel('구매할 출발 거래소',{exact:true}).selectOption('251');await p.getByLabel('가용 자본 · aUEC',{exact:true}).fill('1000000');
 assert.equal(await p.getByLabel('예비금 · %',{exact:true}).inputValue(),'10');await p.locator('[data-candidate]').first().waitFor();assert.match(await p.locator('.trade-summary').innerText(),/100,000/);await p.screenshot({path:out+'/planning-desktop.png'});
 await p.getByRole('button',{name:'계획 검토',exact:true}).first().click();await p.locator('.trade-review').waitFor();const original=await p.locator('.trade-review h3').innerText();await p.screenshot({path:out+'/planning-review.png'});
 const downloaded=p.waitForEvent('download');await p.getByRole('button',{name:'계획 파일 내려받기',exact:true}).click();const dl=await downloaded;const plan=JSON.parse(await readFile(await dl.path(),'utf8'));assert.equal(plan.status,'estimate-not-executed');assert.equal(plan.inputs.reservePercent,10);assert.equal(plan.candidate.reserve,100000);assert(plan.candidate.purchase+plan.inputs.costs+plan.candidate.reserve<=plan.inputs.budget);assert(plan.candidate.quantity<=512);
 await p.getByRole('button',{name:'시세 재확인·재계산',exact:true}).click();await p.getByText('시세 조회에 실패해 기존 가격과 후보를 유지했습니다.',{exact:true}).waitFor();assert.equal(await p.locator('.trade-review h3').innerText(),original);
 refreshMode='good';await p.getByRole('button',{name:'시세 재확인·재계산',exact:true}).click();await p.getByText('가격을 다시 확인해 후보를 재계산했습니다. 검토할 계획을 다시 선택하세요.',{exact:true}).waitFor();assert.equal(await p.locator('.trade-review').count(),0);
 checks.push('Default 10% reserve, capital/container limits, review and downloaded estimate; failed refresh retains plan, successful refresh recalculates and requires reselection');
 await p.getByLabel('예비금 · %',{exact:true}).fill('100');await p.getByText('예비금과 추가 비용을 제외하면 매입 자금이 남지 않습니다.',{exact:true}).waitFor();assert.equal(await p.locator('[data-candidate]').count(),0);await p.getByLabel('예비금 · %',{exact:true}).fill('10');
 await p.locator('[data-advisor=interstellar]').click();await p.getByLabel('구매할 출발 거래소',{exact:true}).selectOption('778');await p.locator('[data-candidate]').first().waitFor();const route=await p.locator('[data-candidate]').first().innerText();assert.match(route,/파이로|pyro/i);await p.screenshot({path:out+'/planning-interstellar.png'});assert.equal(await store(),before);
 checks.push('100% reserve yields no spend; Nyx/Stanton candidates explicitly cross Pyro; freight/account/contract storage remains unchanged');
 await p.keyboard.press('Escape');await p.locator('.trade-planning').waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('data-place')),'planning');
 for(const width of [1366,390]){
  await p.setViewportSize({width,height:width===390?844:768});await p.goto(base+'#/division?lang=en&facility=trade&room=planning&advisor=intrasystem');await p.locator('.trade-inputs').waitFor();await p.getByLabel('Ship',{exact:true}).selectOption('misc-hull-b');await p.getByLabel('Origin purchase terminal',{exact:true}).selectOption('251');await p.getByLabel('Available capital · aUEC',{exact:true}).fill('1000000');await p.locator('[data-candidate]').first().waitFor();await p.locator('.market-room').evaluate(e=>e.scrollTop=0);await p.locator('.facility-lobby').evaluate(e=>e.scrollTop=0);await p.screenshot({path:`${out}/planning-${width}.png`});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.getByRole('button',{name:'Review plan',exact:true}).first().click();await p.locator('.trade-review').waitFor();await p.screenshot({path:`${out}/review-${width}.png`});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.getByRole('button',{name:'Lobby overview',exact:true}).click();await p.locator('.trade-planning').waitFor({state:'hidden'});
 }
 checks.push('Escape and focus restoration; English 1366 desktop / 390 mobile input, scrollable results, review and lobby return without document overflow');assert.deepEqual(errors,[]);
 await writeFile(out+'/report.json',JSON.stringify({passed:true,priceMode:'Saved real-source snapshot; refresh responses explicitly mocked',checks,errors},null,2));console.log(checks);
}catch(error){await page?.screenshot({path:out+'/failure.png'});console.log(await page?.locator('.trade-planning').innerText().catch(()=>page.url()));throw error;}finally{await browser.close();}
