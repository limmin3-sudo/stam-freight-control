// Operator-only routing. Navigator batch search remains in route-search.mjs.
// Each contract is a focus until complete; nearby pickups may fit along its next leg, with delivery later.
// advance() is the same real grid/resume validator used by the navigator.
const cmp=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
export function deliveryFirstRoute(shipments,nav,initial,advance,{avoidFirst=null}={}){
 let state=initial,focus=null,detourLeft=0;
 const remaining=initial.status.reduce((n,s)=>n+2-s,0),missionOf=i=>shipments[i].missionId||shipments[i].id||String(i);
 const unfinished=(st,id)=>shipments.map((s,i)=>i).filter(i=>st.status[i]<2&&missionOf(i)===id);
 // A cheap completion estimate, not a claim of an optimal route. Include every remaining delivery,
 // so a nearby pickup of a complicated contract does not hide its distant remaining work.
 function estimate(id){const status=[...state.status];let at=state.at,seconds=0,jumps=0,stops=0;const indices=unfinished(state,id);
  while(indices.some(i=>status[i]<2)){const ready=indices.filter(i=>status[i]<2),aboard=ready.filter(i=>status[i]===1),pool=aboard.length?aboard:ready;
   const candidates=pool.map(i=>{const s=shipments[i],to=status[i]===0?s.pickupId:s.dropoffId,leg=nav.path(at,to);return {i,to,leg};}).sort((a,b)=>cmp([a.leg.jumps||0,a.leg.seconds,a.i],[b.leg.jumps||0,b.leg.seconds,b.i]));
   const next=candidates[0];if(!next)break;seconds+=next.leg.seconds;stops+=Number(next.to!==at);jumps+=next.leg.jumps||0;at=next.to;status[next.i]++;
  }
  return {seconds,jumps,stops,scu:indices.reduce((n,i)=>n+(shipments[i].scu||0),0)};
 }
 // An incidental pickup must leave enough space to finish the priority contract,
 // even if its own destination is elsewhere. Simulation never mutates the real run.
 function canFinishFocus(from){let probe=from;const count=unfinished(probe,focus).reduce((n,i)=>n+2-probe.status[i],0);
  for(let k=0;k<count;k++){const choices=unfinished(probe,focus).map(i=>({i,next:advance(probe,i)})).filter(o=>o.next);if(!choices.length)return false;
   choices.sort((a,b)=>Number(probe.status[b.i]===1)-Number(probe.status[a.i]===1)||(a.next.cost-probe.cost)-(b.next.cost-probe.cost));probe=choices[0].next;}return true;}
 for(let step=0;step<remaining;step++){
  const options=[];for(let i=0;i<shipments.length;i++){if(state.status[i]===2)continue;const next=advance(state,i);if(next)options.push({i,next,s:shipments[i],delivery:state.status[i]===1});}
  if(!options.length)throw Error('현재 함선에 실을 수 있는 화물을 찾지 못했습니다. 상자 구성을 확인해 주세요.');
  if(!focus||!unfinished(state,focus).length){
   let ids=[...new Set(options.map(o=>missionOf(o.i)))];const aboard=ids.filter(id=>unfinished(state,id).some(i=>state.status[i]===1));if(aboard.length)ids=aboard;
   const estimates=new Map(ids.map(id=>[id,estimate(id)]));ids.sort((a,b)=>{const x=estimates.get(a),y=estimates.get(b);return cmp([x.jumps,x.seconds+x.stops*60,x.stops,x.scu],[y.jumps,y.seconds+y.stops*60,y.stops,y.scu]);});
   focus=ids[0];detourLeft=Math.min(300,estimates.get(focus).seconds*.25);
  }
  const rank=o=>{const leg=nav.path(state.at,o.next.at);return [leg.jumps||0,leg.seconds,o.s.scu||0,o.i];};
  const byTravel=(a,b)=>cmp(rank(a),rank(b));
  const hereDeliveries=options.filter(o=>o.delivery&&o.next.at===state.at);
  let selected=hereDeliveries.sort(byTravel)[0];
  if(!selected){
   let focused=options.filter(o=>missionOf(o.i)===focus),aboard=focused.filter(o=>o.delivery);
   // Load compatible cargo already at this stop, otherwise deliver what is aboard first.
   const sameStop=focused.filter(o=>!o.delivery&&o.next.at===state.at);
   let pool=sameStop.length?sameStop:aboard.length?aboard:focused;
   // A different contract may occupy the space a focus pickup needs; deliver it to free the hold.
   if(!pool.length)pool=options.filter(o=>o.delivery);if(!pool.length)pool=options;
   if(step===0&&avoidFirst&&pool.some(o=>o.next.at!==avoidFirst))pool=pool.filter(o=>o.next.at!==avoidFirst);
   selected=pool.sort(byTravel)[0];
   if(selected.delivery&&selected.next.at!==state.at&&detourLeft>0){
    const direct=nav.path(state.at,selected.next.at),side=[];
    for(const o of options){if(o.delivery||missionOf(o.i)===focus||step===0&&o.next.at===avoidFirst)continue;
     // Pick up nearby cargo even when it will be delivered elsewhere later. Charge
     // the pickup and detour against one cumulative budget, not a fresh budget per stop.
     const continued=advance(o.next,selected.i);if(!continued)continue;
     const extra=Math.max(0,continued.cost-selected.next.cost);
     const legs=[nav.path(state.at,o.s.pickupId),nav.path(o.s.pickupId,selected.next.at)];
     if(legs.reduce((n,l)=>n+(l.jumps||0),0)>(direct.jumps||0)||extra>detourLeft||!canFinishFocus(o.next))continue;
     side.push({o,extra});
    }
    side.sort((a,b)=>a.extra-b.extra||byTravel(a.o,b.o));
    if(side.length){detourLeft-=side[0].extra;selected=side[0].o;}
   }
  }
  state=selected.next;
 }
 return state;
}
