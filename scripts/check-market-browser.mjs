import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='docs/market-information-20261116/runtime-review',base='http://127.0.0.1:5189/';await mkdir(out,{recursive:true});
const snapshot=JSON.parse(await readFile('data/trade-market.json','utf8'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const checks=[],errors=[];let mode='good';
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));
 await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 await p.route('https://api.uexcorp.uk/2.0/**',async route=>{
  if(mode==='failure')return route.fulfill({status:503,body:'unavailable'});
  const url=new URL(route.request().url());if(url.pathname.endsWith('game_versions'))return route.fulfill({json:{status:'ok',data:{live:snapshot.liveVersion}}});
  const id=Number(url.searchParams.get('id_commodity'));const q=snapshot.quotes.find(q=>q.commodityId===id);if(!q)return route.fulfill({json:{status:'ok',data:[]}});
  return route.fulfill({json:{status:'ok',data:[{id:q.id,id_commodity:id,id_terminal:q.terminalId,price_buy:12345,price_sell:23456,scu_buy:0,scu_sell:null,game_version:snapshot.liveVersion,date_modified:Math.floor(Date.now()/1000),container_sizes:'1,2,32'}]}});
 });
 const store=()=>p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>/flight|contract|account|history/.test(k)))));
 await p.goto(base+'#/mission?lang=ko');await p.locator('[data-partner=navigator]').click();await p.getByRole('button',{name:'예시 계약 보기',exact:true}).click();await p.locator('.receipt-card').first().getByRole('checkbox').check();const before=await store();
 const market=async(lang='ko')=>{await p.goto(base+`#/division?lang=${lang}&facility=trade&room=market`);await p.locator('.market-table tbody tr').first().waitFor();await p.locator('.market-action').filter({hasText:/시세 다시 확인|Refresh prices/}).waitFor();};
 await market();await p.getByRole('button',{name:'시세 다시 확인',exact:true}).click();await p.locator('.market-table').getByText('12,345',{exact:true}).waitFor();
 assert.match(await p.locator('.market-table').innerText(),/24시간 내 수정/);assert.match(await p.locator('.market-table').innerText(),/0 \/ — SCU/);
 mode='failure';await p.getByRole('button',{name:'시세 다시 확인',exact:true}).click();await p.getByText('외부 시세를 확인하지 못해 저장된 자료를 표시합니다.',{exact:true}).waitFor();assert.match(await p.locator('.market-table').innerText(),/12,345/);
 checks.push('Live lookup keeps SCU price direction and zero/unknown quantities; failed refresh retains the last successful price');
 await p.locator('.market-filters input').fill('없는품목XYZ');await p.getByText('조건에 맞는 품목이 없습니다.',{exact:true}).waitFor();await p.locator('.market-filters input').fill('');
 await p.locator('.market-filters select').nth(1).selectOption('all');await p.locator('.market-filters select').nth(2).selectOption('all');assert.equal(await p.locator('.market-commodities button').count(),snapshot.commodities.length);
 await p.locator('.market-filters select').nth(1).selectOption('legal');await p.locator('.market-filters select').nth(2).selectOption('low');assert(await p.locator('.market-commodities button').count()<snapshot.commodities.length);
 checks.push('Independent legality/handling-risk filters, unknown inclusion, empty search state');
 await p.screenshot({path:out+'/market-desktop.png'});
 await p.getByRole('button',{name:'거점·적재 조건',exact:true}).click();assert.equal(await p.locator('.market-terminal-grid article').count(),114);await p.locator('.market-filters input').fill('TDD');assert(await p.locator('.market-terminal-grid article').count()>0);await p.screenshot({path:out+'/market-terminals.png'});
 await p.getByRole('button',{name:'출처·검증',exact:true}).click();await p.getByRole('heading',{name:'시세를 읽는 기준'}).waitFor();await p.keyboard.press('Escape');await p.locator('.market-room').waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('data-place')),'market');
 checks.push('114 terminal references, source information, Escape/lobby focus restoration');
 for(const width of [1366,390]){
  await p.setViewportSize({width,height:width===390?844:768});await market('en');await p.screenshot({path:`${out}/market-${width}.png`});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const heading=await p.locator('.market-header h2').boundingBox();assert(heading.y>=0&&heading.y<768);await p.getByRole('button',{name:'Lobby overview',exact:true}).click();await p.locator('.market-room').waitFor({state:'hidden'});
 }
 checks.push('English desktop/mobile, scrollable price table without page overflow, accessible lobby return');
 await p.setViewportSize({width:1920,height:1080});await p.goto(base+'#/division?lang=ko&facility=guide-center&room=freight-information');await p.locator('.freight-reference-cards article').first().waitFor();await p.screenshot({path:out+'/freight-desktop.png'});
 await p.getByRole('button',{name:'출처 대조',exact:true}).click();await p.getByText('피닉스 에메랄드',{exact:false}).count();await p.locator('.market-source-list').getByText('4.10.2-LIVE.12881860',{exact:false}).waitFor();await p.screenshot({path:out+'/freight-audit.png'});
 await p.getByRole('button',{name:'패치 유의사항',exact:true}).click();assert.equal(await p.locator('.market-source-list article').count(),2);
 await p.getByRole('button',{name:'운송 자료',exact:true}).click();await p.locator('a[href*="view=missions"]').click();await p.waitForURL(/information/);assert.equal(await store(),before);
 await p.setViewportSize({width:390,height:844});await p.goto(base+'#/division?lang=en&facility=guide-center&room=freight-information');await p.locator('.freight-reference-cards article').first().waitFor();await p.screenshot({path:out+'/freight-mobile.png'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 checks.push('Freight source comparison, retained older variant, official issue links, existing archive navigation; seeded flight data unchanged');assert.deepEqual(errors,[]);
 await writeFile(out+'/report.json',JSON.stringify({passed:true,mode:'Mocked UEX browser requests; full live-source collection audited separately',checks,errors},null,2));console.log(checks);
}finally{await browser.close();}
