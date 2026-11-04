// Goal/terminal evidence is separate from packing, current inventory and account income.
const terminalState = Object.freeze({MISSION_STATE_COMPLETED:'Complete',MISSION_STATE_FAILED:'Fail'});
const order=(a,b)=>a.at.localeCompare(b.at);
export function contractProgress(contract){
 const endings=(contract.endingObservations||[]).filter(e=>e.actor!=='other');
 const notices=contract.terminalObservations||[],service=contract.missionStateObservations||[];
 const direct=[...notices,...endings.filter(e=>e.actor==='self')];
 const known=[...endings,...notices,...service.map(e=>({...e,completion:terminalState[e.state]})).filter(e=>e.completion)];
 const outcomes=new Set(known.map(e=>e.completion));
 const conflict=outcomes.size>1||(contract.conflicts||[]).length>0;
 const latest=[...direct].sort(order).at(-1);
 const outcome=conflict?'conflict':latest?({Complete:'completed',Fail:'failed',Abandon:'abandoned'}[latest.completion]||'ended-unverified'):
   endings.length||service.length?'ended-unverified':'unconfirmed';
 const groups=new Map();
 for(const e of [...(contract.markerObservations||[]),...(contract.quantityObservations||[]),...(contract.objectiveStateObservations||[])]){
  if(e.missionId!==contract.missionId||!e.objectiveId)continue;
  if(!groups.has(e.objectiveId))groups.set(e.objectiveId,[]);groups.get(e.objectiveId).push(e);
 }
 const goals=[...groups].map(([objectiveId,rows])=>{
  rows.sort(order);const markers=rows.filter(e=>e.type==='marker-observed'),states=rows.filter(e=>e.type==='objective-state-observed'),quantities=rows.filter(e=>e.type==='quantity-observed');
  const last=states.at(-1),lastStates=new Set(states.filter(e=>e.at===last?.at).map(e=>e.state));
  const roles=new Set(markers.map(e=>e.role));
  const totals=new Set(quantities.map(e=>e.total)),q=quantities.at(-1),lastAmounts=new Set(quantities.filter(e=>e.at===q?.at).map(e=>e.current));
  const regressed=quantities.some((e,i)=>i>0&&e.current<quantities[i-1].current);
  const quantityConflict=totals.size>1||lastAmounts.size>1||regressed;
  const state=lastStates.size>1?'conflict':({MISSION_OBJECTIVE_STATE_COMPLETED:'completed',MISSION_OBJECTIVE_STATE_FAILED:'failed',MISSION_OBJECTIVE_STATE_INPROGRESS:'in-progress'}[last?.state]||'unconfirmed');
  return {objectiveId,role:roles.size===1?[...roles][0]:'unknown',state,at:last?.at??q?.at??null,
   quantity:q&&!quantityConflict?{current:q.current,total:q.total,unit:'SCU',at:q.at}:null,quantityConflict};
 }).sort((a,b)=>a.objectiveId.localeCompare(b.objectiveId));
 return {outcome,observedAt:latest?.at??[...known,...service].sort(order).at(-1)?.at??null,
  goals,observedGoals:goals.length,completedGoals:goals.filter(g=>g.state==='completed').length,
  currentInventoryVerified:false,remainingCargoVerified:false,accountHistoryWritten:false};
}

export function rewardObservations(awards,contracts){
 const byId=new Map(contracts.map(c=>[c.missionId,c]));
 return [...awards].sort((a,b)=>b.at.localeCompare(a.at)||a.notificationId.localeCompare(b.notificationId)).map(e=>{
  const c=e.missionId?byId.get(e.missionId):null;
  return {at:e.at,amount:e.amount,currency:'aUEC',notificationId:e.notificationId,source:{...e.source},
   missionId:e.missionId,attribution:c?'exact-mission-id':'unassigned',title:c?.title??null,
   // No nearest-event matching or automatic history write, even for exact IDs.
   accountHistoryWritten:false};
 });
}
