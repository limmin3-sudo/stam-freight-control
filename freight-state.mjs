import {validateCrew,crewTotals} from './crew-trade.mjs';
const mapBy=(rows,key)=>Object.fromEntries(rows.map(row=>[row[key],row]));
export function encodeFreightState(op){
 validateCrew(op);return {...op,members:mapBy(op.members,'uid'),memberOrder:op.members.map(m=>m.uid),assignments:mapBy(op.assignments,'id'),assignmentOrder:op.assignments.map(a=>a.id),events:mapBy(op.events,'id'),eventOrder:op.events.map(e=>e.id),rejections:mapBy(op.rejections||[],'id'),rejectionOrder:(op.rejections||[]).map(r=>r.id)};
}
export function decodeFreightState(state,assignments=null){
 const {memberOrder,assignmentOrder,eventOrder,rejectionOrder,...op}=state;
 for(const [key,order] of [['members',memberOrder],['assignments',assignmentOrder],['events',eventOrder],['rejections',rejectionOrder]]){
  if(!Array.isArray(order)||new Set(order).size!==order.length||Object.keys(op[key]||{}).length!==order.length||order.some(id=>!op[key][id]))throw Error('crew-integrity');
  op[key]=order.map(id=>op[key][id]);
 }
 if(assignments)op.assignments=assignments;
 return validateCrew(op);
}
export function freightAccounting(op){
 const totals=crewTotals(op),started=[...new Set(op.events.filter(e=>!e.voidedAt&&e.assignmentId).map(e=>e.assignmentId))].sort();
 return {cash:totals.cash,lots:Object.fromEntries(started.map(id=>[id,{bought:totals.cargo[id].bought,quantity:totals.cargo[id].quantity}])),aboard:Object.fromEntries([...new Set(started.map(id=>op.assignments.find(a=>a.id===id).uid))].sort().map(uid=>[uid,op.assignments.filter(a=>a.uid===uid).reduce((sum,a)=>sum+totals.cargo[a.id].quantity,0)])),started};
}
export function packFreeCrew(op,previous={}){
 return {engine:'firestore-v3',fleetId:previous.fleetId||'',ownerUid:op.ownerUid,memberIds:op.members.filter(m=>m.active).map(m=>m.uid),participantIds:op.members.map(m=>m.uid),managerIds:op.members.filter(m=>m.active&&['leader','officer'].includes(m.role)).map(m=>m.uid),phase:op.phase,revision:op.revision,settlementId:op.settlement?.id||'',state:{...encodeFreightState(op),assignments:{},assignmentOrder:[]},accounting:freightAccounting(op)};
}
