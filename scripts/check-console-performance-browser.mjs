import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {chooseInitialPartner} from './browser-partner-choice.mjs';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5186/';
const out=process.env.STAM_QA_OUTPUT||'/tmp/stam-console-performance';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const key='stam.control-room.flight.v1',report={selectionRebuilds:{},quality:[]};
try{
 const p=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[];
 p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('vh-map-quality','normal'));
 await p.goto(base+'#/mission?lang=ko');await chooseInitialPartner(p,'navigator');
 await p.getByRole('button',{name:'예시 계약 보기',exact:true}).click();
 await p.locator('.receipt-card input[type=checkbox]').first().check();await p.locator('.dispatch-launch').click();
 await p.waitForSelector('.navigation-chart[data-ready=true]');
 const saved=()=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const quality=async()=>{const value=await p.evaluate(()=>localStorage.getItem('vh-map-quality'));report.quality.push(value);assert.equal(value,'normal');};
 async function selectionDoesNotRebuild(label,action){
  const host=p.locator('.cargo-render-surface').first();await p.waitForSelector('.cargo-render-surface[data-ready=true]');
  const before=Number(await host.getAttribute('data-scene-revision')),run=(await saved()).run,view=await host.getAttribute('data-view');
  await action();
  report.selectionRebuilds[label]=Number(await host.getAttribute('data-scene-revision'))-before;
  assert.equal(report.selectionRebuilds[label],0,label+': selecting cargo must not reconstruct the hold');
  assert.deepEqual((await saved()).run,run,label+': selecting cargo must preserve recorded flight state');
  assert.equal(await host.getAttribute('data-view'),view,label+': selecting cargo must preserve the camera');
 }
 await p.locator('.chart-stop-select').nth(1).click();await p.getByRole('button',{name:'적재 3D 보기'}).click();
 await selectionDoesNotRebuild('map-preview',async()=>{
  const canvas=p.locator('.cargo-render-surface canvas'),r=await canvas.boundingBox();
  for(const [x,y] of [[.6,.6],[.65,.7],[.55,.65],[.5,.6]]){
   await p.mouse.click(r.x+r.width*x,r.y+r.height*y);
   if(!(await p.locator('.chart-cargo-caption').innerText()).includes('상자를 선택'))break;
  }
  assert(!(await p.locator('.chart-cargo-caption').innerText()).includes('상자를 선택'),'the test must select a real crate');
 });
 await p.keyboard.press('Escape');await quality();
 await p.evaluate(()=>location.hash='#/operations?lang=ko');await p.waitForSelector('.ops-live-cargo .cargo-render-surface[data-ready=true]');await quality();
 await p.getByRole('button',{name:'운항 시작',exact:true}).click();await p.getByRole('button',{name:/^출발 완료/}).click();await p.getByRole('button',{name:/^접수 완료/}).click();
 await selectionDoesNotRebuild('operations',async()=>{
  const r=await p.locator('.cargo-render-surface canvas').boundingBox();
  for(const [x,y] of [[.6,.6],[.65,.7],[.55,.65],[.5,.6],[.5,.5],[.65,.6]]){
   await p.mouse.click(r.x+r.width*x,r.y+r.height*y);if(await p.locator('.ops-box').count())break;
  }
  assert.equal(await p.locator('.ops-box').count(),1,'the operations test must select a real crate');
 });
 const revision=Number(await p.locator('.cargo-render-surface').getAttribute('data-scene-revision'));
 await p.locator('.ops-live-cargo').getByRole('button',{name:'작업 후 예상',exact:true}).click();
 assert(Number(await p.locator('.cargo-render-surface').getAttribute('data-scene-revision'))>revision,'a real phase change must still update geometry');
 await p.locator('.ops-live-cargo').getByRole('button',{name:'선적 기록',exact:true}).click();
 await p.locator('.ops-live-cargo').getByRole('link',{name:'적재 설정',exact:true}).click();
 await selectionDoesNotRebuild('workspace',async()=>{for(let i=0;i<8;i++)await p.locator('.cargo-crate-list button').first().click();});
 await quality();assert.deepEqual(errors,[]);
 await writeFile(out+'/console-performance.json',JSON.stringify(report,null,2));
 console.log('PASS: cargo selection preserves geometry, camera, flight state and saved map quality',JSON.stringify(report));
}finally{await browser.close();}
