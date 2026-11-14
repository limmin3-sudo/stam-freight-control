// Opt-in local private logs; output counts only, never raw input or identities.
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const root=process.env.STAM_PRIVATE_LOG_ROOT;assert(root);
async function logs(dir){const found=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())found.push(...await logs(p));else if(e.isFile()&&e.name.toLowerCase().endsWith('.log'))found.push(p);}return found;}
const files=await logs(root);assert(files.length);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.goto(process.env.STAM_MISSION_URL||'http://127.0.0.1:5186/');
 const summary={files:0,cards:0,ready:0,incomplete:0,ended:0,conflict:0};
 for(const path of files){
  const raw=await readFile(path,'utf8');
  const counts=await page.evaluate(async raw=>{
   const {receiveReceipts,decodeReceiptCache,effectiveReceipts}=await import('/src/receipt-cache.ts');
   const result=await new Promise((resolve,reject)=>{const w=new Worker('/src/receipt-log.worker.mjs?worker_file&type=module',{type:'module'});const timeout=setTimeout(()=>{w.terminate();reject(Error('timeout'));},60000);w.onmessage=e=>{w.terminate();clearTimeout(timeout);resolve(e.data);};w.onerror=()=>{w.terminate();clearTimeout(timeout);reject(Error('worker failure'));};w.postMessage(new File([raw],'private-replay.log'));});
   const cache=receiveReceipts(result,null),json=JSON.stringify(cache),restored=decodeReceiptCache(json);
   if(JSON.stringify(effectiveReceipts(restored))!==JSON.stringify(result.cards))throw Error('receipt roundtrip mismatch');
   const counts={cards:result.cards.length,ready:0,incomplete:0,ended:0,conflict:0};for(const card of result.cards)counts[card.state]++;return counts;
  },raw);
  summary.files++;for(const key of Object.keys(counts))summary[key]+=counts[key];
 }
 await writeFile(process.env.STAM_QA_REPORT||'/tmp/stam-private-receipt-cache-report.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
}finally{await browser.close();}
