// Private stdio protocol for the Windows launcher. Never emit raw logs or player identifiers.
import {startLogService} from '../integration/log/live-server.mjs';
import {DEFAULT_LOG_PORT} from '../scripts/log-link-server.mjs';
import {createWebUpdates} from './web-update.mjs';
import {homedir} from 'node:os';
import path from 'node:path';
import {createInterface} from 'node:readline';
let service,updates,closing=false;
let position=null;
async function stop(){if(closing)return;closing=true;await updates?.stop();if(service)await service.close();process.exit(0);}
process.stdin.setEncoding('utf8');
createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',line=>{
 if(line==='stop'){void stop();return;}
 if(line.length>1024)return;
 try{const data=JSON.parse(line);if(data.type==='position-off'){position=null;return;}
  if(data.type!=='position'||!['stanton','pyro','nyx'].includes(data.system)||!Array.isArray(data.position)||data.position.length!==3||data.position.some(n=>!Number.isFinite(n)||Math.abs(n)>1e12))return;
  position={system:data.system,position:data.position,receivedAt:Date.now(),source:'showlocation-clipboard'};
 }catch{}
});
process.stdin.on('end',()=>void stop()); // parent exited: do not leave an orphan log watcher
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
try{
 const selfTest=process.argv.includes('--self-test');
 if(!selfTest)updates=createWebUpdates({directory:path.join(process.env.LOCALAPPDATA||path.join(homedir(),'.cache'),'STAM','web')});
 const webBundle=await updates?.select();
 service=await startLogService({file:process.argv[2],port:selfTest?0:DEFAULT_LOG_PORT,webBundle,webUpdateStatus:()=>updates?.status(),positionStatus:()=>position});
 if(closing){await service.close();process.exit(0);}
 process.stdout.write(JSON.stringify({type:'ready',url:service.url})+'\n');
 // UI downloads are independent of log collection. Apply only at the next launch.
 void updates?.check();
}catch(e){process.stdout.write(JSON.stringify({type:'error',code:e.code==='EADDRINUSE'?'port-busy':'startup-failed'})+'\n');process.exit(1);}
