import type {Session,Progress} from './flight-session.ts';
import {elapsed,sessionKey} from './flight-session.ts';
import type {Box,Ship} from './flight-types';

export const backupLimit=20*1024*1024;
export const previousFlightKey='stam.control-room.flight.previous.v1';
const invalid=()=>{throw Error('운항 백업의 형식·경로·적재 기록을 확인할 수 없습니다. 현재 운항은 유지됩니다.');};
function requireValue(ok:unknown):asserts ok {if(!ok)invalid();}
function object(v:unknown):asserts v is Record<string,unknown>{requireValue(v!==null&&typeof v==='object'&&!Array.isArray(v));}
function list(v:unknown):asserts v is unknown[]{requireValue(Array.isArray(v)&&v.length<=10000);}
function string(v:unknown):asserts v is string {requireValue(typeof v==='string'&&v.length>0);}
function number(v:unknown,min=0):asserts v is number {requireValue(typeof v==='number'&&Number.isFinite(v)&&v>=min);}
function strings(v:unknown){list(v);v.forEach(string);}
function vector(v:unknown,min=-Infinity,integer=false){list(v);requireValue(v.length===3);v.forEach(n=>{number(n,min);if(integer)requireValue(Number.isSafeInteger(n));});}
function optionalBooleans(v:Record<string,unknown>,keys:string[]){for(const k of keys)if(v[k]!==undefined)requireValue(typeof v[k]==='boolean');}
function pair(v:unknown){list(v);requireValue(v.length===2&&v.every(s=>typeof s==='string'));}
function unique(values:unknown[]){requireValue(new Set(values).size===values.length);}
function ship(v:unknown):asserts v is Ship {
 object(v);string(v.id);string(v.name);list(v.grids);requireValue(v.grids.length>0&&v.grids.length<=64);
 v.grids.forEach(g=>{object(g);string(g.id);string(g.name);for(const k of ['w','h','l']){number(g[k],1);requireValue(Number.isSafeInteger(g[k])&&g[k]<=64);}for(const k of ['x','y','z'])number(g[k],-Infinity);if(g.rotation!==undefined)vector(g.rotation);if(g.disabled!==undefined)requireValue(typeof g.disabled==='boolean');});
 unique(v.grids.map(g=>(g as Record<string,unknown>).id));
 requireValue((v as unknown as Ship).grids.reduce((n,g)=>n+g.w*g.h*g.l,0)<=10000);
}
function boxes(v:unknown,s:Ship,owners:Set<string>):asserts v is Box[]{
 list(v);const ids=new Set(),occupied=new Set();
 for(const b of v){object(b);string(b.boxId);string(b.missionId);string(b.dropoffId);string(b.commodity);string(b.color);
  requireValue(owners.has(b.missionId)&&!ids.has(b.boxId));ids.add(b.boxId);
  requireValue(typeof b.shipmentId==='string'||Number.isSafeInteger(b.shipmentId));number(b.size,1);requireValue([1,2,4,8,16,24,32].includes(b.size));
  number(b.bin);requireValue(Number.isInteger(b.bin));const g=s.grids[b.bin];requireValue(g&&!g.disabled);
  vector(b.cell,0,true);vector(b.dims,1,true);const cell=b.cell as number[],dims=b.dims as number[];
  requireValue(dims.reduce((a,b)=>a*b,1)===b.size);
  requireValue(cell.every((n,i)=>n+dims[i]!<=[g.w,g.h,g.l][i]!));
  for(let x=cell[0]!;x<cell[0]!+dims[0]!;x++)for(let y=cell[1]!;y<cell[1]!+dims[1]!;y++)for(let z=cell[2]!;z<cell[2]!+dims[2]!;z++){
   const key=`${b.bin}:${x}:${y}:${z}`;requireValue(!occupied.has(key));occupied.add(key);
  }
 }
}
const boxState=(bs:Box[])=>JSON.stringify(bs.map(b=>[b.boxId,b.missionId,b.shipmentId,b.dropoffId,b.size,b.bin,b.cell,b.dims]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));

/** Validate the imported snapshot without replanning or normalizing away evidence/ownership. */
export function validateFlight(value:unknown):asserts value is Session {
 object(value);requireValue(value.version===1);const d=value.draft;object(d);
 requireValue(['operator','navigator'].includes(String(d.partner)));string(d.start);string(d.ship);
 for(const k of ['received','reviewed'])requireValue(typeof d[k]==='boolean');
 optionalBooleans(d,['partnerSelected','allowUpperBounds']);
 list(d.jobs);const owners=new Set<string>();
 d.jobs.forEach(j=>{object(j);string(j.id);requireValue(!owners.has(j.id));owners.add(j.id);pair(j.title);number(j.pay);list(j.shipments);
  optionalBooleans(j,['rewardUnknown','reviewedReceipt']);
  if(j.state!==undefined)requireValue(['ready','incomplete','ended','conflict'].includes(String(j.state)));
  if(j.hints!==undefined){list(j.hints);j.hints.forEach(h=>{object(h);requireValue(typeof h.cargo==='string'&&typeof h.place==='string');number(h.scu);if(h.name!==undefined)requireValue(typeof h.name==='string');});}
  if(j.referenceInfo!==undefined){object(j.referenceInfo);object(j.referenceInfo.values);object(j.referenceInfo.provenance);Object.values(j.referenceInfo.provenance).forEach(strings);object(j.referenceInfo.sources);Object.values(j.referenceInfo.sources).forEach(src=>{object(src);string(src.name);requireValue(typeof src.version==='string');if(src.url!==undefined)requireValue(typeof src.url==='string');});}
  j.shipments.forEach(r=>{object(r);string(r.id);pair(r.cargo);requireValue(typeof r.from==='string'&&typeof r.to==='string');number(r.scu);if(r.boxes!==undefined){list(r.boxes);r.boxes.forEach(b=>{object(b);number(b.size,1);number(b.count,1);});}});
  if(j.mission!==undefined){object(j.mission);list(j.mission.cargo);j.mission.cargo.forEach(r=>{object(r);requireValue(typeof r.commodity==='string'&&typeof r.pickupId==='string'&&typeof r.dropoffId==='string');requireValue(r.scu===null||typeof r.scu==='string'||typeof r.scu==='number');});}
  if(j.reservations!==undefined){object(j.reservations);Object.values(j.reservations).forEach(v=>number(v));}
 });
 if(d.customShip!==undefined)ship(d.customShip);
 if(value.plan===null){requireValue(value.run===null);return;}
 const p=value.plan;object(p);ship(p.ship);const vessel=p.ship;
 requireValue(p.mode===undefined||['simple','detail'].includes(String(p.mode)));
 requireValue(d.partner==='operator'?p.mode==='simple':p.mode!=='simple');
 string(p.startId);string(p.policy);strings(p.warnings);number(p.seconds);number(p.peak);if(p.capacity!==null)number(p.capacity);
 requireValue(p.driveName===null||typeof p.driveName==='string');
 list(p.points);requireValue(p.points.length>0);p.points.forEach(pt=>{object(pt);string(pt.id);string(pt.name);string(pt.system);string(pt.type);vector(pt.position);});
 const locations=new Set(p.points.map(pt=>(pt as Record<string,unknown>).id));requireValue(locations.has(p.startId));
 const simple=p.mode==='simple';
 function packing(v:unknown){object(v);boxes(v.boxes,vessel,owners);number(v.used);list(v.bins);requireValue(v.bins.length===(simple?0:vessel.grids.length));v.bins.forEach(b=>{object(b);number(b.used);});requireValue(v.used===v.boxes.reduce((n,b)=>n+b.size,0));if(simple)requireValue(v.boxes.length===0);}
 packing(p.initialPacking);list(p.visits);requireValue(p.visits.length>0);
 p.visits.forEach(v=>{object(v);string(v.locationId);requireValue(locations.has(v.locationId));packing(v.packing);number(v.load);number(v.seconds);number(v.elapsed);object(v.leg);strings(v.leg.nodes);number(v.leg.meters);
  list(v.events);v.events.forEach(e=>{object(e);string(e.type);requireValue(['pickup','delivery','departure'].includes(e.type));if(e.type!=='departure'){string(e.shipmentId);string(e.missionId);requireValue(owners.has(e.missionId));string(e.commodity);number(e.scu);}if(e.boxIds!==undefined)strings(e.boxIds);});
  list(v.jumps);v.jumps.forEach(j=>{object(j);for(const k of ['entryId','exitId','entryName','exitName'])string(j[k]);requireValue(locations.has(j.exitId));});
  if(v.blocked!==undefined){list(v.blocked);v.blocked.forEach(b=>{object(b);string(b.boxId);list(b.blockers);b.blockers.forEach(a=>{object(a);string(a.boxId);});});}
 });
 const plan=p as unknown as Session['plan'];requireValue(plan);
 function progress(r:unknown):asserts r is Progress & Record<string,unknown> {
  object(r);number(r.index);number(r.jump);requireValue(Number.isInteger(r.index)&&r.index<=plan!.visits.length&&Number.isInteger(r.jump));
  requireValue(typeof r.started==='boolean'&&typeof r.finished==='boolean');requireValue(r.finished===(r.index===plan!.visits.length));
  requireValue(!r.finished||r.started);requireValue(r.started||(r.index===0&&r.jump===0));
  number(r.elapsed);for(const k of ['since','startedAt'])if(r[k]!==null)number(r[k]);
  if(r.loadScu!==undefined)number(r.loadScu);if(r.completedStops!==undefined)number(r.completedStops);if(r.distanceMeters!==undefined)number(r.distanceMeters);
  strings(r.picked);strings(r.delivered);unique(r.picked as string[]);unique(r.delivered as string[]);
  const picked=new Set(r.picked as string[]),delivered=new Set(r.delivered as string[]);
  for(const v of plan!.visits.slice(0,r.index))for(const e of v.events){if(e.type==='pickup')requireValue(picked.has(e.shipmentId));if(e.type==='delivery')requireValue(delivered.has(e.shipmentId));}
  boxes(r.aboard,vessel,owners);string(r.positionId);
  const prev=plan!.visits[r.index-1],visit=plan!.visits[r.index];requireValue(r.jump<=(visit?.jumps.length??0));
  requireValue(r.positionId===(r.jump?visit?.jumps[r.jump-1]?.exitId:prev?.locationId??plan!.startId));
  requireValue(boxState(r.aboard)===boxState(prev?.packing.boxes??plan!.initialPacking.boxes));
 }
 const r=value.run;object(r);progress(r);list(r.history);r.history.forEach(progress);
 const stages=[...r.history as Progress[],r];for(let i=1;i<stages.length;i++){
  const a=stages[i-1]!,b=stages[i]!;const jumps=plan.visits[a.index]?.jumps.length??0;
  requireValue(a.jump<jumps?b.index===a.index&&b.jump===a.jump+1:b.index===a.index+1&&b.jump===0);
 }
 if(r.log!==undefined){list(r.log);r.log.forEach(l=>{object(l);requireValue(typeof l.locationId==='string');number(l.at);for(const k of ['seconds','estimate'])if(l[k]!==null)number(l[k]);});}
}

function paused(session:Session,now?:number):Session {
 const s=structuredClone(session);if(s.run){s.run.elapsed=now===undefined?Math.max(s.run.elapsed,...(s.run.log??[]).map(step=>step.at)):elapsed(s.run,now);s.run.since=null;s.run.history.forEach(r=>{r.since=null;});}return s;
}
export function exportFlight(session:Session,now=Date.now()):string {
 return JSON.stringify({format:'stam-flight-backup',version:1,exportedAt:now,session:paused(session,now)});
}
export function importFlight(text:string):Session {
 if(new TextEncoder().encode(text).byteLength>backupLimit)throw Error('운항 백업은 20 MB 이하 파일을 선택하세요.');
 let parsed:unknown;try{parsed=JSON.parse(text);}catch{throw Error('JSON 파일을 읽지 못했습니다. 현재 운항은 유지됩니다.');}
 // Bound nested metadata as well as the visible arrays before any recursive consumer sees it.
 let nodes=0;function safe(v:unknown,depth=0){requireValue(++nodes<=1000000&&depth<=64);if(v&&typeof v==='object'){for(const [k,x]of Object.entries(v)){requireValue(!['__proto__','constructor','prototype'].includes(k));safe(x,depth+1);}}else if(typeof v==='number')requireValue(Number.isFinite(v));}safe(parsed);
 object(parsed);let candidate:unknown=parsed;
 if(parsed.format!==undefined){requireValue(parsed.format==='stam-flight-backup'&&parsed.version===1);number(parsed.exportedAt);candidate=parsed.session;}
 validateFlight(candidate);return paused(candidate);
}
/** All writes must succeed before the hook publishes the restored state. */
export function persistRestoredFlight(storage:Pick<Storage,'getItem'|'setItem'>,next:Session,previous:string){
 storage.setItem(previousFlightKey,previous);
 storage.setItem(sessionKey,JSON.stringify(next));
}
