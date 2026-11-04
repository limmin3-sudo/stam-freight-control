import {navigator} from '../../engine.mjs';
import {planActionRoute} from '../../route-search.mjs';
import {deliveryFirstRoute} from '../../delivery-first.mjs';
import {jumpLinks,routeEvidence} from './preview-routes.mjs';

// These are precedence constraints, not cargo shipments or invented allocations.
// The full reservation must fit at once; no partial-capacity trip is inferred.
export function connectReservationRoute(result,previews,{startId,partner='navigator'}={}){
 try{return buildRoute(result,previews,{startId,partner});}
 catch{return {...result,route:null,routeReady:false,routeHold:'항로 연결을 확인하지 못했습니다. 적재 공간은 계속 확인할 수 있습니다.'};}
}
function buildRoute(result,previews,{startId,partner}){
 const hold=message=>({...result,route:null,routeReady:false,routeHold:message});
 if(!previews.length)return hold('운송할 계약을 선택하면 항로를 준비합니다.');
 if(result.partial)return hold('일부 화물만 확인돼 전체 방문 순서를 만들지 않았습니다.');
 if(!result.packing)return hold('전체 예약 공간이 들어가지 않아 분할 운송 확인이 필요합니다.');
 const ids=new Set(result.stops.map(p=>p.id));
 if(!ids.has(startId))return hold('방문 순서를 보려면 출발지를 선택해 주세요.');
 const constraints=[];
 for(const p of previews){
  const complete=p.scope!=='destination-space-reservation'||p.visitRequirements?.complete===true;
  const pickups=p.visitRequirements?.pickups||[...new Set(p.mission.cargo.map(c=>c.pickupId))];
  const deliveries=p.visitRequirements?.deliveries||[...new Set(p.mission.cargo.map(c=>c.dropoffId))];
  if(!complete||!pickups.length||!deliveries.length||[...pickups,...deliveries].some(id=>!ids.has(id)))return hold('계약의 전체 픽업·배송 지점을 확인하고 있습니다.');
  const progress=result.cargoProgress||{};
  const allPicked=p.mission.cargo.length>0&&p.mission.cargo.every(row=>progress[row.key]?.picked);
  const pendingDeliveries=deliveries.filter(id=>{const rows=p.mission.cargo.filter(row=>row.dropoffId===id);return !rows.length||!rows.every(row=>progress[row.key]?.delivered);});
  for(const pickupId of pickups)for(const dropoffId of pendingDeliveries)constraints.push({missionId:p.mission.id,pickupId,dropoffId,picked:allPicked||p.mission.cargo.filter(row=>row.pickupId===pickupId).length>0&&p.mission.cargo.filter(row=>row.pickupId===pickupId).every(row=>progress[row.key]?.picked)});
 }
 if(!constraints.length)return hold('배송하셨다고 확인한 화물을 모두 반영했습니다. 게임 계약 완료는 로그에서 따로 확인합니다.');
 if(constraints.length>48)return hold('방문 조건이 많습니다. 계획할 계약을 나누어 선택해 주세요.');
 const nav=navigator({locations:result.stops,jumps:jumpLinks.filter(j=>ids.has(j.from)&&ids.has(j.to))},{});
 const initial={status:constraints.map(c=>c.picked?1:0),at:startId,cost:0,actions:[]};
 const indices=new Map();constraints.forEach((c,i)=>{if(!indices.has(c.missionId))indices.set(c.missionId,[]);indices.get(c.missionId).push(i);});
 function advance(state,i){
  const c=constraints[i],stage=state.status[i];if(stage===2)return null;
  // Every pickup for this contract precedes every delivery, irrespective of quota.
  if(stage===1&&indices.get(c.missionId).some(j=>state.status[j]===0))return null;
  const locationId=stage===0?c.pickupId:c.dropoffId,leg=nav.path(state.at,locationId);
  if(!Number.isFinite(leg.seconds))return null;
  const status=[...state.status];status[i]++;
  return {status,at:locationId,cost:state.cost+leg.seconds,actions:[...state.actions,{type:stage===0?'pickup':'delivery',locationId,missionId:c.missionId,leg}]};
 }
 let planned;
 if(partner==='operator')planned=deliveryFirstRoute(constraints,nav,initial,advance);
 else{
  const proposal=constraints.some(c=>c.picked)?null:planActionRoute(constraints,startId,nav);
  if(proposal){planned=initial;for(const a of proposal.actions){planned=advance(planned,a.shipmentIndex);if(!planned)break;}}
  if(!planned){
   planned=initial;
   // Bounded fallback for cyclic/large stop graphs. Retain source-system pickups
   // before crossing, and do all available work at a visited location.
   for(let n=0;n<constraints.length*2&&planned.status.some(s=>s!==2);n++){
    const options=constraints.map((c,i)=>({i,next:advance(planned,i),c})).filter(o=>o.next);
    const here=options.filter(o=>o.next.at===planned.at),system=nav.byId.get(planned.at)?.system;
    const localPickups=options.filter(o=>planned.status[o.i]===0&&nav.byId.get(o.c.pickupId)?.system===system);
    const pool=here.length?here:localPickups.length?options.filter(o=>nav.byId.get(o.next.at)?.system===system):options;
    pool.sort((a,b)=>{const x=a.next.actions.at(-1).leg,y=b.next.actions.at(-1).leg;return x.jumps-y.jumps||x.meters-y.meters||x.seconds-y.seconds||a.i-b.i;});
    if(!pool.length)return hold('확인된 점프 연결로 방문 순서를 만들 수 없습니다.');planned=pool[0].next;
   }
  }
 }
 if(planned.status.some(s=>s!==2))return hold('픽업 선행 조건을 만족하는 방문 순서를 확인하지 못했습니다.');
 const visits=[{locationId:startId,events:[{type:'departure'}],load:null,elapsed:0,seconds:0,leg:{nodes:[startId],meters:0,seconds:0,jumps:0}}];
 const seen=new Set();let elapsed=0;
 for(const action of planned.actions){
  const key=JSON.stringify([action.missionId,action.type,action.locationId]);if(seen.has(key))continue;seen.add(key);
  const last=visits.at(-1),leg=nav.path(last.locationId,action.locationId);elapsed+=leg.seconds;
  const event={type:action.type,missionId:action.missionId,allocationKnown:false};
  if(last.locationId===action.locationId)last.events.push(event);
  else visits.push({locationId:action.locationId,events:[event],load:null,elapsed,seconds:leg.seconds,leg});
 }
 const route={scope:'visit-order-with-reserved-space',visits,seconds:elapsed,peak:null,handlingIncluded:false,
  algorithm:partner==='operator'?'오퍼레이터 · 계약 완료 우선, 모든 픽업 선행':'수석 항해사 · 픽업을 모은 뒤 배송',settings:{startId,routePolicy:partner==='operator'?'delivery-first':'batch'}};
 return {...result,route,routeReady:true,routeHold:null,routeEvidence,partner};
}
