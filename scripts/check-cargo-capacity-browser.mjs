import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {emptyDraft,samples} from '../apps/control-room/src/mission-trial.ts';
import {sessionKey} from '../apps/control-room/src/flight-session.ts';
import {cargoPreferenceKey} from '../apps/control-room/src/cargo-plan.mjs';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5188/';
const output=process.env.STAM_QA_OUTPUT||'/tmp/stam-capacity-browser';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({sessionKey,cargoPreferenceKey,draft})=>{
  if(!localStorage.getItem(sessionKey)){
   localStorage.setItem(sessionKey,JSON.stringify({version:1,draft,plan:null,run:null}));
   sessionStorage.setItem(cargoPreferenceKey,JSON.stringify({shipId:'crusader-c2-hercules-starlifter',disabled:{}}));
  }
  localStorage.setItem('vh-map-quality','normal');
 },{sessionKey,cargoPreferenceKey,draft:{...emptyDraft(),partner:'navigator',partnerSelected:true,jobs:[samples[0]]}});
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),sessionKey);
 const expectCapacity=async n=>{
  await page.waitForFunction(n=>[...document.querySelectorAll('.manifest-summary dt')].find(e=>e.textContent==='사용 가능한 적재 용량')?.nextElementSibling?.textContent===`${n} SCU`,n);
 };
 const openCargo=async()=>{await page.getByRole('button',{name:'적재 상세 열기',exact:true}).click();await page.waitForSelector('.cargo-workspace');};
 await page.goto(base+'#/mission?lang=ko');await expectCapacity(46);
 await openCargo();
 assert.equal(await page.getByRole('combobox',{name:'함선 그리드',exact:true}).inputValue(),'drake-cutlass-black','review starts on this flight ship, not a previously previewed ship');
 await page.getByRole('button',{name:/사용할 그리드 선택/}).click();
 await page.locator('.cargo-grid-options input').first().uncheck();await expectCapacity(40);
 assert.match(await page.locator('.cargo-capacity').innerText(),/40 SCU/);
 await page.locator('.cargo-grid-options input').first().check();await expectCapacity(46);
 await page.locator('.cargo-grid-options input').first().uncheck();await expectCapacity(40);
 await page.reload();await expectCapacity(40);await openCargo();
 assert.match(await page.locator('.cargo-capacity').innerText(),/40 SCU/);
 await page.getByRole('combobox',{name:'함선 그리드',exact:true}).selectOption('crusader-c2-hercules-starlifter');await expectCapacity(40);
 assert.match(await page.locator('.cargo-profile-note').innerText(),/다른 함선의 미리보기/);
 await page.getByRole('combobox',{name:'함선',exact:true}).selectOption('C2 Hercules');await expectCapacity(696);
 await page.waitForFunction(()=>document.querySelector('.cargo-capacity').textContent.includes('696 SCU'));
 await page.getByRole('combobox',{name:'함선',exact:true}).selectOption('Cutlass Black');await expectCapacity(40);
 await page.waitForFunction(()=>document.querySelector('.cargo-capacity').textContent.includes('40 SCU'));
 await page.getByRole('button',{name:'적재 상세 열기',exact:true}).click();
 await page.locator('.manifest-summary').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/mission-capacity-desktop.png'});
 await page.locator('.dispatch-launch').click();
 await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key))?.plan,sessionKey);
 const planned=await saved();assert.equal(planned.plan.capacity,40);assert.equal(planned.plan.ship.grids[0].disabled,true);
 await page.evaluate(()=>location.hash='#/operations?lang=ko');
 await page.getByRole('button',{name:'운항 시작',exact:true}).click();
 await page.getByRole('button',{name:/^출발 완료/}).click();
 await page.getByRole('button',{name:/^접수 완료/}).click();
 const loaded=await saved();assert(loaded.run.aboard.length>0);
 await page.evaluate(key=>sessionStorage.setItem(key,JSON.stringify({shipId:'drake-cutlass-black',disabled:{'drake-cutlass-black':[]}})),cargoPreferenceKey);
 await page.evaluate(()=>location.hash='#/mission?lang=ko');await expectCapacity(40);
 assert.deepEqual((await saved()).run,loaded.run,'preview preferences must not change the active run');
 await page.reload();await expectCapacity(40);assert.deepEqual((await saved()).run,loaded.run);
 await page.setViewportSize({width:390,height:844});await expectCapacity(40);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('.manifest-summary').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/mission-capacity-mobile.png'});
 assert.deepEqual(errors,[]);
 const report={passed:true,checks:['46→40→46 grid toggle live update','reload retains 40','preview ship independent and labeled','flight ship change updates open preview','worker plan capacity 40','active aboard/progress preserved despite preview preference change and reload','390px no horizontal overflow'],pageErrors:errors};
 await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
