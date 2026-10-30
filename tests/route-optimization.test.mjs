import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {navigator,planRoute,makeShipments,packBoxes} from '../engine.mjs';
import {planRoutesOnly} from '../route-only.mjs';
import {DEFAULT_SHIP} from '../ships.mjs';

const game=JSON.parse(fs.readFileSync(new URL('../data/locations.json',import.meta.url)));
const location=name=>{const l=game.locations.find(l=>l.name===name);assert.ok(l,`Missing fixture location: ${name}`);return l.id;};
const cargo=(scu,pickup,dropoff,commodity='Fixture commodity')=>({scu,pickupId:location(pickup),dropoffId:location(dropoff),commodity,boxes:[]});
// Six fully specified contracts from the reported route. The seventh contract has two
// pickup sites but no per-site quantities; inventing a split would invalidate this fixture.
const contracts=()=>[
 {id:'ling',cargo:[cargo(2,'HDMS-Norgaard','Sunset Mesa'),cargo(1,"Brio's Breaker Yard",'Sunset Mesa'),cargo(4,'Shubin Mining Facility SMCa-8','Sunset Mesa'),cargo(2,'ArcCorp Mining Area 056','Sunset Mesa')]},
 {id:'dead-medium',cargo:[cargo(16,'CRU-L4 Shallow Fields Station',"Seer's Canyon"),cargo(8,'CRU-L4 Shallow Fields Station',"Seer's Canyon"),cargo(16,'CRU-L4 Shallow Fields Station','Ashland'),cargo(4,'CRU-L4 Shallow Fields Station','Ashland'),cargo(4,'CRU-L4 Shallow Fields Station','Ashland')]},
 {id:'dead-small',cargo:[cargo(2,'Grim HEX','Sunset Mesa'),cargo(1,'Grim HEX',"Seer's Canyon"),cargo(1,'Grim HEX',"Seer's Canyon"),cargo(1,'Grim HEX','Ashland'),cargo(1,'Grim HEX','Ashland')]},
 {id:'dead-organic',cargo:[cargo(64,'Orison','Gaslight'),cargo(64,'Orison','Orbituary')]},
 {id:'dead-pods',cargo:[cargo(4,'Lorville','Sunset Mesa')]},
 {id:'redwind',cargo:[cargo(32,'Orison','Sunset Mesa'),cargo(32,'Orison','Sunset Mesa'),cargo(20,'Orison','Sunset Mesa'),cargo(32,'Orison','Bueno Ravine'),cargo(32,'Orison','Bueno Ravine'),cargo(20,'Orison','Bueno Ravine')]}
];
const roomy={id:'fixture-freighter',name:'Fixture freighter',shareGrids:true,grids:[{id:'main',name:'main',w:8,h:4,l:16,x:0,y:0,z:0,maxBoxSize:32}]};
function verifyOwnership(plan,missions,initialPicked=[]){
 const state=new Map(initialPicked.map(id=>[id,1])),delivered=new Map();
 for(const visit of plan.visits)for(const event of visit.events){
  assert.ok(event.type==='pickup'||event.type==='delivery');
  if(event.type==='pickup'){assert.ok(!state.has(event.shipmentId));state.set(event.shipmentId,1);}
  else {assert.equal(state.get(event.shipmentId),1,`delivery before pickup: ${event.shipmentId}`);state.set(event.shipmentId,2);delivered.set(event.missionId,(delivered.get(event.missionId)||0)+event.scu);}
 }
 for(const mission of missions)assert.equal(delivered.get(mission.id),mission.cargo.reduce((n,c)=>n+c.scu,0));
 assert.equal(plan.visits.at(-1).load,0);
}
for(const [mode,planner,settings]of [['simple',planRoutesOnly,{}],['capacity-aware',planRoute,{ship:roomy}]]){
 test(`${mode}: six contracts collect Stanton cargo before one Pyro crossing and combine delivery stops`,()=>{
  const missions=contracts();
  if(settings.ship){const {shipments}=makeShipments(missions,new Map(game.locations.map(l=>[l.id,l])),settings);assert.ok(packBoxes(shipments.flatMap(s=>s.boxes),[],settings.ship),'fixture cargo fits in one departure');}
  const plan=planner(game,missions,location('Orison'),settings);
  assert.equal(plan.visits.reduce((n,v)=>n+v.leg.jumps,0),1,'a 363 SCU load fitting the ship does not require a return to Stanton');
  for(const id of new Set(missions.flatMap(m=>m.cargo.flatMap(c=>[c.pickupId,c.dropoffId])))){
   assert.equal(plan.visits.filter(v=>v.locationId===id).length,1,`repeated stop: ${game.locations.find(l=>l.id===id).name}`);
  }
  verifyOwnership(plan,missions);
  if(!plan.simple)assert.ok(plan.visits.every(v=>v.load<=plan.capacity));
 });
}

// Exhaustive event-order oracle, deliberately independent of stop grouping, beam widths,
// and heuristics. Small instances are cheap enough to compare with the actual optimum.
function exactSeconds(data,cargo,start,settings){
 const nav=navigator(data,settings),memo=new Map();
 const visit=(status,at)=>{
  if(status.every(s=>s===2))return 0;
  const key=status.join('')+'|'+at;if(memo.has(key))return memo.get(key);
  let best=Infinity;
  for(let i=0;i<cargo.length;i++){
   if(status[i]===2)continue;
   const dest=status[i]===0?cargo[i].pickupId:cargo[i].dropoffId,next=[...status];next[i]++;
   best=Math.min(best,nav.path(at,dest).seconds+visit(next,dest));
  }
  memo.set(key,best);return best;
 };
 return visit(cargo.map(()=>0),start);
}
const smallData={locations:[[0,0],[8,2],[10,9],[2,7],[5,3],[9,5],[1,6],[7,1]].map(([x,y],i)=>({id:String(i),name:String(i),type:'Manmade',system:'stanton',position:[x*1e9,y*1e9,0]})),jumps:[]};
test('simple small-instance route matches exhaustive optimum regardless of cargo row order',()=>{
 const shipments=[['5','4'],['6','2'],['1','2'],['7','5'],['7','4']].map(([pickupId,dropoffId])=>({pickupId,dropoffId,scu:1,commodity:'Same commodity'}));
 const settings={spool:0,dockMinutes:0,surfaceMinutes:0},optimal=exactSeconds(smallData,shipments,'0',settings);
 for(const rows of [shipments,[...shipments].reverse()]){
  const p=planRoutesOnly(smallData,[{id:'oracle',cargo:rows}],'0',settings);
  assert.ok(Math.abs(p.seconds-optimal)<1e-6,`${p.seconds} seconds vs optimal ${optimal}`);
  verifyOwnership(p,[{id:'oracle',cargo:rows}]);
 }
});

test('route optimization still permits necessary return trips when cargo exceeds capacity',()=>{
 const ship={id:'eight',name:'Eight SCU',grids:[{id:'g',name:'g',w:2,h:2,l:2,x:0,y:0,z:0,maxBoxSize:8}]};
 const missions=['A','B'].map(id=>({id,cargo:[{pickupId:'0',dropoffId:'1',commodity:'Identical goods',scu:8,boxes:[{size:8,count:1}]}]}));
 const p=planRoute(smallData,missions,'0',{ship});
 assert.equal(p.peak,8);assert.equal(p.visits.filter(v=>v.locationId==='0').length,2);verifyOwnership(p,missions);
 const first=p.visits[0],picked=first.events.filter(e=>e.type==='pickup').map(e=>e.shipmentId);
 const resumed=planRoute(smallData,missions,'0',{ship,resume:{picked,delivered:[],aboard:first.packing.boxes}});
 assert.equal(resumed.visits[0].events[0].type,'delivery');
 assert.ok(resumed.visits.every(v=>v.load<=8));
 verifyOwnership(resumed,missions,picked);
});

test('Hull B preserves dedicated-grid policy and can batch the whole load when sharing is allowed',()=>{
 const missions=contracts(),start=location('Orison');
 const dedicated=planRoute(game,missions,start,{ship:{...DEFAULT_SHIP,shareGrids:false}});
 assert.ok(dedicated.warnings.some(w=>w.includes('전용 그리드')));
 assert.equal(dedicated.ship.shareGrids,false);
 verifyOwnership(dedicated,missions);
 const shared=planRoute(game,missions,start,{ship:{...DEFAULT_SHIP,shareGrids:true}});
 assert.equal(shared.visits.reduce((n,v)=>n+v.leg.jumps,0),1);
 assert.equal(shared.peak,363);
 verifyOwnership(shared,missions);
 let previous=new Map();
 for(const v of shared.visits){for(const b of v.packing.boxes){if(previous.has(b.boxId))assert.equal(JSON.stringify([b.bin,b.cell,b.dims]),previous.get(b.boxId));}previous=new Map(v.packing.boxes.map(b=>[b.boxId,JSON.stringify([b.bin,b.cell,b.dims])]));}
});

test('default Hull B gathers all six contracts before leaving Stanton without a manual sharing setting',()=>{
 const missions=contracts(),plan=planRoute(game,missions,location('Orison'));
 assert.equal(plan.peak,363);
 assert.equal(plan.visits.reduce((n,v)=>n+v.leg.jumps,0),1);
 const destinations=new Set(missions.flatMap(m=>m.cargo.map(c=>c.dropoffId)));
 const firstDelivery=plan.visits.findIndex(v=>destinations.has(v.locationId));
 assert.ok(plan.visits.slice(firstDelivery).every(v=>game.locations.find(l=>l.id===v.locationId).system==='pyro'));
 for(const id of new Set(missions.flatMap(m=>m.cargo.map(c=>c.pickupId))))assert.equal(plan.visits.filter(v=>v.locationId===id).length,1);
 verifyOwnership(plan,missions);
});

// More than 16 distinct stops takes the fallback path rather than the exact stop DP.
// Each origin contains two independent shipments: leaving after just one is a bug.
for(const [mode,planner,settings] of [['simple',planRoutesOnly,{}],['detailed',planRoute,{ship:roomy}]]){
 test(`${mode} fallback completes each pickup stop before departure and crosses only once`,()=>{
  const data={locations:Array.from({length:20},(_,i)=>({id:String(i),name:'Stop '+i,system:i<9||i===18?'stanton':'pyro',type:'Manmade',position:[(i%9)*1e9,0,0],isGateway:i>=18})),jumps:[{from:'18',to:'19'}]};
  const missions=Array.from({length:18},(_,i)=>({id:'fallback-'+i,cargo:[{commodity:'same goods',scu:1,boxes:[{size:1,count:1}],pickupId:String(Math.floor(i/2)),dropoffId:String(9+i%9)}]}));
  const plan=planner(data,missions,'0',settings);
  assert.equal(plan.visits.reduce((n,v)=>n+v.leg.jumps,0),1);
  for(let i=0;i<9;i++){
   const pickups=plan.visits.filter(v=>v.locationId===String(i));
   assert.equal(pickups.length,1,'pickup stop '+i+' revisited');
   assert.equal(pickups[0].events.filter(e=>e.type==='pickup').length,2);
  }
  verifyOwnership(plan,missions);
 });
}
