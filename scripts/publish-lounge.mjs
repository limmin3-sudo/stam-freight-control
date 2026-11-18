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
 // Direct links to older browser tools share the main site's phone notice.
 // These HTML pages are published after the immutable desktop snapshot is built.
 const phoneRedirect = `<script>if (Math.min(screen.width, screen.height) < 600) {
   const lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ko';
   location.replace('./#/division?lang=' + lang);
 }</script>`;
 for (const name of await fs.readdir(out)) {
   if (name === 'index.html' || !name.endsWith('.html')) continue;
   const page = path.join(out, name);
   const sourceHtml = await fs.readFile(page, 'utf8');
   await fs.writeFile(page, sourceHtml.replace(/<head(?:\s[^>]*)?>/i, head => head + phoneRedirect));
 }
 async function copy(dir,prefix=''){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+entry.name;if(rel==='index.html')continue;const from=path.join(dir,entry.name),to=path.join(out,rel);if(entry.isDirectory()){await fs.mkdir(to,{recursive:true});await copy(from,rel+'/');}else await fs.copyFile(from,to,constants.COPYFILE_EXCL);}}
 await copy(source);
 await fs.writeFile(path.join(out,'index.html'),html.replace('</head>',`<meta name="app-version" content="${version}"></head>`));
 return {entry:'index.html',flight:'flight.html',desktopSnapshot:'unchanged'};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(await publishLounge(process.argv[2]||'public',process.argv[3]||'apps/control-room/dist'));
