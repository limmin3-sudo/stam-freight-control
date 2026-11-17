import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=process.env.STAM_QA_OUTPUT||'/tmp/stam-guide-journey-review';await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{const p=await b.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});p.setDefaultTimeout(30000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
await p.goto('http://127.0.0.1:5189/#/guide?lang=ko');await p.locator('.guide-desk .replies button').first().click();await p.locator('.guide-journey').waitFor();await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:out+'/scene-dialogue-desktop.png'});
const next=()=>p.locator('.guide-journey').getByRole('button',{name:'다음 →',exact:true}).click();const titles=[];await next();
for(let i=0;i<3;i++){await next();titles.push(await p.locator('#guide-journey-title').innerText());}assert.deepEqual(titles,['아카데미','무역센터','라운지']);
await p.getByRole('button',{name:'라운지 투어 이어가기',exact:true}).click();
for(let i=0;i<3;i++){await p.locator('.lounge-tour[data-phase=intro]').waitFor();await p.locator('.lounge-tour-caption button').click();}
await p.locator('.lounge-tour[data-stop=gate][data-phase=intro]').waitFor();
// Turn motion on only after reaching the gate to verify the approved boarding connector.
await p.emulateMedia({reducedMotion:'no-preference'});await p.getByRole('button',{name:'셔틀 타고 관제센터로',exact:true}).click();await p.locator('.shuttle-boarding[open]').waitFor();await p.locator('.shuttle-boarding video').evaluate(v=>new Promise(resolve=>{if(v.readyState>=1)resolve();else v.addEventListener('loadedmetadata',resolve,{once:true});}));
assert(await p.locator('.shuttle-boarding video').evaluate(v=>v.duration>0));await p.getByRole('button',{name:'관제센터로 바로 이동',exact:true}).click();await p.locator('.guide-journey[data-topic=bridge]').waitFor();assert(p.url().includes('#/bridge?'));await p.screenshot({path:out+'/bridge-introduction.png'});await next();await next();await next();await p.getByRole('button',{name:'예시 운송 연습',exact:true}).click();await p.locator('.guide-journey[data-topic=practice]').waitFor();
await p.keyboard.press('Escape');assert.equal(await p.locator('.guide-journey').count(),0);assert(p.url().includes('#/bridge?'));assert.deepEqual(errors,[]);await writeFile(out+'/tour-chain.json',JSON.stringify({order:titles,boardingMetadata:true,bridgeIntro:true,practiceContinuation:true,errors},null,2));console.log('PASS: academy → trade → lounge tour → approved boarding → bridge guide → practice');
}finally{await b.close();}
