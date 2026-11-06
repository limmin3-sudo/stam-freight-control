import {deliveryFirstRoute} from './delivery-first.mjs';
import {compareRoute} from './route-cost.mjs';
import {replayManualStops} from './manual-route.mjs';
import {planActionRoute} from './route-search.mjs';
import {remainingTravelEstimate} from './route-estimate.mjs';
import {DEFAULTS,navigator} from './engine.mjs';
import {reservationJobs,shipmentReady,reservationEvent} from './delivery-totals.mjs';
import {regionStep} from './route-regions.mjs';

// Capacity and box composition intentionally do not participate in this mode.
export function planRoutesOnly(data,missions,startId,settings={}){
 const opt={...DEFAULTS,...settings,startId},nav=navigator(data,opt),shipments=[];
 if(!nav.byId.has(startId))throw Error('출발 위치를 선택하세요.');
 const ids=new Set();for(const m of missions){if(!m.id||ids.has(m.id))throw Error('미션 ID가 중복됐습니다.');ids.add(m.id);const {jobs,excluded}=reservationJobs(m);for(const [i,c]of m.cargo.entries()){if(!nav.byId.has(c.pickupId)||!nav.byId.has(c.dropoffId))throw Error(m.id+': 픽업지·배송지를 확인하세요.');if(!excluded.has(i))shipments.push({...c,id:m.id+':route:'+i,missionId:m.id,boxes:[]});}shipments.push(...jobs);}
 if(!shipments.length||shipments.length>48)throw Error('간편 경로는 운송 구간 1–48개까지 계산합니다.');
 const picked=new Set(opt.resume?.picked||[]),delivered=new Set(opt.resume?.delivered||[]),initialStatus=shipments.map(s=>delivered.has(s.id)?2:picked.has(s.id)?1:0);
 const operator=!Array.isArray(opt.manualStops)&&opt.routePolicy==='delivery-first';
 const initial={status:initialStatus,at:startId,cost:0,actions:[],meters:0,jumps:0,visited:new Set([startId]),revisits:0,visitedRegions:new Set([nav.regionOf(startId)]),regionRevisits:0};
 function advance(state,i,id){if(i!==null&&!shipmentReady(shipments,state.status,i))return null;const s=i===null?null:shipments[i],type=i===null?'waypoint':state.status[i]===0?'pickup':'delivery',locationId=i===null?id:type==='pickup'?s.pickupId:s.dropoffId,leg=nav.path(state.at,locationId),status=[...state.status],event=i===null?{scu:0}:reservationEvent(shipments,state.status,i);if(i!==null)status[i]++;
  return {...state,...regionStep(nav,state,locationId),status,at:locationId,cost:state.cost+leg.seconds,meters:state.meters+(leg.meters||0),jumps:state.jumps+(leg.jumps||0),visited:new Set([...state.visited,locationId]),revisits:state.revisits+Number(locationId!==state.at&&state.visited.has(locationId)),actions:[...state.actions,{type,locationId,shipmentIndex:i,shipmentId:s?.id||'',missionId:s?.missionId||'',commodity:s?.reservation&&type==='delivery'?s.reservation.commodity:s?.commodity||'경유',...event,leg,seconds:leg.seconds}]};
 }
 const operatorRoute=operator?deliveryFirstRoute(shipments,nav,initial,advance,{avoidFirst:opt.avoidFirst}):null;
 const proposed=operatorRoute||(Array.isArray(opt.manualStops)?null:planActionRoute(shipments,startId,nav,{initialStatus})),estimate=remainingTravelEstimate(shipments,nav),estimateMeters=remainingTravelEstimate(shipments,nav,'meters');
 let best=null;
 if(Array.isArray(opt.manualStops))best=replayManualStops(opt.manualStops,shipments,nav,initial,advance);
 if(proposed){let candidate=initial;for(const action of proposed.actions){candidate=advance(candidate,action.shipmentIndex);if(!candidate)break;}best=candidate;}
 let beam=[initial];
 if(!best){
 for(let step=0;step<initialStatus.reduce((n,x)=>n+2-x,0);step++){
  const next=[];for(const state of beam){const successors=shipments.map((s,i)=>advance(state,i)).filter(Boolean),system=nav.byId.get(state.at).system,canCollectHere=successors.some(s=>s.actions.at(-1).type==='pickup'&&nav.byId.get(s.at).system===system),here=successors.filter(s=>s.at===state.at),deliveries=here.filter(s=>s.actions.at(-1).type==='delivery');next.push(...(deliveries.length?deliveries:here.length?here:successors.filter(s=>!canCollectHere||nav.byId.get(s.at).system===system)));}
  for(const s of next){s.estimate=s.cost+estimate(s.status,s.at);s.estimateMeters=s.meters+estimateMeters(s.status,s.at);}
  next.sort((a,b)=>a.revisits-b.revisits||a.jumps-b.jumps||(a.regionRevisits||0)-(b.regionRevisits||0)||a.estimate-b.estimate||a.estimateMeters-b.estimateMeters);const seen=new Set();beam=[];for(const s of next){const k=s.status.join('')+'|'+s.at+'|'+[...s.visited].sort().join(',');if(seen.has(k))continue;seen.add(k);beam.push(s);if(beam.length===60)break;}
 }
 best=beam.sort(compareRoute)[0];}
 if(!best)throw Error('픽업·배송 순서를 계산하지 못했습니다.');const initialReserved=new Set();const empty={boxes:[],bins:[],used:0},visits=[];let elapsed=0,load=shipments.reduce((n,s,i)=>{if(!s.reservation)return n+(initialStatus[i]===1?(s.scu||0):0);const r=s.reservation;if(initialReserved.has(r.id))return n;initialReserved.add(r.id);const group=shipments.map((x,j)=>x.reservation?.id===r.id?initialStatus[j]:null).filter(x=>x!==null);return n+(group.some(x=>x===1)&&group.every(x=>x!==2)?r.scu:0);},0),peak=load;
 for(const e of best.actions){elapsed+=e.seconds;load+=e.reservationId?e.reservationDelta:e.type==='pickup'?e.scu:-e.scu;peak=Math.max(peak,load);const prev=visits.at(-1);if(prev?.locationId===e.locationId){prev.events.push(e);prev.seconds+=e.seconds;prev.elapsed=elapsed;prev.load=load;}else visits.push({locationId:e.locationId,events:[e],seconds:e.seconds,elapsed,leg:e.leg,load,packing:empty});}
 for(const v of visits)if(v.events.some(e=>e.type!=='waypoint'))v.events=v.events.filter(e=>e.type!=='waypoint');
 let last=best.at;for(const id of new Set(opt.includeReturn?missions.map(m=>m.returnId).filter(Boolean):[])){if(!nav.byId.has(id))throw Error('복귀 위치를 확인하세요.');const leg=nav.path(last,id);elapsed+=leg.seconds;visits.push({locationId:id,events:[{type:'return',missionId:missions.filter(m=>m.returnId===id).map(m=>m.id).join(', '),shipmentId:'return:'+id,scu:0,commodity:'복귀'}],elapsed,seconds:leg.seconds,leg,load:0,packing:empty});last=id;}
 for(const v of visits)v.region=nav.regions.get(v.locationId);return {regionRevisits:best.regionRevisits||0,simple:true,visits,shipments,seconds:elapsed,peak,capacity:null,timing:[],warnings:['간편 경로: 함선 용량·상자 크기·적재 배치·상하차 시간 미반영'],manual:Array.isArray(opt.manualStops),algorithm:operator?'오퍼레이터 · 같은 행성권 픽업 후 배송 완료 우선':Array.isArray(opt.manualStops)?'직접 수정한 방문 순서 · 픽업 선행 확인':proposed?((proposed.batching?'행성계 픽업을 모은 뒤 이동 · ':'픽업 선행 · ')+(proposed.method==='action-state'?'조건 내 행성권 재방문 감소·이동 부담·거리 순':'거점 1회 방문 조건 내 행성권 재방문 감소·이동 부담·거리 순')):'거점·행성권 재방문 감소·이동 부담·거리 순 경로 탐색 (전역 최적 보장 없음)',settings:opt};
}
