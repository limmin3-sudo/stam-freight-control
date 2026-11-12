import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_SIDEBAR_URL||'http://127.0.0.1:5186/';
const output=process.env.STAM_QA_OUTPUT||'/tmp/stam-sidebar-review';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('stam:director-opening:v1','1'));
 await page.goto(base+'#/lounge?lang=ko');await page.locator('.space-background').evaluate(i=>i.decode());await page.evaluate(()=>document.fonts.ready);
 const before=await page.evaluate(()=>({...localStorage}));
 const group=id=>page.locator(`.space-group-button[href*="/${id}"]`);
 const settled=()=>page.waitForTimeout(650);
 async function layout(){
  const rail=await page.locator('.space-sidebar').boundingBox(),art=await page.locator('.space-artwork').boundingBox();
  assert(rail.x+rail.width<=art.x+.5,'Sidebar is outside scene');
  assert(Math.abs(art.width/art.height-1672/941)<.002,'Scene ratio preserved');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
  assert.equal(await page.locator('.space-artwork .space-intro,.space-topbar .space-switch,.space-topbar .control-mode-link').count(),0);
 }
 await layout();await page.screenshot({path:output+'/lounge-1920.png'});
 // Closing/reopening the current group must move the next major button, not cover it.
 const expandedY=(await group('bridge').boundingBox()).y;
 await group('lounge').click();await settled();
 const closedY=(await group('bridge').boundingBox()).y;assert(expandedY-closedY>200);
 assert.equal(await group('lounge').getAttribute('aria-expanded'),'false');
 assert.equal(await page.locator('#space-links-lounge').evaluate(el=>el.inert),true);
 await group('lounge').click();await settled();assert(Math.abs((await group('bridge').boundingBox()).y-expandedY)<2);
 await group('bridge').click();await page.waitForURL(/#\/bridge/);await settled();
 assert.equal(await group('bridge').getAttribute('aria-expanded'),'true');
 assert.equal(await group('lounge').getAttribute('aria-expanded'),'false');
 await page.locator('.space-background').evaluate(i=>i.decode());await layout();await page.screenshot({path:output+'/bridge-1920.png'});
 await page.goBack();await page.waitForURL(/#\/lounge/);await settled();assert.equal(await group('lounge').getAttribute('aria-expanded'),'true');
 // Child selection retains its parent, locale and browser history.
 await page.locator('.space-nav-links a[href*="information"]').click();await page.waitForURL(/#\/information/);await settled();
 assert.equal(await page.locator('.space-nav-links a[aria-current=page]').textContent(),'03정보실›');
 await page.getByRole('combobox',{name:'표시 언어',exact:true}).selectOption('en');assert.match(await group('lounge').innerText(),/Lounge/);
 await group('bridge').click();await page.waitForURL(/#\/bridge\?lang=en/);await settled();await layout();
 await page.setViewportSize({width:1366,height:768});await layout();await page.screenshot({path:output+'/bridge-1366.png'});
 await page.setViewportSize({width:390,height:844});await settled();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const toggle=page.getByRole('button',{name:'Spaces',exact:true});
 assert.equal(await page.locator('.space-nav-links a[href*=mission]').isVisible(),false,'Closed mobile navigation is not focusable');
 await toggle.click();await settled();assert(await group('bridge').isVisible());
 const mobile=await group('bridge').boundingBox();assert(mobile.x>=0&&mobile.x+mobile.width<=390&&mobile.y<650);
 await page.screenshot({path:output+'/mobile-menu.png'});
 await page.keyboard.press('Escape');await settled();assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert(await toggle.evaluate(el=>el===document.activeElement));
 await toggle.click();await settled();await group('lounge').click();await page.waitForURL(/#\/lounge\?lang=en/);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 await page.screenshot({path:output+'/mobile-scene.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await toggle.click();assert.equal(await page.locator('.space-group-reveal').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 assert.deepEqual(await page.evaluate(()=>({...localStorage})),before,'Navigation does not rewrite contracts or flight state');
 assert.deepEqual(errors,[]);console.log('PASS: external 16:9 sidebar, expanding group pushes later headers, collapse/inert, space/child/history/locale navigation, mobile drawer/Escape, reduced motion, storage preservation');
}finally{await browser.close();}
