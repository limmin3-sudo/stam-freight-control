// Narrow boundary around the production planner. No legacy UI bootstrap or storage.
import {planRoute} from '../../../route-departure.mjs';
import {jumpSegments} from '../../../route-display.mjs';
import {validateShip,withStacking} from '../../../ships.mjs';
import {quantitiesReady,actualQuantity} from '../../../delivery-totals.mjs';
import {resolveQuantumDrive} from '../../../quantum.mjs';
import locations from '../../../data/locations.json' with {type:'json'};
import fleet from '../../../data/ships.json' with {type:'json'};
import quantum from '../../../data/quantum-drives.json' with {type:'json'};
import performance from '../../../data/ship-performance.json' with {type:'json'};

const byId=new Map(locations.locations.map(p=>[p.id,p]));
const cities={hurston:'Lorville',crusader:'Orison',arccorp:'Area18',microtech:'New Babbage'};
export function canonicalPlace(id){return cities[id]?locations.locations.find(p=>p.system==='stanton'&&p.name===cities[id])?.id:id;}
export function missionsFor(draft){
 return draft.jobs.map(job=>{
  if(job.state&&job.state!=='ready')throw Error('정보가 미확인되거나 종료된 계약입니다. 수신함에서 확인해 주세요.');
  // Receipt evidence, cryopod shape, exact boxes and destination reservations survive intact.
  const mission=job.mission?structuredClone(job.mission):{id:job.id,title:job.title[1],reward:job.pay,
   cargo:job.shipments.map(row=>({commodity:row.cargo[1],scu:row.scu,pickupId:canonicalPlace(row.from),dropoffId:canonicalPlace(row.to),boxes:row.boxes||[]})),
   _deliveryTotals:Object.entries(job.reservations||{}).map(([id,scu])=>({dropoffId:canonicalPlace(id),scu}))};
  mission.id=job.id;
  if(!quantitiesReady(mission)||mission.cargo.some(r=>!actualQuantity(r)&&!mission._deliveryTotals?.some(t=>t.dropoffId===r.dropoffId)))throw Error('실제 수량 또는 확인된 배송 총량이 필요합니다.');
  return mission;
 });
}
const slimPacking=p=>({boxes:p.boxes,used:p.used,bins:p.bins.map(b=>({used:b.used}))});
export function calculateFlight(draft,context){
 const id={'Cutlass Black':'drake-cutlass-black','C2 Hercules':'crusader-c2-hercules-starlifter'}[draft.ship]||draft.ship;
 const raw=fleet.find(s=>s.id===id);if(!raw)throw Error('함선 그리드를 찾지 못했습니다.');
 const ship=validateShip(withStacking(structuredClone(raw)));
 const base={...performance.profiles[id],...quantum.profiles[id]};
 const drive=resolveQuantumDrive(quantum,base,{driveMode:'factory'}).drive;
 const flightPerformance={scm:base.scm,maxSpeed:base.maxSpeed,zeroToScm:base.zeroToScm,drive,
  ascentSpeed:base.maxSpeed?Math.round(base.maxSpeed*.65):null,
  ascentAcceleration:base.scm>0&&base.zeroToScm>0?Math.round(base.scm/base.zeroToScm*.25*100)/100:null,
  approachSpeed:base.scm?Math.round(base.scm*.65):null};
 const plan=planRoute(locations,missionsFor(draft),context?.startId||canonicalPlace(draft.start),{
  ship,performance:flightPerformance,routePolicy:draft.partner==='operator'?'delivery-first':'navigator',
  includeReturn:false,...(context?{resume:context.resume}:{}),
 });
 // The legacy engine may recover missing coordinates by repacking; an active console must fail closed instead.
 if(context){const actual=new Map(plan.initialPacking.boxes.map(b=>[b.boxId,b]));
  if(context.resume.aboard.length!==actual.size||context.resume.aboard.some(b=>{
   const p=actual.get(b.boxId);return !p||p.missionId!==b.missionId||p.size!==b.size||p.bin!==b.bin||String(p.cell)!==String(b.cell)||String(p.dims)!==String(b.dims);
  }))throw Error('현재 실린 화물 위치를 유지할 수 없어 기존 운항을 보존했습니다.');
 }
 return {visits:plan.visits.map(v=>({...v,packing:slimPacking(v.packing),jumps:jumpSegments(v.leg,byId)})),
  initialPacking:slimPacking(plan.initialPacking),ship:plan.ship,seconds:plan.seconds,peak:plan.peak,capacity:plan.capacity,
  warnings:[...plan.warnings,...(!drive?['기본 퀀텀 드라이브 미확인 · 이동시간은 기본 속도 가정입니다.']:[])],
  points:locations.locations.map(({id,name,system,type,position,parentId})=>({id,name,system,type,position,parentId})),
  startId:plan.settings.startId,driveName:drive?.name||null,policy:draft.partner};
}
