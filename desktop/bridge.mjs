// Private stdio protocol. No raw logs, authentication tokens in status, or player identifiers.
import {projectReceipts} from '../integration/log/project-receipts.mjs';
import {startLogService} from '../integration/log/live-server.mjs';
import {DEFAULT_LOG_PORT} from '../scripts/log-link-server.mjs';
import {createInterface} from 'node:readline';
import {discoverLogs,automaticLog} from './discover-log.mjs';
import {readFile,readdir} from 'node:fs/promises';
import {mime} from '../scripts/web-files.mjs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

async function loadPreviewConsole(){
 const root=fileURLToPath(new URL('../../preview-console/',import.meta.url));
 const files=new Map();
 async function index(directory, prefix){
  for(const entry of await readdir(directory,{withFileTypes:true})){
   const file=join(directory,entry.name), name=prefix+entry.name;
   if(entry.isDirectory())await index(file,name+'/');
   else if(entry.isFile())files.set(name,file);
  }
 }
 try{await index(root,'');}catch(error){if(error.code==='ENOENT')return null;throw error;}
 if(!files.has('index.html'))return null;
 return async encoded=>{
  const name=decodeURIComponent(encoded)||'index.html', file=files.get(name);
  if(!file)return null;
  return {type:mime(name)||({mp3:'audio/mpeg',ttf:'font/ttf'})[name.split('.').pop()]||'application/octet-stream',body:await readFile(file)};
 };
}
const screenRoot=new URL('../../contract-reader/',import.meta.url);
async function screenBundle(name){
 const file=name||'contract-reader.html';
 const ocr=/^ocr\/(?:worker\.min\.js|tesseract\.min\.js|tesseract-core-lstm\.wasm\.js|(?:kor|eng)\.traineddata\.gz)$/.test(file);
 if(!ocr&&file!=='contract-reader.html'&&!/^assets\/[\w.-]+\.(js|css)$/.test(file))return null;
 const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.gz')?'application/octet-stream':'text/html';
 try{return {type,body:await readFile(new URL(file,screenRoot))};}catch{return null;}
}
let service,closing=false,timer;
const send=value=>{if(!closing)process.stdout.write(JSON.stringify(value)+'\n');};
async function stop(){if(closing)return;closing=true;clearTimeout(timer);if(service)await service.close();process.exit(0);}
process.stdin.setEncoding('utf8');
createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',line=>{if(line==='stop')void stop();else if(line.length<=1536){try{const m=JSON.parse(line);if(m.type==='command'&&typeof m.command==='string'&&m.command.length<=210){if(m.command==='read-contract')service?.assist.tap();else if(m.command.startsWith('screen-reply:')){
 const match=/^screen-reply:([a-f0-9-]{36}):([^\r\n]{1,160})$/u.exec(m.command);
 if(match)service?.screenReply(match[1],match[2]);
}else service?.companion.enqueue(m.command);}}catch{}}});
process.stdin.on('end',()=>void stop());
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
const selfTest=process.argv.includes('--self-test');
let file=process.argv[2];if(file==='--auto')file=null;
// Let adjacent log notifications settle and discard an older lookup result.
let reviewTimer,latestRevision=0;
function onSnapshot(snapshot,revision){
 latestRevision=revision;clearTimeout(reviewTimer);
 reviewTimer=setTimeout(async()=>{
  try{
   const result=await projectReceipts(snapshot);
   if(!closing&&revision===latestRevision)service?.assist.review(result.cards);
  }catch{/* The log watcher continues if a catalogue lookup fails. */}
 },1200);
}
async function start(){
 try{
  if(!file){
   const candidates=await discoverLogs();if(closing)return;
   file=automaticLog(candidates);
   if(!file){send({type:'discovery',phase:candidates.length?'choose-file':'searching',candidates});timer=setTimeout(start,10000);return;}
  }
  service=await startLogService({file,port:selfTest?0:DEFAULT_LOG_PORT,apiOnly:true,screenBundle,previewConsole:selfTest?null:await loadPreviewConsole(),onSnapshot,onReadNotice:notice=>send({type:'contract-read',...notice})});
  if(closing){await service.close();process.exit(0);}
  send({type:'ready',url:service.url,file});
  const report=()=>{if(closing)return;send({type:'status',...service.status()});send({type:'display',display:service.companion.snapshot()||service.screenPreview()});timer=setTimeout(report,1000);};report();
 }catch(e){send({type:'error',code:e.code==='EADDRINUSE'?'port-busy':'startup-failed'});process.exitCode=1;process.stdin.destroy();clearTimeout(timer);}
}
void start();
