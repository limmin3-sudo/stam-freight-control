import fs from 'node:fs/promises';import {spawnSync} from 'node:child_process';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
for(const [target,script]of [['vendor/three.module.js','scripts/ensure-three.mjs'],['data/locations.json','scripts/refresh-data.mjs']]){try{await fs.access(path.join(root,target));}catch{const result=spawnSync(process.execPath,[path.join(root,script)],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}}
