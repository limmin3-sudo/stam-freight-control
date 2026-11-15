// Version-pinned Wiki fleet, drive and log identifiers. Publish only a complete compatible set.
import {readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {gridSource,reconcileCommunityGrids} from './fleet-grids.mjs';
import {applyReviewedProfiles} from './reviewed-fleet-profiles.mjs';
const api='https://api.star-citizen.wiki/api/';
const digest=value=>createHash('sha256').update(value).digest('hex');
const flatten=ports=>(ports||[]).flatMap(port=>[port,...flatten(port.ports)]);
const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function versionedUrl(value,version){
 const url=new URL(value,api);if(url.origin!==new URL(api).origin||!url.pathname.startsWith('/api/'))throw Error('Unexpected Wiki origin/path');
 url.searchParams.set('version',version);return url.href;
}
export async function readWikiPages(endpoint,version,get,{minimum=1,maxPages=30}={}){
 let next=versionedUrl(endpoint,version),rows=[],page=1,total;const seen=new Set();
 while(next){
  if(page>maxPages||seen.has(next))throw Error('Incomplete Wiki catalogue');seen.add(next);
  const result=await get(next),meta=result?.meta;
  if(!Array.isArray(result?.data)||meta?.current_page!==page||!Number.isSafeInteger(meta.total)||result.data.some(row=>row.version!==version))throw Error('Mixed version or invalid Wiki page');
  if(total!==undefined&&total!==meta.total)throw Error('Wiki total changed during refresh');total=meta.total;
  rows.push(...result.data);next=result.links?.next?versionedUrl(result.links.next,version):null;page++;
 }
 if(rows.length<minimum||rows.length!==total||new Set(rows.map(row=>row.uuid)).size!==rows.length||rows.some(row=>!row.uuid))throw Error('Incomplete Wiki catalogue');
 return rows;
}
export function driveFromItem(item,version,{stockOnly=false}={}){
 const q=item?.quantum_drive?.standard_jump;
 if(item?.version!==version||item.type!=='QuantumDrive'||!item.uuid||!q||![item.size,q.drive_speed,q.stage_one_accel_rate,q.stage_two_accel_rate].every(n=>Number.isFinite(n)&&n>0))throw Error('Incomplete or wrong-version drive: '+item?.name);
 return {id:item.uuid,name:item.name,size:item.size,grade:item.grade||null,class:item.class||null,maxSpeed:q.drive_speed,a1:q.stage_one_accel_rate,a2:q.stage_two_accel_rate,engageSpeed:q.engage_speed||0,spool:q.spool_up_time||0,cooldown:q.cooldown_time||0,sourceUrl:versionedUrl(item.link||api+'items/'+item.uuid,version),version,...(stockOnly?{stockOnly:true}:{})};
}
export function selectVehicle(ship,index,prior){
 if(ship.wikiVehicleId){const selected=index.find(row=>row.uuid===ship.wikiVehicleId);if(!selected)throw Error('Unresolved/reviewed vehicle identity: '+ship.id);return selected;}
 // Preserve exact vehicle identity across refreshes; do not pick a similarly named variant.
 const migrations={'rsi-constellation-andromeda':'rsi-constellation-andromeda-gs','rsi-constellation-aquila':'rsi-constellation-aquila-gs'};
 const migrated=index.find(row=>row.slug===migrations[ship.id]);if(migrated)return migrated;
 const source=prior?.sourceUrl&&new URL(prior.sourceUrl).pathname.split('/').pop();
 const byId=index.find(row=>row.uuid===source||row.slug===source);if(byId)return byId;
 const wanted=normalize(ship.name.replace(/ \(화물 모듈 장착 시\)$/,''));
 const candidates=index.filter(row=>!row.slug?.includes('display')&&[row.game_name,row.name].some(name=>normalize(name)===wanted));
 if(candidates.length>1)throw Error('ambiguous vehicle identity: '+ship.id);
 if(!candidates.length)throw Error('Unresolved/vehicle identity: '+ship.id);return candidates[0];
}
export function auditGrid(ship,vehicle,version){
 const localScu=ship.grids.reduce((sum,g)=>sum+g.w*g.h*g.l,0),sourceGrids=vehicle.cargo_grids||[];
 // Wiki supplies dimensions, not attachment positions/rotations. Never invent those coordinates.
 const shape=g=>[g.w,g.h,g.l].sort((a,b)=>a-b).join('x');
 const wikiShapes=sourceGrids.map(g=>[g.width,g.height,g.length].map(n=>n/1.25)).filter(a=>a.every(Number.isInteger)).map(a=>a.sort((x,y)=>x-y).join('x')).sort();
 const matching=JSON.stringify(ship.grids.map(shape).sort())===JSON.stringify(wikiShapes);
 return {id:ship.id,version,sourceUrl:versionedUrl(vehicle.link,version),localScu,wikiCapacity:vehicle.cargo_capacity,wikiGridScu:sourceGrids.reduce((sum,g)=>sum+(g.scu||0),0),dimensionsMatch:matching,status:matching?'dimensions-confirmed':'community-layout-retained',layoutSource:ship.sourceUrl,scope:'Dimensions/capacity comparison only; community attachment positions, restrictions and saved cargo are preserved.'};
}
export async function publishFiles(directory,values,{renameImpl=rename}={}){
 const old=new Map(),staged=[];
 try{
  for(const [name,value] of Object.entries(values)){const target=path.join(directory,name);old.set(name,await readFile(target).catch(error=>{if(error.code==='ENOENT')return null;throw error;}));await writeFile(target+'.staged',value);staged.push(target+'.staged');}
  for(const name of Object.keys(values))await renameImpl(path.join(directory,name+'.staged'),path.join(directory,name));
 }catch(error){for(const [name,value] of old){const target=path.join(directory,name);if(value!==null)await writeFile(target,value);else await unlink(target).catch(()=>{});}throw error;}
 finally{await Promise.all(staged.map(file=>unlink(file).catch(()=>{})));}
}
export async function refreshFleet({directory=fileURLToPath(new URL('../data/',import.meta.url)),fetchImpl=fetch,onProgress=console.log}={}){
 const get=async url=>{const response=await fetchImpl(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Wiki HTTP '+response.status);return response.json();};
 const version=(await get(api+'game-versions/default'))?.data?.code;
 if(!/^\d+\.\d+\.\d+-LIVE\.\d+$/i.test(version||''))throw Error('Invalid Wiki LIVE version');
 const originalShips=JSON.parse(await readFile(path.join(directory,'ships.json'),'utf8')),previous=JSON.parse(await readFile(path.join(directory,'ship-performance.json'),'utf8')),previousQuantum=JSON.parse(await readFile(path.join(directory,'quantum-drives.json'),'utf8'));
 const gridResponse=await fetchImpl(gridSource,{signal:AbortSignal.timeout(45000)});if(!gridResponse.ok)throw Error('Community grid HTTP '+gridResponse.status);
 const gridText=await gridResponse.text(),gridUpdate=reconcileCommunityGrids(originalShips,gridText);
 const index=await readWikiPages('vehicles',version,get,{minimum:100});onProgress('Wiki vehicles: '+index.length);
 const reviewed=applyReviewedProfiles(gridUpdate.ships,index),ships=reviewed.ships;
 const items=await readWikiPages('items?filter[type]=QuantumDrive',version,get,{minimum:50});
 const drives=items.map(item=>driveFromItem(item,version)).sort((a,b)=>a.size-b.size||a.name.localeCompare(b.name));
 const performance={},profiles={},stockSources=[],audits=[],unavailable=[],vehicleIds=new Map();
 for(const ship of ships){
  let selected;
  try{selected=selectVehicle(ship,index,previous.profiles[ship.id]);}catch(error){
   // An absent variant is not the similarly named base ship. Keep its explicitly dated complete profile.
   if(!/Unresolved\//.test(error.message))throw error;
   const old=previous.profiles[ship.id],q=previousQuantum.profiles[ship.id];if(!old||!q)throw error;
   const cachedDrives=q.cachedDrives||previousQuantum.drives.filter(d=>q.compatibleDriveIds.includes(d.id));
   if(!cachedDrives.some(d=>d.id===q.factoryDriveId))throw Error('Invalid retained quantum profile');
   performance[ship.id]={...old,updateStatus:'retained',requestedVersion:version};
   profiles[ship.id]={...q,updateStatus:'retained',requestedVersion:version,cachedDrives};
   unavailable.push({id:ship.id,requestedVersion:version,retainedVersion:old.version,reason:'No unambiguous current Wiki vehicle; previous exact variant retained'});
   audits.push({id:ship.id,version:old.version,requestedVersion:version,status:'vehicle-unavailable-layout-retained',dimensionsMatch:false});continue;
  }
  const sourceUrl=versionedUrl(selected.link,version);
  const vehicle=(await get(sourceUrl)).data;
  if(vehicle?.uuid!==selected.uuid||vehicle?.version!==version)throw Error('Vehicle identity/version mismatch: '+ship.id);
  const port=flatten(vehicle.ports).find(p=>p.type==='QuantumDrive');
  if(!port?.equipped_item?.uuid)throw Error('Missing factory quantum port: '+ship.id);
  let factory=drives.find(d=>d.id===port.equipped_item.uuid);
  if(!factory){const item=(await get(versionedUrl(port.equipped_item.link||api+'items/'+port.equipped_item.uuid,version))).data;factory=driveFromItem(item,version,{stockOnly:true});drives.push(factory);stockSources.push({url:factory.sourceUrl,sha256:digest(JSON.stringify(item))});}
  const size=Number(port.equipped_item.size),editable=port.editable!==false;
  if(size!==factory.size||size<port.sizes?.min||size>port.sizes?.max)throw Error('Factory drive does not fit Wiki port: '+ship.id);
  if(![vehicle.speed?.scm,vehicle.speed?.max].every(n=>Number.isFinite(n)&&n>0))throw Error('Incomplete flight performance: '+ship.id);
  const p={name:vehicle.name,sourceUrl,version,scm:vehicle.speed.scm,maxSpeed:vehicle.speed.max,zeroToScm:vehicle.speed.zero_to_scm||null,brakeFromScm:vehicle.speed.scm_to_zero||null,driveSize:size,factoryDrive:{name:factory.name,size,maxSpeed:factory.maxSpeed,a1:factory.a1,a2:factory.a2,engageSpeed:factory.engageSpeed,spool:factory.spool,cooldown:factory.cooldown}};
  performance[ship.id]=p;profiles[ship.id]={name:p.name,sourceUrl,version,scm:p.scm,maxSpeed:p.maxSpeed,hasQuantumDrive:true,sizeBasis:'wiki-drive-size',minDriveSize:size,maxDriveSize:size,editable,factoryDriveId:factory.id,factoryDrive:factory,compatibleDriveIds:[]};
  vehicleIds.set(vehicle.uuid,ship.id);audits.push(auditGrid(ship,vehicle,version));
 }
 for(const p of Object.values(profiles).filter(p=>p.updateStatus!=='retained'))p.compatibleDriveIds=drives.filter(d=>d.size===p.maxDriveSize&&(!d.stockOnly||d.id===p.factoryDriveId)&&(p.editable||d.id===p.factoryDriveId)).map(d=>d.id);
 const referenceDrives={};for(const name of ['hemera','atlas','erebos']){const item=items.find(item=>item.slug===name);if(!item)throw Error('Missing reference drive '+name);const d=driveFromItem(item,version);referenceDrives[name]={name:d.name,size:d.size,maxSpeed:d.maxSpeed,a1:d.a1,a2:d.a2,engageSpeed:d.engageSpeed,spool:d.spool,cooldown:d.cooldown,sourceUrl:d.sourceUrl,version,reference10Gm:item.quantum_drive.travel_time_10gm?.seconds};}
 if((await get(api+'game-versions/default'))?.data?.code!==version)throw Error('Wiki version changed during refresh');
 const retrievedAt=new Date().toISOString(),shipBytes=JSON.stringify({version,downloaded:retrievedAt.slice(0,10),profiles:performance,drives:referenceDrives,unavailable})+'\n';
 const quantum={schemaVersion:1,source:new URL(api).origin,catalogUrl:versionedUrl('items?filter[type]=QuantumDrive',version),version,retrievedAt,attribution:'Star Citizen Wiki API / Cloud Imperium Games',catalogueCount:items.length,stockSources,itemsSha256:digest(JSON.stringify(items)),shipPerformanceSha256:digest(shipBytes),scope:'Same-version Wiki drive statistics and factory ship slots. Travel times are estimates; fuel and power constraints are not simulated.',drives,profiles,unavailable};
 const references={};for(const row of index){if(!row.class_name||references[row.class_name])throw Error('Invalid/duplicate vehicle class');references[row.class_name]={id:vehicleIds.get(row.uuid)||null,name:row.name,source:versionedUrl(row.link,version),version};}
 const priorReferences=(await import(pathToFileURL(path.join(directory,'log-vehicle-index.mjs')).href+'?refresh='+Date.now())).SHIP_REFERENCES;
 for(const [key,value] of Object.entries(priorReferences))if(!references[key])references[key]={...value,legacy:true};
 const meta={version,downloaded:retrievedAt,source:versionedUrl('vehicles',version),total:index.length,linkedProfiles:vehicleIds.size,legacyIdentifiers:Object.values(references).filter(r=>r.legacy).length};
 const referenceModule='// Generated from public Wiki vehicle facts; do not edit. No game descriptions or translations.\nexport const VEHICLE_INDEX_META=Object.freeze('+JSON.stringify(meta)+');\nexport const SHIP_REFERENCES=Object.freeze(Object.fromEntries(Object.entries('+JSON.stringify(references)+').map(([key,value])=>[key,Object.freeze(value)])));\n';
 const gridAudit={version,retrievedAt,reviewedProfiles:reviewed.applied,communitySource:{url:gridSource,sha256:digest(gridText),updatedShips:gridUpdate.changes,unresolved:gridUpdate.unresolved},scope:'Community grid geometry is not assigned a game patch without evidence. Wiki verifies dimensions only.',profiles:audits,vehiclesWithoutLayout:index.filter(v=>!v.slug?.includes('display')&&v.cargo_capacity>0&&!vehicleIds.has(v.uuid)).map(v=>({uuid:v.uuid,name:v.game_name||v.name,cargoCapacity:v.cargo_capacity,sourceUrl:versionedUrl(v.link,version)}))};
 await publishFiles(directory,{'ships.json':JSON.stringify(ships,null,1)+'\n','ship-performance.json':shipBytes,'quantum-drives.json':JSON.stringify(quantum)+'\n','log-vehicle-index.mjs':referenceModule,'ship-grid-audit.json':JSON.stringify(gridAudit,null,2)+'\n'});
 return {version,profiles:ships.length,drives:drives.length,vehicleIdentifiers:index.length,gridDimensionsConfirmed:audits.filter(a=>a.dimensionsMatch).length,gridLayoutsRetained:audits.filter(a=>!a.dimensionsMatch).length,unavailable};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(await refreshFleet());
