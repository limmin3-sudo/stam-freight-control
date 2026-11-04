import {readFile,writeFile,mkdir,copyFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {logServiceFiles} from '../integration/log/live-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function desktopFiles(){
 const files=new Set(logServiceFiles().map(fileURLToPath));
 for(const name of ['desktop/bridge.mjs','scripts/log-link-server.mjs','integration/log/live-server.mjs','data/screen-reader-assets.json','LICENSE','THIRD-PARTY-NOTICES.md','vendor/THREE-LICENSE.txt','vendor/SUPERCARGO-LICENSE.txt','vendor/ocr-LICENSES.txt'])files.add(path.join(root,name));
 const queue=[...files];
 for(let i=0;i<queue.length;i++){
  const full=queue[i];if(!/\.mjs$/.test(full))continue;
  const text=await readFile(full,'utf8');
  for(const match of text.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.{1,2}\/[^'"?#]+)['"]/g)){
   const dependency=path.resolve(path.dirname(full),match[1]);
   if(!dependency.startsWith(root))throw Error('dependency-outside-project');
   if(!files.has(dependency)){files.add(dependency);queue.push(dependency);}
  }
 }
 return [...files].sort();
}
export async function buildDesktop(out){
 const directory=path.resolve(out);
 if(directory===root.slice(0,-1)||root.startsWith(directory+path.sep))throw Error('unsafe-output');
 try{await stat(directory);throw Error('output-exists');}catch(e){if(e.code!=='ENOENT')throw e;}
 await mkdir(path.join(directory,'app'),{recursive:true});
 const version=JSON.parse(await readFile(path.join(root,'data/rebuild-version.json'),'utf8')).version;
 const manifest=[];
 for(const full of await desktopFiles()){
  const relative=path.relative(root,full).split(path.sep).join('/');
  if(/(^|\/)(\.env|\.git|logbackups)(\/|$)|\.log$|ko-(names|commodities|hauling)\.json$|global\.ini$/i.test(relative))throw Error('private-or-retired-data');
  // The ZIP is built before its public checksum exists. Do not ship a stale
  // direct-download URL for the previous ZIP; retain this version's release page.
  const bytes=relative==='data/desktop-release.json'?Buffer.from(JSON.stringify({status:'bundled',version})+'\n'):await readFile(full),target=path.join(directory,'app',relative);
  await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);
  manifest.push({path:'app/'+relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 await writeFile(path.join(directory,'APP-FILES.json'),JSON.stringify({version,files:manifest},null,2)+'\n');
 await writeFile(path.join(directory,'START-HERE.txt'),'STAM FREIGHT CONTROL\r\n\r\n1. Extract the entire ZIP to a new folder.\r\n2. Run STAM.exe (no administrator rights required).\r\n3. Select StarCitizen/LIVE/Game.log.\r\n4. Your browser opens the local control room. Keep the launcher running.\r\n\r\nNo separate Node installation is needed. Game logs are read only.\r\nThis is a development build, not a CIG-approved or fully game-validated release.\r\nThe launcher is unsigned. Never disable Windows security to run it.\r\nSee app/THIRD-PARTY-NOTICES.md and runtime/LICENSE.\r\n');
 return {version,files:manifest.length,bytes:manifest.reduce((n,f)=>n+f.bytes,0)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(await buildDesktop(process.argv[2]));
