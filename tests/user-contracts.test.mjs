import test from 'node:test';
import assert from 'node:assert/strict';
import {checkedUserContract,createUserContracts,mergeUserContracts,userContractPreview,userContractScope} from '../integration/log/user-contracts.mjs';
import {calculatePreview} from '../integration/log/preview-packing.mjs';
import {createPlanSelection} from '../integration/log/preview-session.mjs';
import {exportFlightBackup,restoreFlightBackup} from '../integration/log/flight-backup.mjs';
import {ACCOUNT_META} from '../sync.mjs';
import {DEFAULT_SHIP} from '../ships.mjs';
import {createCargoContinuity} from '../integration/log/cargo-continuity.mjs';
import {checkedCargoRecord} from '../integration/log/retained-cargo.mjs';
import {boxBinding,specifiedBoxes} from '../integration/log/reservations.mjs';
import {data,index,fixture} from './helpers/log-preview.mjs';
const stop=name=>data.locations.find(p=>p.name===name).id;
const mem=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
const record=()=>({id:'manual:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',title:'Confirmed contract',updatedAt:'2026-11-04T12:00:00.000Z',rows:[{commodity:'Hydrogen',scu:66,pickupIds:[stop('ArcCorp Mining Area 061')],dropoffId:stop('Sunset Mesa'),boxes:[]}]});
test('manual contracts use destination reservations without claiming physical containers',()=>{
 const contracts=mergeUserContracts([],[],[record()]);const p=userContractPreview(contracts[0],index);
 assert.equal(p.mission.cargo[0].scu,66);assert.deepEqual(p.mission.cargo[0].boxes,[]);assert.equal(p.userEntered,true);
 const result=calculatePreview({contracts,catalogData:[],locationData:data,ship:DEFAULT_SHIP,startId:stop('ArcCorp Mining Area 061')});
 assert.equal(result.routeReady,true);assert.equal(result.totalScu,66);assert.equal(result.packing.boxes.reduce((n,b)=>n+b.size,0),66);assert.ok(result.packing.boxes.every(b=>b.reservation));
 const selection=createPlanSelection();selection.reconcile(contracts,new Set(contracts.map(c=>c.missionId)));assert.equal(selection.selected.size,1);
});
test('supplement preserves log identity and terminal state; changed or absent source never resurrects a contract',()=>{
 const c=fixture().contract,r={...record(),id:c.missionId,binding:userContractScope(c)};
 const merged=mergeUserContracts([c],[],[r]);assert.equal(merged.length,1);assert.equal(merged[0].definitionId,c.definitionId);assert.ok(!c.userManifest);
 assert.deepEqual(mergeUserContracts([],[],[r]),[]);
 const changed={...c,gameBuild:{status:'known',value:'other'}};assert.equal(mergeUserContracts([changed],[],[r])[0].userManifest,undefined);
 assert.throws(()=>userContractPreview({...merged[0],status:'end-observed'},index));assert.throws(()=>userContractPreview({...merged[0],conflicts:['conflict']},index));
});
test('multiple pickup quotas remain unknown while every pickup precedes delivery',()=>{
 const r=record();r.rows[0].pickupIds.push(stop("Brio's Breaker Yard"));const contracts=mergeUserContracts([],[],[r]);
 const p=userContractPreview(contracts[0],index);assert.equal(p.mission.cargo[0].pickupId,null);assert.equal(p.mission.cargo[0].scu,66);
 const result=calculatePreview({contracts,catalogData:[],locationData:data,ship:DEFAULT_SHIP,startId:r.rows[0].pickupIds[0]});
 assert.equal(result.routeReady,true);const visits=result.route.visits;const delivery=visits.findIndex(v=>v.events.some(e=>e.type==='delivery'));assert.ok(r.rows[0].pickupIds.every(id=>visits.findIndex(v=>v.locationId===id&&v.events.some(e=>e.type==='pickup'))<delivery));
});
test('user-entered boxes retain size/count and invalid totals or unknown stops block planning',()=>{
 const r=record();r.rows[0].boxes=[{size:2,count:33}];const contracts=mergeUserContracts([],[],[r]);const result=calculatePreview({contracts,catalogData:[],locationData:data,ship:DEFAULT_SHIP,startId:r.rows[0].pickupIds[0]});assert.equal(result.packing.boxes.length,33);assert.ok(result.packing.boxes.every(b=>b.size===2&&!b.reservation));assert.equal(result.rows[0].boxSource,'user');
 r.rows[0].boxes[0].count=32;assert.throws(()=>checkedUserContract(r));r.rows[0].boxes=[];r.rows[0].dropoffId='unknown';assert.throws(()=>userContractPreview(mergeUserContracts([],[],[r])[0],index));
});
test('contracts sharing a destination are delivered together for both partners',()=>{
 const first=record(),second={...record(),id:'manual:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',rows:[{...record().rows[0],pickupIds:[stop("Brio's Breaker Yard")],scu:12}]};
 const contracts=mergeUserContracts([],[],[first,second]);
 for(const partner of ['navigator','operator']){const result=calculatePreview({contracts,catalogData:[],locationData:data,ship:DEFAULT_SHIP,startId:first.rows[0].pickupIds[0],partner});assert.equal(result.routeReady,true);const deliveries=result.route.visits.filter(v=>v.events.some(e=>e.type==='delivery'));assert.equal(deliveries.length,1);assert.equal(new Set(deliveries[0].events.map(e=>e.missionId)).size,2);assert.equal(new Set(result.packing.boxes.map(b=>b.missionId)).size,2);}
});
test('manual manifest persistence is owner-scoped, concurrent-safe, sanitized and included in backup',()=>{
 const s=mem(),a=createUserContracts(s),b=createUserContracts(s),r=record();a.save({...r,rawText:'not retained',screenshot:'not retained'});assert.equal(a.snapshot().records[0].rawText,undefined);assert.throws(()=>b.save(r),/다른 창/);
 const dest=mem();restoreFlightBackup(dest,exportFlightBackup(s));assert.deepEqual(createUserContracts(dest).snapshot().records,[checkedUserContract(r)]);
 s.setItem(ACCOUNT_META,JSON.stringify({uid:'other'}));assert.match(a.snapshot().error,/계정/);assert.equal(createUserContracts(s).snapshot().records.length,0);
});
test('cryopods retain their half-height footprint through planning, onboard restore, delivery and retained cargo',()=>{
 const r=record();r.rows[0]={...r.rows[0],commodity:'CryoPod',scu:2,_cargoShape:'cryopod'};
 const contracts=mergeUserContracts([],[],[r]),ship={id:'pod-test',name:'Pod test',grids:[{id:'hold',w:1,h:1,l:2,x:0,y:0,z:0,maxBoxSize:2}]};
 const plan=(extra={})=>calculatePreview({contracts,catalogData:[],locationData:data,ship,startId:r.rows[0].pickupIds[0],...extra});
 const first=plan();assert.ok(first.routeReady);assert.equal(first.totalScu,2);assert.equal(first.packing.boxes.length,2);
 assert.deepEqual(first.packing.boxes.map(b=>b.cell[1]).sort(),[0,.5]);
 assert.ok(first.packing.boxes.every(b=>b._cargoShape==='cryopod'&&b.size===1&&b.dims[1]===.5&&!b.reservation));
 assert.throws(()=>specifiedBoxes(first.rows[0],{binding:boxBinding(first.rows[0]),boxes:[{size:2,count:1}]}),/포드/);
 const storage=mem(),state=createCargoContinuity(storage);state.lock(first,first.packing.boxes.map(b=>b.boxId));
 const restored=createCargoContinuity(storage);assert.equal(restored.snapshot().error,null);
 const again=plan({continuityRecords:restored.snapshot().records});
 for(const box of first.packing.boxes){const actual=again.packing.boxes.find(b=>b.boxId===box.boxId);assert.deepEqual(actual.cell,box.cell);assert.deepEqual(actual.dims,box.dims);assert.equal(actual._cargoShape,'cryopod');}
 const upper=first.packing.boxes.find(b=>b.cell[1]===.5);restored.deliver([upper.boxId],upper.dropoffId);
 assert.equal(plan({continuityRecords:restored.snapshot().records}).totalScu,1);
 restored.undoDelivery([upper.boxId],first.ship);
 const retained=checkedCargoRecord(restored.snapshot().records[0]);
 const abandoned=plan({contracts:[],retainedRecords:[retained]});assert.equal(abandoned.retainedScu,2);assert.ok(abandoned.packing.boxes.every(b=>b._cargoShape==='cryopod'));
 const missingShape=structuredClone(retained);delete missingShape.boxes[0]._cargoShape;assert.throws(()=>checkedCargoRecord(missingShape));
 const tilted=structuredClone(retained);tilted.boxes[0].dims=[.5,1,2];assert.throws(()=>checkedCargoRecord(tilted));
 const floating=structuredClone(retained);floating.boxes[0].cell[1]=.25;assert.throws(()=>checkedCargoRecord(floating));
 const tooNarrow=plan({ship:{...ship,grids:[{...ship.grids[0],l:1,h:2}]}});assert.equal(tooNarrow.packing,null,'same SCU capacity does not imply a pod fits');
});
