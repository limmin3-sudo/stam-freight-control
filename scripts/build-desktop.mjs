import {readFile,writeFile,mkdir,copyFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {root,webFiles} from './web-files.mjs';
export async function desktopFiles(){
 const files=new Set(['assets/stam-logo-transparent.png','data/log-location-index.json','data/companion-help.json','data/log-vehicle-index.mjs','THIRD-PARTY-NOTICES.md'].map(n=>path.join(root,n)));
 for(const n of ['desktop/portraits/female.png','desktop/portraits/male.png','desktop/voices/partner-female-ko.wav','desktop/voices/partner-male-ko.wav','desktop/fonts/README.md','desktop/fonts/Barlow-Medium.ttf','desktop/fonts/SUIT-Medium.ttf','desktop/fonts/BARLOW-LICENSE.txt','desktop/fonts/SUIT-LICENSE.txt','desktop/version.json','desktop/overlay-material.png','desktop/theme/black-gold-d-frame.png','desktop/theme/flight-console-a-frame.png','desktop/theme/hologram-button.png','desktop/theme/division-overview.png','desktop/bridge.mjs','scripts/log-link-server.mjs','integration/log/live-server.mjs','LICENSE'])files.add(path.join(root,n));
 for(const file of ['glass-edge.png','glass-face.jpg','Michroma-Regular.ttf','Michroma-OFL.txt'])files.add(path.join(root,'desktop/theme/optics',file));
 const queue=[...files];for(let i=0;i<queue.length;i++){const full=queue[i];if(!full.endsWith('.mjs'))continue;const s=await readFile(full,'utf8');for(const m of s.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.{1,2}\/[^'"?#]+)['"]/g)){const file=path.resolve(path.dirname(full),m[1]);if(!file.startsWith(root))throw Error('dependency-outside-project');if(!files.has(file)){files.add(file);queue.push(file);}}}
 return [...files].sort();
}
export async function buildDesktop(out){const directory=path.resolve(out);if(directory===path.resolve(root)||root.startsWith(directory+path.sep))throw Error('unsafe-output');try{await stat(directory);throw Error('output-exists');}catch(e){if(e.code!=='ENOENT')throw e;}
 const manifest=[];const version=JSON.parse(await readFile(path.join(root,'desktop/version.json'),'utf8')).version;
 for(const file of await desktopFiles()){const name=path.relative(root,file).split(path.sep).join('/');if(/(^|\/)(\.env|\.git)(\/|$)|\.log$/i.test(name))throw Error('private-data');const to=path.join(directory,'app',name);await mkdir(path.dirname(to),{recursive:true});const bytes=await readFile(file);await writeFile(to,bytes);manifest.push({path:'app/'+name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
 const readData=async name=>JSON.parse(await readFile(path.join(root,'data',name),'utf8'));
 const market=await readData('trade-market.json'),official=await readData('stam-korean.json'),supplement=await readData('ai-korean.json');
 const vocabulary=Buffer.from(JSON.stringify(market.commodities.map(c=>({id:c.id,en:c.name,ko:official.goods[c.name]||supplement.goods[c.name]||c.name}))));
 const voiceFile='app/data/voice-goods.json';await writeFile(path.join(directory,voiceFile),vocabulary);
 manifest.push({path:voiceFile,bytes:vocabulary.length,sha256:createHash('sha256').update(vocabulary).digest('hex')});
 await writeFile(path.join(directory,'APP-FILES.json'),JSON.stringify({version,files:manifest},null,2)+'\n');
 await writeFile(path.join(directory,'START-HERE.txt'),'STAM / FREIGHT DIVISION\r\nExtract the whole ZIP and run STAM.exe, or use the installer. The app finds a unique LIVE installation automatically, or reconnects your last selected Game.log. Use Choose Game.log for a custom installation or PTU/EPTU. Closing the window keeps receiving in the system tray; use Quit app to exit. Click Open mission console. Contracts, login and all website updates stay on the original public website. Connecting does not automatically open a browser.\r\n');return {version,files:manifest.length};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(await buildDesktop(process.argv[2]));
