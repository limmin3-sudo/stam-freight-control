import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),file=path.join(root,'vendor/three.module.js'),expected='0a3368c165eea773490aec7b77c22de70e3eac288503409256fdbf4d12578416';
let content;try{content=await fs.readFile(file);}catch{}
if(!content||crypto.createHash('sha256').update(content).digest('hex')!==expected){const response=await fetch('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js');if(!response.ok)throw Error('Three.js download failed: '+response.status);content=Buffer.from(await response.arrayBuffer());if(crypto.createHash('sha256').update(content).digest('hex')!==expected)throw Error('Three.js integrity mismatch');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,content);}
console.log('Three.js 0.169.0 integrity verified');
