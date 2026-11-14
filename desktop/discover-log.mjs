// Bounded known-installation search. Never crawl drives or read the contents of Game.log.
import {stat} from 'node:fs/promises';
import path from 'node:path';
export function installationRoots(env=process.env,drives=['C:','D:','E:','F:']){
 const roots=[];
 for(const base of [env.ProgramFiles,env['ProgramFiles(x86)'],...drives.flatMap(d=>[d+'\\',d+'\\Games'])].filter(Boolean))
  for(const suffix of ['Roberts Space Industries\\StarCitizen','RSI\\StarCitizen','StarCitizen'])roots.push(path.win32.join(base,suffix));
 return [...new Set(roots.map(p=>p.toLowerCase()))].map(key=>roots.find(p=>p.toLowerCase()===key));
}
export async function discoverLogs({roots=installationRoots(),inspect=stat}={}){
 const candidates=[];
 // At most the known roots x three channels; never recursively enumerate a drive.
 await Promise.all(roots.slice(0,48).flatMap(root=>['LIVE','PTU','EPTU'].map(async channel=>{
  const file=path.join(root,channel,'Game.log');
  try{const info=await inspect(file);if(info.isFile())candidates.push({file,channel,modified:info.mtimeMs});}catch{/* Missing installation, permission or offline drive. */}
 })));
 return candidates.sort((a,b)=>(a.channel==='LIVE'?0:1)-(b.channel==='LIVE'?0:1)||b.modified-a.modified||a.file.localeCompare(b.file));
}
export function automaticLog(candidates){
 // Never silently choose between separate LIVE installs or opt into a test universe.
 const live=candidates.filter(c=>c.channel==='LIVE');return live.length===1?live[0].file:null;
}
