// Narrow boundary around the production planner. No legacy UI bootstrap or storage.
import {planRoute,planRoutesOnly} from '../../../route-departure.mjs';
import {containerText,eventContainers} from '../../../cargo-summary.mjs';
import {jumpSegments} from '../../../route-display.mjs';
import {draftCargoShip,shipIdFor} from './ship-profile.mjs';
import {makeShipments,packBoxes} from '../../../engine.mjs';
import {capacity} from '../../../ships.mjs';
import {reservationJobs} from '../../../delivery-totals.mjs';
import {actualQuantity} from '../../../delivery-totals.mjs';
import {resolveQuantumDrive} from '../../../quantum.mjs';
import {locationDataFor,canonicalLocationId} from './personal-locations.mjs';
import quantum from '../../../data/quantum-drives.json' with {type:'json'};
import performance from '../../../data/ship-performance.json' with {type:'json'};
import {quantityPlan} from './mission-quantities.mjs';

export const canonicalPlace=canonicalLocationId;
export function missionFor(job){
  // Receipt evidence, cryopod shape, exact boxes and destination reservations survive intact.
  const mission=job.mission?structuredClone(job.mission):{id:job.id,title:job.title[1],reward:job.pay,_rewardKnown:!job.rewardUnknown,
   cargo:job.shipments.map(row=>({commodity:row.cargo[1],scu:row.scu||null,pickupId:canonicalPlace(row.from),dropoffId:canonicalPlace(row.to),boxes:row.boxes||[],_cargoShape:row.cargoShape,maxBoxSize:row.maxBoxSize})),
   _deliveryTotals:Object.entries(job.reservations||{}).map(([id,scu])=>({dropoffId:canonicalPlace(id),scu}))};
  mission.id=job.id;
  mission.title??=job.title[1];mission.reward??=job.pay;
  return mission;
}
export function missionsFor(draft, simple = false, data=locationDataFor(draft.locationEdits)){
 const byId=new Map(data.locations.map(p=>[p.id,p]));
 return draft.jobs.map(job=>{
  if(job.state==='ended'||job.state==='conflict')throw Error('종료되었거나 기록이 충돌한 계약입니다. 수신함에서 확인해 주세요.');
  const quantity=quantityPlan(missionFor(job),draft.allowUpperBounds!==false);
  const mission=simple?missionFor(job):quantity.mission;
  if(simple)for(const row of mission.cargo){if(!actualQuantity(row))row.scu=null;}
  if(!mission.cargo.length || mission.cargo.some(row=>!byId.has(row.pickupId)||!byId.has(row.dropoffId)))throw Error('계약의 픽업지와 배송지를 확인하세요.');
  if(!simple && !quantity.ready)throw Error('실제 수량·배송 총량 또는 확인된 최대 수량이 필요합니다.');
  return mission;
 });
}
export function flightShipments(draft,simple=false,ship=draftCargoShip(draft),excluded=[]){
 const data=locationDataFor(draft.locationEdits),byId=new Map(data.locations.map(p=>[p.id,p]));
 const missions=missionsFor({...draft,jobs:draft.jobs.filter(j=>!excluded.includes(j.id))},simple,data);
 if(!simple)return makeShipments(missions,byId,{...draft.settings,ship}).shipments;
 return missions.flatMap(m=>{const {jobs,excluded}=reservationJobs(m);return [...m.cargo.flatMap((c,i)=>excluded.has(i)?[]:[{...c,id:m.id+':route:'+i,missionId:m.id,boxes:[]}]),...jobs];});
}
const slimPacking=p=>({boxes:p.boxes.map(b=>({...b,shipmentId:b.shipmentId||b.cargoId})),used:p.used,bins:(p.bins||[]).map(b=>({used:b.used}))});
export function calculateFlight(draft,context){
 const locations=locationDataFor(draft.locationEdits),byId=new Map(locations.locations.map(p=>[p.id,p]));
 const mode=context?.mode || (draft.partner==='operator'?'simple':'detail');
 const simple=mode==='simple';
 const id=shipIdFor(draft.ship);
 const ship=draftCargoShip(draft,simple?[]:context?.disabledGrids);
 const base={...performance.profiles[id],...quantum.profiles[id]};
 const drive=resolveQuantumDrive(quantum,base,{driveMode:'factory'}).drive;
 const flightPerformance={scm:base.scm,maxSpeed:base.maxSpeed,zeroToScm:base.zeroToScm,drive,
  ascentSpeed:base.maxSpeed?Math.round(base.maxSpeed*.65):null,
  ascentAcceleration:base.scm>0&&base.zeroToScm>0?Math.round(base.scm/base.zeroToScm*.25*100)/100:null,
  approachSpeed:base.scm?Math.round(base.scm*.65):null};
 const calculate=simple?planRoutesOnly:planRoute;
 const excluded=context?.excludedMissionIds||[];
 const missions=missionsFor({...draft,jobs:draft.jobs.filter(j=>!excluded.includes(j.id))},simple,locations);
 const heldCargo=simple?[]:(context?.resume?.aboard||[]).filter(b=>excluded.includes(b.missionId));
 const startId=context?.startId||canonicalPlace(draft.start);
 if(context?.resume&&flightShipments(draft,simple,ship,excluded).every(s=>context.resume.delivered.includes(s.id))){
  const packing=simple?{boxes:[],used:0,bins:[]}:packBoxes([],heldCargo,ship);
  if(!packing||!byId.has(startId)||(!simple&&packing.boxes.length!==context.resume.aboard.length))throw Error('현재 선적 기록을 유지할 수 없습니다.');
  const point=byId.get(startId);
  return {visits:[],mode,initialPacking:slimPacking(packing),ship,seconds:0,peak:packing.used,capacity:simple?null:capacity(ship),warnings:[],points:[point],startId,driveName:drive?.name||null,policy:draft.partner};
 }
 const plan=calculate(locations,missions,startId,{
  ...draft.settings,ship,heldCargo,performance:draft.settings?.performance||flightPerformance,routePolicy:draft.partner==='operator'?'delivery-first':'batch',
  includeReturn:false,...(context?.manualStops?{manualStops:context.manualStops}:{}),...(context?.resume?{resume:context.resume,avoidFirst:context.avoidFirst,showDeparture:context.showDeparture}:{}),
 });
 // The legacy engine may recover missing coordinates by repacking; an active console must fail closed instead.
 if(!simple && context?.resume){const actual=new Map(plan.initialPacking.boxes.map(b=>[b.boxId,b]));
  if(context.resume.aboard.length!==actual.size||context.resume.aboard.some(b=>{
   const p=actual.get(b.boxId);return !p||p.missionId!==b.missionId||p.size!==b.size||p.bin!==b.bin||String(p.cell)!==String(b.cell)||String(p.dims)!==String(b.dims);
  }))throw Error('현재 실린 화물 위치를 유지할 수 없어 기존 운항을 보존했습니다.');
 }
 return {visits:plan.visits.map(v=>({...v,events:v.events.map(event=>{
    const shipment=plan.shipments[event.shipmentIndex];
    return {...event,deliveryId:shipment?.dropoffId,containers:simple?'':containerText(eventContainers(event,shipment)),estimatedBoxes:!!shipment?.estimated};
  }),packing:slimPacking(v.packing),jumps:jumpSegments(v.leg,byId)})),
  mode,initialPacking:slimPacking(plan.initialPacking||{boxes:[],used:0}),ship:plan.ship||ship,seconds:plan.seconds,peak:plan.peak,capacity:plan.capacity,
  warnings:[...plan.warnings,...(!drive?['기본 퀀텀 드라이브 미확인 · 이동시간은 기본 속도 가정입니다.']:[])],
  points:[...new Set(plan.visits.flatMap(v=>[v.locationId,...v.leg.nodes]))].map(id=>byId.get(id)).filter(Boolean).map(({id,name,system,type,position,parentId})=>({id,name,system,type,position,parentId})),
  startId:plan.settings.startId,driveName:drive?.name||null,policy:draft.partner};
}
