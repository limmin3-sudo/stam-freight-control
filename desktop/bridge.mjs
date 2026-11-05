// Private stdio protocol for the Windows launcher. Never emit raw logs or player identifiers.
import {startLogService} from '../integration/log/live-server.mjs';
import {DEFAULT_LOG_PORT} from '../scripts/log-link-server.mjs';
import {createInterface} from 'node:readline';
let service,closing=false;
async function stop(){if(closing)return;closing=true;if(service)await service.close();process.exit(0);}
process.stdin.setEncoding('utf8');
createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',line=>{
 if(line==='stop'){void stop();return;}
});
process.stdin.on('end',()=>void stop()); // parent exited: do not leave an orphan log watcher
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
try{
 const selfTest=process.argv.includes('--self-test');
 service=await startLogService({file:process.argv[2],port:selfTest?0:DEFAULT_LOG_PORT,apiOnly:true});
 if(closing){await service.close();process.exit(0);}
 process.stdout.write(JSON.stringify({type:'ready',url:service.url})+'\n');
 // Browser UI and authentication stay on the public website.
}catch(e){process.stdout.write(JSON.stringify({type:'error',code:e.code==='EADDRINUSE'?'port-busy':'startup-failed'})+'\n');process.exit(1);}
