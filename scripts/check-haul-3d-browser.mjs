import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE ||
 '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_GUIDE_URL || 'http://127.0.0.1:5189/';
const out=process.env.STAM_QA_OUTPUT || '/tmp/stam-haul-3d';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',
 args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 page.setDefaultTimeout(45000);
 const errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin ? route.continue() : route.abort());
 await page.addInitScript(()=>{
   const proto=WebGL2RenderingContext.prototype,draw=proto.drawElements;
   proto.drawElements=function(...args){
     this.canvas.testDraws=(this.canvas.testDraws??0)+1;
     return draw.apply(this,args);
   };
 });
 const button=name=>page.getByRole('button',{name,exact:true});
 const snapshot=()=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 for(const [partner,motion] of [['operator','reduce'],['navigator','reduce'],['navigator','no-preference']]){
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.goto(base+'#/guide?lang=ko');
   await page.locator('#stage[data-state=arrived]:not(.closed)').waitFor();
   await button('운송 튜토리얼').click();
   const before=await snapshot();
   await button('운송 연습 시작').click();
   const dialog=page.locator('.guide-journey[data-topic=practice]'),next=button('다음 →');
   await next.click();
   await dialog.getByRole('combobox').selectOption(partner);
   await next.click();
   await button('예시 계약 불러오기').click();
   await button('6계약 모두 선택').click();
   assert.match(await dialog.locator('.guide-practice-toolbar').innerText(),/6 \/ 6 · 363 \/ 363 SCU/);
   await next.click();
   // Hold a real planet texture until the camera settles to test late GPU updates.
   let held;
   const texture='**/assets/hurston-*.png';
   await page.route(texture,route=>{held=route;});
   await button('경로 계산').click();
   const chart=dialog.locator('.navigation-chart[data-ready=true]'),canvas=chart.locator('canvas');
   await canvas.waitFor();
   const renderer=await canvas.evaluate(el=>{
     const gl=el.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
     return gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER);
   });
   const count=()=>canvas.evaluate(el=>el.testDraws??0);
   async function rest(){
     await chart.locator('canvas[data-settled=true]').waitFor();
     for(let i=0;i<40;i++){
       const n=await count();
       await page.waitForTimeout(400);
       if(n>0&&n===await count())return n;
     }
     throw Error('Settled chart continued drawing');
   }
   const waitDraw=n=>page.waitForFunction(previous=>document.querySelector('.navigation-chart canvas').testDraws>previous,n);
   let n=await rest();
   assert(held,'Expected a deferred planet texture');
   await held.continue();
   await page.unroute(texture);
   await waitDraw(n);
   const view=await canvas.getAttribute('data-view');
   await canvas.hover();await page.mouse.wheel(0,-160);
   await page.waitForFunction(old=>document.querySelector('.navigation-chart canvas').dataset.view!==old,view);
   n=await rest();
   await page.emulateMedia({reducedMotion:'no-preference'});await waitDraw(n);
   await page.emulateMedia({reducedMotion:'reduce'});await rest();
   await page.emulateMedia({reducedMotion:motion});
   await next.click();await button('연습 운항 시작').click();
   const stops=dialog.locator('.guide-practice-stops');
   await page.evaluate(()=>{
     window.haulCommits=[];
     const section=document.querySelector('.guide-practice-stops');
     section.addEventListener('click',event=>{
       if(!event.target.closest('.guide-practice-progress button'))return;
       const start=performance.now();
       const observer=new MutationObserver(()=>{
         observer.disconnect();window.haulCommits.push(Math.round(performance.now()-start));
       });
       observer.observe(section,{childList:true,subtree:true,characterData:true,attributes:true});
     },true);
   });
   let picked=0,delivered=0,visits=0,jumps=0;
   const jumpMs=[];
   while(!await dialog.getByText('모든 연습 작업 완료',{exact:true}).isVisible()){
     assert(visits+jumps<80,'Practice did not advance');
     const jump=button('점프 완료 연습');
     if(await jump.isVisible()){
       const start=performance.now();await jump.click();
       jumpMs.push(Math.round(performance.now()-start));jumps++;continue;
     }
     for(const item of await stops.locator('li').allTextContents()){
       const match=/^(픽업|배송) · (\d+) SCU$/.exec(item);
       if(match?.[1]==='픽업')picked+=Number(match[2]);
       if(match?.[1]==='배송')delivered+=Number(match[2]);
     }
     if(visits===1){
       assert.match(await chart.locator('.map-route-readout').innerText(),/02\s*\//);
       await chart.screenshot({path:join(out,partner+'-'+motion+'-map.png')});
     }
     await button('현재 작업 완료 연습').click();visits++;
     assert(await canvas.evaluate(el=>!el.getContext('webgl2').isContextLost()));
   }
   assert.equal(picked,363);assert.equal(delivered,363);
   assert.equal(jumps,partner==='navigator'?1:15);
   const commitMs=await page.evaluate(()=>window.haulCommits);
   assert.equal(commitMs.length,visits+jumps);
   await next.click();await dialog.getByRole('heading',{name:'연습 완료',exact:true}).waitFor();
   await button('안내 종료').click();
   assert.deepEqual(await snapshot(),before);
   await page.goto('about:blank');
   checks.push({partner,motion,renderer,picked,delivered,visits,jumps,jumpMs,commitMs});
   console.log(partner,motion,visits,jumps,'complete');
 }
 assert.deepEqual(errors,[]);
 await writeFile(join(out,'verification.json'),JSON.stringify({checks,errors,viewport:[1440,900]},null,2)+'\n');
}finally{await browser.close();}
