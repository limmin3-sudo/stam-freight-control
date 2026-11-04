// Private stdio protocol for the Windows launcher. Never emit raw logs or player identifiers.
import {startLogService} from '../integration/log/live-server.mjs';
import {DEFAULT_LOG_PORT} from '../scripts/log-link-server.mjs';
let service,closing=false;
async function stop(){if(closing)return;closing=true;if(service)await service.close();process.exit(0);}
process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{if(chunk.includes('stop'))void stop();});
process.stdin.on('end',()=>void stop()); // parent exited: do not leave an orphan log watcher
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
try{
 service=await startLogService({file:process.argv[2],port:process.argv.includes('--self-test')?0:DEFAULT_LOG_PORT});
 if(closing){await service.close();process.exit(0);}
 process.stdout.write(JSON.stringify({type:'ready',url:service.url})+'\n');
}catch(e){process.stdout.write(JSON.stringify({type:'error',code:e.code==='EADDRINUSE'?'port-busy':'startup-failed'})+'\n');process.exit(1);}
