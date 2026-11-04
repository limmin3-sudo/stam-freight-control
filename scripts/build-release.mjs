import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export async function buildRelease(directory,version){
 const out=path.resolve(directory);if(out===root)throw Error('배포용 복사본에서만 실행하세요.');
 if(!/^[a-f0-9]{40}$/.test(version))throw Error('전체 커밋 버전이 필요합니다.');
 const releases=JSON.parse(await fs.readFile(path.join(out,'data/releases.json'),'utf8'));
 if(!Array.isArray(releases))throw Error('업데이트 기록 형식을 확인하세요.');
 // Give every local module, data file and asset its release URL. A new HTML
 // alone must not load dependencies cached from an older deployment.
 const stamp=text=>text.replace(/(["'])((?:(?:\.{1,2}\/)+|(?:assets|data|vendor|integration|onboarding)\/)[^"'\s?]+\.(?:mjs|js|json|css|jpg|png|webp|svg|mp4|vtt))(?:\?v=[a-f0-9]+)?\1/g,(_,quote,url)=>`${quote}${url}?v=${version}${quote}`);
 async function stampModules(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){const full=path.join(directory,entry.name);if(entry.isDirectory())await stampModules(full);else if(entry.name.endsWith('.mjs'))await fs.writeFile(full,stamp(await fs.readFile(full,'utf8')));}}
 await stampModules(out);
 for(const page of ['guide.html','download.html']){try{const full=path.join(out,page);await fs.writeFile(full,stamp(await fs.readFile(full,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;}}
 const index=path.join(out,'index.html');let html=stamp(await fs.readFile(index,'utf8'));
 html=html.replace(/<meta name="app-version" content="[^"]*">/g,'').replace('</head>',`<meta name="app-version" content="${version}"></head>`);
 html=html.replace(/((?:src|href)=)(["'])(app\.mjs|style\.css|icon\.svg)(?:\?v=[a-f0-9]+)?\2/g,(_,attr,q,url)=>`${attr}${q}${url}?v=${version}${q}`);
 const importMap=html.match(/<script\s+type="importmap"[^>]*>([\s\S]*?)<\/script>/);if(importMap){const hash=createHash('sha256').update(importMap[1]).digest('base64');html=html.replace(/'sha256-[A-Za-z0-9+/=]+'/g,`'sha256-${hash}'`);}
 await fs.writeFile(index,html);await fs.writeFile(path.join(out,'version.json'),JSON.stringify({version,releases}));
 return {version,releases:releases.length};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const version=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 console.log(await buildRelease(process.argv[2]||path.join(root,'public'),version));
}
