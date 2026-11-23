import {namedCargoGoal} from '../../objective-text.mjs';

const cargoKey=name=>name.trim().normalize('NFKC').toLowerCase();
const orderId=/^(pickup|dropoff)_([\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}_\d+)$/i;

// Each suffix identifies an order within this one mission instance. Identical
// commodities at different stops are common, so the item name alone is not a key.
export function cargoGoals(notices){
 const groups=new Map();
 for(const event of notices||[]){
  const id=event.objectiveId?.match(orderId),goal=namedCargoGoal(event.notification);
  if(!id||!goal||goal.role!==id[1].toLowerCase())continue;
  const suffix=id[2].toLowerCase(),key=suffix+'|'+cargoKey(goal.commodity);
  if(!groups.has(key))groups.set(key,{suffix,commodity:goal.commodity,pickup:new Set(),dropoff:new Set()});
  groups.get(key)[goal.role].add(goal.place);
 }
 return [...groups.values()];
}

export function mergeCargoGoals(rows,groups,byName,markers){
 const original=[...rows];
 for(const group of groups){
  const sameItem=original.filter(r=>cargoKey(r.commodity)===cargoKey(group.commodity));
  const exact=sameItem.filter(r=>r._objectiveId?.toLowerCase()==='dropoff_'+group.suffix||
   r._catalog?.objectives?.some(id=>id+'_'+r._catalog.orderIndex===group.suffix));
  let row;
  if(exact.length===1)row=exact[0];
  else if(sameItem.length&&!sameItem.every(r=>!r._catalog&&r._objectiveId&&r._objectiveId.toLowerCase()!=='dropoff_'+group.suffix)){
   // A row explicitly bound to another order must never take this order's stops.
   if(sameItem.length!==1||sameItem[0]._objectiveId||groups.filter(g=>cargoKey(g.commodity)===cargoKey(group.commodity)).length!==1)continue;
   row=sameItem[0];
  }else{
   row={commodity:group.commodity,scu:'',pickupId:'',dropoffId:'',boxes:[]};
   rows.push(row);
  }
  for(const role of ['pickup','dropoff']){
   const labels=[...group[role]],ids=new Set(labels.map(byName).filter(Boolean));
   for(const m of markers)if(m.objectiveId?.toLowerCase()===role+'_'+group.suffix&&m.role===role&&m.pointId)ids.add(m.pointId);
   if(row[role+'Id'])ids.add(row[role+'Id']);
   if(labels.length===1)row['_'+role+'Text']=labels[0];
   if(ids.size>1){row[role+'Id']='';row._locationConflict=true;}
   else if(ids.size===1)row[role+'Id']=[...ids][0];
  }
 }
}
