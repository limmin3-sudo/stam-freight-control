// Read-only observations; exact public class-to-profile references, never live XYZ.
import {SHIP_REFERENCES} from '../../data/log-vehicle-index.mjs';
export {SHIP_REFERENCES} from '../../data/log-vehicle-index.mjs';
// Explicit community reference only; no code/name guessing or geometric proximity.
// Four factual station correspondences, not copied parser implementation.
const STATION_URL='https://github.com/tactilebiscuit4/StarCargoTracker/blob/main/src/locations.rs';
const STATIONS=Object.freeze({RR_ARC_LEO:'Baijini Point',RR_CRU_LEO:'Seraphim Station',RR_HUR_LEO:'Everus Harbor',RR_MIC_LEO:'Port Tressler'});
const station = code => Object.hasOwn(STATIONS,code||'') ? {name:STATIONS[code],system:'stanton',source:STATION_URL,verification:'community-reference'} : null;
const validStamp = at => /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at||'') && Number.isFinite(Date.parse(at)) && new Date(at).toISOString()===at;
export const isNavigationEvent = e => e.type.startsWith('navigation-');

export function parseNavigationLine(line, source) {
  const selected=line.includes('<Player Selected Quantum Target - Local>');
  const arrived=line.includes('<Quantum Drive Arrived - Arrived at Final Destination>');
  const release=line.includes('<Vehicle Control Flow>') && line.includes('ClearDriver: Local client node');
  const inventory=line.includes('<RequestLocationInventory>');
  const session=line.includes("@session:");
  if(!selected&&!arrived&&!release&&!inventory&&!session)return null;
  const at=line.match(/^<([^>]+)>/)?.[1],fail=()=>({diagnostic:'unrecognized-navigation-format'});
  if(!validStamp(at))return fail();
  const emit=(type,fields={})=>({event:{type:'navigation-'+type,at,source:{...source},...fields}});
  if(session)return /\[Trace\] @session:\s+'[^'\r\n]+'\s*$/.test(line)?emit('session'):fail();
  if(inventory){
    // The name in Player[...] is deliberately discarded, not matched as a numeric GEID.
    const m=line.match(/<RequestLocationInventory> Player\[[^\]\r\n]+\] requested inventory for Location\[([A-Za-z0-9_]{1,150})\]/);
    return m?emit('inventory',{location:station(m[1])}):fail();
  }
  if(release){
    const m=line.match(/releasing control token for '([A-Za-z][A-Za-z0-9_]{1,150})_(\d{1,20})' \[(\d{1,20})\]/);
    return m&&m[2]===m[3]?emit('release',{vehicleClass:m[1],entityId:m[2]}):fail();
  }
  const m=line.match(/\| (?:NOT AUTH|AUTH) \| ([A-Za-z][A-Za-z0-9_]{1,150})_(\d{1,20})\[(\d{1,20})\]\|CSCItemNavigation::(OnPlayerSelectedQuantumTarget|OnQuantumDriveArrived)\|/);
  if(!m||m[2]!==m[3])return fail();
  if(selected&&m[4]==='OnPlayerSelectedQuantumTarget'){
    const target=line.match(/\|Player has selected point (.{1,300}) as their destination, routing locally /)?.[1];
    if(!target)return fail();
    // Do not retain beacon names, paths, UUIDs or unknown runtime targets.
    return emit('target',{vehicleClass:m[1],entityId:m[2],destination:station(target.startsWith('LOC_')?target.slice(4):null)});
  }
  return arrived&&m[4]==='OnQuantumDriveArrived'&&line.includes('|Quantum Drive has arrived at final destination ')?emit('arrived',{vehicleClass:m[1],entityId:m[2]}):fail();
}

export function navigationSnapshot(records) {
  const groups=new Map();
  for(const e of records){const key=JSON.stringify([e.source?.input??null,e.source?.generation??0]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
  const scopes=[];
  for(const rows of groups.values()){
    rows.sort((a,b)=>a.at.localeCompare(b.at)||(a.source?.line||0)-(b.source?.line||0));
    const targetsByTime=new Map();
    for(const row of rows)if(row.type==='navigation-target'){if(!targetsByTime.has(row.at))targetsByTime.set(row.at,new Set());targetsByTime.get(row.at).add(row.vehicleClass+':'+row.entityId);}
    let ship=null,target=null,inventory=null,sessionAt=null,ambiguous=false;
    for(let i=0;i<rows.length;i++){
      const e=rows[i];
      if(e.type==='navigation-session'||e.type==='local-character-observed'||e.type==='game-build-observed'){
        ship=target=inventory=null;ambiguous=false;sessionAt=e.at;continue;
      }
      if(e.type==='navigation-target'){
        // Ambiguous simultaneous different vehicles cannot choose an arbitrary winner.
        ambiguous=targetsByTime.get(e.at).size>1;
        ship=ambiguous?null:e;target=ambiguous?null:{...e,phase:'selected'};
      }else if(e.type==='navigation-release'){
        if(ship?.entityId===e.entityId&&ship.vehicleClass===e.vehicleClass){ship=null;target=null;}
      }else if(e.type==='navigation-arrived'){
        if(target?.entityId===e.entityId&&target.vehicleClass===e.vehicleClass){target={...target,phase:'arrived',arrivalAt:e.at};}
      }else if(e.type==='navigation-inventory')inventory=e;
    }
    const last=rows.at(-1),ref=ship&&Object.hasOwn(SHIP_REFERENCES,ship.vehicleClass)?SHIP_REFERENCES[ship.vehicleClass]:null;
    scopes.push({input:last.source?.input??null,generation:last.source?.generation??0,sessionAt,lastObservedAt:last.at,
      ship:ship?{...(ref||{id:null,name:null,source:null}),at:ship.at,verification:'local-navigation-candidate'}:null,
      target:target?{location:target.destination,at:target.at,phase:target.phase,arrivalAt:target.arrivalAt??null}:null,
      inventory:inventory?{location:inventory.location,at:inventory.at,verification:'inventory-request-only',actor:'unverified'}:null,
      ambiguous,currentPositionVerified:false});
  }
  return {scopes,currentPositionVerified:false};
}

// Freshness is an offer policy, not a guarantee of current piloting or location.
export function liveNavigationCandidate(navigation,status,now=Date.now()){
  if(status?.phase!=='watching')return null;
  const scope=navigation?.scopes?.find(s=>s.input==='live-log'&&s.generation===status.generation);
  if(!scope)return null;
  const recent=at=>{const age=now-Date.parse(at);return Number.isFinite(age)&&age>=0&&age<=120_000;};
  return {...scope,ship:scope.ship&&recent(scope.ship.at)?scope.ship:null,
    inventory:scope.inventory&&recent(scope.inventory.at)?scope.inventory:null,
    target:scope.target&&Date.parse(scope.target.at)<=now&&recent(scope.target.arrivalAt||scope.target.at)?scope.target:null};
}
