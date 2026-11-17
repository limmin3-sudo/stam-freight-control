import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const base=process.env.STAM_REVIEW_URL||'http://127.0.0.1:5193/',out='/workspace/stam-freight-control-fresh-20261108/docs/release-330-20261118/facility/';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']}),checks=[],errors=[],missing=[];
try{
 const p=await b.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))missing.push(r.url());});await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 const lobby=async(facility,lang='ko')=>{await p.goto(base+`#/division?lang=${lang}&facility=${facility}`);await p.locator('.lobby-stage[data-loaded=true]').waitFor();};
 const idle=()=>p.waitForFunction(()=>document.querySelector('.facility-lobby')?.dataset.travel==='idle');
 const meet=async(id)=>{await p.locator(`.lobby-person[data-staff=${id}]`).click();await p.locator('.crew-encounter[data-ready=true]').waitFor();};
 const close=async()=>{await p.getByRole('button',{name:/대화 마치기|End conversation/}).click();await p.locator('.crew-encounter').waitFor({state:'detached'});await p.waitForTimeout(60);};
 await lobby('trade');const stored=()=>p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/^(vh-|sfc-|stam\.control-room\.flight)/.test(k)).sort().map(k=>[k,localStorage.getItem(k)])));const before=await stored();
 for(const [id,scope] of [['senior-trade-officer','intrasystem'],['ling-broker','interstellar']]){
  await meet(id);assert(!p.url().includes('room='));await p.waitForTimeout(1000);await p.screenshot({path:out+id+'-desktop.png'});assert.equal(await p.locator('.lobby-stage').getAttribute('inert'),'');
  await close();assert.equal(await p.evaluate(()=>document.activeElement.dataset.staff),id);assert.equal(await p.locator('.lobby-stage').getAttribute('inert'),null);
  await meet(id);await p.getByRole('button',{name:'무역 계획하기'}).click();await p.waitForURL('**advisor='+scope);await idle();await p.getByLabel('함선',{exact:true}).waitFor();await p.screenshot({path:out+scope+'-planning.png'});
  await p.keyboard.press('Escape');await p.waitForFunction(()=>!location.hash.includes('room='));await idle();assert.equal(await p.evaluate(()=>document.activeElement.dataset.staff),id);
 }
 checks.push('Both trade staff open dialogue first, then existing planning with exact intrasystem/interstellar scope. Close and room return restore the original person focus.');
 await lobby('guide-center');await meet('academic-advisor');await p.waitForTimeout(1000);assert.equal(await p.locator('.crew-encounter-actions button').count(),3);await p.screenshot({path:out+'professor-desktop.png'});await close();
 for(const [name,room] of [['운송 정보실','freight-information'],['교육실','education'],['작전 연구실','operations-study']]){
  await meet('academic-advisor');await p.locator('.crew-encounter-actions').getByRole('button',{name}).click();await p.waitForURL('**room='+room);await idle();await p.locator('.market-room').waitFor();await p.keyboard.press('Escape');await p.waitForFunction(()=>!location.hash.includes('room='));await idle();
 }
 checks.push('Professor dialogue retains all three academy destinations and existing room monitors; every room returns to the professor.');
 // Place clicks and sidebar retain their direct route, with no conversation detour.
 for(const [facility,room] of [['trade','market'],['guide-center','education']]){await lobby(facility);await p.locator(`[data-place=${room}]`).click();await p.waitForURL('**room='+room);await idle();assert.equal(await p.locator('.crew-encounter').count(),0);}
 await lobby('trade');await meet('ling-broker');await p.locator('.space-group-button[href="#/lounge?lang=ko"]').click();await p.waitForURL('**#/lounge?lang=ko');assert.equal(await p.locator('.crew-encounter').count(),0);await p.waitForTimeout(1100);assert(!p.url().includes('room='));
 await lobby('trade');await meet('senior-trade-officer');await p.locator('.crew-encounter-actions button').click();await p.locator('.space-group-button[href="#/lounge?lang=ko"]').click();await p.waitForTimeout(1600);assert(p.url().includes('#/lounge'));assert.equal(await p.locator('.crew-encounter').count(),0);
 await lobby('guide-center');await meet('academic-advisor');await p.evaluate(()=>history.back());await p.locator('.crew-encounter').waitFor({state:'detached'});
 checks.push('Place clicks remain direct; sidebar/history, including navigation during the deferred action, cancel the conversation without a late route change.');
 await p.setViewportSize({width:390,height:844});
 for(const [facility,id] of [['trade','ling-broker'],['guide-center','academic-advisor']]){
  await lobby(facility);await meet(id);await p.waitForTimeout(1000);await p.screenshot({path:out+id+'-mobile.png'});
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const rect=await p.locator('.crew-encounter-close').boundingBox();assert(rect.y>=0&&rect.y+rect.height<=844);
  await p.locator('.space-menu-toggle').click();await p.keyboard.press('Escape');assert.equal(await p.locator('.crew-encounter').count(),1);await p.keyboard.press('Escape');await p.locator('.crew-encounter').waitFor({state:'detached'});
 }
 await lobby('guide-center','en');await p.emulateMedia({reducedMotion:'reduce'});await meet('academic-advisor');assert.equal(await p.locator('.crew-encounter-person').evaluate(e=>e.getAnimations().length),0);await p.screenshot({path:out+'professor-mobile-en-reduced.png'});await p.locator('.crew-encounter-actions button').filter({hasText:'Education'}).click();await p.waitForURL('**room=education');await idle();assert.equal(await p.locator('.crew-encounter').count(),0);
 checks.push('390px: portraits and all actions/close fit; menu Escape has priority; English/reduced-motion reaches the original academy room without zoom.');
 assert.deepEqual(await stored(),before);
 // Regression for the two original bridge callers of the extracted presentation.
 await p.setViewportSize({width:1440,height:900});await p.emulateMedia({reducedMotion:'no-preference'});await p.goto(base+'#/bridge?lang=ko');await p.locator('.space-experience').waitFor();if(await p.locator('.partner-choice').count())await p.locator('.partner-options [data-partner=operator]').click();
 for(const id of ['operator','navigator']){await p.locator(`.partner-hit[data-partner=${id}]`).click();await p.locator('.crew-encounter[data-ready=true]').waitFor();await p.waitForTimeout(950);await close();assert.equal(await p.evaluate(()=>document.activeElement.dataset.partner),id);}
 checks.push('Existing operator/navigator greetings, approach and return still work after extracting the common presentation; facility conversations preserved flight storage.');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await writeFile(out+'checks.json',JSON.stringify({passed:true,checks,errors,missing,scope:'Local Chromium production build, no real account/game/iOS verification'},null,2)+'\n');console.log(JSON.stringify({passed:true,checks},null,2));
}finally{await b.close();}
