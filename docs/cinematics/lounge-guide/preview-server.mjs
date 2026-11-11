import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const assets=new Map([
  ['/guide-cutout-review.html',['guide-cutout-review.html','text/html; charset=utf-8']],
  ['/guide-original-cutout.png',['../guide-replacements-20261111/originals/01-grok-fullbody.png','image/png']],
  ['/guide-matte-candidate.png',['../guide-replacements-20261111/prepared/director-standing-matte-candidate.png','image/png']],
  ['/guide-start-capture.html',['guide-start-capture.html','text/html; charset=utf-8']],
  ['/lounge-original-source.png',['../../../apps/control-room/src/assets/lounge-original-composite.png','image/png']],
  ['/director-standing-source.png',['../../../apps/control-room/src/assets/director-standing.png','image/png']],
  ['/motion-preview.html',['motion-preview-v2.html','text/html; charset=utf-8']],
  ['/motion-preview-v2.html',['motion-preview-v2.html','text/html; charset=utf-8']],
  ['/motion-preview-v1.html',['motion-preview.html','text/html; charset=utf-8']],
  ['/suit.woff2',['../../../apps/control-room/src/assets/fonts/SUIT-Variable.woff2','font/woff2']],
  ['/lounge-guide-end-v1.png',['lounge-guide-end-v1.png','image/png']],
]);
createServer(async(req,res)=>{
  const asset=assets.get(new URL(req.url,'http://127.0.0.1').pathname);
  if(!asset){res.writeHead(404);res.end();return;}
  try{const bytes=await readFile(fileURLToPath(new URL(asset[0],import.meta.url)));res.writeHead(200,{'Content-Type':asset[1],'Cache-Control':'no-store'});res.end(bytes);}
  catch{res.writeHead(500);res.end();}
}).listen(5186,'127.0.0.1',()=>console.log('STAM motion preview: http://127.0.0.1:5186/motion-preview.html'));
