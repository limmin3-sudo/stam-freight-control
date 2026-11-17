// Promote only the fixed Windows run that passed native and installer checks.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {desktopFiles} from './build-desktop.mjs';
import {root} from './web-files.mjs';
import {checkedDesktopArtifacts} from './desktop-artifacts.mjs';
import path from 'node:path';
const source='3ddc89bf8c62f6cb68b63b59d19b63a1035f727b',run=44060734263;
if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='limmin3-sudo/stam-freight-control'||process.env.GITHUB_WORKFLOW!=='Publish verified Windows companion')throw Error('promotion-context');
const gh=args=>execFileSync('gh',args,{encoding:'utf8'});
const result=JSON.parse(gh(['api',`repos/${process.env.GITHUB_REPOSITORY}/actions/runs/${run}`]));
if(result.head_sha!==source||result.conclusion!=='success')throw Error('verified-run-mismatch');
execFileSync('git',['fetch','origin',source]);
const files=[...new Set([...(await desktopFiles()).map(f=>path.relative(root,f)), 'desktop/Launcher.cs','desktop/CompanionOverlay.cs','desktop/CompanionOverlayChecks.cs','desktop/build-windows.ps1','scripts/build-desktop.mjs'])];
const reviewedDifferences=[];
for(const file of files){const original=execFileSync('git',['show',`${source}:${file}`],{maxBuffer:64*1024*1024});if(!original.equals(await readFile(file))){
 const expected=original.toString().replace("&&!n.startsWith('.'))","&&!n.startsWith('.')&&!['freight-free.mjs','uex-submit.mjs'].includes(n))");
 if(file!=='scripts/web-files.mjs'||expected!==await readFile(file,'utf8'))throw Error('verified-source-changed: '+file);
 reviewedDifferences.push({file,reason:'Web-only packaging exclusion of cancelled modules; companion uses API-only service and contains neither module.'});
}}
const release=JSON.parse((await readFile('dist/desktop-release.json','utf8')).replace(/^\uFEFF/,''));
if(release.version!=='app.1.5.0')throw Error('unexpected-version');
await checkedDesktopArtifacts(release);
execFileSync('python3',['-c',"import zipfile; z=zipfile.ZipFile('dist/STAM-app.1.5.0-win-x64.zip'); assert not any(n.endswith(('freight-free.mjs','uex-submit.mjs','server/freight-domain.mjs')) for n in z.namelist()); assert z.testzip() is None"]);
const evidence={source,verifiedRun:run,sourceFiles:files.length,reviewedDifferences,release,files:[]};
for(const name of await readdir('dist')){
 if(!/\.(json|png|txt)$/i.test(name))continue;
 const bytes=await readFile('dist/'+name);if(bytes.length>10*1024*1024)continue;
 const blob=JSON.parse(execFileSync('gh',['api',`repos/${process.env.GITHUB_REPOSITORY}/git/blobs`,'--input','-'],{input:JSON.stringify({encoding:'base64',content:bytes.toString('base64')}),encoding:'utf8',maxBuffer:20*1024*1024}));
 evidence.files.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),blob:blob.sha});
}
await writeFile('dist/promotion-evidence.json',JSON.stringify(evidence,null,2));
console.log('STAM_PROMOTION_EVIDENCE '+JSON.stringify(evidence));
