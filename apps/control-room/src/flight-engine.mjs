// Narrow boundary around the production planner. No legacy UI bootstrap or storage.
import {planRoute,planRoutesOnly} from '../../../route-departure.mjs';
import {containerText,eventContainers} from '../../../cargo-summary.mjs';
import {jumpSegments} from '../../../route-display.mjs';
import {DEFAULT_SHIP,validateShip,withStacking,selectShipGrids} from '../../../ships.mjs';
import {quantitiesReady,actualQuantity} from '../../../delivery-totals.mjs';
import {resolveQuantumDrive} from '../../../quantum.mjs';
import locations from '../../../data/locations.json' with {type:'json'};
import fleet from '../../../data/ships.json' with {type:'json'};
import quantum from '../../../data/quantum-drives.json' with {type:'json'};
import performance from '../../../data/ship-performance.json' with {type:'json'};

const byId=new Map(locations.locations.map(p=>[p.id,p]));
const cities={hurston:'Lorville',crusader:'Orison',arccorp:'Area18',microtech:'New Babbage'};
export function canonicalPlace(id){return cities[id]?locations.locations.find(p=>p.system==='stanton'&&p.name===cities[id])?.id:id;}
export function missionFor(job){
  // Receipt evidence, cryopod shape, exact boxes and destination reservations survive intact.
  const mission=job.mission?structuredClone(job.mission):{id:job.id,title:job.title[1],reward:job.pay,_rewardKnown:!job.rewardUnknown,
   cargo:job.shipments.map(row=>({commodity:row.cargo[1],scu:row.scu||null,pickupId:canonicalPlace(row.from),dropoffId:canonicalPlace(row.to),boxes:row.boxes||[],_cargoShape:row.cargoShape,maxBoxSize:row.maxBoxSize})),
   _deliveryTotals:Object.entries(job.reservations||{}).map(([id,scu])=>({dropoffId:canonicalPlace(id),scu}))};
  mission.id=job.id;
  return mission;
}
export function missionsFor(draft, simple = false){
 return draft.jobs.map(job=>{
  if(job.state&&job.state!=='ready'&&!(simple&&job.state==='incomplete'))throw Error('정보가 미확인되거나 종료된 계약입니다. 수신함에서 확인해 주세요.');
  const mission=missionFor(job);
  if(simple)for(const row of mission.cargo){if(!actualQuantity(row))row.scu=null;}
  if(!mission.cargo.length || mission.cargo.some(row=>!byId.has(row.pickupId)||!byId.has(row.dropoffId)))throw Error('계약의 픽업지와 배송지를 확인하세요.');
  if(!simple && (!quantitiesReady(mission)||mission.cargo.some(r=>!actualQuantity(r)&&!mission._deliveryTotals?.some(t=>t.dropoffId===r.dropoffId))))throw Error('실제 수량 또는 확인된 배송 총량이 필요합니다.');
  return mission;
 });
}
const slimPacking=p=>({boxes:p.boxes.map(b=>({...b,shipmentId:b.shipmentId||b.cargoId})),used:p.used,bins:(p.bins||[]).map(b=>({used:b.used}))});
export function calculateFlight(draft,context){
 const mode=context?.mode || (draft.partner==='operator'?'simple':'detail');
 const simple=mode==='simple';
 const id={'Cutlass Black':'drake-cutlass-black','C2 Hercules':'crusader-c2-hercules-starlifter'}[draft.ship]||draft.ship;
 const raw=draft.customShip?.id===id?draft.customShip:fleet.find(s=>s.id===id);if(!raw)throw Error('함선 그리드를 찾지 못했습니다.');
 const ship=selectShipGrids(withStacking(validateShip(raw.id===DEFAULT_SHIP.id?{...raw,...DEFAULT_SHIP}:raw)),simple?[]:context?.disabledGrids||draft.settings?.disabledGrids?.[id]);
 const base={...performance.profiles[id],...quantum.profiles[id]};
 const drive=resolveQuantumDrive(quantum,base,{driveMode:'factory'}).drive;
 const flightPerformance={scm:base.scm,maxSpeed:base.maxSpeed,zeroToScm:base.zeroToScm,drive,
  ascentSpeed:base.maxSpeed?Math.round(base.maxSpeed*.65):null,
  ascentAcceleration:base.scm>0&&base.zeroToScm>0?Math.round(base.scm/base.zeroToScm*.25*100)/100:null,
  approachSpeed:base.scm?Math.round(base.scm*.65):null};
 const calculate=simple?planRoutesOnly:planRoute;
 const plan=calculate(locations,missionsFor(draft,simple),context?.startId||canonicalPlace(draft.start),{
  ...draft.settings,ship,performance:draft.settings?.performance||flightPerformance,routePolicy:draft.partner==='operator'?'delivery-first':'batch',
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
