// Actual UI captures: built site + real loopback service reading an isolated synthetic file.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {startLogService} from '../integration/log/live-server.mjs';
import {mime} from './web-files.mjs';
const {chromium}=await import(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const site='https://limmin3-sudo.github.io/stam-freight-control/';
const out=process.env.STAM_MANUAL_ASSETS||'apps/control-room/src/assets/manual';
const report=process.env.STAM_CAPTURE_REPORT||'/tmp/stam-manual-log-app-capture.json';
await mkdir(out,{recursive:true});
const dir=await mkdtemp(join(tmpdir(),'stam-manual-log-')),file=join(dir,'Game.log');
await writeFile(file,'<2026-11-16T10:00:00.000Z> [Notice] Synthetic guide connection check\n');
let service,browser;const records=[];
try{
 service=await startLogService({file,port:23458,apiOnly:true});
 browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 for(const locale of ['ko','en','mix']){
  const context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:2,reducedMotion:'reduce',permissions:['local-network-access']});
  await context.route(site+'**',async route=>{
   const name=decodeURIComponent(new URL(route.request().url()).pathname.slice(new URL(site).pathname.length))||'index.html';
   if(name.split('/').includes('..'))return route.abort();
   try{await route.fulfill({body:await readFile(join('apps/control-room/dist',name)),contentType:mime(name)||'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Not found'});}
  });
  const page=await context.newPage();page.setDefaultTimeout(30000);
  await page.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
  await page.goto(site+'#/mission?lang='+locale);await page.locator('[data-partner=operator]').click();
  await page.getByText(locale==='en'?'Receiving from app':'앱 자동 수신 중',{exact:true}).waitFor();
  await page.evaluate(()=>document.fonts.ready);
  for(const [step,selector] of [['download','.space-topbar'],['connected','.mission-source.receipt-import']]){
   const element=page.locator(selector);await element.screenshot({path:`${out}/${locale}-${step}.png`});
   records.push({locale,step,selector,text:await element.innerText(),source:'built site; actual local API; synthetic log; isolated storage'});
  }
  const release=JSON.parse(await readFile('data/desktop-release.json','utf8'));
  assert.equal(await page.locator('.space-download').getAttribute('href'),release.installer?.url||release.url);
  const source=`docs/function-review-20261114/log-companion/companion-${locale==='en'?'en':'ko'}-windows.png`;
  await copyFile(source,`${out}/${locale}-app-window.png`);
  records.push({locale,step:'app-window',source,testedSourceCommit:'66c26ac84d7a22824be7f2bf3794b828482f145f',note:'Native Windows form capture. Launcher.cs and installer.iss unchanged through HEAD 8c9b06a. Ready state, not connected.'});
  await context.close();console.log(locale+' log-app captures complete');
 }
 await writeFile(report,JSON.stringify({userDataUsed:false,installerScreenshot:false,records},null,2));
}finally{await browser?.close();await service?.close();await rm(dir,{recursive:true,force:true});}
