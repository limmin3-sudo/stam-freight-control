import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const output=process.env.STAM_QA_OUTPUT||'/tmp/stam-cargo-review';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|Shader|WebGL/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('vh-map-quality','normal'));
 await page.goto((process.env.STAM_MISSION_URL||'http://127.0.0.1:5182/')+'#/mission?lang=ko');
 await page.getByRole('button',{name:'예시 계약 보기',exact:true}).click();
 await page.locator('.receipt-card').first().getByRole('checkbox').check();await page.locator('.receipt-card').nth(1).getByRole('checkbox').check();
 await page.getByLabel('운항 파트너',{exact:true}).selectOption('navigator');await page.locator('.dispatch-launch').click();
 await page.waitForSelector('.navigation-chart[data-ready=true]');
 await page.locator('.chart-stop-select').nth(1).click();
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('stam.control-room.flight.v1')));
 await page.getByRole('button',{name:'적재 3D 보기'}).click();
 const host=page.locator('.cargo-render-surface');await page.waitForSelector('.cargo-render-surface[data-ready=true]');
 await page.waitForFunction(()=>document.querySelector('.cargo-render-surface')?.dataset.view);
 assert.equal(Number(await host.getAttribute('data-boxes')),state.plan.visits[1].packing.boxes.length);
 const box=await host.boundingBox();let picked=false;
 for(const [a,b] of [[.65,.6],[.6,.65],[.55,.6],[.65,.7],[.55,.7],[.5,.6]]){
  await page.mouse.click(box.x+box.width*a,box.y+box.height*b);
  if(!(await page.locator('.chart-cargo-caption').innerText()).includes('상자를 선택')){picked=true;break;}
 }
 assert(picked,'3D crate selects real ownership');
 await page.getByRole('dialog').getByRole('button',{name:'위',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'전체',exact:true}).click();
 await page.mouse.move(20,20);await page.waitForTimeout(800);await page.screenshot({path:output+'/cargo-hold.png'});console.log('Captured real app cargo dialog');
 const before=await host.getAttribute('data-view');await page.getByRole('button',{name:'위',exact:true}).click();
 await page.waitForFunction(old=>document.querySelector('.cargo-render-surface')?.dataset.view!==old,before);
 await page.getByRole('button',{name:'전체',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'확대',exact:true}).click();
 await page.mouse.move(20,20);await page.waitForTimeout(800);await page.screenshot({path:output+'/cargo-detail.png'});
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('stam.control-room.flight.v1')).run),state.run);
 await page.keyboard.press('Escape');
 // Exercise the same renderer with outward/downward grids and disable/re-enable.
 const result=await page.evaluate(async()=>{
  const {createCargoScene}=await import('/src/cargo-scene.ts');const {cargoShip,cargoPacking,demoCargo}=await import('/src/cargo-plan.mjs');
  const host=document.createElement('div');Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'99999'});document.body.append(host);
  const view=createCargoScene(host,()=>{},()=>{throw Error('WebGL context lost');});const checks=[];
  try{for(const id of ['drake-cutlass-black','misc-hull-b','argo-raft','drake-golem-ox']){
   const ship=cargoShip(id),packing=cargoPacking(ship,demoCargo()),snapshot=JSON.stringify({ship,packing});
   if(!packing)throw Error(id+' cannot pack demo');view.update(ship,packing,false);view.home('port',true);
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const before=host.dataset.view;
   view.update(ship,packing,true);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   if(before!==host.dataset.view)throw Error(id+': camera reset');
   if(snapshot!==JSON.stringify({ship,packing}))throw Error(id+': packing mutated');
   if(+host.dataset.boxes!==packing.boxes.length)throw Error(id+': lost crates');
   const disabled=cargoShip(id,[ship.grids[0].id]),next=cargoPacking(disabled,demoCargo());view.update(disabled,next,false);
   if(next?.boxes.some(b=>b.bin===0))throw Error(id+': disabled grid packed');
   view.update(ship,packing,false);checks.push(id);
  }}finally{view.dispose();host.remove();}return checks;
 });
 assert.deepEqual(errors,[]);console.log('PASS: real crate picking, camera controls, preview run isolation, same-grid camera preservation, attachment profiles and disabled grids',result);
}finally{await browser.close();}
