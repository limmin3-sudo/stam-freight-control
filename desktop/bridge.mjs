// Private stdio protocol for the Windows launcher. Never emit raw logs or player identifiers.
import {startLogService} from '../integration/log/live-server.mjs';
import {DEFAULT_LOG_PORT} from '../scripts/log-link-server.mjs';
import {createWebUpdates} from './web-update.mjs';
import {homedir} from 'node:os';
import path from 'node:path';
let service,updates,closing=false;
async function stop(){if(closing)return;closing=true;await updates?.stop();if(service)await service.close();process.exit(0);}
process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{if(chunk.includes('stop'))void stop();});
process.stdin.on('end',()=>void stop()); // parent exited: do not leave an orphan log watcher
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
try{
 const selfTest=process.argv.includes('--self-test');
 if(!selfTest)updates=createWebUpdates({directory:path.join(process.env.LOCALAPPDATA||path.join(homedir(),'.cache'),'STAM','web')});
 const webBundle=await updates?.select();
 service=await startLogService({file:process.argv[2],port:selfTest?0:DEFAULT_LOG_PORT,webBundle,webUpdateStatus:()=>updates?.status()});
 if(closing){await service.close();process.exit(0);}
 process.stdout.write(JSON.stringify({type:'ready',url:service.url})+'\n');
 // UI downloads are independent of log collection. Apply only at the next launch.
 void updates?.check();
}catch(e){process.stdout.write(JSON.stringify({type:'error',code:e.code==='EADDRINUSE'?'port-busy':'startup-failed'})+'\n');process.exit(1);}
