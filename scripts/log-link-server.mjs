import {startLogService} from '../integration/log/live-server.mjs';
export const DEFAULT_LOG_PORT=23458;
if(process.argv[1]?.endsWith('log-link-server.mjs')){const s=await startLogService({file:process.argv[2],port:DEFAULT_LOG_PORT});console.log(s.url);}
