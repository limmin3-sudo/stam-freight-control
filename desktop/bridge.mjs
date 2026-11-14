// Private stdio protocol. No raw logs, authentication tokens in status, or player identifiers.
import {startLogService} from '../integration/log/live-server.mjs';
import {DEFAULT_LOG_PORT} from '../scripts/log-link-server.mjs';
import {createInterface} from 'node:readline';
import {discoverLogs,automaticLog} from './discover-log.mjs';
let service,closing=false,timer;
const send=value=>{if(!closing)process.stdout.write(JSON.stringify(value)+'\n');};
async function stop(){if(closing)return;closing=true;clearTimeout(timer);if(service)await service.close();process.exit(0);}
process.stdin.setEncoding('utf8');
createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',line=>{if(line==='stop')void stop();});
process.stdin.on('end',()=>void stop());
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
const selfTest=process.argv.includes('--self-test');
let file=process.argv[2];if(file==='--auto')file=null;
async function start(){
 try{
  if(!file){
   const candidates=await discoverLogs();if(closing)return;
   file=automaticLog(candidates);
   if(!file){send({type:'discovery',phase:candidates.length?'choose-file':'searching',candidates});timer=setTimeout(start,10000);return;}
  }
  service=await startLogService({file,port:selfTest?0:DEFAULT_LOG_PORT,apiOnly:true});
  if(closing){await service.close();process.exit(0);}
  send({type:'ready',url:service.url,file});
  const report=()=>{if(closing)return;send({type:'status',...service.status()});timer=setTimeout(report,1000);};report();
 }catch(e){send({type:'error',code:e.code==='EADDRINUSE'?'port-busy':'startup-failed'});process.exitCode=1;process.stdin.destroy();clearTimeout(timer);}
}
void start();
