// Two isolated browser devices against a synthetic account backend. No real account writes.
import assert from 'node:assert/strict';import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
import {emptyDraft,samples} from '../apps/control-room/src/mission-trial.ts';import {calculateFlight} from '../apps/control-room/src/flight-engine.mjs';import {blankRun,startRun,completeStep} from '../apps/control-room/src/flight-session.ts';
const base=process.env.STAM_MANUAL_URL||'http://127.0.0.1:5189/',out=process.env.STAM_MANUAL_ASSETS||'apps/control-room/src/assets/manual';await mkdir(out,{recursive:true});
const F='stam.control-room.flight.v1',P='stam.control-room.flight.previous.v1',O='stam.flight-owner.v1',M='vh-account-meta';
function fixture(i){const draft={...emptyDraft(),partner:'navigator',partnerSelected:true,jobs:[samples[i]]},plan=calculateFlight(draft),run=completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000);run.since=null;return JSON.stringify({version:1,draft,plan,run});}
// Same mock SDK contract as the established account-isolation regression suite.
const source=await readFile(new URL('./check-account-sync-browser.mjs',import.meta.url),'utf8'),sdk=source.split('const sdk=`')[1].split('`;')[0];
const db=new Map([['users/pilot',{revision:1,updatedAt:100}]]),errors=[],checks=[];
async function backend(req){const path=req.path.join('/');if(req.kind==='get'||req.kind==='transaction-read')return structuredClone(db.get(path));if(req.kind==='list')return [...db].filter(([k])=>k.startsWith(path+'/')&&k.split('/').length===req.path.length+1).map(([k,v])=>({id:k.split('/').at(-1),data:v}));if(req.kind==='cas'){if(JSON.stringify(db.get(path))!==JSON.stringify(req.expected))return false;for(const op of req.ops)op.value===null?db.delete(op.path.join('/')):db.set(op.path.join('/'),op.value);return true;}}
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
async function setup(flight,locale){const context=await browser.newContext({viewport:{width:1600,height:1000},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(40000);page.on('pageerror',e=>errors.push(e.message));await page.exposeFunction('qaDb',backend);await page.route('https://www.gstatic.com/firebasejs/**',r=>r.fulfill({contentType:'text/javascript',body:sdk}));await page.route(/https:\/\/.*(googleapis\.com|firebaseio\.com).*/,r=>r.abort());await page.addInitScript(({flight,F,O,M})=>{if(!sessionStorage.getItem('qa-seeded')){localStorage.setItem(F,flight);localStorage.setItem(O,'account:pilot');localStorage.setItem(M,JSON.stringify({uid:'pilot',revision:1,lastSyncedAt:100,lastSnap:{}}));sessionStorage.setItem('qa-uid','pilot');sessionStorage.setItem('qa-seeded','1');}localStorage.setItem('vh-map-quality','normal');},{flight,F,O,M});await page.goto(base+'#/service?lang='+locale+'&section=account');return page;}
const records=[];
try{
 for(const locale of ['ko','en','mix']){
  db.clear();db.set('users/pilot',{revision:1,updatedAt:100});
  const en=locale==='en',original=fixture(0),other=fixture(1),a=await setup(original,locale),panel=p=>p.locator('.flight-cloud-panel');
  await panel(a).getByText(en?'No flight saved to this account.':'계정에 저장한 운항이 없습니다.',{exact:true}).waitFor();
  await panel(a).locator('input[type=checkbox]').first().check();
  const shot=async(page,step)=>{await page.evaluate(()=>document.fonts.ready);await panel(page).screenshot({path:`${out}/${locale}-${step}.png`});records.push({locale,step,selector:'.flight-cloud-panel',text:await panel(page).innerText()});};
  await shot(a,'account-save');
  await panel(a).getByRole('button',{name:en?'Save this flight to account':'이 기기 운항을 계정에 저장',exact:true}).click();
  await panel(a).getByText(en?'Account flight connected':'계정 운항 연결됨',{exact:true}).waitFor();
  const b=await setup(other,locale);
  await panel(b).getByText(en?'Compare the account flight with this device and choose.':'계정 운항과 현재 기기의 운항을 비교해 선택하세요.',{exact:true}).waitFor();
  assert.equal(await b.evaluate(F=>localStorage.getItem(F),F),other);
  await panel(b).locator('input[type=checkbox]').first().check();await shot(b,'account-compare');
  await panel(b).getByRole('button',{name:en?'Load account flight':'계정 운항 불러오기',exact:true}).click();
  await panel(b).getByText(en?'Flight restored. The flight clock is paused.':'운항을 불러왔습니다. 운항 시간은 일시정지 상태입니다.',{exact:true}).waitFor();
  const restored=JSON.parse(await b.evaluate(F=>localStorage.getItem(F),F));assert.deepEqual(restored.run.aboard,JSON.parse(original).run.aboard);assert.equal(restored.run.since,null);assert.ok(await b.evaluate(P=>localStorage.getItem(P),P));
  const status=panel(b).locator('p[role=status]');await status.screenshot({path:`${out}/${locale}-account-restored.png`});records.push({locale,step:'account-restored',selector:'.flight-cloud-panel p[role=status]',text:await status.innerText()});
  await a.context().close();await b.context().close();console.log(locale+' account guide captures complete');
 }
 assert.deepEqual(errors,[]);await writeFile(process.env.STAM_CAPTURE_REPORT||'/tmp/stam-manual-account-capture.json',JSON.stringify({syntheticBackend:true,productionRequests:0,userDataUsed:false,checks:['actual UI save and restore using sample flights','second device preserved until explicit load','cargo restored, previous flight backed up, timer paused'],records},null,2));
}finally{await browser.close();}
