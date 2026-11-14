import path from 'node:path';import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {checkedDesktopArtifacts} from '../scripts/desktop-artifacts.mjs';
const zip=Buffer.from('synthetic zip'),setup=Buffer.from('MZsynthetic setup'),base='https://github.com/limmin3-sudo/stam-freight-control/releases/download/app.1.4.0/';
const metadata=(suffix,data)=>({url:base+'STAM-app.1.4.0-'+suffix,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
const release={version:'app.1.4.0',...metadata('win-x64.zip',zip),installer:metadata('setup-win-x64.exe',setup)};
const read=async file=>file.endsWith('.zip')?zip:setup;
test('ZIP-only releases stay compatible and installer releases validate both assets',async()=>{
 const old={...release};delete old.installer;assert.equal((await checkedDesktopArtifacts(old,{read})).length,1);
 assert.deepEqual(await checkedDesktopArtifacts(release,{read}),[path.join('dist','STAM-app.1.4.0-win-x64.zip'),path.join('dist','STAM-app.1.4.0-setup-win-x64.exe')]);
});
test('installer tampering or a wrong release URL fails before publication',async()=>{
 await assert.rejects(checkedDesktopArtifacts(release,{read:async file=>file.endsWith('.zip')?zip:Buffer.from('wrong')}),/package-integrity/);
 await assert.rejects(checkedDesktopArtifacts({...release,installer:{...release.installer,url:'https://example.com/other.exe'}},{read}),/invalid-asset-metadata/);
 await assert.rejects(checkedDesktopArtifacts({...release,version:'../../other'},{read}),/invalid-version/);
});
