// Replay a user-selected stop list without merging contracts or inventing cargo.
export function replayManualStops(stops,shipments,nav,initial,advance){
 if(!Array.isArray(stops)||!stops.length||stops.length>128)throw Error('방문 거점은 1–128곳으로 지정해 주세요.');
 let state=initial;
 for(const locationId of stops){
  if(!nav.byId.has(locationId))throw Error('목록에서 유효한 거점을 선택해 주세요.');
  state=advance(state,null,locationId);
  // Unload this destination's cargo first, freeing space for all feasible pickups.
  for(let i=0;i<shipments.length;i++)if(state.status[i]===1&&shipments[i].dropoffId===locationId)state=advance(state,i);
  const pickups=shipments.map((s,i)=>({s,i})).filter(({s,i})=>state.status[i]===0&&s.pickupId===locationId).sort((a,b)=>(b.s.scu||0)-(a.s.scu||0));
  for(const {i}of pickups){const next=advance(state,i);if(next)state=next;}
  for(let i=0;i<shipments.length;i++)if(state.status[i]===1&&shipments[i].dropoffId===locationId)state=advance(state,i);
 }
 const missing=shipments.flatMap((s,i)=>state.status[i]===2?[]:[nav.byId.get(state.status[i]===0?s.pickupId:s.dropoffId)?.name]).filter(Boolean);
 if(missing.length)throw Error('화물 작업을 끝낼 수 없습니다. 픽업 후 배송 순서·적재 한도를 확인하고 다음 거점을 포함해 주세요: '+[...new Set(missing)].join(', '));
 return state;
}
