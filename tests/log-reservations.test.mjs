import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {reservationPreview,calculateReservations,boxBinding,specifiedBoxes} from '../integration/log/reservations.mjs';
import {previewReadiness,calculatePreview} from '../integration/log/preview-packing.mjs';
import {definitionIndex} from '../integration/log/catalog.mjs';import {DEFAULT_SHIP} from '../ships.mjs';
import {fixture,index,data} from './helpers/log-preview.mjs';
const catalog=definitionIndex(JSON.parse(readFileSync(new URL('../data/log-mission-index.json',import.meta.url))));
import {mediumFixture} from './helpers/log-reservations.mjs';
const synthetic=(scu=66)=>{
 const c=fixture().contract,id=c.markerObservations[1].objectiveId;
 c.quantityObservations=[{missionId:c.missionId,objectiveId:id,total:scu,current:0,unit:'SCU',notification:`New Objective: Deliver 0/${scu} SCU of Pollen to the destination`}];
 const cat=new Map(catalog),d=cat.get(c.definitionId);cat.set(c.definitionId,{...d,rules:{...d.rules,orders:[{kind:'Resource',name:'Pollen',maxBoxScu:null}]}});
 return {c,cat,preview:reservationPreview(c,cat,index)};
};
test('medium reserves corroborated destination totals without inventing pickup quotas or exact boxes',()=>{
 const c=mediumFixture(),r=previewReadiness(c,catalog,index);assert.equal(r.ready,true);assert.equal(r.reservation,true);
 assert.deepEqual(r.preview.mission.cargo.map(x=>x.scu),[24,12,14]);assert.ok(r.preview.mission.cargo.every(x=>!x.pickupId&&x.boxes.length===0));
 const result=calculatePreview({contracts:[c],catalogData:[...catalog],locationData:data,ship:DEFAULT_SHIP});
 assert.equal(result.totalScu,50);assert.equal(result.route,null);assert.equal(result.currentInventoryVerified,false);assert.ok(result.packing);
 const wrong=structuredClone(c);wrong.gameBuild.value='new-build';assert.throws(()=>reservationPreview(wrong,catalog,index));
});
test('66 SCU means 32+32+2 virtual guides, not an assertion of three physical boxes',()=>{
 const {preview}=synthetic(),result=calculateReservations([preview],DEFAULT_SHIP,data.locations);
 assert.deepEqual(result.packing.boxes.map(b=>b.size).sort((a,b)=>b-a),[32,32,2]);assert.equal(result.totalScu,66);assert.equal(result.partial,true);assert.equal(result.routeReady,false);
 assert.ok(result.packing.boxes.every(b=>b.reservation));
});
test('two contracts for one destination share its color and packing group, retaining ownership',()=>{
 const {preview:a}=synthetic(32),b=structuredClone(a);b.mission.id='22222222-2222-4222-8222-222222222222';b.mission.cargo[0].key=b.mission.id+':other';
 const r=calculateReservations([a,b],DEFAULT_SHIP,data.locations);
 assert.equal(new Set(r.packing.boxes.map(b=>b.color)).size,1);assert.equal(new Set(r.packing.boxes.map(b=>b.missionId)).size,2);assert.equal(new Set(r.packing.boxes.map(b=>b.boxId)).size,2);assert.equal(r.totalScu,64);
});
test('small grids divide virtual guides, but never change explicitly specified box counts',()=>{
 const {preview}=synthetic(32),small={...DEFAULT_SHIP,id:'tiny-test',grids:[{id:'only',name:'Only',x:0,y:0,z:0,w:4,h:2,l:4}]};
 const r=calculateReservations([preview],small,data.locations);assert.ok(r.packing);assert.ok(r.subdivided);assert.equal(r.totalScu,32);assert.ok(r.packing.boxes.every(b=>b.size<32));
 const row=preview.mission.cargo[0],overrides={[row.key]:{binding:boxBinding(row),boxes:[{size:32,count:1}]}};
 const exact=calculateReservations([preview],small,data.locations,overrides);assert.equal(exact.packing,null);assert.equal(exact.boxCount,1);assert.equal(exact.rows[0].boxSource,'user');
});
test('manual size/count validates totals and invalidates on changed cargo, without editing another contract',()=>{
 const {preview}=synthetic(),row=preview.mission.cargo[0],value={binding:boxBinding(row),boxes:[{size:16,count:4},{size:2,count:1}]};
 assert.equal(specifiedBoxes(row,value).length,2);assert.throws(()=>specifiedBoxes(row,{...value,boxes:[{size:16,count:4}]}),/2 SCU 부족/);
 assert.throws(()=>specifiedBoxes({...row,scu:64},value),/바뀌었습니다/);
 assert.throws(()=>specifiedBoxes(row,{...value,boxes:[{size:2,count:33.5}]}),/올바르지/);
 const r=calculateReservations([preview],DEFAULT_SHIP,data.locations,{[row.key]:value});assert.equal(r.boxCount,5);assert.equal(r.estimated,false);assert.equal(r.rows[0].boxSource,'user');
});
test('unmapped or ambiguous quantities cannot become complete cargo or use neighboring objective markers',()=>{
 const {c,cat}=synthetic();c.quantityObservations[0].objectiveId+='9';assert.throws(()=>reservationPreview(c,cat,index));
 const s=synthetic();s.c.quantityObservations.push({...s.c.quantityObservations[0],total:99});assert.throws(()=>reservationPreview(s.c,s.cat,index));
 const t=synthetic();t.c.quantityObservations[0].notification='unknown commodity';assert.throws(()=>reservationPreview(t.c,t.cat,index));
});
