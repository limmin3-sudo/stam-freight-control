import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';

const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const preview='/docs/cinematics/lounge-tour-20261114/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.json':'application/json','.mp4':'video/mp4','.webm':'video/webm'};
createServer(async(req,res)=>{
 try{
  let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path==='/'){res.writeHead(302,{Location:preview+'index.html'}).end();return;}
  if(path.startsWith('/live/'))path='/apps/control-room/dist/'+path.slice(6);
  if(!/^\/(docs|apps|assets)\//.test(path)){res.writeHead(404).end();return;}
  let file=resolve(root,'.'+path);
  if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  let info=await stat(file);if(info.isDirectory()){file=resolve(file,'index.html');info=await stat(file);}
  const headers={'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),info.size-1):info.size-1;if(start>end||start>=info.size){res.writeHead(416).end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${info.size}`,'Content-Length':end-start+1});createReadStream(file,{start,end}).pipe(res);}
  else{res.writeHead(200,{...headers,'Content-Length':info.size});createReadStream(file).pipe(res);}
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('미리보기 파일을 찾지 못했습니다. 실제 메뉴를 보려면 앱 빌드를 먼저 실행해 주세요.');}
}).listen(Number(process.env.STAM_TOUR_PORT||5197),'0.0.0.0',()=>console.log('STAM full lounge tour: http://127.0.0.1:5197/'));
