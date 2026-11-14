import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {chooseInitialPartner} from './browser-partner-choice.mjs';
import {locationDataFor} from '../apps/control-room/src/personal-locations.mjs';
import {LOCATION_KEY} from '../locations.mjs';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5188/',key='stam.control-room.flight.v1',out=process.env.STAM_QA_OUTPUT||'/tmp/stam-personal-locations';await mkdir(out,{recursive:true});
const harbor=locationDataFor().locations.find(p=>p.name==='Everus Harbor');
const depot={id:'custom:qa-depot',name:'QA Freight Depot',system:'stanton',type:'Manmade',position:harbor.position.map((n,i)=>n+(i===0?100000:0)),aliases:['개인화물기지'],parentId:harbor.parentId,qt:true,updatedAt:'2026-11-13'};
const draft={...depot,id:'custom:qa-draft',name:'Unverified Depot',aliases:['미확인기지'],position:null};
const payload=JSON.stringify({format:'sfc-locations-v1',locations:[depot,draft]});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const errors=[];
 const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({k,payload})=>{if(!sessionStorage.getItem('qa-init')){localStorage.setItem(k,payload);sessionStorage.setItem('qa-init','1');}localStorage.setItem('vh-map-quality','normal');},{k:LOCATION_KEY,payload});
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const nav=async screen=>{await page.evaluate(screen=>location.hash='#/'+screen+'?lang=ko',screen);};
 await page.goto(base+'#/mission?lang=ko');await chooseInitialPartner(page,'navigator');
 await page.getByRole('button',{name:'+ 직접 입력',exact:true}).click();
 const form=page.locator('.manifest-editor');await form.getByLabel('계약명',{exact:true}).fill('개인 기지 배송');await form.getByLabel('화물명',{exact:true}).fill('Ore');await form.getByLabel('SCU',{exact:true}).fill('4');
 const pickup=form.getByRole('combobox',{name:'픽업',exact:true});await pickup.fill('Lorville');await form.getByRole('option').first().click();
 const delivery=form.getByRole('combobox',{name:'배송',exact:true});await delivery.fill('미확인기지');assert.equal(await form.getByRole('option').filter({hasText:'미확인기지'}).count(),0);
 await delivery.fill('개인화물기지');await form.getByRole('option').filter({hasText:'개인화물기지'}).click();await form.getByRole('button',{name:'계약 저장',exact:true}).click();
 assert.equal((await saved()).draft.jobs[0].shipments[0].to,depot.id);assert.equal(await page.evaluate(k=>localStorage.getItem(k),LOCATION_KEY),payload);
 await page.locator('.dispatch-launch').click();await page.waitForFunction(k=>!!JSON.parse(localStorage.getItem(k))?.plan,key);
 let planned=await saved();assert.deepEqual(planned.plan.points.find(p=>p.id===depot.id).position,depot.position);
 // Changes in the legacy store need an explicit preparation action; contracts remain.
 const changed={...depot,position:depot.position.map((n,i)=>n+(i===1?1000:0)),aliases:['수정화물기지']};
 await page.evaluate(({k,changed,draft})=>{localStorage.setItem(k,JSON.stringify({format:'sfc-locations-v1',locations:[changed,draft]}));dispatchEvent(new Event('focus'));},{k:LOCATION_KEY,changed,draft});
 await nav('mission');await page.getByRole('button',{name:'운항 준비에 적용 · 경로 재계산 필요',exact:true}).click();
 assert.equal((await saved()).plan,null);assert.deepEqual((await saved()).draft.jobs,planned.draft.jobs);
 await page.locator('.dispatch-launch').click();await page.waitForFunction(k=>!!JSON.parse(localStorage.getItem(k))?.plan,key);planned=await saved();assert.deepEqual(planned.plan.points.find(p=>p.id===depot.id).position,changed.position);
 await nav('map');await page.locator('.navigation-chart[data-ready=true]').waitFor();
 await page.locator('.chart-explore-toggle').click();const search=page.locator('.port-search input').first();await search.fill('수정화물기지');await page.getByRole('option').filter({hasText:'수정화물기지'}).click();
 await page.screenshot({path:out+'/personal-map-desktop.png'});
 await nav('operations');await page.getByRole('button',{name:'운항 시작',exact:true}).click();
 for(let i=0;i<8&&!(await saved()).run.aboard.length;i++)await page.locator('.flight-actions .manifest-primary').click();
 const loaded=await saved();assert(loaded.run.aboard.length>0);
 await page.evaluate(k=>{localStorage.setItem(k,JSON.stringify({format:'sfc-locations-v1',locations:[]}));dispatchEvent(new Event('focus'));},LOCATION_KEY);
 await page.reload();await page.locator('.ops-live-cargo .cargo-render-surface[data-ready=true]').waitFor();assert.deepEqual((await saved()).run,loaded.run);assert.deepEqual((await saved()).draft.locationEdits,loaded.draft.locationEdits);
 await nav('mission');assert.equal(await page.getByRole('button',{name:'운항 준비에 적용 · 경로 재계산 필요',exact:true}).count(),0);
 await nav('operations');await page.locator('.flight-backup summary').click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'운항 백업 저장',exact:true}).click();const file=await download,text=await readFile(await file.path(),'utf8');
 // Fresh profile has no personal-location key; the full-flight backup carries its own snapshot.
 const restored=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});restored.on('pageerror',e=>errors.push(e.message));await restored.goto(base+'#/mission?lang=ko');await chooseInitialPartner(restored,'navigator');
 await restored.locator('.flight-backup summary').click();await restored.locator('.flight-backup input').setInputFiles({name:'personal-flight.json',mimeType:'application/json',buffer:Buffer.from(text)});
 await restored.getByRole('button',{name:'이 백업으로 복원',exact:true}).click();await restored.waitForFunction(k=>!!JSON.parse(localStorage.getItem(k))?.run?.started,key);
 assert.equal(await restored.evaluate(k=>localStorage.getItem(k),LOCATION_KEY),null);
 assert.deepEqual(await restored.evaluate(k=>JSON.parse(localStorage.getItem(k)).run.aboard,key),loaded.run.aboard);
 await restored.screenshot({path:out+'/personal-backup-mobile.png'});assert(await restored.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await restored.close();
 // Corrupt legacy bytes are retained and cannot silently create a new route.
 const invalid=await browser.newPage();invalid.on('pageerror',e=>errors.push(e.message));await invalid.addInitScript(k=>localStorage.setItem(k,'{'),LOCATION_KEY);await invalid.goto(base+'#/mission?lang=ko');await chooseInitialPartner(invalid,'navigator');
 await invalid.getByRole('alert').filter({hasText:'개인 장소를 읽지 못했습니다'}).waitFor();assert.equal(await invalid.evaluate(k=>localStorage.getItem(k),LOCATION_KEY),'{');await invalid.close();
 assert.deepEqual(errors,[]);const report={passed:true,checks:['legacy data unchanged','manual alias selection uses canonical custom ID','coordinate-less place excluded','real planner Worker uses personal coordinates','explicit refresh retains contracts and invalidates stale plan','3D map searches and focuses personal place','active flight snapshot survives later deletion and reload','full-flight backup restores into fresh profile without legacy storage','390px layout','corrupt source remains unchanged and blocks planning'],pageErrors:errors};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await browser.close();}
