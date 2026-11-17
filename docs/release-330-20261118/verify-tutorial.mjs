import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base=process.env.STAM_REVIEW_URL||'http://127.0.0.1:5193/';
const out='/workspace/stam-freight-control-fresh-20261108/docs/release-330-20261118/tutorial/';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],checks=[];
try{
 const p=await b.newPage({viewport:{width:1440,height:900}});p.setDefaultTimeout(25000);
 p.on('pageerror',e=>errors.push(e.message));
 await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 const open=async(lang='ko')=>{await p.goto(base+'#/guide?lang='+lang);await p.locator('#stage[data-state=arrived]:not(.closed)').waitFor();await p.waitForTimeout(700);};
 const stored=()=>p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));
 for(const [lang,width,motion] of [['ko',1440,'no-preference'],['en',390,'reduce'],['mix',390,'reduce']]){
  const en=lang==='en',txt=(ko,eng)=>en?eng:ko;
  await p.setViewportSize({width,height:900});await p.emulateMedia({reducedMotion:motion});await open(lang);
  await p.evaluate(()=>sessionStorage.setItem('stam.trade-view.v1:guest:mode',JSON.stringify('fleet')));
  const before=await stored(),sessionBefore=await p.evaluate(()=>Object.fromEntries(Object.keys(sessionStorage).map(k=>[k,sessionStorage.getItem(k)])));
  await p.getByRole('button',{name:txt('무역 튜토리얼','Trading tutorial'),exact:true}).click();
  await p.getByRole('button',{name:txt('무역 연습 시작','Start trade practice'),exact:true}).click();
  const dialog=p.locator('.guide-journey[data-topic=trade]');await dialog.waitFor();
  const next=p.getByRole('button',{name:en?'Next →':'다음 →',exact:true});
  const scope=en?'intrasystem':'interstellar';
  if(!en)await p.getByRole('button',{name:new RegExp('링 가문 중개인')}).click();
  await p.waitForTimeout(600);await p.screenshot({path:out+`intro-${lang}.png`});
  await next.click();assert(await next.isDisabled());
  await p.getByRole('button',{name:txt('가격·수요·확인 시점 살펴봤어요','I checked quotes, demand and timestamps'),exact:true}).click();await next.click();assert(await next.isDisabled());
  await p.getByRole('button',{name:txt('적재량·자금·예상 손익 확인','Check capacity, cash and expected result'),exact:true}).click();await next.click();assert(await next.isDisabled());
  const action=p.locator('.trade-guide-actions button').first();
  await action.click();assert.equal(await p.locator('[data-trade-cash]').innerText(),'68,000 aUEC');
  await action.click();await action.click();assert.equal(await p.locator('[data-trade-cargo]').innerText(),'32 SCU');
  await p.screenshot({path:out+`record-${lang}.png`});
  await p.getByRole('button',{name:txt('이전','Previous'),exact:true}).click();await next.click();assert.equal(await p.locator('[data-trade-cargo]').innerText(),'32 SCU');
  await p.getByRole('button',{name:txt('기록 연습 초기화','Reset practice'),exact:true}).click();assert.equal(await p.locator('[data-trade-cash]').innerText(),'100,000 aUEC');
  for(let i=0;i<6;i++)await action.click();assert.equal(await p.locator('[data-trade-profit]').innerText(),'5,400 aUEC');await next.click();
  await p.screenshot({path:out+`complete-${lang}.png`});
  assert.deepEqual(await stored(),before);assert.deepEqual(await p.evaluate(()=>Object.fromEntries(Object.keys(sessionStorage).map(k=>[k,sessionStorage.getItem(k)]))),sessionBefore);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const href=await p.locator('.trade-guide-open').getAttribute('href');assert.equal(href,`#/division?lang=${lang}&facility=trade&room=planning&advisor=${scope}`);
  await p.locator('.trade-guide-open').click();await p.waitForURL('**&advisor='+scope);await dialog.waitFor({state:'detached'});
  await p.locator('.trade-suite').waitFor({timeout:10000});await p.waitForFunction(label=>document.querySelector('.trade-mode-switch button[aria-pressed=true]')?.textContent?.trim()===label,en?'Personal':'개인');await p.getByLabel(en?'Ship':'함선',{exact:true}).waitFor();await p.screenshot({path:out+`real-plan-${lang}.png`});
  await p.goBack();await p.locator('#stage[data-state=arrived]:not(.closed)').waitFor();
  await p.getByRole('button',{name:txt('무역 튜토리얼','Trading tutorial'),exact:true}).click();await p.getByRole('button',{name:txt('무역 연습 시작','Start trade practice'),exact:true}).click();
  await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'});await p.waitForFunction(label=>document.activeElement?.textContent?.trim()===label,txt('무역 연습 시작','Start trade practice'));
  await p.getByRole('button',{name:txt('운송 튜토리얼','Hauling tutorial'),exact:true}).click();await p.getByRole('button',{name:txt('운송 연습 시작','Start practice'),exact:true}).click();await p.locator('.guide-journey[data-topic=practice]').waitFor();await p.keyboard.press('Escape');
  checks.push(`${lang} ${width}px ${motion}: all trade steps, gating, scope, cash/cargo/profit, back/reset, unchanged stored flight/trade data, real planning, browser back, Escape/focus, freight entry, overflow`);
 }
 assert.deepEqual(errors,[]);await writeFile(out+'checks.json',JSON.stringify({passed:true,checks,errors},null,2)+'\n');console.log(checks);
}finally{await b.close();}
