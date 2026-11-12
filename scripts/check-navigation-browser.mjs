import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5182/';
const output=process.env.STAM_QA_OUTPUT||'/tmp/stam-navigation-qa';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const key='stam.control-room.flight.v1',errors=[];
const settled=page=>page.waitForSelector('.navigation-chart canvas[data-settled=true]',{timeout:60000});
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:.5,reducedMotion:'reduce'});await page.addInitScript(()=>localStorage.setItem('vh-map-quality','normal'));
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|Shader|WebGL|Navigation chart failed/.test(m.text()))errors.push(m.text());});
 await page.goto(base+'#/mission?lang=ko');await page.getByRole('button',{name:'예시 계약 보기',exact:true}).click();
 await page.locator('.receipt-card').first().getByRole('checkbox').check();await page.locator('.receipt-card').nth(1).getByRole('checkbox').check();await page.getByLabel('운항 파트너',{exact:true}).selectOption('navigator');await page.locator('.dispatch-launch').click();
 await page.waitForSelector('.navigation-chart[data-ready=true]');await settled(page);console.log('map ready');
 const state=await saved(page);assert.equal(await page.locator('.chart-stop-select').count(),state.plan.visits.length);
 const boxes=await page.locator('.chart-space,.chart-itinerary').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right};}));assert(boxes[0].right<=boxes[1].x,'map is left, itinerary right');
 await page.screenshot({path:output+'/map-overview.png'});
 const canvas=page.locator('.navigation-chart canvas');const view=async()=>JSON.parse(await canvas.getAttribute('data-view'));
 if(!process.env.STAM_SKIP_GESTURES){
 const rect=await canvas.boundingBox(),x=rect.x+rect.width*.4,y=rect.y+rect.height*.45;
 async function waitForCameraUpdate(previous) {
   await page.waitForFunction(previous => {
     const canvas = document.querySelector('.navigation-chart canvas');
     return canvas?.dataset.settled === 'true' && canvas.dataset.view !== previous;
   }, previous);
 }
 async function drag(button='left',shift=false){const previous=await canvas.getAttribute('data-view');await page.mouse.move(x,y);if(shift)await page.keyboard.down('Shift');await page.mouse.down({button});await page.mouse.move(x+70,y+35,{steps:2});await page.mouse.up({button});if(shift)await page.keyboard.up('Shift');await waitForCameraUpdate(previous);}
 let before=await view();await drag();console.log('orbit done');let after=await view();assert(Math.abs(after[3]-before[3])>.05,'orbit changes angle');
 before=after;await drag('right');console.log('pan done');after=await view();assert(Math.hypot(...after.slice(0,3).map((v,i)=>v-before[i]))>.1,'right drag pans');assert(Math.abs(after[3]-before[3])<.005,'pan does not rotate');
 before=after;await drag('left',true);console.log('shift pan done');after=await view();assert(Math.hypot(...after.slice(0,3).map((v,i)=>v-before[i]))>.1,'Shift drag pans');
 before=after;await page.mouse.move(x,y);await page.mouse.wheel(0,-150);await waitForCameraUpdate(JSON.stringify(before));assert((await view())[5]<before[5],'wheel zooms in');console.log('legacy camera gestures pass');
 }
 await page.getByRole('button',{name:'거점 검색 · 항성계 탐색'}).click();
 const search=page.getByRole('combobox',{name:'거점 검색',exact:true});await search.fill('Daymar');await page.locator('.chart-explore [role=option]').first().click();await page.waitForSelector('.navigation-chart canvas[data-focus^="stanton:"]');await settled(page);assert.match(await canvas.getAttribute('data-focus'),/stanton:/);
 await page.screenshot({path:output+'/map-moon.png'});
 await canvas.click({position:{x:30,y:300}});await page.keyboard.press('Escape');await settled(page);assert.match(page.url(),/#\/map/,'Escape stays in map');
 await page.getByRole('button',{name:'파이로',exact:true}).click();await page.waitForSelector('.navigation-chart canvas[data-system=pyro]');await settled(page);assert.equal(await canvas.getAttribute('data-system'),'pyro');
 await page.getByRole('button',{name:'닉스',exact:true}).click();await page.waitForSelector('.navigation-chart canvas[data-system=nyx]');await settled(page);assert.equal(await canvas.getAttribute('data-system'),'nyx');
 await page.locator('.chart-stop-select').nth(1).click();await page.waitForSelector('.navigation-chart canvas[data-system=stanton]');await settled(page);assert.equal(await canvas.getAttribute('data-system'),'stanton','route selection returns to correct system');assert.equal(await page.locator('.chart-selected strong').innerText(),await page.locator('.chart-stop-select strong').nth(1).innerText());
 await page.getByRole('button',{name:'거점 검색 · 항성계 탐색'}).click();await page.screenshot({path:output+'/map-stop.png'});
 const expected=state.plan.visits[1].packing.boxes.length;
 await page.getByRole('button',{name:'적재 3D 보기'}).click();await page.waitForSelector('.cargo-render-surface[data-ready=true]');const cargo=page.locator('.cargo-render-surface');assert.equal(Number(await cargo.getAttribute('data-boxes')),expected);
 await page.getByRole('button',{name:'위',exact:true}).click();await page.waitForTimeout(750);await page.getByRole('button',{name:'전체',exact:true}).click();await page.waitForTimeout(750);
 // Pick a visible crate using the real rendered canvas, not a fabricated selection.
 const cr=await cargo.boundingBox();let picked=false;
 for(const [a,b] of [[.65,.6],[.6,.65],[.55,.6],[.65,.7],[.55,.7],[.5,.6]]){await page.mouse.click(cr.x+cr.width*a,cr.y+cr.height*b);if(!(await page.locator('.chart-cargo-caption').innerText()).includes('상자를 선택')){picked=true;break;}}
 assert(picked,'rendered crate selects a real box');await page.screenshot({path:output+'/cargo-3d.png'});
 assert.deepEqual((await saved(page)).run,state.run,'cargo preview does not change run');await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 // Change presentation locale without losing the plan.
 for(const locale of ['en','mix','ko']){await page.locator('.chart-navigation select').selectOption(locale);await page.waitForSelector('.navigation-chart[data-ready=true]');assert.deepEqual((await saved(page)).plan,state.plan);}
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile does not overflow horizontally');await page.screenshot({path:output+'/map-mobile.png'});
 await page.setViewportSize({width:1440,height:900});await page.locator('.chart-navigation a').first().click();await page.waitForSelector('.mission-screen');assert.equal(await page.locator('.receipt-select input:checked').count(),2);
 await page.evaluate(()=>location.hash='#/operations?lang=ko');await page.waitForSelector('.ops-map .navigation-chart[data-ready=true]');assert.deepEqual((await saved(page)).plan,state.plan);
 console.log('systems, moon focus, route framing, cargo ownership, preview isolation, locale, mobile and shared operations map pass');
 // Updating the cargo for the same grid retains the user's camera (regression).
 await page.evaluate(async key=>{
  const {createCargoScene}=await import('/src/cargo-scene.ts');const state=JSON.parse(localStorage.getItem(key));
  const host=document.createElement('div');Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'99999'});document.body.append(host);
  const view=createCargoScene(host,()=>{},()=>{throw Error('cargo WebGL failed');});
  const ship=state.plan.ship,packing={...state.plan.visits[1].packing,capacity:state.plan.capacity};view.update(ship,packing,false);view.home('port',true);
  await new Promise(r=>setTimeout(r,600));const before=host.dataset.view;view.update(ship,{...packing,boxes:[]},true);await new Promise(r=>setTimeout(r,600));
  const after=host.dataset.view;view.dispose();host.remove();if(before!==after)throw Error('Cargo update reset the camera');
 },key);
 // Exercise the physical table and independent map against a real, in-progress haul.
 await page.getByRole('button',{name:'운항 시작',exact:true}).click();
 const complete=page.locator('.flight-actions button.manifest-primary');
 await complete.click();
 await complete.click();
 const loaded=(await saved(page)).run;
 assert(loaded.aboard.length>0,'pickup loads real boxes');
 await page.goto(base+'#/bridge?lang=ko');
 await page.waitForFunction(()=>document.querySelector('.space-background')?.naturalWidth>0);
 assert.equal(await page.locator('.table-globe-mask, .space-artwork .hologram-layer').count(),0,'keep the photographed blue globe visible');
 await page.screenshot({path:output+'/bridge-table.png'});
 await page.locator('#space-marker-map').click();
 await page.waitForSelector('.navigation-chart[data-ready=true]');
 await page.reload();
 await page.waitForSelector('.navigation-chart[data-ready=true]');
 assert.deepEqual((await saved(page)).run,loaded);
 await page.getByRole('link',{name:/관제에서 운항 진행/}).click();
 const beforeDelivery=(await saved(page)).run;
 await complete.click();
 assert((await saved(page)).run.index>beforeDelivery.index,'the delivery advances the visit');
 await page.getByRole('button',{name:'직전 작업 되돌리기',exact:true}).click();
 const restored=(await saved(page)).run;
 assert.equal(restored.index,beforeDelivery.index);
 assert.deepEqual(restored.aboard,beforeDelivery.aboard,'undo restores box ownership and positions');
 console.log('PASS: bridge table to standalone chart, navigation/reload with cargo, delivery and undo');
 assert.deepEqual(errors,[]);console.log('PASS: 3D navigation + cargo regression checks. Screenshots: '+output);
}catch(error){console.error(error);throw error;}finally{await browser.close();}
