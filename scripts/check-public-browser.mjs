import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const root=resolve(process.argv[2]||'/tmp/stam-public'),prefix='/stam-freight-control/';
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://local');if(!url.pathname.startsWith(prefix))throw Error();
 const file=resolve(root,url.pathname.slice(prefix.length)||'index.html');if(!file.startsWith(root+'/'))throw Error();
 res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp4':'video/mp4','.vtt':'text/vtt'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1');await once(server,'listening');let browser;
try{
 browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const base=`http://127.0.0.1:${server.address().port}${prefix}`;
 await page.goto(base);await page.waitForSelector('#flight-ready-action');assert.equal(await page.locator('canvas').count(),0);
 await page.locator('#workspace-language [data-lang=en]').click();assert.equal(await page.locator('#workspace-backup').innerText(),'Backup & restore');
 await page.locator('#workspace-language [data-lang=ko]').click();assert.equal(await page.locator('#workspace-backup').innerText(),'백업·복원');
 await page.evaluate(()=>{localStorage.setItem('vh-ship-id','misc-hull-b');localStorage.setItem('stam-sentinel','preserved');});
 await page.locator('#workspace-backup').click();
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('[data-export]').click()]);
 const backup=await readFile(await download.path(),'utf8');assert.equal(JSON.parse(backup).settings['vh-ship-id'],'misc-hull-b');
 await page.evaluate(()=>localStorage.setItem('vh-ship-id','changed'));
 await page.locator('[data-file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});await page.waitForFunction(()=>!document.querySelector('[data-import]').disabled);
 await Promise.all([page.waitForEvent('load'),page.locator('[data-import]').click()]);await page.waitForSelector('#flight-ready-action');
 assert.equal(await page.evaluate(()=>localStorage.getItem('vh-ship-id')),'misc-hull-b');assert.equal(await page.evaluate(()=>localStorage.getItem('stam-sentinel')),'preserved');
 // Interrupted restore rolls back before the planner reads any restored values.
 await page.evaluate(()=>{localStorage.setItem('vh-ship-id','interrupted');localStorage.setItem('stam-flight-restore-journal-v1',JSON.stringify({version:1,owner:'guest',before:{'vh-ship-id':'misc-hull-b'}}));});
 await page.reload();await page.waitForSelector('#flight-ready-action');assert.equal(await page.evaluate(()=>localStorage.getItem('vh-ship-id')),'misc-hull-b');
 assert.equal(await page.evaluate(()=>localStorage.getItem('stam-flight-restore-journal-v1')),null);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.goto(base+'download.html');await page.waitForFunction(()=>document.querySelector('#app-download').textContent==='Windows 앱 다운로드');
 await page.goto(base+'guide.html');await page.waitForSelector('#slide-title');assert.equal(await page.locator('#chapters button').count(),13);
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 console.log(JSON.stringify({passed:true,githubPagesPrefix:true,csp:true,languageSwitchReversible:true,backupRoundtrip:true,interruptedRestoreRecovery:true,unrelatedDataPreserved:true,mobileOverflow:false,errors,bad}));
}finally{await browser?.close();server.close();}
