import fs from 'node:fs/promises';
import path from 'node:path';
import {constants} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Run AFTER build-release. The desktop's immutable web-assets snapshot keeps
// the working flight deck; the public browser entry can move to the new lounge.
export async function publishLounge(directory,dist){
 const out=path.resolve(directory),source=path.resolve(dist);
 const html=await fs.readFile(path.join(source,'index.html'),'utf8');
 const {version}=JSON.parse(await fs.readFile(path.join(out,'version.json'),'utf8'));
 if(!/^[a-f0-9]{40}$/.test(version))throw Error('missing-release-version');
 const legacy=await fs.readFile(path.join(out,'index.html'));
 if(!legacy.includes(Buffer.from('app.mjs')))throw Error('expected-legacy-flight-entry');
 // Preserve same-origin account, local storage and module URLs for real flights.
 await fs.writeFile(path.join(out,'flight.html'),legacy);
 async function copy(dir,prefix=''){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+entry.name;if(rel==='index.html')continue;const from=path.join(dir,entry.name),to=path.join(out,rel);if(entry.isDirectory()){await fs.mkdir(to,{recursive:true});await copy(from,rel+'/');}else await fs.copyFile(from,to,constants.COPYFILE_EXCL);}}
 await copy(source);
 await fs.writeFile(path.join(out,'index.html'),html.replace('</head>',`<meta name="app-version" content="${version}"></head>`));
 return {entry:'index.html',flight:'flight.html',desktopSnapshot:'unchanged'};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(await publishLounge(process.argv[2]||'public',process.argv[3]||'apps/control-room/dist'));
