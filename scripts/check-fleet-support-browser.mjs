import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
import {chooseInitialPartner} from './browser-partner-choice.mjs';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5199/stam-freight-control/',out=process.env.STAM_QA_OUTPUT||'/tmp/stam-fleet-support/browser';await mkdir(out,{recursive:true});
const reconcile=process.env.STAM_QA_GRID_RECONCILE==='1';
const cases=reconcile?[['drake-caterpillar',576,14],['aegis-idris-p',1374,25],['gatac-syulen',6,6]]:[['anvil-liberator',400],['rsi-galaxy',64],['rsi-galaxy-cargo',720],['rsi-galaxy-medical',68]];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']}),report=[];
try{
 for(const [ship,capacity,gridCount] of cases)for(const partner of reconcile?['navigator']:['operator','navigator']){
  const context=await browser.newContext({viewport:{width:1600,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('vh-map-quality','low'));
  await page.goto(base+'#/mission?lang=ko');await chooseInitialPartner(page,partner);await page.getByLabel('함선',{exact:true}).selectOption(ship);
  await page.getByRole('button',{name:'예시 계약 보기',exact:true}).click();await page.locator('.receipt-card input[type=checkbox]').first().check();
  if(ship==='gatac-syulen'){
   await page.locator('.receipt-card').first().getByRole('button',{name:'상세 · 수정',exact:true}).click();
   const editor=page.locator('.mission-contract-editor');await editor.getByLabel('SCU',{exact:true}).fill('6');await editor.getByText('상자 규격 · 개수',{exact:true}).click();await editor.getByLabel('1 SCU',{exact:true}).fill('6');await editor.getByRole('button',{name:/보완한 카드 저장|화물 수정 저장|계약 저장/}).click();
  }
  await page.locator('.dispatch-launch').click();
  await page.waitForSelector('.navigation-chart[data-ready=true]');
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('stam.control-room.flight.v1')));const saved=await state();assert.equal(saved.draft.ship,ship);assert.equal(saved.plan.mode,partner==='operator'?'simple':'detail');if(partner==='navigator')assert.equal(saved.plan.capacity,capacity);if(gridCount)assert.equal(saved.plan.ship.grids.length,gridCount);
  await page.evaluate(()=>location.hash='#/operations?lang=ko');await page.waitForSelector('.operations-desk');
  if(partner==='navigator'){
   await page.waitForSelector('.ops-live-cargo .cargo-render-surface[data-ready=true]');assert.match(await page.locator('.cargo-stage-scale').innerText(),/개략 배치/);
   if(ship==='anvil-liberator'||ship==='rsi-galaxy-cargo'||ship==='gatac-syulen')await page.screenshot({path:out+'/'+ship+'-navigator.png'});
  }else{assert.equal(await page.locator('.cargo-render-surface').count(),0);}
  assert.deepEqual(await state(),saved,'console navigation must preserve flight data');assert.deepEqual(errors,[]);
  report.push({ship,partner,capacity:saved.plan.capacity,mode:saved.plan.mode,gridCount:saved.plan.ship?.grids.length,cargoVisible:partner==='navigator',errors});console.log('PASS',ship,partner);await context.close();
 }
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));
}finally{await browser.close();}
