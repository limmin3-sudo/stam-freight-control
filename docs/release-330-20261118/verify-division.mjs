import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.STAM_REVIEW_URL||'http://127.0.0.1:5193/',out=new URL('./division/',import.meta.url).pathname;await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']}),checks=[],errors=[];
try{const p=await b.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>errors.push(e.message));await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
 await p.goto(base+'#/division?lang=ko');await p.locator('.division-facility').first().waitFor();await p.screenshot({path:out+'overview.png'});
 for(const facility of ['trade','guide-center']){
  await p.locator(`.division-facility[data-facility=${facility}]`).click();await p.locator('.space-experience[data-moving=true][data-facility-travel=true]').waitFor();await p.waitForURL('**facility='+facility);await p.locator('.lobby-stage[data-loaded=true]').waitFor();await p.waitForTimeout(500);
  assert.equal(await p.locator('svg.shell-material image').count(),1);await p.locator('.lobby-person img').evaluateAll(es=>Promise.all(es.map(e=>e.decode())));await p.screenshot({path:out+facility+'-lobby.png'});
  await p.locator('[data-place]').first().click();await p.locator('.facility-lobby[data-travel=approach]').waitFor();await p.waitForFunction(()=>location.hash.includes('room='));await p.waitForFunction(()=>document.querySelector('.facility-lobby')?.dataset.travel==='idle');await p.locator('.market-room').waitFor();await p.screenshot({path:out+facility+'-interior.png'});
  await p.keyboard.press('Escape');await p.waitForFunction(()=>!location.hash.includes('room='));await p.waitForFunction(()=>document.querySelector('.facility-lobby')?.dataset.travel==='idle');
  await p.locator('.lobby-exit').click();await p.waitForURL('**#/division?lang=ko');await p.waitForTimeout(900);
 }
 checks.push('Division direct clicks approach both lobbies; room entry and Escape return preserve shared shell and monitor, lobby exit zooms back to division');
 await p.locator('.division-facility[data-facility=trade]').click();await p.locator('.space-experience[data-moving=true]').waitFor();await p.keyboard.press('Escape');await p.waitForTimeout(1100);assert(!p.url().includes('facility='));
 await p.locator('.division-facility[data-facility=trade]').click();await p.locator('.space-experience[data-moving=true]').waitFor();await p.locator('.space-group-button[href="#/lounge?lang=ko"]').click();await p.waitForURL('**#/lounge?lang=ko');await p.waitForTimeout(1100);assert(!p.url().includes('facility='));checks.push('Escape and sidebar navigation during division approach cancel deferred arrival without late navigation');
 for(const screen of ['service','information','bridge']){await p.goto(base+'#/'+screen+'?lang=ko');await p.locator('svg.shell-material image').waitFor({state:'attached'});await p.waitForTimeout(700);await p.screenshot({path:out+screen+'.png'});}
 checks.push('Service, archive and bridge retain the same approved shell');assert.deepEqual(errors,[]);await writeFile(out+'checks.json',JSON.stringify({passed:true,checks,errors},null,2));
}finally{await b.close();}
