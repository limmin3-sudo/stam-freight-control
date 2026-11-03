import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
const target = new URL('../../vendor/three.module.js',import.meta.url);
const expected = '0a3368c165eea773490aec7b77c22de70e3eac288503409256fdbf4d12578416';
const valid = bytes => createHash('sha256').update(bytes).digest('hex') === expected;
let pending;
export function preparePreviewAssets() {
  return pending ||= prepare().finally(()=>{pending=null;});
}
async function prepare() {
  try {if(valid(await readFile(target)))return;} catch {}
  const response = await fetch('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js',
    {signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!response.ok)throw Error('preview-library-unavailable');
  const parts=[];let size=0;
  for await (const part of response.body) {
    size+=part.length;if(size>3*1024*1024)throw Error('preview-library-too-large');parts.push(part);
  }
  const content=Buffer.concat(parts);
  if(!valid(content))throw Error('preview-library-integrity');
  await mkdir(new URL('../../vendor/',import.meta.url),{recursive:true});
  const temp=new URL('./three-'+randomUUID()+'.tmp',target);
  try {await writeFile(temp,content,{flag:'wx'});await rename(temp,target);}
  finally {await unlink(temp).catch(()=>{});}
}
