// Actual delivery totals belong to one accepted mission and destination. They
// never imply a quantity at an individual pickup whose allocation is unknown.
export const actualQuantity=row=>Number.isSafeInteger(row.scu)&&row.scu>0&&row.scu<=10000&&!row._scuEstimated&&!row._scuAssumed;
export function deliveryGroups(mission){
 const groups=new Map();for(const [index,row] of (mission.cargo||[]).entries()){const key=row.dropoffId||'';if(!groups.has(key))groups.set(key,{dropoffId:key,rows:[],indices:[]});const group=groups.get(key);group.rows.push(row);group.indices.push(index);}
 for(const group of groups.values()){
  const totals=(mission._deliveryTotals||[]).filter(t=>t.dropoffId===group.dropoffId),entered=totals.length===1?totals[0].scu:null;
  group.unknown=group.rows.filter(row=>!actualQuantity(row));group.known=group.rows.filter(actualQuantity).reduce((n,row)=>n+row.scu,0);
  group.total=Number.isSafeInteger(entered)&&entered>0&&entered<=group.rows.length*10000&&(group.unknown.length?entered>=group.known+group.unknown.length:entered===group.known)?entered:null;
  group.reservation=!!group.dropoffId&&group.total!==null&&group.unknown.length>0;
  group.scu=group.total??group.rows.reduce((n,row)=>n+(Number.isSafeInteger(row.scu)&&row.scu>0?row.scu:0),0);
 }
 return [...groups.values()];
}
export const missionSCU=mission=>deliveryGroups(mission).reduce((n,group)=>n+group.scu,0);
export const hasUpperBound=mission=>deliveryGroups(mission).some(group=>!group.reservation&&group.rows.some(row=>row._scuEstimated));
export const quantitiesReady=mission=>deliveryGroups(mission).every(group=>group.reservation||group.rows.every(actualQuantity));
export function reservationJobs(mission){
 const excluded=new Set(),jobs=[];
 for(const group of deliveryGroups(mission).filter(group=>group.reservation)){
  group.indices.forEach(index=>excluded.add(index));
  const pickupIds=[...new Set(group.rows.map(row=>row.pickupId))],id=mission.id+':delivery:'+encodeURIComponent(group.dropoffId),reservation={id,scu:group.total,dropoffId:group.dropoffId,pickupIds,commodity:[...new Set(group.rows.map(row=>row.commodity))].join(' / '),rows:group.rows};
  for(const pickupId of pickupIds){const rows=group.rows.filter(row=>row.pickupId===pickupId);jobs.push({id:id+':pickup:'+encodeURIComponent(pickupId||''),missionId:mission.id,pickupId,dropoffId:group.dropoffId,commodity:[...new Set(rows.map(row=>row.commodity))].join(' / '),scu:rows.every(actualQuantity)?rows.reduce((n,row)=>n+row.scu,0):null,boxes:[],estimated:true,reservation});}
 }
 return {jobs,excluded};
}
export const shipmentBoxes=shipment=>shipment.reservation?.boxes||shipment.boxes||[];
const members=(shipments,index)=>shipments.map((s,i)=>s.reservation?.id===shipments[index].reservation?.id?i:-1).filter(i=>i>=0);
export function shipmentReady(shipments,status,index){
 if(status[index]===2)return false;
 return status[index]!==1||!shipments[index].reservation||members(shipments,index).every(i=>status[i]>0);
}
export function transitionBoxes(shipments,status,index){
 const shipment=shipments[index];if(!shipment.reservation)return shipment.boxes||[];
 return firstReservationAction(shipments,status,index)?shipmentBoxes(shipment):[];
}
const firstReservationAction=(shipments,status,index)=>{const group=members(shipments,index);return status[index]===0?group.every(i=>status[i]===0):group.every(i=>status[i]!==2);};
export function activeShipmentBoxes(shipments,status){
 const seen=new Set(),out=[];for(const [index,shipment] of shipments.entries()){
  const active=shipment.reservation?members(shipments,index).some(i=>status[i]===1)&&members(shipments,index).every(i=>status[i]!==2):status[index]===1;
  if(active)for(const box of shipmentBoxes(shipment))if(!seen.has(box.boxId)){seen.add(box.boxId);out.push(box);}
 }return out;
}
export function reservationEvent(shipments,status,index){
 const shipment=shipments[index];if(!shipment.reservation)return {scu:shipment.scu||0};
 const first=firstReservationAction(shipments,status,index),reservation=shipment.reservation,pickup=status[index]===0;
 return {scu:pickup?(shipment.scu??0):first?reservation.scu:0,reservationId:reservation.id,reservationScu:reservation.scu,reservationDelta:first?(pickup?reservation.scu:-reservation.scu):0,reservationStart:pickup&&first,pickupQuantityUnknown:pickup&&shipment.scu===null,reservationContinuation:!pickup&&!first};
}
