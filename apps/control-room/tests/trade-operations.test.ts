import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blankTradeBook,changeTradeBook,tradeSummary,validateTradeBook,exportTradeBook,importTradeBook,type TradePlan,type TradeBook,type TradeEventKind} from '../src/trade-operations.ts';
import {readTradeBook,writeTradeBook,tradeKey,readyTradeOwner} from '../src/trade-storage.ts';
const now='2026-11-16T12:00:00Z';
const plan:TradePlan={createdAt:now,ship:{id:'misc-hull-b',name:'Hull B',capacity:512},inputs:{shipId:'misc-hull-b',budget:1000,reservePercent:10,costs:10,cargoLimit:512,originId:1,scope:'interstellar',legality:'legal',risk:'low',prices:'current'},commodity:{id:1,name:'Gold'},origin:{id:1,name:'Origin'},destination:{id:2,name:'Destination'},systemPath:['Stanton','Pyro','Nyx'],quantity:100,purchase:700,revenue:1000,profit:290,reserve:100,boxSize:1,buyUpdatedAt:now,sellUpdatedAt:now,sourceVersion:'4.10.3',warnings:[]};
function start(owner='guest'){return changeTradeBook(blankTradeBook(owner),{kind:'start',plan,id:'run-1'});}
let sequence=0;
function add(b:TradeBook,kind:TradeEventKind,quantity=0,amount=0,note=''){return changeTradeBook(b,{kind:'entry',runId:'run-1',entry:{id:'e-'+(++sequence),kind,quantity,amount,note,at:now}});}
const summary=(b:TradeBook)=>tradeSummary(b.runs[0]!);
class Store{values=new Map<string,string>();getItem(k:string){return this.values.get(k)??null;}setItem(k:string,v:string){this.values.set(k,v);}}
test('handover copies estimate only, never invents cargo/payment or replaces an active trade',()=>{
 const b=start();assert.equal(summary(b).aboard,0);assert.equal(summary(b).cash,1000);assert.equal(summary(b).profit,0);
 assert.throws(()=>changeTradeBook(b,{kind:'start',plan,id:'run-2'}),/active/);
 const changed=structuredClone(plan);changed.quantity=12;assert.equal(b.runs[0]!.plan.quantity,100);assert.equal(plan.inputs.reservePercent,10);
});
test('partial buys/sales, expenses and unsold cost yield distinct cash and realized profit',()=>{
 let b=add(start(),'buy',3,100);b=add(b,'buy',2,50);b=add(b,'expense',0,7.25,'Fuel');
 assert.equal(summary(b).inventoryCost,150);assert.equal(summary(b).profit,-7.25);assert.equal(summary(b).cash,842.75);
 b=add(add(b,'depart'),'arrive');b=add(b,'sell',2,100);assert.equal(summary(b).aboard,3);assert.equal(summary(b).inventoryCost,90);assert.equal(summary(b).profit,32.75);assert.equal(summary(b).cash,942.75);
 b=add(b,'sell',3,150);b=add(b,'finish');assert.equal(summary(b).inventoryCost,0);assert.equal(summary(b).profit,92.75);assert.equal(summary(b).cash,1092.75);assert.equal(summary(b).status,'completed');
});
test('actual spend may differ from estimate and consume reserve without fabricating profit',()=>{
 const b=add(start(),'buy',110,1200);assert.equal(summary(b).cash,-200);assert.equal(summary(b).reserveUsed,300);assert.equal(summary(b).profit,0);assert.equal(b.runs[0]!.plan.purchase,700);
});
test('departure/arrival gates and actual aboard quantities prevent fictitious sales and closure',()=>{
 const b=add(start(),'buy',5,100);assert.throws(()=>add(b,'sell',1,30),/stage/);assert.throws(()=>add(b,'arrive'),/stage/);assert.throws(()=>add(b,'finish'),/remaining/);assert.throws(()=>add(start(),'depart'),/stage/);
 const at=add(add(b,'depart'),'arrive');assert.throws(()=>add(at,'buy',1,10),/stage/);assert.throws(()=>add(at,'sell',6,300),/aboard/);assert.throws(()=>add(b,'buy',508,10),/capacity/);
});
test('loss requires an explicit reason, releases cost and never generates revenue',()=>{
 let b=add(start(),'buy',3,100);assert.throws(()=>add(b,'loss',1,0,''),/note/);b=add(b,'loss',1,0,'Cargo destroyed');assert.equal(summary(b).profit,-33.33);assert.equal(summary(b).inventoryCost,66.67);assert.equal(summary(b).revenue,0);assert.equal(summary(b).aboard,2);
 b=add(b,'loss',2,0,'Destroyed remainder');b=add(b,'finish');assert.equal(summary(b).profit,-100);assert.equal(summary(b).inventoryCost,0);assert.equal(summary(b).lost,3);
});
test('cent allocation releases exact remainder and remains exact for large acquisition totals',()=>{
 let b=add(start(),'buy',512,999999999999.99);b=add(add(b,'depart'),'arrive');for(let i=0;i<511;i++)b=add(b,'sell',1,.01);assert(summary(b).inventoryCost>0);b=add(b,'sell',1,.01);assert.equal(summary(b).inventoryCost,0);assert.equal(summary(b).releasedCost,999999999999.99);
});
test('undo is last-entry-only, preserves audit entries and restores cargo and stage',()=>{
 let b=add(start(),'buy',5,100);const purchaseId=b.runs[0]!.entries[0]!.id;b=add(b,'depart');const departure=b.runs[0]!.entries[1]!.id;
 assert.throws(()=>changeTradeBook(b,{kind:'undo',runId:'run-1',entryId:purchaseId,at:now}),/conflict/);
 b=changeTradeBook(b,{kind:'undo',runId:'run-1',entryId:departure,at:now});assert.equal(summary(b).stage,'purchase');assert.equal(b.runs[0]!.entries.length,2);assert.equal(b.runs[0]!.entries[1]!.voidedAt,now);
 b=changeTradeBook(b,{kind:'undo',runId:'run-1',entryId:purchaseId,at:now});assert.equal(summary(b).aboard,0);assert.equal(summary(b).cash,1000);
});
test('closed records stay independent, and undo cannot create two active trades',()=>{
 let b=add(start(),'cancel');const closeId=b.runs[0]!.entries[0]!.id;b=changeTradeBook(b,{kind:'start',id:'run-2',plan});assert.throws(()=>changeTradeBook(b,{kind:'undo',runId:'run-1',entryId:closeId,at:now}),/active/);assert.equal(b.runs.length,2);assert.equal(summary(b).status,'cancelled');assert.throws(()=>add(b,'expense',0,10,'Late'),/closed/);
});
test('malformed backups, identity mismatch and duplicate entries cannot change live state',()=>{
 const b=add(start(),'buy',1,10),raw=exportTradeBook(b);assert.deepEqual(importTradeBook(raw,'guest'),b);assert.throws(()=>importTradeBook(raw,'account:other'),/invalid/);
 for(const mutate of [(v:TradeBook)=>v.runs[0]!.entries.push(v.runs[0]!.entries[0]!), (v:TradeBook)=>v.runs[0]!.plan.ship.capacity=0, (v:TradeBook)=>v.runs[0]!.entries[0]!.amount=NaN]){const bad=structuredClone(b);mutate(bad);assert.throws(()=>validateTradeBook(bad));}
 assert.throws(()=>add(b,'expense',0,1.123,'Bad cents'));assert.throws(()=>add(b,'buy',NaN,10));assert.throws(()=>add(b,'buy',1,Infinity));
});
test('owner-specific storage leaves all freight/account keys intact',()=>{
 const s=new Store();s.setItem('stam.control-room.flight.v1','unchanged');s.setItem('stam.flight-owner.v1','guest');s.setItem('vh-missions','original');const b=start();
 writeTradeBook(s,'guest',null,b,()=> 'guest');assert.deepEqual(readTradeBook(s,'guest').book,b);assert.equal(readTradeBook(s,'account:someone').book.runs.length,0);assert.equal(s.getItem('stam.control-room.flight.v1'),'unchanged');assert.equal(s.getItem('vh-missions'),'original');assert.equal(readyTradeOwner(s),'guest');
 s.setItem('stam.account-storage-journal.v1','pending');assert.throws(()=>readyTradeOwner(s),/account/);
});
test('stale tab, account switch and failed storage write preserve the previous book',()=>{
 const s=new Store(),b=start(),raw=writeTradeBook(s,'guest',null,b,()=> 'guest'),next=add(b,'buy',2,20);
 assert.throws(()=>writeTradeBook(s,'guest',null,next,()=> 'guest'),/conflict/);assert.throws(()=>writeTradeBook(s,'guest',raw,next,()=> 'account:other'),/account/);assert.equal(s.getItem(tradeKey('guest')),raw);
 const failing={getItem:(k:string)=>s.getItem(k),setItem:()=>{throw Error('QuotaExceeded');}};assert.throws(()=>writeTradeBook(failing,'guest',raw,next,()=> 'guest'),/QuotaExceeded/);assert.equal(s.getItem(tradeKey('guest')),raw);
 const newer=writeTradeBook(s,'guest',raw,next,()=> 'guest');assert.throws(()=>writeTradeBook(s,'guest',raw,add(b,'buy',3,30),()=> 'guest'),/conflict/);assert.equal(s.getItem(tradeKey('guest')),newer);
});
test('corrupt stored records are retained, never silently replaced with an empty book',()=>{
 const s=new Store();s.setItem(tradeKey('guest'),'{bad');assert.throws(()=>readTradeBook(s,'guest'));assert.equal(s.getItem(tradeKey('guest')),'{bad');
});
