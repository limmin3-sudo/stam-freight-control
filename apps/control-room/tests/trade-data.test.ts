import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMarket,validateSnapshot,quoteFreshness,commodityAllowed} from '../src/trade-data.ts';
const now='2026-11-16T12:00:00Z';
const commodity={id:1,name:'Gold',kind:'Metal',is_available_live:1,is_visible:1,is_illegal:0,is_volatile_qt:0,is_volatile_time:0,is_explosive:0,is_buggy:0};
const terminal={id:9,name:'TDD',type:'commodity',is_available_live:1,is_visible:1,max_container_size:32,mcs:0,has_freight_elevator:1,has_docking_port:null};
const quote={id:100,id_commodity:1,id_terminal:9,price_buy:0,price_sell:200,scu_buy:0,scu_sell:null,game_version:'4.10.3',date_modified:Date.parse(now)/1000-60,container_sizes:'1,2,32,999'};
function data(overrides:Record<string,unknown>={}){return normalizeMarket({commodities:[commodity],terminals:[terminal],quotes:[quote],liveVersion:'4.10.3',retrievedAt:now,queriedTerminals:1,...overrides});}
test('joins LIVE/public identifiers, keeps zero stock distinct from unknown and uses SCU limits',()=>{
 const d=data({commodities:[commodity,{...commodity,id:2,is_available_live:0}],quotes:[quote,{...quote,id:101,id_commodity:2}]});
 assert.equal(d.commodities.length,1);assert.equal(d.coverage.excludedQuotes,1);assert.equal(d.quotes[0]!.buy,null);assert.equal(d.quotes[0]!.stock,0);assert.equal(d.quotes[0]!.demand,null);assert.equal(d.terminals[0]!.maxContainerScu,32);assert.equal(d.terminals[0]!.docking,null);assert.deepEqual(d.quotes[0]!.containers,[1,2,32]);
});
test('risk and legality are independent; unknown flags never become low risk/legal',()=>{
 const c=data().commodities[0]!;assert(commodityAllowed(c,'legal','low'));
 assert(!commodityAllowed({...c,illegal:null},'legal','all'));assert(!commodityAllowed({...c,riskKnown:false},'all','low'));
 assert(commodityAllowed({...c,illegal:true},'known','low'));assert(!commodityAllowed({...c,illegal:true},'legal','known'));
 assert(!commodityAllowed({...c,hazards:['is_explosive']},'legal','low'));assert(commodityAllowed({...c,hazards:['is_explosive']},'legal','known'));
});
test('current collection does not disguise old patch, missing date or stale record',()=>{
 const q=data().quotes[0]!,clock=Date.parse(now);assert.equal(quoteFreshness(q,'4.10.3',clock),'current');
 assert.equal(quoteFreshness({...q,version:'4.10.2'},'4.10.3',clock),'old-patch');assert.equal(quoteFreshness({...q,version:null},'4.10.3',clock),'unknown');
 assert.equal(quoteFreshness({...q,updatedAt:null},'4.10.3',clock),'unknown');assert.equal(quoteFreshness({...q,updatedAt:'2026-11-14T00:00:00Z'},'4.10.3',clock),'stale');
 assert.equal(quoteFreshness({...q,updatedAt:'2026-12-01T00:00:00Z'},'4.10.3',clock),'unknown');
});
test('malformed and partial snapshots cannot replace validated references',()=>{
 assert.throws(()=>data({commodities:[]}));assert.throws(()=>data({queriedTerminals:0}));assert.throws(()=>data({commodities:[commodity,commodity]}));assert.throws(()=>data({quotes:[quote,{...quote,id:101}]}));
 assert.throws(()=>data({quotes:[{...quote,id:'100'}]}));assert.throws(()=>validateSnapshot({...data(),quotes:[{...data().quotes[0],terminalId:99}]}));
});
test('invalid numbers/future timestamps stay unknown rather than useful prices',()=>{
 const q=data({quotes:[{...quote,price_sell:-1,scu_buy:'200',date_modified:Date.parse('2027-01-01')/1000}]}).quotes[0]!;assert.equal(q.sell,null);assert.equal(q.stock,null);assert.equal(q.updatedAt,null);
 const t=data({terminals:[{...terminal,max_container_size:0,has_docking_port:'false'}]}).terminals[0]!;assert.equal(t.maxContainerScu,null);assert.equal(t.docking,null);
});
// Publication failure coverage exercises the same collector used by scheduled builds.
import {refreshTrade} from '../../../scripts/refresh-trade.ts';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
test('upstream failure, version rollover and malformed detail retain previous snapshot atomically',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'stam-market-')),output=pathToFileURL(join(dir,'market.json')),original=JSON.stringify(data());
 try{
  for(const failure of ['http','terminal','version']){
   await writeFile(output,original);let versionCalls=0;
   const fake=(async(url:URL|string|Request)=>{const s=String(url);let result:unknown;
    if(s.includes('game_versions'))result={live:failure==='version'&&versionCalls++>0?'4.10.4':'4.10.3'};
    else if(s.includes('commodities_prices')){if(failure==='http')return new Response('{}',{status:503});result=[failure==='terminal'?{...quote,id_terminal:10}:quote];}
    else if(s.includes('terminals'))result=[terminal];else result=[commodity];return Response.json({status:'ok',data:result});
   }) as typeof fetch;
   await assert.rejects(refreshTrade({output,fetchImpl:fake,delayMs:0,onProgress:()=>{}}));assert.equal(await readFile(output,'utf8'),original);
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('security joins the exact facility; ambiguous or missing stations do not inherit city security',()=>{
 const station={id:7,is_available_live:1,is_visible:1,is_monitored:1,is_armistice:0,date_modified:Date.parse(now)/1000};
 const city={...station,id:8,is_armistice:1};
 const input={terminals:[{...terminal,id_space_station:7,id_city:8,has_loading_dock:1}],sites:{stations:[station],cities:[city]}};
 const t=data(input).terminals[0]!;assert.equal(t.loadingDock,true);assert.equal(t.security?.armistice,false);assert.match(t.security!.source,/space_stations\?id=7$/);
 assert.equal(data({...input,sites:{stations:[],cities:[city]}}).terminals[0]!.security,null);
 assert.equal(data({...input,sites:{stations:[station,station],cities:[city]}}).terminals[0]!.security,null);
 assert.equal(data({...input,sites:{stations:[{...station,date_modified:0}]}}).terminals[0]!.security?.updatedAt,null);
});
