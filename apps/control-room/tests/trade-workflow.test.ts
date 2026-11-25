import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tradeNextStep,tradeSettlement} from '../src/trade-workflow.ts';
import {expeditionSummary,type Expedition,type TradeEvent} from '../src/trade-expedition.ts';
import {defaultSuiteOptions,type SuiteLeg,type TradeLine} from '../src/trade-suite.ts';
import {tradeLabel,tradeMatches} from '../src/trade-labels.ts';
import {normalizePriceHistory,createPriceHistoryLoader} from '../src/trade-price-history.ts';

const line:TradeLine={commodityId:44,name:'Iron',quantity:8,boxSize:2,buy:10,sell:20,purchase:80,revenue:160,available:10,demand:10,buyAt:null,sellAt:null,ownership:'owned',costKnown:true,buySource:'UEX',sellSource:'UEX'};
const leg=(originId:number,destinationId:number):SuiteLeg=>({originId,destinationId,lines:[{...line}],purchase:80,revenue:160,costs:0,profit:80,seconds:60,meters:1e9,waitMinutes:0,systems:['Stanton'],empty:false});
const run=():Expedition=>({id:'r',at:'2026-11-17T00:00:00Z',options:{...defaultSuiteOptions,shipId:'drake-cutlass-black',originId:1,capacity:46,budget:1000},route:{id:'route',legs:[leg(1,2),leg(2,1),leg(1,3)],profit:240,purchase:240,costs:0,cash:1240,reserve:100,seconds:180,profitPerHour:4800,unsold:[],warnings:[]},events:[]});
const event=(kind:TradeEvent['kind'],extra:Partial<TradeEvent>={}):TradeEvent=>({id:crypto.randomUUID(),at:'2026-11-17T01:00:00Z',kind,note:'',...extra});
const buy=(qty:number,extra:Partial<TradeEvent>={})=>event('buy',{lotId:crypto.randomUUID(),commodityId:44,quantity:qty,boxSize:2,amount:qty*10,ownership:'owned',terminalId:1,...extra});
test('remaining purchase uses this visit and box group; repeated visits do not reuse first purchase',()=>{
 const r=run();r.events=[buy(2)];let step=tradeNextStep(r);assert.equal(step.purchases[0]!.remaining,6);assert.equal(step.purchases[0]!.amount,60);
 r.events.push(event('depart',{terminalId:2}),event('arrive',{terminalId:2}),event('depart',{terminalId:1}),event('arrive',{terminalId:1}));step=tradeNextStep(r);assert.equal(step.index,2);assert.equal(step.leg!.destinationId,3);assert.equal(step.purchases[0]!.remaining,8);
 r.events.push(buy(4));assert.equal(tradeNextStep(r).purchases[0]!.remaining,4);
 r.events.at(-1)!.voidedAt='2026-11-17T02:00:00Z';assert.equal(tradeNextStep(r).purchases[0]!.remaining,8);
});
test('partial overpurchase clamps suggestion to zero, does not delete cargo or manufacture trades',()=>{
 const r=run();r.events=[buy(10)];const raw=JSON.stringify(r);assert.equal(tradeNextStep(r).purchases[0]!.remaining,0);assert.equal(JSON.stringify(r),raw);assert.equal(expeditionSummary(r).holdings[0]!.quantity,10);
});
test('manual detours do not claim planned progress; in transit no purchase suggestion',()=>{
 const r=run();r.events=[event('depart',{terminalId:3})];assert.equal(tradeNextStep(r).aligned,false);assert.equal(tradeNextStep(r).purchases.length,0);
 r.events=[event('depart',{terminalId:2})];assert.equal(tradeNextStep(r).aligned,true);assert.equal(tradeNextStep(r).purchases.length,0);
});
test('replan starts progress from new route and never offers held cargo as a purchase',()=>{
 const r=run();r.events=[buy(2),event('depart',{terminalId:2}),event('arrive',{terminalId:2})];r.routeHistory=[{at:'2026-11-17T02:00:00Z',route:structuredClone(r.route)}];r.route.legs=[leg(2,3)];r.route.legs[0]!.lines[0]!.buySource='holding';const step=tradeNextStep(r);assert.equal(step.index,0);assert(step.aligned);assert.equal(step.purchases.length,0);
});
test('settlement distinguishes realized partial sales, remaining cost, expenses and cash adjustment',()=>{
 const r=run(),b=buy(8);r.events=[b,event('sell',{lotId:b.lotId,quantity:2,amount:30,terminalId:1}),event('expense',{amount:3,note:'fuel'}),event('balance',{amount:2000,note:'outside money'})];
 const s=expeditionSummary(r),v=tradeSettlement(s);assert.equal(s.realized,7);assert.equal(v.cashFlow,-53);assert.equal(v.remainingCost,60);assert.equal(s.cash,2000);assert.equal(v.remainingCostUnknown,false);
});
test('canonical and Korean searches accept spaces, case and all language modes',()=>{
 const ko=tradeLabel('Iron','goods','ko');assert.notEqual(ko,'Iron');assert(tradeMatches(ko,['Iron']));assert(tradeMatches('i R o N',['Iron']));assert(tradeMatches('Everus Harbor',[],['Admin - Everus Harbor']));assert.equal(tradeLabel('Iron','goods','en'),'Iron');assert(!tradeMatches('missing',['Iron']));
});
const now=Date.parse('2026-11-17T03:00:00Z');
const report=(id:number,extra:Record<string,unknown>={})=>({id,id_terminal:25,id_commodity:102,game_version:'4.10.3',date_added:now/1000-id*60,price_buy:269,price_sell:0,scu_buy:0,scu_sell:null,...extra});
test('source history separates side absence from true zero stock and excludes wrong patch/future points',()=>{
 const d=normalizePriceHistory({status:'ok',data:[report(1),report(2,{price_buy:300}),report(3,{game_version:'4.10.2'}),report(4,{date_added:now/1000+600})]},25,102,'4.10.3',now);
 assert.deepEqual(d.reports.map(p=>p.id),[2,1]);assert.equal(d.reports[0]!.sell,null);assert.equal(d.reports[0]!.stock,0);assert.equal(d.reports[0]!.demand,null);assert.equal(d.excluded,2);
 assert.throws(()=>normalizePriceHistory({status:'ok',data:[report(1,{id_terminal:99})]},25,102,'4.10.3',now));assert.throws(()=>normalizePriceHistory({status:'ok',data:[report(1),report(1)]},25,102,'4.10.3',now));
});
test('history requests deduplicate, cache 12h, separate query identities and allow retry after failure',async()=>{
 let calls=0,clock=now,fail=false;
 const load=createPriceHistoryLoader((async url=>{calls++;if(fail)throw Error('offline');const u=new URL(String(url));return new Response(JSON.stringify({status:'ok',data:[report(1,{id_commodity:Number(u.searchParams.get('id_commodity'))})]}));}) as typeof fetch,()=>clock);
 const [a,b]=await Promise.all([load(25,102,'4.10.3'),load(25,102,'4.10.3')]);assert.equal(a,b);assert.equal(calls,1);await load(25,102,'4.10.3');assert.equal(calls,1);await load(25,103,'4.10.3');assert.equal(calls,2);
 clock+=12*3600000;fail=true;await assert.rejects(load(25,102,'4.10.3'));fail=false;await load(25,102,'4.10.3');assert.equal(calls,4);
});

test('trade guidance follows actual cargo from a partial purchase through sale and undo',async()=>{
 const {tradeCompanion}=await import('../src/trade-companion.ts');
 const r=run(),places=(id:number)=>['','구매항','판매항','다음 항'][id]!;
 const deck=()=>tradeCompanion(r,expeditionSummary(r),places,()=>'철',false);
 assert.equal(deck().guidance.destination,'구매소 · 구매항');
 assert.match(deck().guidance.load,/남은 매입 · 철 8 SCU · 10 aUEC\/SCU/);
 const lot=buy(4);r.events.push(lot);
 assert.equal(deck().guidance.destination,'판매소 · 판매항');assert.match(deck().guidance.load,/선내 · 철 4 SCU/);
 assert.ok(deck().lines.some(l=>l.includes('20 aUEC/SCU')));
 r.events.push(event('depart',{terminalId:2}),event('arrive',{terminalId:2}));
 assert.equal(deck().guidance.destination,'판매소 · 판매항');
 r.events.push(event('sell',{lotId:lot.lotId,quantity:2,amount:40,terminalId:2}));
 assert.match(deck().guidance.load,/선내 · 철 2 SCU/);
 r.events.push(event('sell',{lotId:lot.lotId,quantity:2,amount:40,terminalId:2}));
 assert.match(deck().guidance.load,/남은 매입 · 철 8 SCU/);
 r.events.at(-1)!.voidedAt='2026-11-17T03:00:00Z';assert.match(deck().guidance.load,/선내 · 철 2 SCU/);
 r.events.push(event('depart',{terminalId:3}));assert.equal(deck().guidance.destination,'이동 · 다음 항');
 assert.ok(!deck().lines.some(l=>l.includes('예상 판매가')));
});
