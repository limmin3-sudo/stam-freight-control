import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const base='https://limmin3-sudo.github.io/stam-freight-control/',sha=process.env.STAM_RELEASE_SHA;
const out='/workspace/stam-freight-control-fresh-20261108/docs/release-310-20261117';
await mkdir(out+'/runtime-review',{recursive:true});
assert.match(sha??'',/^[a-f0-9]{40}$/);
const response=await fetch(base+'version.json?release='+sha);assert(response.ok);const version=await response.json();
assert.equal(version.version,sha);assert.equal(version.releases[0].version,'3.1.0');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const checks=['Public version.json matches release commit and beta 3.1.0'],errors=[],failed=[],cache=new Map();let p;
try {
 const c=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
 // The managed Chromium lacks the network proxy CA. Fetch real public responses
 // through Node's verified HTTPS proxy transport, retaining original URLs/origin.
 await c.route('https://**/*',async route=>{
  const req=route.request(),url=req.url();
  if(!url.startsWith(base)){await route.abort();return;}
  try {
   let item=cache.get(url);
   if(!item){const r=await fetch(url);const headers=Object.fromEntries(r.headers);for(const k of ['content-encoding','content-length','transfer-encoding'])delete headers[k];item={status:r.status,headers,body:Buffer.from(await r.arrayBuffer())};cache.set(url,item);if(!r.ok)failed.push({url,status:r.status});}
   await route.fulfill(item);
  }catch(e){failed.push({url,error:e.message});await route.abort();}
 });
 p=await c.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));
 const go=async(hash,selector)=>{await p.goto(base+'?release='+sha+hash,{waitUntil:'domcontentloaded'});await p.locator(selector).first().waitFor();await p.evaluate(()=>document.fonts.ready);assert.equal(await p.locator('meta[name=app-version]').getAttribute('content'),sha);};
 await go('','.division-hub');assert.equal(await p.locator('.division-facility').count(),4);await p.screenshot({path:out+'/runtime-review/division-public.png'});checks.push('Default entry opens division with four destinations and approved assets');
 assert.match(await p.locator('.space-download').getAttribute('href'),/releases\/download\/app\.1\.5\.0\/STAM-app\.1\.5\.0-setup-win-x64\.exe$/);checks.push('Top app download points to verified public companion 1.5 installer');
 await go('#/division?lang=ko&facility=trade','.facility-lobby');await p.waitForFunction(()=>document.querySelector('.lobby-plate')?.naturalWidth>0);assert.equal(await p.locator('.lobby-place').count(),3);await p.screenshot({path:out+'/runtime-review/trade-lobby-public.png'});checks.push('Trade lobby loads approved background and three room links');
 await p.locator('[data-place=trade-operations]').click();await p.locator('.trade-price-console').waitFor();await p.locator('.control-goods select').selectOption('25');await p.locator('.control-price-select').first().waitFor();assert.equal(await p.locator('.trade-map-canvas,.trade-cargo-view').count(),0);assert.equal(await p.locator('.space-sidebar').count(),1);await p.screenshot({path:out+'/runtime-review/trade-control-public.png'});checks.push('Lobby opens price-first trade monitor and current published prices render after choosing Everus Harbor; no map/cargo 3D mounted');
 await p.getByRole('button',{name:'함대',exact:true}).click();await p.locator('.crew-trade').waitFor();await p.getByText('상단 계정 메뉴에서 로그인한 뒤 공동 교역을 사용할 수 있습니다.',{exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'함대·모집 찾기',exact:true}).count(),0);assert.equal(await p.getByRole('button',{name:'모집·권한',exact:true}).count(),0);await p.screenshot({path:out+'/runtime-review/fleet-public.png'});await p.getByRole('button',{name:'개인',exact:true}).click();await p.locator('.trade-price-console').waitFor();checks.push('Personal/fleet switch and existing sign-in entry available; cancelled recruitment and delegation controls absent');
 await go('#/division?lang=ko&facility=trade&room=market','.market-room');await p.locator('.market-tabs').waitFor();checks.push('Market reference room opens');
 await go('#/division?lang=ko&facility=guide-center','.facility-lobby');await p.waitForFunction(()=>document.querySelector('.lobby-plate')?.naturalWidth>0);assert.equal(await p.locator('.lobby-place').count(),3);
 await p.locator('[data-place=education]').click();await p.locator('.academy-room .market-tabs').waitFor();await p.screenshot({path:out+'/runtime-review/academy-public.png'});checks.push('Academy lobby and education room load with shared monitor');
 await p.getByText('함장·함대원은 무엇을 맡을까?',{exact:true}).click();assert((await p.locator('.academy-lessons').innerText()).includes('초대 코드'));assert(!(await p.locator('.academy-lessons').innerText()).includes('오피서'));checks.push('Academy lesson describes invitation and captain approval, not cancelled delegation');
 await go('#/division?lang=ko&facility=guide-center&room=freight-information','.freight-reference-cards');checks.push('Academy freight references load');
 await go('#/lounge?lang=ko','.space-background');await p.waitForFunction(()=>document.querySelector('.space-background')?.naturalWidth>0);checks.push('Existing lounge route and background remain available');
 await p.setViewportSize({width:390,height:844});await go('#/division?lang=en&facility=trade&room=trade-operations','.trade-price-console');await p.locator('.control-goods select').selectOption('25');await p.locator('.control-price-select').first().waitFor();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.locator('.control-price-scroll').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/runtime-review/trade-mobile-public.png'});checks.push('English 390px trade control fits without horizontal overflow');
 const legacy=await fetch(base+'flight.html?release='+sha);assert(legacy.ok);assert((await legacy.text()).includes(sha));checks.push('Preserved legacy flight entry carries same release SHA');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 const result={passed:true,checkedAt:new Date().toISOString(),sha,url:base,version:'3.1.0',checks,errors,failed,publicRequests:cache.size,transport:'Public responses over verified Node HTTPS proxy, original browser origins preserved; external authentication not exercised',workflow:process.env.STAM_RELEASE_WORKFLOW};
 await writeFile(out+'/deployment-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(e){await p?.screenshot({path:out+'/runtime-review/failure.png'});console.log(JSON.stringify({errors,failed}));throw e;}finally{await browser.close();}
