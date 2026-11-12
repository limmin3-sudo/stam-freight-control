import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5182/';
const output=process.env.STAM_QA_OUTPUT||'/tmp/stam-celestial-review';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(90000);
 const errors=[],assets=new Set();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/Shader|WebGL|THREE|Navigation chart/.test(m.text()))errors.push(m.text());});
 page.on('response',r=>{if(r.url().includes('/celestial/')){if(r.status()!==200)errors.push('Asset failed '+r.url());assets.add(r.url().split('/').pop().split('?')[0]);}});
 await page.goto(base+'#/mission?lang=ko');await page.getByRole('button',{name:'예시 계약 보기',exact:true}).click();
 await page.locator('.receipt-card').first().getByRole('checkbox').check();await page.locator('.receipt-card').nth(1).getByRole('checkbox').check();await page.getByLabel('운항 파트너',{exact:true}).selectOption('navigator');await page.locator('.dispatch-launch').click();
 const settled=()=>page.waitForSelector('.navigation-chart canvas[data-settled=true]',{timeout:90000});
 await page.waitForSelector('.navigation-chart[data-ready=true]');await settled();
 await page.getByRole('button',{name:'거점 검색 · 항성계 탐색'}).click();
 async function capture(name){await settled();await page.waitForTimeout(1300);await page.screenshot({path:output+'/'+name+'.png'});console.log('captured '+name);}
 await capture('stanton-system');
 for(const [label,id]of [['파이로','pyro'],['닉스','nyx']]){await page.getByRole('button',{name:label,exact:true}).click();await page.waitForSelector('canvas[data-system='+id+']');await capture(id+'-system');}
 async function zoom(steps){
  const before=await page.locator('.navigation-chart canvas').getAttribute('data-view');
  await page.locator('.navigation-chart canvas').evaluate((el,steps)=>{for(let i=0;i<steps;i++)el.dispatchEvent(new WheelEvent('wheel',{deltaY:-Math.log(1.3)/.0017,cancelable:true}));},steps);
  await page.waitForFunction(before=>{const c=document.querySelector('.navigation-chart canvas');return c?.dataset.view!==before&&c?.dataset.settled==='true';},before,{timeout:90000});
 }
 async function focus(query,zooms){const field=page.getByRole('combobox',{name:'거점 검색',exact:true});await field.fill(query);await page.locator('.chart-explore [role=option]').first().click();await settled();await zoom(zooms);}
 await focus('microTech',4);await capture('microtech-closeup');
 await focus('Hurston',4);await capture('hurston-closeup');
 await focus('Crusader',4);await capture('crusader-closeup');
 // The star stays at the system origin; reset then use the existing zoom control.
 await page.getByRole('button',{name:'전체 보기',exact:true}).click();await settled();await zoom(9);await capture('star-closeup');
 assert.deepEqual(errors,[]);assert.equal(assets.size,9,'Expected source textures loaded successfully');
 await writeFile(output+'/verification.json',JSON.stringify({errors,assets:[...assets],viewport:'1600x1000',devicePixelRatio:1},null,2));
 console.log('PASS: expected generated textures loaded and captures completed without shader/page errors');
}finally{await browser.close();}
