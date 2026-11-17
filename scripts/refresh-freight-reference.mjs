// Read-only Wiki reference library. Never changes route coordinates, cargo grids or contracts.
import {readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const api='https://api.star-citizen.wiki/api/';
export async function collectWikiReference({fetchImpl=fetch,onProgress=console.log}={}){
 const get=async url=>{const r=await fetchImpl(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('Wiki HTTP '+r.status);const raw=await r.text();return {data:JSON.parse(raw),sha256:createHash('sha256').update(raw).digest('hex')};};
 const version=(await get(api+'game-versions/default')).data.data.code;if(!/^\d+\.\d+\.\d+-LIVE\.\d+$/.test(version))throw Error('Invalid LIVE version');
 const result={schema:1,checkedAt:'',requestedVersion:version,commodityVersionScope:'Version-pinned request; commodity index has no per-record version field. Do not claim row-level patch verification.',locationVersionScope:'All location record versions verified; UUID ordering with unique count matching advertised total.',commodities:[],locations:[],evidence:[]};
 const fields={commodities:['uuid','key','name','display_name','slug','tier','density_g_per_cc','instability','resistance','volatility','volatility_health_decay_per_second','box_sizes_scu','has_default_cargo_containers','kind','methods','systems','link','web_url'],locations:['uuid','slug','name','size','respawn_location_type','child_count','mission_count','hide_in_starmap','hide_in_world','block_travel','quantum_travel','system','parent','type','jurisdiction','affiliation','amenities','tag','designation','link','web_url','updated_at','version']};
 for(const resource of ['commodities','locations']){
  let pages=1,total;const ids=new Set();
  for(let page=1;page<=pages;page++){
   const url=api+resource+'?version='+version+'&page[number]='+page+'&page[size]=100'+(resource==='locations'?'&sort=uuid':'');const {data:d,sha256}=await get(url);
   if(!Array.isArray(d.data)||d.meta?.current_page!==page||!Number.isSafeInteger(d.meta.total)||!Number.isSafeInteger(d.meta.last_page)||d.meta.last_page<1||d.meta.last_page>100||(total!==undefined&&total!==d.meta.total))throw Error('Invalid or changing Wiki pagination');
   total=d.meta.total;pages=d.meta.last_page;
   for(const r of d.data){if(typeof r.uuid!=='string'||ids.has(r.uuid)||(resource==='locations'&&r.version!==version))throw Error('Duplicate identity or wrong record version');ids.add(r.uuid);result[resource].push(Object.fromEntries(fields[resource].map(k=>[k,r[k]??null])));}
   result.evidence.push({url,sha256,rows:d.data.length});
  }
  if(result[resource].length!==total||!total)throw Error('Incomplete Wiki reference');onProgress(resource+': '+total);
 }
 if((await get(api+'game-versions/default')).data.data.code!==version)throw Error('LIVE version changed during collection');result.checkedAt=new Date().toISOString();return result;
}
export async function refreshFreightReference({output=new URL('../data/freight-source-reference.json',import.meta.url),...options}={}){
 const data=await collectWikiReference(options);let prior;try{prior=JSON.parse(await readFile(output,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(prior&&['commodities','locations'].some(k=>data[k].length<prior[k].length*.7))throw Error('Unexpected loss of reference coverage');
 const staged=new URL(output.href+'.staged');try{await writeFile(staged,JSON.stringify(data)+'\n');await rename(staged,output);}finally{await unlink(staged).catch(()=>{});}return {version:data.requestedVersion,commodities:data.commodities.length,locations:data.locations.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{console.log(await refreshFreightReference());}catch(e){console.error('Wiki reference collection failed; previous library retained:',e.message);process.exitCode=1;}}
