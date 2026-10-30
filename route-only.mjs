import {planActionRoute} from './route-search.mjs';
import {remainingTravelEstimate} from './route-estimate.mjs';
import {DEFAULTS,navigator} from './engine.mjs';

// Capacity and box composition intentionally do not participate in this mode.
export function planRoutesOnly(data,missions,startId,settings={}){
 const opt={...DEFAULTS,...settings},nav=navigator(data,opt),shipments=[];
 if(!nav.byId.has(startId))throw Error('출발 위치를 선택하세요.');
 const ids=new Set();for(const m of missions){if(!m.id||ids.has(m.id))throw Error('미션 ID가 중복됐습니다.');ids.add(m.id);for(const [i,c]of m.cargo.entries()){if(!nav.byId.has(c.pickupId)||!nav.byId.has(c.dropoffId))throw Error(m.id+': 픽업지·배송지를 확인하세요.');shipments.push({...c,id:m.id+':route:'+i,missionId:m.id,boxes:[]});}}
 if(!shipments.length||shipments.length>48)throw Error('간편 경로는 운송 구간 1–48개까지 계산합니다.');
 const proposed=planActionRoute(shipments,startId,nav),estimate=remainingTravelEstimate(shipments,nav);
 let best=null;
 if(proposed){let at=startId,cost=0;const actions=proposed.actions.map(e=>{const s=shipments[e.shipmentIndex],leg=nav.path(at,e.locationId);at=e.locationId;cost+=leg.seconds;return {...e,shipmentId:s.id,missionId:s.missionId,commodity:s.commodity,scu:s.scu||0,leg,seconds:leg.seconds};});best={at,cost,actions};}
 let beam=[{status:shipments.map(()=>0),at:startId,cost:0,actions:[]}];
 if(!best){
 for(let step=0;step<shipments.length*2;step++){
  const next=[];for(const state of beam){const system=nav.byId.get(state.at).system,canCollectHere=shipments.some((s,i)=>state.status[i]===0&&nav.byId.get(s.pickupId).system===system);for(let i=0;i<shipments.length;i++){const s=shipments[i],st=state.status[i];if(st===2)continue;const status=[...state.status];status[i]++;const locationId=st===0?s.pickupId:s.dropoffId;if(canCollectHere&&nav.byId.get(locationId).system!==system)continue;const leg=nav.path(state.at,locationId);next.push({status,at:locationId,cost:state.cost+leg.seconds,actions:[...state.actions,{type:st===0?'pickup':'delivery',shipmentIndex:i,shipmentId:s.id,missionId:s.missionId,commodity:s.commodity,scu:s.scu||0,locationId,leg,seconds:leg.seconds}]});}}
  for(const s of next)s.estimate=s.cost+estimate(s.status,s.at);
  next.sort((a,b)=>a.estimate-b.estimate||a.cost-b.cost);const seen=new Set();beam=[];for(const s of next){const k=s.status.join('')+'|'+s.at;if(seen.has(k))continue;seen.add(k);beam.push(s);if(beam.length===60)break;}
 }
 best=beam.sort((a,b)=>a.cost-b.cost)[0];}
 const empty={boxes:[],bins:[],used:0},visits=[];let elapsed=0,load=0,peak=0;
 for(const e of best.actions){elapsed+=e.seconds;load+=e.type==='pickup'?e.scu:-e.scu;peak=Math.max(peak,load);const prev=visits.at(-1);if(prev?.locationId===e.locationId){prev.events.push(e);prev.seconds+=e.seconds;prev.elapsed=elapsed;prev.load=load;}else visits.push({locationId:e.locationId,events:[e],seconds:e.seconds,elapsed,leg:e.leg,load,packing:empty});}
 let last=best.at;for(const id of new Set(opt.includeReturn?missions.map(m=>m.returnId).filter(Boolean):[])){if(!nav.byId.has(id))throw Error('복귀 위치를 확인하세요.');const leg=nav.path(last,id);elapsed+=leg.seconds;visits.push({locationId:id,events:[{type:'return',missionId:missions.filter(m=>m.returnId===id).map(m=>m.id).join(', '),shipmentId:'return:'+id,scu:0,commodity:'복귀'}],elapsed,seconds:leg.seconds,leg,load:0,packing:empty});last=id;}
 return {simple:true,visits,shipments,seconds:elapsed,peak,capacity:null,timing:[],warnings:['간편 경로: 함선 용량·상자 크기·적재 배치·상하차 시간 미반영'],algorithm:proposed?((proposed.batching?'행성계 픽업을 모은 뒤 이동 · ':'픽업 선행 · ')+(proposed.method==='action-state'?'조건 내 최단 이동 시간':'거점 1회 방문 조건 내 최단 이동 시간')):'픽업 선행·남은 이동 시간을 반영한 경로 탐색 (전역 최적 보장 없음)',settings:opt};
}
