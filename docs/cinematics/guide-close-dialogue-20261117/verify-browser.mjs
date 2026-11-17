import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const base=process.env.STAM_REVIEW_URL||'http://127.0.0.1:5201/stam-freight-control/';
const out=new URL('./review/',import.meta.url).pathname;await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const checks=[],errors=[],missing=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.addInitScript(()=>sessionStorage.setItem('stam:director-opening:v1','1'));
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))missing.push(r.url());});
 await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 const goto=async(hash)=>{await p.goto(base+hash);await p.locator('.space-experience').waitFor();};
 const stored=()=>p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/^(vh-|sfc-|stam\.control-room\.flight)/.test(k)).sort().map(k=>[k,localStorage.getItem(k)])));
 const open=async(id)=>{await p.locator(`.partner-hit[data-partner=${id}]`).click();await p.locator('.crew-encounter[data-ready=true]').waitFor();};
 const close=async()=>{await p.getByRole('button',{name:/대화 마치기|End conversation/}).click();await p.locator('.crew-encounter').waitFor({state:'detached'});};
 await goto('#/bridge?lang=ko');
 if(await p.locator('.partner-choice').count())await p.locator('.partner-options [data-partner=operator]').click();
 await p.locator('.space-background').evaluate(e=>e.decode());await p.waitForTimeout(400);const before=await stored();
 for(const id of ['operator','navigator']){
  await open(id);await p.waitForTimeout(140);
  const scale=await p.locator('.crew-encounter-person').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a);
  assert(scale>0&&scale<1,`approach animation exists: ${id} scale ${scale}`);
  await p.waitForTimeout(950);
  assert.equal(await p.locator('.space-overview').getAttribute('inert'),'');
  assert.equal(await p.locator('.partner-conversation').evaluate(e=>getComputedStyle(e).opacity),'1');
  assert.equal(await p.locator('dialog:modal').count(),0);
  await p.screenshot({path:out+`desktop-${id}.png`});
  const greeting=await p.locator('#partner-conversation-line').innerText();
  await p.getByRole('button',{name:'대화 마치기'}).click();assert.equal(await p.locator('.crew-encounter').getAttribute('data-closing'),'true');
  await p.locator('.crew-encounter').waitFor({state:'detached'});await p.waitForTimeout(50);
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.partner),id);
  await open(id);await p.waitForTimeout(850);assert.notEqual(await p.locator('#partner-conversation-line').innerText(),greeting);
  await p.keyboard.press('Escape');await p.locator('.crew-encounter').waitFor({state:'detached'});
 }
 checks.push('Both bridge partners approach from their standing position, display existing rotating greetings, reverse on close/Escape and restore focus. Scene inert; topbar/sidebar remain outside a non-modal dialog.');
 await open('operator');await p.locator('.space-group-button[href="#/lounge?lang=ko"]').click();await p.waitForURL('**#/lounge?lang=ko');assert.equal(await p.locator('.crew-encounter').count(),0);
 await goto('#/bridge?lang=ko');await open('navigator');await p.evaluate(()=>history.back());await p.locator('.crew-encounter').waitFor({state:'detached'});
 checks.push('Sidebar navigation and browser Back cancel dialogue without stale close timers or route replacement.');
 await goto('#/bridge?lang=ko');await open('operator');await p.locator('.space-language select').selectOption('en');await p.waitForURL('**#/bridge?lang=en');assert.equal(await p.locator('.crew-encounter').count(),0);await open('navigator');await p.waitForTimeout(950);await p.screenshot({path:out+'desktop-en.png'});await close();
 for(const width of [390,768]){
  await p.setViewportSize({width,height:844});await open('operator');await p.waitForTimeout(1000);
  const boxes=await p.locator('.crew-encounter,.crew-encounter-person,.partner-conversation').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  assert(boxes[1].top>=boxes[0].top&&boxes[1].top+boxes[1].height*.28<boxes[2].top,'face remains above mobile panel');
  assert(boxes[2].bottom<=844&&boxes[2].x>=0&&boxes[2].right<=width);
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:out+`mobile-${width}.png`});await close();
 }
 checks.push('English, 390px and 768px: full head visible, readable panel and close button fit viewport without horizontal overflow.');
 await p.setViewportSize({width:390,height:844});await open('navigator');await p.locator('.space-menu-toggle').click();await p.locator('.space-group-button[href="#/lounge?lang=en"]').click();await p.waitForURL('**#/lounge?lang=en');assert.equal(await p.locator('.crew-encounter').count(),0);
 await p.emulateMedia({reducedMotion:'reduce'});await goto('#/bridge?lang=ko');await open('navigator');
 assert.equal(await p.locator('.crew-encounter').getAttribute('data-motion'),'false');assert.equal(await p.locator('.crew-encounter-person').evaluate(e=>e.getAnimations().length),0);await p.screenshot({path:out+'mobile-reduced-motion.png'});await close();
 assert.deepEqual(await stored(),before);checks.push('Mobile sidebar works while talking; reduced-motion disables zoom/slide; flight storage unchanged by all conversation interactions.');
 await p.setViewportSize({width:1440,height:900});await p.emulateMedia({reducedMotion:'no-preference'});
 await goto('#/guide?lang=ko');await p.locator('.lounge-tour-entry').click();await p.locator('.lounge-tour[data-ready=true]').waitFor();await p.waitForTimeout(3800);
 await p.getByRole('button',{name:'일시정지',exact:true}).click();await p.screenshot({path:out+'tour-lead.png'});await p.getByRole('button',{name:'계속 보기',exact:true}).click();await p.waitForTimeout(3300);await p.getByRole('button',{name:'일시정지',exact:true}).click();await p.screenshot({path:out+'tour-cinema-arrival.png'});
 for(const [stop,screen] of [['cinema','cinema'],['archive','information'],['service','service'],['gate','lounge']]){
  await p.getByRole('button',{name:'이동 건너뛰기',exact:true}).click();await p.locator(`.lounge-tour[data-stop=${stop}][data-phase=intro]`).waitFor();assert(p.url().includes('#/'+screen+'?'));await p.locator('.lounge-tour-caption button').click();
 }
 await p.locator('.lounge-tour').waitFor({state:'detached'});assert.equal(await p.locator('.lounge-tour-world canvas').count(),0);assert.deepEqual(await stored(),before);
 checks.push('New escort/cinema pose loads in the live Three tour; cinema/archive/service/gate still navigate in order, complete and dispose canvas without changing flight data.');
 await p.goto(base+'docs/cinematics/guide-close-dialogue-20261117/index.html');
 for(let i=0;i<8;i++){await p.locator('nav button').nth(i).click();await p.locator('main img').evaluateAll(es=>Promise.all(es.map(e=>e.decode())));if([0,5,6,7].includes(i))await p.screenshot({path:out+`asset-comparison-${i}.png`});}
 await p.getByRole('button',{name:'밝은 배경에서 확인'}).click();await p.screenshot({path:out+'asset-alpha-light.png'});
 checks.push('All eight transparent assets and original comparisons load in the review page, including light-background alpha inspection.');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await writeFile(out+'checks.json',JSON.stringify({passed:true,checks,errors,missing,scope:'Local production build in Chromium. No real account/game/iOS verification.'},null,2));console.log(JSON.stringify({passed:true,checks},null,2));await context.close();
}finally{await browser.close();}
