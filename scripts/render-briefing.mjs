import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import {once} from 'node:events';import {createServer} from 'node:http';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const root=process.cwd(),out=resolve('assets/onboarding');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!p.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.jpg':'image/jpeg'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1');await once(server,'listening');
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],headless:true});const page=await browser.newPage({viewport:{width:1920,height:1080}});
 await page.goto(`http://127.0.0.1:${server.address().port}/onboarding/film.html`);await page.waitForFunction(()=>typeof window.renderFrame==='function');await page.evaluate(()=>window.renderFrame(3));await page.screenshot({path:resolve(out,'poster.jpg'),type:'jpeg',quality:90});
 const audio=spawn('python3',['scripts/make-briefing-audio.py','/tmp/stam-briefing.wav'],{stdio:'inherit'});if((await once(audio,'close'))[0])throw Error('audio-failed');
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-i','/tmp/stam-briefing.wav','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-r','30','-af','loudnorm=I=-16:TP=-1.5:LRA=9','-c:a','aac','-b:a','256k','-movflags','+faststart','-shortest',resolve(out,'briefing.mp4')],{stdio:['pipe','inherit','inherit']});
 for(let frame=0;frame<24*30;frame++){await page.evaluate(t=>window.renderFrame(t),frame/30);const bytes=await page.screenshot({type:'jpeg',quality:95});if(!ff.stdin.write(bytes))await once(ff.stdin,'drain');if(frame%150===0)console.log(`Scene ${frame/150+1}/5 rendered`);}
 ff.stdin.end();if((await once(ff,'close'))[0])throw Error('video-failed');
 const captions=[['00:00:00.000','00:00:05.500','수락한 계약에 맞춰 항로를 준비합니다.'],['00:00:05.500','00:00:10.500','픽업부터 배송까지, 방문 순서를 정리하세요.'],['00:00:10.500','00:00:15.500','같은 배송지의 화물은 가까이 배치하세요.'],['00:00:15.500','00:00:19.500','항로와 적재 상태를 한눈에 확인하세요.'],['00:00:19.500','00:00:24.000','출항 준비 완료. 운송을 시작하세요.']];
 await writeFile(resolve(out,'briefing-ko.vtt'),'WEBVTT\n\n'+captions.map(([a,b,s],i)=>`${i+1}\n${a} --> ${b}\n${s}\n`).join('\n'));console.log('Original 24-second 1080p briefing and score generated.');
}finally{await browser?.close();server.close();}
