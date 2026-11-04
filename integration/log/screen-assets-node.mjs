import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
const manifest=JSON.parse(await readFile(new URL('../../data/screen-reader-assets.json',import.meta.url),'utf8'));
export const screenAssets=manifest.map(a=>a.name);
const valid=(b,a)=>b.length===a.bytes&&createHash('sha256').update(b).digest('hex')===a.sha256;
let pending;
export function prepareScreenAssets(){return pending||=(async()=>{
 const directory=new URL('../../vendor/screen/',import.meta.url);await mkdir(directory,{recursive:true});
 // Serial, bounded downloads; no request path, image or user text is accepted.
 for(const a of manifest){
  const target=new URL(a.name,directory);try{if(valid(await readFile(target),a))continue;}catch{}
  const r=await fetch(a.url,{signal:AbortSignal.timeout(20000),redirect:'error'});if(!r.ok)throw Error('screen-library-unavailable');
  const parts=[];let size=0;for await(const part of r.body){size+=part.length;if(size>a.bytes)throw Error('screen-library-size');parts.push(part);}
  const bytes=Buffer.concat(parts);if(!valid(bytes,a))throw Error('screen-library-integrity');
  const temp=new URL(randomUUID()+'.tmp',directory);try{await writeFile(temp,bytes,{flag:'wx'});await rename(temp,target);}finally{await unlink(temp).catch(()=>{});}
 }
})().finally(()=>{pending=null;});}
