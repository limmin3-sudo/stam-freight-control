import {chooseInitialPartner} from './browser-partner-choice.mjs';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile),cache=new Map();
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const ko=process.env.STAM_OCR_LANGUAGE==='ko';
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5186/';
const out=process.env.STAM_QA_OUTPUT||'/tmp/stam-ocr-final';await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const context=await b.newContext({viewport:{width:1920,height:1080},serviceWorkers:'block'});
 // Cloud Chromium does not inherit the proxy CA. Fetch unchanged public OCR assets
 // through curl's trusted system CA; do not disable TLS or mock recognition.
 if(process.env.STAM_OCR_SYSTEM_FETCH==='1')await context.route(/^https:\/\//,async route=>{const url=route.request().url();try{if(!cache.has(url))cache.set(url,run('curl',['--fail','--location','--silent','--show-error','--max-time','60',url],{encoding:'buffer',maxBuffer:40*1024*1024}).then(r=>r.stdout));const body=await cache.get(url);await route.fulfill({status:200,body,headers:{'access-control-allow-origin':'*','content-type':new URL(url).pathname.endsWith('.js')?'application/javascript':url.includes('.wasm')?'application/wasm':'application/octet-stream'}});}catch(e){cache.delete(url);console.log('ASSET FAIL '+url+' '+e.message);await route.abort();}});
 const p=await context.newPage();const errors=[],failures=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failures.push({url:r.url().split('?')[0],error:r.failure()?.errorText}));
 await p.goto(base+'#/mission?lang='+(ko?'ko':'en'));await chooseInitialPartner(p);await p.waitForSelector('.mission-screen');
 await p.getByLabel(ko?'운항 파트너':'Flight partner',{exact:true}).selectOption('navigator');
 const data=await p.evaluate(async ko=>{
  if(ko)await document.fonts.load('500 42px SUIT');
  const c=document.createElement('canvas');c.width=ko?1900:1700;c.height=740;
  const x=c.getContext('2d');x.fillStyle='#071522';x.fillRect(0,0,c.width,c.height);x.fillStyle='#eef8ff';x.font=ko?'500 42px SUIT':'36px Arial';
  const lines=ko?['미션명: 신입 화물 운송','Mission ID: OCR-FINAL-KO','보상: 73,500 aUEC','알루미늄을(를) 0/22 SCU 에어리어 18에 배송하십시오.','로빌에서 알루미늄을(를) 접수하십시오.','뉴 배비지에서 알루미늄을(를) 접수하십시오.']:
   ['Title: Junior Hauler Needed for Small Shipment','Mission ID: OCR-FINAL-001','Reward: 73,500 aUEC','Collect Aluminum from Lorville','Collect Aluminum from New Babbage','Deliver 22 SCU of Aluminum to Area18'];
  lines.forEach((line,i)=>x.fillText(line,50,75+i*105));return c.toDataURL('image/png').split(',')[1];
 },ko);
 const bytes=Buffer.from(data,'base64');await writeFile(out+'/synthetic-contract.png',bytes);
 const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:ko?'스크린샷 여러 장 선택':'Choose screenshots',exact:true}).click();await(await chooser).setFiles({name:'synthetic-contract.png',mimeType:'image/png',buffer:bytes});
 try {await p.locator('.shot-review .manifest-editor').waitFor({timeout:120000});}catch(e){console.log(JSON.stringify({state:await p.locator('.shot-details').innerText(),failures,errors}));throw e;}
 await p.locator('.shot-transcript summary').click();const text=await p.locator('.shot-transcript pre').innerText();await writeFile(out+'/recognized.txt',text);assert.match(text,/22\s*SCU/i);
 const form=p.locator('.shot-review .manifest-editor');await p.screenshot({path:out+'/ocr-review.png'});
 assert.equal(await form.getByLabel(ko?'보상 · aUEC':'Reward · aUEC',{exact:true}).inputValue(),'73500');
 const total=form.getByLabel(ko?/배송 총량.*SCU/:/Delivery total.*SCU/);assert.equal(await total.inputValue(),'22');
 assert.equal(await form.getByLabel('SCU',{exact:true}).count(),2);
 for(const field of await form.getByLabel('SCU',{exact:true}).all())assert.equal(await field.inputValue(),'');
 await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await p.locator('.shot-review').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await p.screenshot({path:out+'/ocr-review-mobile.png'});await p.setViewportSize({width:1920,height:1080});
 await total.fill('0');assert(await form.getByRole('button',{name:ko?'확인한 계약 담기':'Add reviewed contract',exact:true}).isDisabled());await total.fill('22');
 await form.getByRole('button',{name:ko?'확인한 계약 담기':'Add reviewed contract',exact:true}).click();
 const key='stam.control-room.flight.v1';const state=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 assert.equal((await state()).draft.jobs.length,1);assert.equal(Object.values((await state()).draft.jobs[0].reservations)[0],22);assert.equal((await state()).draft.jobs[0].pay,73500);

 // Reuse the same recognized contract ID through a second image in the real intake.
 const files=p.locator('.shot-intake>input[type=file]');await files.setInputFiles({name:'duplicate.png',mimeType:'image/png',buffer:bytes});
 await p.locator('.shot-review .manifest-editor').waitFor({timeout:120000});assert(await p.getByRole('button',{name:ko?'확인한 계약 담기':'Add reviewed contract',exact:true}).isDisabled());
 await p.locator('.shot-review').getByRole('button',{name:ko?'닫기':'Close',exact:true}).click();assert.equal((await state()).draft.jobs.length,1);
 await p.locator('.dispatch-launch').click();await p.waitForSelector('.chart-stop-events',{timeout:60000});const s=await state();assert.equal(s.plan.peak,22);assert.equal(s.draft.jobs[0].pay,73500);
 assert.equal(s.plan.visits.flatMap(v=>v.events).filter(e=>e.type==='delivery').reduce((n,e)=>n+e.scu,0),22);
 await p.screenshot({path:out+'/ocr-planned.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS real Tesseract → parsed review → pooled total validation → duplicate guard → navigator plan',language:ko?'ko':'en',peak:s.plan.peak,reward:s.draft.jobs[0].pay,shipments:s.draft.jobs[0].shipments,failures}));
}finally{await b.close();}
