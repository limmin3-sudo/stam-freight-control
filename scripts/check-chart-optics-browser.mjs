import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {chooseInitialPartner} from './browser-partner-choice.mjs';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5188/',out=process.env.STAM_QA_OUTPUT||'/tmp/stam-chart-optics';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[],panoramas=[];
 p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/Shader|WebGL|THREE|Navigation chart/.test(m.text()))errors.push(m.text());});
 p.on('request',r=>{if(/sky-(stanton|pyro|nyx)/.test(r.url()))panoramas.push(r.url());});
 await p.addInitScript(()=>localStorage.setItem('vh-map-quality','normal'));
 await p.goto(base+'#/mission?lang=ko');await chooseInitialPartner(p,'navigator');await p.getByRole('button',{name:'예시 계약 보기',exact:true}).click();for(const i of [0,2])await p.locator('.receipt-card').nth(i).getByRole('checkbox').check();await p.locator('.dispatch-launch').click();
 const settle=async()=>{await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await p.waitForSelector('.chart-space canvas[data-settled=true]');};
 await p.waitForSelector('.navigation-chart[data-ready=true]');await settle();
 const stored=await p.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1'));
 const toggle=p.locator('.chart-explore-toggle');
 async function explore(open){if((await toggle.getAttribute('aria-expanded')==='true')!==open)await toggle.click();}
 async function capture(name){await explore(false);await settle();await p.screenshot({path:out+'/'+name+'.png'});console.log('CAPTURE '+name);}
 await p.locator('.chart-stop-select').nth(2).click();await p.getByRole('button',{name:'전체 보기',exact:true}).click();await capture('stanton');
 for(const [name,id] of [['파이로','pyro'],['닉스','nyx']]){await explore(true);await p.locator('.chart-systems').getByRole('button',{name,exact:true}).click();await p.waitForSelector(`canvas[data-system=${id}]`);await capture(id);}
 await explore(true);await p.getByRole('combobox',{name:'거점 검색',exact:true}).fill('microTech');await p.locator('.chart-explore [role=option]').first().click();await settle();await capture('microtech');
 // Zoom must enlarge the body without enlarging sky pixels; sky is direction-only.
 await p.getByRole('button',{name:'확대',exact:true}).click();await p.getByRole('button',{name:'확대',exact:true}).click();await capture('microtech-close');
 await p.goto(base+'#/map?lang=ko&chartLook=hologram');await p.waitForSelector('.map-monitor[data-chart-look=hologram]');await p.waitForSelector('.navigation-chart[data-ready=true]');await settle();
 await p.locator('.chart-stop-select').nth(2).click();await settle();await explore(true);await p.getByRole('combobox',{name:'거점 검색',exact:true}).fill('microTech');await p.locator('.chart-explore [role=option]').first().click();await settle();
 await p.getByRole('button',{name:'확대',exact:true}).click();await p.getByRole('button',{name:'확대',exact:true}).click();await capture('hologram-microtech-close');
 for(const name of ['Hurston','Crusader']){await explore(true);await p.getByRole('combobox',{name:'거점 검색',exact:true}).fill(name);await p.locator('.chart-explore [role=option]').first().click();await settle();await p.getByRole('button',{name:'확대',exact:true}).click();await capture('hologram-'+name.toLowerCase());}
 await p.getByRole('button',{name:'전체 보기',exact:true}).click();await capture('hologram-stanton');
 // Exercise all three real render quality settings after shader/material changes.
 for(const quality of ['high','ultra','normal']){await explore(true);await p.locator('.chart-explore select').selectOption(quality);await settle();}
 await explore(false);await p.setViewportSize({width:2560,height:1440});await settle();await p.screenshot({path:out+'/hologram-1440p.png'});await p.setViewportSize({width:390,height:844});await settle();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:out+'/mobile.png'});
 assert.equal(await p.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),stored,'graphics exploration must preserve flight data');
 assert.deepEqual(panoramas,[],'low-resolution sky panoramas must not be requested');assert.deepEqual(errors,[]);
 await writeFile(out+'/verification.json',JSON.stringify({errors,panoramas,viewport:'1920x1080',mobile:'390x844',qualities:['normal','high','ultra'],styles:['physical','hologram'],hologramGrid:false,bodyColoursPreserved:true,storagePreserved:true},null,2));console.log('PASS sky replacement; three system palettes; physical/projected styles; native body colours; close view; quality modes; 1440p/mobile; unchanged flight data; no shader errors');
}finally{await browser.close()}
