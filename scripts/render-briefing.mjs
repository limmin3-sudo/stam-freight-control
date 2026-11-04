import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import {once} from 'node:events';import {createServer} from 'node:http';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.STAM_PLAYWRIGHT_MODULE||'playwright');
const root=process.cwd(),out=resolve('assets/onboarding');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!p.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.jpg':'image/jpeg'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1');await once(server,'listening');
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.goto(`http://127.0.0.1:${server.address().port}/onboarding/film.html`);await page.waitForFunction(()=>typeof window.renderFrame==='function');await page.evaluate(()=>window.renderFrame(5));await page.screenshot({path:resolve(out,'poster.jpg'),type:'jpeg',quality:90});
 const audio=spawn('python3',['scripts/make-briefing-audio.py','/tmp/stam-briefing.wav'],{stdio:'inherit'});if((await once(audio,'close'))[0])throw Error('audio-failed');
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','12','-vcodec','mjpeg','-i','pipe:0','-i','/tmp/stam-briefing.wav','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-r','24','-c:a','aac','-b:a','160k','-movflags','+faststart','-shortest',resolve(out,'briefing.mp4')],{stdio:['pipe','inherit','inherit']});
 for(let frame=0;frame<66*12;frame++){await page.evaluate(t=>window.renderFrame(t),frame/12);const bytes=await page.screenshot({type:'jpeg',quality:88});if(!ff.stdin.write(bytes))await once(ff.stdin,'drain');if(frame%132===0)console.log(`Scene ${frame/132+1}/6 rendered`);}
 ff.stdin.end();if((await once(ff,'close'))[0])throw Error('video-failed');
 const captions=['계약은 게임에서. 항로와 적재는 STAM에서.','STAM.exe를 실행하고 Game.log를 선택해 주세요.','확인된 품목·수량·배송지를 연결합니다.','같은 배송지는 가까이. 미확인 상자 구성은 공간 가이드로 준비합니다.','파트너별 항로와 예상 이동을 확인해 주세요.','이용 안내를 확인한 뒤 실제 비행으로 검증합니다.'];
 const time=n=>`00:${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}.000`;
 await writeFile(resolve(out,'briefing-ko.vtt'),'WEBVTT\n\n'+captions.map((s,i)=>`${i+1}\n${time(i*11)} --> ${time((i+1)*11)}\n${s}\n`).join('\n'));console.log('Original 66-second briefing and score generated.');
}finally{await browser?.close();server.close();}
