import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export async function buildRelease(directory,version){
 const out=path.resolve(directory);if(out===root)throw Error('배포용 복사본에서만 실행하세요.');
 if(!/^[a-f0-9]{40}$/.test(version))throw Error('전체 커밋 버전이 필요합니다.');
 const releases=JSON.parse(await fs.readFile(path.join(out,'data/releases.json'),'utf8'));
 if(!Array.isArray(releases))throw Error('업데이트 기록 형식을 확인하세요.');
 // Give every local module, data file and asset its release URL. A new HTML
 // alone must not load dependencies cached from an older deployment.
 const stamp=text=>text.replace(/(["'])((?:\.\/|(?:assets|data|vendor)\/)[^"'\s?]+\.(?:mjs|js|json|css|jpg|png|webp|svg))(?:\?v=[a-f0-9]+)?\1/g,(_,quote,url)=>`${quote}${url}?v=${version}${quote}`);
 for(const file of await fs.readdir(out))if(file.endsWith('.mjs')){const full=path.join(out,file);await fs.writeFile(full,stamp(await fs.readFile(full,'utf8')));}
 const index=path.join(out,'index.html');let html=stamp(await fs.readFile(index,'utf8'));
 html=html.replace(/<meta name="app-version" content="[^"]*">/g,'').replace('</head>',`<meta name="app-version" content="${version}"></head>`);
 html=html.replace(/((?:src|href)=)(["'])(app\.mjs|style\.css|icon\.svg)(?:\?v=[a-f0-9]+)?\2/g,(_,attr,q,url)=>`${attr}${q}${url}?v=${version}${q}`);
 await fs.writeFile(index,html);await fs.writeFile(path.join(out,'version.json'),JSON.stringify({version,releases}));
 return {version,releases:releases.length};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const version=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 console.log(await buildRelease(process.argv[2]||path.join(root,'public'),version));
}
