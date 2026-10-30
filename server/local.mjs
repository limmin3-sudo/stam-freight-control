import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {handle} from './worker.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),port=Number(process.env.PORT||4173),localOrigin=`http://127.0.0.1:${port}`;
try{const env=await fs.readFile(path.join(root,'.env'),'utf8');for(const line of env.split(/\r?\n/)){const m=line.match(/^([A-Z_]+)\s*=\s*(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');}}catch{}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{const url=new URL(req.url,localOrigin);
  if(['/analyze','/health'].includes(url.pathname)){
   const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>22*1024*1024){res.writeHead(413);res.end('Too large');return;}chunks.push(c);}
   const request=new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
   const env={...process.env,ALLOWED_ORIGINS:process.env.ALLOWED_ORIGINS||`${localOrigin},http://localhost:${port}`};const response=await handle(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const rel=decodeURIComponent(url.pathname).replace(/^\/+/,'' )||'index.html';
  if(rel.split(/[\\/]/).some(p=>p.startsWith('.'))||/^(server|scripts|tests)(\/|\\|$)/.test(rel)||/^(package|wrangler)/.test(rel)){res.writeHead(404);res.end();return;}
  const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`STAM FREIGHT CONTROL · ${localOrigin}`));
