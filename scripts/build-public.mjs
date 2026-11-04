import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {dirname,resolve,relative} from 'node:path';
import {logServiceFiles} from '../integration/log/live-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(process.argv[2]||'public');
if(out===resolve(root))throw Error('separate-output-required');
await mkdir(out,{recursive:true});
for(const url of logServiceFiles()){
 const file=fileURLToPath(url),name=relative(root,file);if(name.startsWith('..'))throw Error('outside-app');
 const destination=resolve(out,name);await mkdir(dirname(destination),{recursive:true});await copyFile(file,destination);
}
for(const name of ['data/locations.json','LICENSE','THIRD-PARTY-NOTICES.md','vendor/THREE-LICENSE.txt','vendor/SUPERCARGO-LICENSE.txt','vendor/ocr-LICENSES.txt']){await mkdir(dirname(resolve(out,name)),{recursive:true});await copyFile(resolve(root,name),resolve(out,name));}
await writeFile(resolve(out,'.nojekyll'),'');console.log('Public transport workspace, download and guide assembled.');
