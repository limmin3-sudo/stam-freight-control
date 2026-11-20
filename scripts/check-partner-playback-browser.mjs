import assert from 'node:assert/strict';
const {chromium}=await import(process.env.STAM_PLAYWRIGHT_MODULE || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');

const base = process.env.STAM_NATIVE_URL ?? 'http://127.0.0.1:5290/site/';
const browser = await chromium.launch({executablePath:process.env.STAM_CHROMIUM ?? '/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
try {
  const page = await browser.newPage({viewport:{width:1440,height:960}});
  await page.addInitScript(()=>sessionStorage.setItem('stam:director-opening:v1','1'));
  const errors = [];
  page.on('pageerror', error=>errors.push(error.message));
  const mediaErrors = [];
  page.on('response',r=>{if(r.url().includes('/partner-dialogue/')&&r.status()>=400)mediaErrors.push(r.url());});
  await page.route(/^https:\/\//,route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  const open = hash=>page.goto(base+hash,{waitUntil:'domcontentloaded'});
  const dialog = page.locator('.crew-encounter');
  async function transition(id,phase) {
    const video = dialog.locator('video.crew-transition');
    await page.waitForFunction(({id,phase})=>{
      const v=document.querySelector('.crew-transition');
      return v?.currentSrc.endsWith('/'+id+'/'+phase+'.mp4') && !v.paused && v.currentTime>0;
    },{id,phase},{timeout:30000});
    assert.equal(await dialog.locator('.partner-conversation').count(),0);
    await video.evaluate(v=>{v.playbackRate=5;});
  }
  const places = [
    ['director','lounge'],['operator','bridge'],['navigator','bridge'],
    ['senior-trade-officer','division?facility=trade'],['ling-broker','division?facility=trade'],
    ['academic-advisor','division?facility=guide-center'],
  ];
  for (const [id,place] of places) {
    await open('#/'+place);
    if(id==='operator'){
      const choice=page.locator('.partner-options button').first();
      await choice.or(page.locator('.partner-hit[data-partner="operator"]')).first().waitFor();
      if(await choice.isVisible())await choice.click();
    }
    const trigger = page.locator('.partner-hit[data-partner="'+id+'"],[data-staff="'+id+'"]');
    await trigger.click();
    await transition(id,'approach');
    await dialog.locator('.partner-conversation').waitFor();
    if(id==='director'){
      await page.waitForFunction(()=>{const v=document.querySelector('video.crew-idle');return v?.muted&&v.loop&&!v.paused&&v.currentTime>0;});
    } else {
      assert.deepEqual(await dialog.locator('.crew-idle').evaluate(img=>[img.naturalWidth,img.naturalHeight,img.currentSrc.split('/').slice(-2).join('/')]),[1664,936,id+'/idle.png']);
    }
    await dialog.locator('.crew-encounter-close').click();
    await transition(id,'return');
    await dialog.waitFor({state:'detached'});
    await page.waitForFunction(el=>document.activeElement===el,await trigger.elementHandle());
    console.log(id,'played approach, idle and return; focus restored');
  }
  await open('#/lounge?lang=en');
  await page.locator('.partner-hit[data-partner=director]').click();
  await transition('director','approach');
  await dialog.getByRole('button',{name:'Facility tour'}).waitFor();
  const returns=[];
  page.on('request',request=>{
    if(request.url().endsWith('/director/return.mp4'))returns.push(request.url());
  });
  await page.evaluate(()=>{
    window.visitEntryRooms=[];
    const record=()=>{
      const room=document.querySelector('.visit-room-entry')?.dataset.room;
      if(room&&window.visitEntryRooms.at(-1)!==room)window.visitEntryRooms.push(room);
    };
    new MutationObserver(record).observe(document.body,{childList:true,subtree:true});
  });
  await dialog.getByRole('button',{name:'Facility tour'}).click();
  await page.locator('.visit-room-entry[data-room=cinema]').waitFor({timeout:3000});
  assert.deepEqual(returns,[]);
  assert(await page.locator('.visit-next').isDisabled());
  await page.keyboard.press('Enter');
  assert.match(await page.locator('.visit-speech p').innerText(),/cinema/i);
  let previousLine="";
  const expectedEntries=[];
  for(const rooms of [
    ['cinema','information','service',null,null],
    [null,null,'mission','map','operations'],
    [null,null,'market',null,'trade-operations'],
    [null,'freight-information','education','operations-study',null],
  ]){
    for(const room of rooms){
      if(room)expectedEntries.push(room);
      // Observe transient door animations independently of Playwright's click timing.
      const next=await page.waitForFunction(previous=>{
        const line=document.querySelector('.visit-speech p')?.textContent;
        const button=document.querySelector('.visit-next:enabled');
        if(!button||!line||line===previous)return false;
        button.click();
        return line;
      },previousLine);
      previousLine=await next.jsonValue();
      await next.dispose();
    }
    if(rooms[0]==='cinema'){
      const shuttle=page.locator('.shuttle-boarding');
      await shuttle.waitFor();
      await page.waitForFunction(()=>document.querySelector('.shuttle-boarding video')?.currentTime>0);
      await shuttle.locator('video').evaluate(video=>{video.playbackRate=5;});
      await shuttle.waitFor({state:'detached'});
    }
    await page.locator('.visit-travel').waitFor({state:'detached'});
  }
  await page.waitForURL(/#\/division/);
  assert.deepEqual(await page.evaluate(()=>window.visitEntryRooms),expectedEntries);
  await page.emulateMedia({reducedMotion:'reduce'});
  await open('#/lounge?lang=en');
  await page.locator('.partner-hit[data-partner=director]').click();
  await dialog.locator('.partner-conversation').waitFor();
  assert.match(await dialog.locator('img.crew-idle').getAttribute('src'),/02-approach-end/);
  assert.equal(await dialog.locator('video').count(),0);
  await dialog.getByRole('button',{name:'Facility tour'}).click();
  const scenes=new Set();
  for(let stop=0;stop<4;stop++){
    for(let line=0;line<5;line++){
      await page.waitForFunction(index=>document.querySelector('.visit-marker span')?.textContent.startsWith('0'+index),stop+1);
      const picture=page.locator('.visit-picture');
      scenes.add(await picture.evaluate(el=>el.dataset.loungeView||el.querySelector('.visit-plate').src));
      const speech=await page.locator('.visit-speech p').innerText();
      await page.locator('.visit-next').click();
      if(line<4)await page.waitForFunction(last=>document.querySelector('.visit-speech p')?.textContent!==last,speech);
    }
  }
  assert.equal(scenes.size,18);
  await page.waitForURL(/#\/division/);
  assert.equal(await page.locator('.space-topbar').count(),1);
  assert.equal(await page.locator('.space-sidebar').count(),1);
  assert.deepEqual(errors,[]);
  assert.deepEqual(mediaErrors,[]);
  console.log('Reduced motion, desk, four-stop tour, 20 lines from the desk, 18 scenes, return to facility map');
} finally { await browser.close(); }
