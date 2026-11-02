import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {prepareMissionDb,matchMission,enrichMission} from '../mission-match.mjs';
import {boxList} from '../engine.mjs';
import {fillDestinationRecipes,saveDestinationRecipe,destinationGroups} from '../recipes.mjs';
const db={meta:{version:'4.10.2-LIVE.1'},missions:[
 {id:'rw-med',title:'Rookie Hauler Needed for Medium Shipment',giver:'Red Wind Linehaul',rank:1,orders:[['Nitrogen',12,8],['Nitrogen',12,8],['Organics',6,4],['Organics',6,4],['Ranta Dung',7,2],['Ranta Dung',7,2]]},
 {id:'rw-big',title:'Experienced Hauler Needed for Medium Shipment',giver:'Red Wind Linehaul',rank:4,orders:[['Nitrogen',87,32],['Organics',87,32],['Ranta Dung',87,32]]},
 {id:'ling-0',title:'Cargo Hauling Opportunity with Ling Hauling',giver:'Ling Family Hauling',rank:0,orders:[['Souvenirs',2,2],['Processed Food',4,1]]},
 {id:'ling-1',title:'Ling Family Rookie Cargo Haul - Small Scale',giver:'Ling Family Hauling',rank:1,orders:[['Souvenirs',2,2],['Processed Food',4,1]]},
 {id:'ds-cryo',title:'DEAD SAINTS -- Rookie Rank, Small Scale Cargo Run',giver:'Dead Saints',rank:1,orders:[['CryoPod',null,-1]]}]};
const ko={commodities:{'질소':'Nitrogen','유기체':'Organics','란타 똥':'Ranta Dung','기념품':'Souvenirs','가공 식품':'Processed Food','냉동포드':'CryoPod'},companies:{'레드 윈드':'Red Wind Linehaul','링 가문':'Ling Family Hauling'}};
const prepared=prepareMissionDb(db,ko);
const contract=(company,title,cargo)=>({company,title,cargo:cargo.map(([commodity,scu],i)=>({commodity,scu,pickupId:'p'+(i%2),dropoffId:'d',boxes:[]}))});

test('Korean contract names find the wiki mission and its per-commodity container limits',()=>{
 const m=contract('레드 윈드','중형 신입 화물 계약자 필요',[['질소',12],['질소',12],['유기체',6],['유기체',6],['란타 똥',7],['란타 똥',7]]);
 const r=matchMission(m,prepared);assert.equal(r.id,'rw-med');assert.equal(r.candidates,1);
 const e=enrichMission(m,prepared);assert.deepEqual(e.cargo.map(c=>c.maxBoxSize),[8,8,4,4,2,2]);assert.equal(e._wiki.title,'Rookie Hauler Needed for Medium Shipment');
});
test('SCU above a mission limit rules it out, and an unknown Korean commodity gives no match',()=>{
 assert.equal(matchMission(contract('레드 윈드','',[['질소',40],['유기체',6],['란타 똥',7]]),prepared).id,'rw-big');
 assert.equal(matchMission(contract('레드 윈드','',[['모르는 품목',4]]),prepared),null);
});
test('the rank in the title picks between variants with the same cargo; cryo pods are flagged, not boxed',()=>{
 assert.equal(matchMission(contract('링 가문','링 가문 신입 화물 운송 - 소량 화물',[['기념품',2],['가공 식품',4]]),prepared).id,'ling-1');
 const cryo=enrichMission(contract('DEAD SAINTS','신입 Rank, 소형 Scale Cargo Run',[['냉동포드',4]]),prepared);
 assert.equal(cryo.cargo[0]._special,'cryopod');assert.equal(cryo.cargo[0].maxBoxSize??null,null);
});
test('a limit read from the contract is kept; a wiki limit plans with its largest boxes but never rejects real boxes',()=>{
 const own=contract('레드 윈드','신입',[['질소',12],['질소',12],['유기체',6],['유기체',6],['란타 똥',7],['란타 똥',7]]);own.cargo[0].maxBoxSize=4;
 const e=enrichMission(own,prepared);assert.equal(e.cargo[0].maxBoxSize,4);assert.equal(e.cargo[0]._maxBoxSource,undefined);assert.equal(e.cargo[1].maxBoxSize,8);
 assert.deepEqual(boxList({scu:32,maxBoxSize:16,_maxBoxSource:'wiki'}).boxes,[16,16]);
 assert.deepEqual(boxList({scu:32,maxBoxSize:16}).boxes,[8,8,8,8]);
 assert.equal(boxList({scu:32,maxBoxSize:8,_maxBoxSource:'wiki',boxes:[{size:16,count:2}]}).estimated,false);
});
test('remembered layouts follow the mission type: old saves still apply, but not when a box exceeds the limit',()=>{
 const plain=contract('','',[['Nitrogen',12]]),g=destinationGroups(plain)[0];
 const recipes=saveDestinationRecipe({},plain,g,[{size:8,count:1},{size:4,count:1}],'v');
 const small={...plain,cargo:[{...plain.cargo[0],maxBoxSize:8,_maxBoxSource:'wiki'}]};
 assert.deepEqual(fillDestinationRecipes(recipes,small,'v').destinationBoxes[0].boxes,[{size:8,count:1},{size:4,count:1}]);
 const tiny={...plain,cargo:[{...plain.cargo[0],maxBoxSize:2,_maxBoxSource:'wiki'}]};
 assert.equal(fillDestinationRecipes(recipes,tiny,'v').destinationBoxes.length,0);
});
test('the bundled hauling mission data is well formed',()=>{
 const d=JSON.parse(fs.readFileSync(new URL('../data/hauling-missions.json',import.meta.url),'utf8'));
 assert.match(d.meta.version,/^\d+\.\d+/);assert.ok(d.missions.length>100);
 for(const m of d.missions){assert.ok(m.id&&m.title!==undefined&&Array.isArray(m.orders)&&m.orders.length);for(const o of m.orders)assert.equal(o.length,3);}
});
test('a misread commodity is renamed from the mission data when the other goods settle the mission',()=>{
 const misread=contract('레드 윈드','중형 신입 화물 계약자 필요',[['칠소',12],['칠소',12],['유기체',6],['유기체',6],['란타 똥',7],['란타 똥',7]]);
 const ko=enrichMission(misread,prepared,{namesOnly:true,korean:true});
 assert.deepEqual(ko.cargo.map(c=>c.commodity).slice(0,2),['질소','질소']);assert.deepEqual(ko._nameFixes,[['칠소','질소']]);assert.equal(ko._wiki,undefined);
 const en=enrichMission(contract('Red Wind Linehaul','Rookie Hauler Needed for Medium Shipment',[['Nitrogn',12],['Organics',6],['Ranta Dung',7]]),prepared);
 assert.equal(en.cargo[0].commodity,'Nitrogen');assert.equal(en.cargo[0].maxBoxSize,8);
 // Two unknown names, or a leftover that is not unique, are never guessed.
 assert.equal(matchMission(contract('레드 윈드','',[['칠소',12],['모름',6]]),prepared),null);
 const unknownKorean=enrichMission(contract('링 가문','신입',[['기념품',2],['가공식품X',4]]),prepared,{namesOnly:true,korean:true});
 assert.equal(unknownKorean.cargo[1].commodity,'가공 식품');
});
