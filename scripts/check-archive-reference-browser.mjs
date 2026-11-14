import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {intelRecords,filterIntel} from '../intel-model.mjs';
import {emptyDraft,samples} from '../apps/control-room/src/mission-trial.ts';
import {archiveReference,referenceValue} from '../apps/control-room/src/archive-reference.mjs';
const load=async name=>JSON.parse(await readFile(new URL('../data/'+name+'.json',import.meta.url),'utf8'));
const [db,index,details]=await Promise.all(['hauling-missions','log-mission-index','mission-details'].map(load));
const records=filterIntel(intelRecords(db,index,details)),different=records.find(r=>r.info?.differences?.shareable),group=records.find(r=>r.ids.length>1);
assert(different&&group);
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const base=process.env.STAM_MISSION_URL||'http://127.0.0.1:5188/',out=process.env.STAM_QA_OUTPUT||'/tmp/stam-archive-reference';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 const job={...samples[0],title:[different.title,different.title],pay:12345,shipments:samples[0].shipments.map(row=>({...row,scu:22}))};
 await page.addInitScript(value=>localStorage.setItem('stam.control-room.flight.v1',JSON.stringify(value)),{version:1,draft:{...emptyDraft(),partnerSelected:true,jobs:[job]},plan:null,run:null});
 await page.goto(base+'#/information?lang=ko&view=missions');await page.waitForSelector('.archive-card');
 const saved=await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1'));
 assert.equal(await page.locator('.archive-reference-fields').count(),0,'closed details do not mount all reference fields');
 async function open(record){
  await page.locator('.archive-search input').fill(record.title);
  const card=page.locator(`.archive-card[data-definition="${record.id}"]`);
  while(!await card.count()){const more=page.locator('.archive-more');assert(await more.count(),'target must be in filtered data');await more.click();}
  if(!await card.locator('.archive-reference').evaluate(n=>n.open))await card.locator('.archive-reference>summary').click();await card.locator('.archive-reference-fields').waitFor();return card;
 }
 const card=await open(different),expected=archiveReference(details,different.id);
 const share=card.locator('[data-field=shareable]');assert.equal(await share.getAttribute('data-status'),'preferred');
 assert.equal(await share.locator('.archive-reference-value').innerText(),referenceValue('shareable',different.info.values.shareable));
 for(const field of expected.fields){
  const row=card.locator(`[data-field="${field.key}"]`);assert.equal(await row.locator('.archive-reference-value').textContent(),referenceValue(field.key,field.value));
  assert.equal(await row.locator('.archive-variants>div').count(),field.variants.length);
 }
 assert.match(await card.locator('.archive-reference').innerText(),/내 계약이나 경로에 적용되지 않습니다/);
 assert.equal(await card.locator('.archive-reference-sources a[href*="/api/missions/"]').getAttribute('href'),'https://api.star-citizen.wiki/api/missions/'+different.id);
 await card.locator('.archive-difference-filter input').check();assert.equal(await card.locator('.archive-reference-fields>section').count(),expected.fields.filter(f=>f.variants.length).length);
 await share.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/source-comparison-desktop.png'});
 const grouped=await open(group),select=grouped.locator('.archive-definition-select select');await select.selectOption(group.ids.at(-1));
 const last=archiveReference(details,group.ids.at(-1));
 assert.equal(await grouped.locator('.archive-reference>.archive-ids').innerText(),last.id);
 for(const field of last.fields)assert.equal(await grouped.locator(`[data-field="${field.key}"] .archive-reference-value`).textContent(),referenceValue(field.key,field.value));
 for(const lang of ['mix','en']){
  await page.locator('.space-language select').selectOption(lang);await grouped.locator('.archive-reference-fields').waitFor();
  assert.equal(await grouped.locator('[data-field=reward] .archive-reference-value').textContent(),referenceValue('reward',last.fields.find(f=>f.key==='reward').value,lang));
 }
 await page.setViewportSize({width:390,height:844});await grouped.locator('.archive-reference>summary').scrollIntoViewIfNeeded();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert(await grouped.evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.screenshot({path:out+'/source-comparison-mobile.png'});
 await page.keyboard.press('Escape');await page.waitForSelector('.room-reference-library');
 assert.equal(await page.evaluate(()=>localStorage.getItem('stam.control-room.flight.v1')),saved);
 assert.deepEqual(errors,[]);
 const report={status:'PASS',checks:['lazy detail rendering','each exact value/variant matches current snapshot','SCMDB preferred and both variants visible','definition-specific source links','differences-only filter','grouped definitions switch provenance independently','ko/mix/en','390px no page or card overflow','Escape preserves archive hierarchy','flight storage unchanged'],pageErrors:errors};
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
