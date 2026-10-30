import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function normalize(raw,version){
 const gateIds=new Set(raw.connections.flatMap(c=>[c.entry_uuid,c.exit_uuid]));
 const candidates=raw.data.filter(l=>['stanton','pyro','nyx'].includes(l.system)&&l.uuid&&(!l.hidden||gateIds.has(l.uuid))&&l.type!=='unknown'&&[l.x,l.y,l.z].every(Number.isFinite));
 const groups=new Map();for(const l of candidates){const key=l.system+':'+l.uuid;const list=groups.get(key)||[];list.push(l);groups.set(key,list);}
 const locations=[];let ambiguous=0;
 for(const [id,ls] of groups){const unique=[...new Map(ls.map(l=>[[l.x,l.y,l.z].join(','),l])).values()];if(unique.length>1){ambiguous++;continue;}const l=ls[0];locations.push({id,uuid:l.uuid,name:l.name,system:l.system,type:l.type,parentId:l.parent_uuid?l.system+':'+l.parent_uuid:null,qt:l.qt_valid,position:[l.x,l.y,l.z].map(v=>Math.round(v*1000)/1000),isGateway:gateIds.has(l.uuid)});}
 const ids=new Set(locations.map(l=>l.id));
 const jumps=raw.connections.map(c=>({from:c.entry_system+':'+c.entry_uuid,to:c.exit_system+':'+c.exit_uuid})).filter(c=>ids.has(c.from)&&ids.has(c.to));
 return {meta:{source:'https://api.star-citizen.wiki/api/locations/positions',version,downloaded:'2026-10-30',units:'meters',attribution:'Star Citizen Wiki game data / Cloud Imperium Games',license:'https://starcitizen.tools/Star_Citizen_Wiki:DISCLAIMER',omittedAmbiguous:ambiguous,notes:'A source snapshot, not live navigation. Multi-position identifiers omitted; unavailable Nyx planets are map references only. Jump connections reflect this dataset.'},locations,jumps};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const raw=await fetch('https://api.star-citizen.wiki/api/locations/positions').then(r=>{if(!r.ok)throw Error(r.status);return r.json();});
 const v=await fetch('https://api.star-citizen.wiki/api/game-versions/default').then(r=>r.json());
 const data=normalize(raw,v.data.code);data.meta.downloaded=new Date().toISOString().slice(0,10);
 await fs.mkdir(path.join(base,'data'),{recursive:true});await fs.writeFile(path.join(base,'data/locations.json'),JSON.stringify(data));console.log(`${data.locations.length} locations; ${data.jumps.length} jumps; ${data.meta.version}`);
}
