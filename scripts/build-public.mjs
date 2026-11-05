import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root,webFiles} from './web-files.mjs';
const out=path.resolve(process.argv[2]||'public');if(out===path.resolve(root))throw Error('separate-output-required');
for(const file of await webFiles()){const dest=path.join(out,file);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(root,file),dest);}
await writeFile(path.join(out,'.nojekyll'),'');console.log('Original flight deck and selected contract inbox assembled.');
