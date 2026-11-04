import {readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {catalogDrive} from '../performance-core.mjs';
export async function refreshQuantumDrives({fetcher=fetch,output=new URL('../data/quantum-drives.json',import.meta.url)}={}){
 const shipData=JSON.parse(await readFile(new URL('../data/ship-performance.json',import.meta.url),'utf8'));
 const version=shipData.version,items=[],seen=new Set();let url='https://api.star-citizen.wiki/api/items?filter%5Btype%5D=QuantumDrive',total;
 while(url){
  if(seen.has(url)||seen.size>=20)throw Error('Drive index pagination invalid');seen.add(url);
  const address=new URL(url);if(address.origin!=='https://api.star-citizen.wiki'||address.pathname!=='/api/items')throw Error('Unexpected drive source');
  const response=await fetcher(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Drive index unavailable');
  const page=await response.json();if(!Array.isArray(page.data)||!Number.isInteger(page.meta?.total))throw Error('Drive index incomplete');
  total??=page.meta.total;if(total!==page.meta.total)throw Error('Drive index changed during refresh');items.push(...page.data);url=page.links?.next;
 }
 if(items.length!==total||new Set(items.map(i=>i.uuid)).size!==total)throw Error('Drive index incomplete or duplicated');
 const drives=items.map(item=>catalogDrive(item,version)).sort((a,b)=>a.size-b.size||a.name.localeCompare(b.name));
 const result={version,total,downloaded:new Date().toISOString(),source:'https://api.star-citizen.wiki/api/items?filter%5Btype%5D=QuantumDrive',drives};
 const path=fileURLToPath(output),temp=path+'.tmp';await writeFile(temp,JSON.stringify(result,null,2)+'\n');await rename(temp,path);
 return {version,count:drives.length};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(await refreshQuantumDrives());
