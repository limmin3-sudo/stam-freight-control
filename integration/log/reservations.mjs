import {applyCargoContinuity} from './cargo-continuity.mjs';
import {contractLocations} from './locations.mjs';
import {definitionReference} from './catalog.mjs';
import {SIZES,fullLoadLayout,COLORS} from '../../engine.mjs';
import {validateShip,withStacking} from '../../ships.mjs';
import {fixedRetained} from './retained-cargo.mjs';

const medium='6f207f9c-0575-4a88-82f8-ccc348eab9da',objective='7ad329fd-b582-4675-91ed-c474102627b7';
const mediumTotals=[['Nitrogen',24,8,12],['Organics',12,4,6],['Ranta Dung',14,2,7]];
const escaped=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const rowKey=(c,id)=>`${c.missionId}:${id}`;
// Binary guide volumes subdivide cleanly. 24 SCU remains a valid real/manual
// crate, but is not a universal envelope for smaller standard containers.
const guideSizes=scu=>{const out=[];for(const size of [32,16,8,4,2,1]){while(scu>=size){out.push(size);scu-=size;}}return out;};
// This returns destination volume, never pickup allocation or an actual recipe.
export function reservationPreview(contract,catalog,index){
 if(contract.conflicts?.length||contract.definitionObservations?.length!==1)throw Error('계약 기록 충돌을 확인해 주세요.');
 const reference=definitionReference(contract,catalog);
 const resources=rows=>(rows||[]).flatMap(o=>o.kind==='Or'?o.options.flatMap(resources):o.kind==='Resource'?[o]:[]);
 const orders=resources(reference.rules?.orders);
 if(!orders.length)throw Error('이 화물 유형의 적재 공간 가이드는 아직 지원하지 않습니다.');
 const compared=contractLocations(contract,index),destinations=compared.objectives.filter(o=>o.role==='dropoff');
 if(compared.objectives.some(o=>o.status!=='coordinate-match'||o.quantityConflict))throw Error('배송 좌표·수량을 먼저 확인해야 합니다.');
 const rows=[],pending=[];
 // A user-corroborated fixed total and single delivery for this exact type/build.
 // The public pickup mapping is contradictory: intentionally never use it.
 const mediumMatch=contract.definitionId===medium&&contract.gameBuild?.value==='12913470'&&contract.gameBuild?.status==='known';
 if(mediumMatch){
  const expected=new Set([`pickup_${objective}_0`,`pickup_${objective}_3`,`dropoff_${objective}_0`]);
  if(compared.objectives.length!==3||compared.objectives.some(o=>!expected.has(o.objectiveId))||destinations.length!==1)throw Error('중형 계약의 전체 목표 지점을 확인하고 있습니다.');
  for(const q of contract.quantityObservations||[]){
   const i=mediumTotals.findIndex((_,i)=>q.objectiveId===`dropoff_${objective}_${i}`);
   if(i<0||q.unit!=='SCU'||q.total!==mediumTotals[i][1])throw Error('중형 계약의 수량이 확인된 유형과 다릅니다.');
  }
  for(const [commodity,scu,cap,part] of mediumTotals){
   const matches=orders.filter(o=>o.name===commodity);
   if(matches.length!==2||matches.some(o=>o.maxBoxScu!==cap||!((o.minScu===part&&o.maxScu===null)||(o.maxScu===part&&o.minScu===null)||(o.minScu===part&&o.maxScu===part))))throw Error('공개 주문 규칙이 달라 중형 적재 가이드를 보류합니다.');
   rows.push({key:rowKey(contract,commodity),commodity,scu,maxBoxSize:32,publicMaxBoxSize:cap,parts:[scu],dropoffId:destinations[0].candidates[0].id,boxes:[]});
  }
 }else{
  const groups=new Map();for(const q of contract.quantityObservations||[]){if(q.missionId!==contract.missionId)continue;if(!groups.has(q.objectiveId))groups.set(q.objectiveId,[]);groups.get(q.objectiveId).push(q);}
  for(const [id,events] of groups){
   const marker=destinations.find(o=>o.objectiveId===id),totals=new Set(events.map(q=>q.total));
   const names=new Set();for(const q of events){const hits=[...new Set(orders.map(o=>o.name).filter(n=>typeof n==='string'&&new RegExp(`(?<![A-Za-z])${escaped(n)}(?![A-Za-z])`,'i').test(q.notification||'')))];if(hits.length!==1){names.add(null);continue;}names.add(hits[0]);}
   const total=events[0]?.total,name=[...names][0],matches=orders.filter(o=>o.name===name),caps=new Set(matches.map(o=>o.maxBoxScu));
   if(!marker||events.some(q=>q.unit!=='SCU')||totals.size!==1||names.size!==1||!name||!Number.isSafeInteger(total)||total<1||total>10000){pending.push(id);continue;}
   rows.push({key:rowKey(contract,id),commodity:name,scu:total,maxBoxSize:32,publicMaxBoxSize:caps.size===1&&SIZES.includes([...caps][0])?[...caps][0]:null,limitSource:'reservation-guide',parts:[total],dropoffId:marker.candidates[0].id,boxes:[]});
  }
 }
 if(!rows.length)throw Error('배송지·품목·수량이 함께 확인된 화물을 기다리고 있습니다.');
 return {scope:'destination-space-reservation',mission:{id:contract.missionId,title:contract.title,cargo:rows},
  evidence:{source:reference.source,version:reference.version,allocation:'pickup-unresolved',boxComposition:'estimated-space-only',totals:mediumMatch?'user-corroborated-fixed-type':'exact-objective-log-notices'},
  ...(mediumMatch?{visitRequirements:{complete:true,pickups:[...new Set(compared.objectives.filter(o=>o.role==='pickup').map(o=>o.candidates[0].id))],deliveries:destinations.map(o=>o.candidates[0].id)}}:{}),
  partial:!mediumMatch,pendingObjectives:pending.length,routeReady:false,currentInventoryVerified:false,remainingCargoVerified:false};
}
export function boxBinding(row){return JSON.stringify([row.key,row.commodity,row.scu,row.dropoffId,row.maxBoxSize,row.parts,row.pickupId||null,row.publicMaxBoxSize||null,...(row._cargoShape?[row._cargoShape]:[])]);}
export function specifiedBoxes(row,value){
 if(!value)return null;
 if(value.binding!==boxBinding(row))throw Error('화물 정보가 바뀌었습니다. 직접 지정한 상자 구성을 다시 확인해 주세요.');
 if(!Array.isArray(value.boxes)||!value.boxes.length||value.boxes.length>SIZES.length)throw Error('상자 크기와 개수를 입력해 주세요.');
 let total=0,count=0;const sizes=new Set();
 for(const b of value.boxes){if(!SIZES.includes(b.size)||sizes.has(b.size)||!Number.isSafeInteger(b.count)||b.count<1||b.count>2048)throw Error('상자 크기·개수가 올바르지 않습니다.');sizes.add(b.size);total+=b.size*b.count;count+=b.count;}
 if(row._cargoShape==='cryopod'&&value.boxes.some(b=>b.size!==1))throw Error('냉동포드는 개당 1 SCU입니다. 포드를 큰 상자로 합칠 수 없습니다.');
 if(total!==row.scu)throw Error(`상자 합계 ${total} SCU · 필요한 화물 ${row.scu} SCU입니다. ${Math.abs(total-row.scu)} SCU ${total<row.scu?'부족합니다':'초과합니다'}.`);
 if(count>2048)throw Error('상자는 2,048개까지 지정할 수 있습니다.');
 return value.boxes.map(b=>({...b}));
}
export function calculateReservations(previews,rawShip,stops,overrides={},retainedRecords=[],continuityRecords=[],cargoRows=[]){
 const ship=withStacking(validateShip(rawShip)),rows=previews.flatMap(p=>p.mission.cargo.map((r,i)=>({...r,key:r.key||`${p.mission.id}:${i}`,missionId:p.mission.id})));
 const fixed=fixedRetained(ship,retainedRecords);
 if(rows.some(r=>fixed.some(b=>b.missionId===r.missionId)))throw Error('제외한 계약의 화물이 남아 있습니다. 남은 화물을 먼저 확인해 주세요.');
 if(rows.length>64)throw Error('예약할 화물 항목은 64개까지입니다.');
 const ids=[...new Set(rows.map(r=>r.dropoffId))].sort(),groups=[];let count=0;
 for(const row of rows){
  const manual=specifiedBoxes(row,overrides[row.key]);
  const recipe=manual||row.boxes?.length&&row.boxes;
  const sizes=recipe?recipe.flatMap(b=>Array(b.count).fill(b.size)):guideSizes(row.scu);
  count+=sizes.length;if(count>2048)throw Error('예약 블록이 2,048개를 넘습니다. 계약을 나누어 선택해 주세요.');
  row.boxSource=manual?'user':recipe?(row.boxSource==='user'?'user':'profile'):'estimate';row.blockCount=sizes.length;
  groups.push({key:row.key,rank:ids.indexOf(row.dropoffId)/Math.max(1,ids.length-1),items:sizes.map((size,i)=>({size,...(row._cargoShape?{_cargoShape:row._cargoShape}:{}),boxId:`${row.key}:reserve:${i}`,missionId:row.missionId,shipmentId:row.key,commodity:row.commodity,dropoffId:row.dropoffId,color:COLORS[ids.indexOf(row.dropoffId)%COLORS.length],reservation:row.boxSource==='estimate'}))});
 }
 const continuity=applyCargoContinuity(groups,cargoRows,ship,continuityRecords,retainedRecords);
 for(const box of continuity.fixed)if(ids.includes(box.dropoffId))box.color=COLORS[ids.indexOf(box.dropoffId)%COLORS.length];
 const allFixed=[...fixed,...continuity.fixed];
 if(allFixed.length+groups.reduce((n,g)=>n+g.items.length,0)>2048)throw Error('남은 화물을 포함한 배치가 2,048개를 넘습니다. 계획할 계약을 나누어 주세요.');
 count=allFixed.length+groups.reduce((n,g)=>n+g.items.length,0);
 let packing=fullLoadLayout(groups,allFixed,ship),subdivided=false;
 // Only virtual guides may be divided to fit small/disabled grids. Never
 // change the counts of user-specified or confirmed physical boxes.
 for(let pass=0;!packing&&pass<5;pass++){
  const largest=Math.max(0,...groups.flatMap(g=>g.items.filter(b=>b.reservation).map(b=>b.size)));
  if(largest<=1)break;
  const extra=groups.reduce((n,g)=>n+g.items.filter(b=>b.reservation&&b.size===largest).length,0);
  if(count+extra>2048)break;
  for(const g of groups)g.items=g.items.flatMap(b=>b.reservation&&b.size===largest?[0,1].map(i=>({...b,size:b.size/2,boxId:b.boxId+':'+i})):b);
  count+=extra;subdivided=true;packing=fullLoadLayout(groups,allFixed,ship);
 }
 for(const row of rows){row.blockCount=(packing?.boxes||[...allFixed,...groups.flatMap(g=>g.items)]).filter(b=>b.shipmentId===row.key||b.rowKey===row.key).length;row.deliveredScu=continuity.progress[row.key]?.deliveredScu||0;row.remainingScu=row.scu-row.deliveredScu;}
 count=(packing?.boxes||[...allFixed,...groups.flatMap(g=>g.items)]).filter(b=>!b.retained).length;
 return {scope:'destination-space-reservation',ship,packing,rows,stops,route:null,routeReady:false,cargoProgress:continuity.progress,aboard:continuity.fixed,aboardScu:continuity.fixed.reduce((n,b)=>n+b.size,0),deliveredScu:Object.values(continuity.progress).reduce((n,p)=>n+p.deliveredScu,0),retained:fixed,retainedScu:fixed.reduce((n,b)=>n+b.size,0),
  contracts:previews.map(p=>({id:p.mission.id,title:p.mission.title})),contractCount:previews.length,
  estimated:rows.some(r=>r.boxSource==='estimate'),subdivided,boxCount:count,totalScu:rows.reduce((n,r)=>n+r.remainingScu,0),originalScu:rows.reduce((n,r)=>n+r.scu,0),partial:previews.some(p=>p.partial),
  currentInventoryVerified:false,remainingCargoVerified:false};
}
