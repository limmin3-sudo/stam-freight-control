import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
// Validate every release asset before any remote write. ZIP-only older releases remain valid.
export async function checkedDesktopArtifacts(release,{directory='dist',read=readFile}={}){
 if(!/^app\.\d+\.\d+\.\d+(?:-preview\.\d+)?$/.test(release.version))throw Error('invalid-version');
 const base='https://github.com/limmin3-sudo/stam-freight-control/releases/download/'+release.version+'/';
 const assets=[[`STAM-${release.version}-win-x64.zip`,release]];
 if(release.installer)assets.push([`STAM-${release.version}-setup-win-x64.exe`,release.installer]);
 const files=[];
 for(const [name,metadata]of assets){
  if(metadata.url!==base+name||!Number.isSafeInteger(metadata.bytes)||metadata.bytes<=0||!/^[a-f0-9]{64}$/.test(metadata.sha256))throw Error('invalid-asset-metadata');
  const file=path.join(directory,name),bytes=await read(file);
  if(bytes.length!==metadata.bytes||createHash('sha256').update(bytes).digest('hex')!==metadata.sha256)throw Error('package-integrity');
  files.push(file);
 }
 return files;
}
