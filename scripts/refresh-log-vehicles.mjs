import {readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const SOURCE='https://api.star-citizen.wiki/api/vehicles';
const UUID=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
// Match exact public UUIDs already used by performance profiles, never name similarity.
export function vehicleReferences(items,performance,ships){
 const profiles=new Map(),ids=new Map(ships.map(s=>[s.id,s])),uuids=new Set(),classes=new Set();
 for(const [id,p] of Object.entries(performance.profiles)){
  const uuid=p.sourceUrl?.match(/^https:\/\/api\.star-citizen\.wiki\/api\/vehicles\/([a-f0-9-]+)$/)?.[1];
  if(!UUID.test(uuid||'')||!ids.has(id)||profiles.has(uuid)||p.version!==performance.version)throw Error('Invalid vehicle profile reference');
  profiles.set(uuid,id);
 }
 const entries=items.map(item=>{
  if(!UUID.test(item.uuid||'')||!(/^[A-Za-z][A-Za-z0-9_]{1,150}$/).test(item.class_name||'')||!item.name||item.name.length>200||item.version!==performance.version||uuids.has(item.uuid)||classes.has(item.class_name))throw Error('Invalid or duplicate vehicle definition');
  uuids.add(item.uuid);classes.add(item.class_name);
  const id=profiles.get(item.uuid)||null;
  return [item.class_name,{id,name:id?ids.get(id).name:item.name,source:SOURCE+'/'+item.uuid,version:item.version}];
 }).sort(([a],[b])=>a.localeCompare(b));
 if([...profiles.keys()].some(uuid=>!uuids.has(uuid)))throw Error('Vehicle index missing existing profiles');
 return Object.fromEntries(entries);
}
export async function refreshLogVehicles({fetcher=fetch,output=new URL('../data/log-vehicle-index.mjs',import.meta.url)}={}){
 const [performance,ships]=await Promise.all(['ship-performance.json','ships.json'].map(async name=>JSON.parse(await readFile(new URL('../data/'+name,import.meta.url),'utf8'))));
 const items=[],seen=new Set();let url=SOURCE,total;
 while(url){
  const address=new URL(url);if(seen.has(url)||seen.size>=30||address.origin!=='https://api.star-citizen.wiki'||address.pathname!=='/api/vehicles')throw Error('Invalid vehicle pagination');seen.add(url);
  const response=await fetcher(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Vehicle index unavailable');
  const page=await response.json();if(!Array.isArray(page.data)||!Number.isInteger(page.meta?.total)||page.meta.total<1)throw Error('Vehicle index incomplete');
  total??=page.meta.total;if(total!==page.meta.total)throw Error('Vehicle index changed during refresh');items.push(...page.data);url=page.links?.next;
 }
 if(items.length!==total)throw Error('Vehicle index incomplete');
 const references=vehicleReferences(items,performance,ships),meta={version:performance.version,downloaded:new Date().toISOString(),source:SOURCE,total,linkedProfiles:Object.values(references).filter(r=>r.id).length};
 const path=fileURLToPath(output),tmp=path+'.tmp';
 await writeFile(tmp,'// Generated from public Wiki vehicle facts; do not edit. No game descriptions or translations.\nexport const VEHICLE_INDEX_META=Object.freeze('+JSON.stringify(meta)+');\nexport const SHIP_REFERENCES=Object.freeze(Object.fromEntries(Object.entries('+JSON.stringify(references)+').map(([key,value])=>[key,Object.freeze(value)])));\n');await rename(tmp,path);
 return meta;
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(await refreshLogVehicles());
