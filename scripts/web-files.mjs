import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export const root=fileURLToPath(new URL('../',import.meta.url));
export const WEB_CLIENTS=['integration/log/live-client.mjs','integration/log/locations.mjs','integration/inbox-core.mjs','integration/inbox-view.mjs','integration/inbox.css'];
export const mime=name=>name==='LICENSE'?'text/plain':({'html':'text/html; charset=utf-8','mjs':'text/javascript','js':'text/javascript','css':'text/css','json':'application/json','png':'image/png','jpg':'image/jpeg','svg':'image/svg+xml','txt':'text/plain','md':'text/plain','webp':'image/webp','woff2':'font/woff2'})[name.split('.').pop()];
export async function webFiles(){
 const files=['LICENSE','THIRD-PARTY-NOTICES.md',...(await readdir(root)).filter(n=>/\.(mjs|css|html|svg)$/.test(n)&&!n.startsWith('.'))];
 async function walk(dir){for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){const n=dir+'/'+entry.name;if(entry.isDirectory()){if(n==='vendor/screen')continue;await walk(n);}else if(mime(n))files.push(n);}}
 for(const dir of ['assets','data','vendor'])await walk(dir);
 return [...new Set([...files,...WEB_CLIENTS])].sort();
}
