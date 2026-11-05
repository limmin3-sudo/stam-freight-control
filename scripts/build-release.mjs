import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export async function buildRelease(directory,version){
 const out=path.resolve(directory);if(out===root)throw Error('배포용 복사본에서만 실행하세요.');
 if(!/^[a-f0-9]{40}$/.test(version))throw Error('전체 커밋 버전이 필요합니다.');
 const releases=JSON.parse(await fs.readFile(path.join(out,'data/releases.json'),'utf8'));
 if(!Array.isArray(releases))throw Error('업데이트 기록 형식을 확인하세요.');
 // Give every local module, data file and asset its release URL. A new HTML
 // alone must not load dependencies cached from an older deployment.
 const stamp=text=>text.replace(/(["'])((?:\.\/|(?:assets|data|vendor)\/)[^"'\s?]+\.(?:mjs|js|json|css|jpg|png|webp|svg|mp4|vtt))(?:\?v=[a-f0-9]+)?\1/g,(_,quote,url)=>`${quote}${url}?v=${version}${quote}`);
 async function modules(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory()&&entry.name!=='vendor')await modules(full);else if(entry.isFile()&&entry.name.endsWith('.mjs'))await fs.writeFile(full,stamp(await fs.readFile(full,'utf8')));}}await modules(out);
 for(const page of (await fs.readdir(out)).filter(n=>n.endsWith('.html'))){const index=path.join(out,page);let html=stamp(await fs.readFile(index,'utf8'));
 html=html.replace(/<meta name="app-version" content="[^"]*">/g,'').replace('</head>',`<meta name="app-version" content="${version}"></head>`);
 html=html.replace(/((?:src|href)=)(["'])(app\.mjs|style\.css|icon\.svg)(?:\?v=[a-f0-9]+)?\2/g,(_,attr,q,url)=>`${attr}${q}${url}?v=${version}${q}`);
 await fs.writeFile(index,html);}await fs.writeFile(path.join(out,'version.json'),JSON.stringify({version,releases}));
 const {createHash}=await import('node:crypto');const digest=bytes=>createHash('sha256').update(bytes).digest('hex');const files=[];
 async function collect(dir,prefix=''){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const relative=prefix+entry.name,full=path.join(dir,entry.name);if(entry.name.startsWith('.')||['web-assets','web-release.json'].includes(entry.name))continue;if(entry.isDirectory())await collect(full,relative+'/');else{const bytes=await fs.readFile(full);if(!bytes.length)continue;const sha256=digest(bytes);files.push({path:relative,bytes:bytes.length,sha256});await fs.mkdir(path.join(out,'web-assets'),{recursive:true});await fs.writeFile(path.join(out,'web-assets',sha256),bytes);}}}
 await collect(out);files.sort((a,b)=>a.path.localeCompare(b.path));const payload={schema:1,protocol:1,snapshotSchema:1,sourceRevision:version,files};await fs.writeFile(path.join(out,'web-release.json'),JSON.stringify({...payload,id:digest(JSON.stringify(payload))}));
 return {version,releases:releases.length};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const version=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 console.log(await buildRelease(process.argv[2]||path.join(root,'public'),version));
}
