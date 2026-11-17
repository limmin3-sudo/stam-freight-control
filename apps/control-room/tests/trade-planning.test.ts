import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planTrades,systemPath,type TradeInputs,type TradeContext} from '../src/trade-planning.ts';
import type {MarketSnapshot,Terminal,Quote} from '../src/trade-data.ts';
import {tradeBoxCapacity,tradeShip} from '../src/trade-cargo.mjs';
const now=Date.parse('2026-11-16T12:00:00Z');
const security={monitored:true,armistice:true,source:'https://api.uexcorp.uk/2.0/cities?id=1',updatedAt:'2026-01-01T00:00:00Z'};
const origin:Terminal={id:1,name:'Origin',location:'Origin',planet:'Hurston',system:'Stanton',version:'4.10.3',updatedAt:new Date(now).toISOString(),maxContainerScu:32,elevator:true,docking:true,autoLoad:true,playerOwned:false,loadingDock:true,security};
const buy:Quote={id:10,terminalId:1,commodityId:1,buy:7.21,sell:null,stock:1000,demand:null,version:'4.10.3',updatedAt:new Date(now-3600000).toISOString(),containers:[1,2,4,8,16,24,32]};
const sell:Quote={...buy,id:20,terminalId:2,buy:null,sell:10.1,stock:null,demand:1000};
const data=():MarketSnapshot=>({schema:1,source:'UEX',retrievedAt:new Date(now).toISOString(),liveVersion:'4.10.3',commodities:[{id:1,name:'Gold',kind:'Metal',illegal:false,hazards:[],riskKnown:true}],terminals:[origin,{...origin,id:2,name:'Destination',location:'Destination'}],quotes:[buy,sell],coverage:{rawCommodities:1,rawTerminals:2,rawQuotes:2,excludedQuotes:0,queriedTerminals:2},evidence:[]});
const input:TradeInputs={shipId:'misc-hull-b',budget:1000,reservePercent:10,costs:10,cargoLimit:512,originId:1,scope:'intrasystem',legality:'legal',risk:'low',prices:'current'};
const context:TradeContext={shipId:'misc-hull-b',capacity:512,boxCapacities:{1:512,2:512,4:512,8:512,16:512,24:384,32:512},systemEdges:[['Stanton','Pyro'],['Pyro','Nyx']]};
const run=(d=data(),i:Partial<TradeInputs>={},c:Partial<TradeContext>={})=>planTrades(d,{...input,...i},{...context,...c},now);
test('10% reserve and entered costs constrain purchases; reserve is not an expense',()=>{
 const [p]=run().candidates;assert(p);assert.equal(p.quantity,123);assert.equal(p.reserve,100);assert.equal(p.purchase,886.83);assert.equal(p.revenue,1242.3);assert.equal(p.profit,345.47);assert.equal(p.remaining,103.17);assert(p.purchase+input.costs+p.reserve<=input.budget);assert(p.limits.includes('budget'));
});
test('supply, demand, capital and uniform container multiples all cap cargo',()=>{
 const d=data();d.quotes=[{...buy,stock:70,containers:[32]},{...sell,demand:50}];const p=run(d,{budget:10000}).candidates[0]!;assert.equal(p.quantity,32);assert.equal(p.boxCount,1);assert.equal(p.boxSize,32);assert(p.limits.includes('demand'));assert(p.limits.includes('boxMultiple'));
 assert.equal(run(d,{budget:10000},{boxCapacities:{32:0}}).candidates.length,0);
 for(const value of [0,null]){d.quotes=[{...buy,stock:value},sell];assert.equal(run(d).candidates.length,0);d.quotes=[buy,{...sell,demand:value}];assert.equal(run(d).candidates.length,0);}
});
test('missing source container choices or unknown terminal limits are not fabricated',()=>{
 let d=data();d.quotes=[{...buy,containers:[]},sell];assert.equal(run(d).candidates.length,0);d=data();d.terminals[1]={...origin,id:2,maxContainerScu:null};assert.equal(run(d).candidates.length,0);
 d=data();d.quotes=[{...buy,containers:[32]},sell];d.terminals[1]={...origin,id:2,maxContainerScu:16};assert.equal(run(d).candidates.length,0);
});
test('old/missing/future prices never masquerade as current; opt-in stale is same-patch only',()=>{
 for(const change of [{version:'4.10.2'},{updatedAt:null},{updatedAt:'2027-01-01T00:00:00Z'}]){const d=data();d.quotes=[{...buy,...change},sell];assert.equal(run(d,{prices:'stale'}).candidates.length,0);}
 const d=data();d.quotes=[{...buy,updatedAt:'2026-11-13T00:00:00Z'},sell];assert.equal(run(d).candidates.length,0);const p=run(d,{prices:'stale'}).candidates[0]!;assert(p.warnings.includes('stalePrices'));
});
test('risk and legality choices are independent; unknown is never low risk or legal',()=>{
 const d=data();d.commodities[0]={...d.commodities[0]!,illegal:true};assert.equal(run(d).candidates.length,0);assert.equal(run(d,{legality:'known'}).candidates.length,1);
 d.commodities[0]={...d.commodities[0]!,illegal:false,hazards:['is_explosive']};assert.equal(run(d).candidates.length,0);assert.equal(run(d,{risk:'known'}).candidates.length,1);
 d.commodities[0]={...d.commodities[0]!,illegal:null};assert.equal(run(d,{risk:'all',legality:'known'}).candidates.length,0);assert.equal(run(d,{risk:'all',legality:'all'}).candidates.length,1);
 d.commodities[0]={...d.commodities[0]!,illegal:false,hazards:[]};d.terminals[1]={...origin,id:2,security:null};assert.equal(run(d).candidates.length,0);assert.equal(run(d,{risk:'known'}).candidates.length,0);assert.equal(run(d,{risk:'all'}).candidates.length,1);
});
test('partner scope and verified system graph preserve intermediate systems',()=>{
 const d=data();d.terminals[1]={...origin,id:2,system:'Nyx'};assert.equal(run(d).candidates.length,0);const p=run(d,{scope:'interstellar'}).candidates[0]!;assert.deepEqual(p.systemPath,['stanton','pyro','nyx']);assert.equal(run(d,{scope:'interstellar'},{systemEdges:[]}).candidates.length,0);assert.equal(systemPath('Stanton','Unknown',context.systemEdges),null);
});
test('Hull C requires loading docks at both ends; a generic docking port is insufficient',()=>{
 const d=data();d.terminals[1]={...origin,id:2,loadingDock:false,docking:true};assert.equal(run(d,{shipId:'misc-hull-c'},{shipId:'misc-hull-c'}).candidates.length,0);
 d.terminals[1]={...origin,id:2,loadingDock:true};assert.equal(run(d,{shipId:'misc-hull-c'},{shipId:'misc-hull-c'}).candidates.length,1);
});
test('invalid financial/capacity input cannot produce infinite, negative or unsafe proposals',()=>{
 for(const change of [{budget:NaN},{budget:Infinity},{budget:-1},{costs:-1},{reservePercent:101},{reservePercent:NaN},{cargoLimit:513},{cargoLimit:1.5},{shipId:'other'}])assert.equal(run(data(),change).error,'inputs');
 assert.equal(run(data(),{reservePercent:100}).error,'capital');assert.equal(run(data(),{costs:1000}).error,'capital');
 const d=data();d.quotes=[{...buy,buy:10},{...sell,sell:10}];assert.equal(run(d).candidates.length,0);
});
test('real normalized grid profiles use the existing upright restrictions and respect disabled grids',()=>{
 const hull=tradeShip('misc-hull-b');assert.equal(tradeBoxCapacity(hull,32),512);assert.equal(tradeBoxCapacity(tradeShip('misc-hull-b',[hull.grids[0]!.id]),32),480);
 const raft=tradeShip('argo-raft');const narrow={...raft,grids:[{...raft.grids[0]!,w:1,h:2,l:1}]};assert.equal(tradeBoxCapacity(narrow,2),0);assert.equal(tradeBoxCapacity(narrow,1),2);assert.equal(tradeBoxCapacity(tradeShip('aegis-avenger-titan'),32),0);
});
test('many budget/stock values never exceed funds, capacity, or reported liquidity',()=>{
 for(let n=1;n<=80;n++){const d=data();d.quotes=[{...buy,stock:n+0.9,buy:7.213},{...sell,demand:n/2+0.4,sell:10.109}];const i={budget:n*31.73,reservePercent:10,costs:2.25};for(const p of run(d,i).candidates){assert(p.purchase+p.reserve+i.costs<=i.budget+0.001);assert(p.quantity<=Math.floor(d.quotes[0]!.stock!));assert(p.quantity<=Math.floor(d.quotes[1]!.demand!));assert.equal(p.quantity%p.boxSize,0);assert(p.profit<=p.quantity*(10.109-7.213)-i.costs+0.001);}}
});
