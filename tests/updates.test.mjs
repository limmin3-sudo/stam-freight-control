import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {readManifest,updateURL} from '../updates.mjs';import {buildRelease} from '../scripts/build-release.mjs';
test('update manifests reject missing or unsafe versions',()=>{
 for(const value of [null,{}, {version:''},{version:'<script>'},{version:'https://elsewhere.test'}])assert.throws(()=>readManifest(value));
 assert.deepEqual(readManifest({version:'a'.repeat(40),releases:[]}),{version:'a'.repeat(40),releases:[]});
});
test('update URL stays on the same app and preserves other query options and hash',()=>{
 const url=new URL(updateURL('https://example.test/stam-freight-control/?debug&v=old#cargo','b'.repeat(40)));
 assert.equal(url.origin,'https://example.test');assert.equal(url.pathname,'/stam-freight-control/');assert.ok(url.searchParams.has('debug'));assert.equal(url.hash,'#cargo');assert.equal(url.searchParams.get('v'),'b'.repeat(40));
 assert.throws(()=>updateURL(url.href,'//elsewhere.test'));
});
test('release build versions HTML, modules, data and assets consistently and is repeatable',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'stam-release-'));try{
  await fs.mkdir(path.join(dir,'data'));await fs.writeFile(path.join(dir,'data/releases.json'),JSON.stringify([{title:'검증',changes:['경로 개선']}]));
  await fs.writeFile(path.join(dir,'index.html'),'<head><link href="style.css"><script type="importmap">{"imports":{"three":"./vendor/three.module.js"}}</script></head><script type="module" src="app.mjs"></script>');
  await fs.writeFile(path.join(dir,'app.mjs'),"import './engine.mjs';fetch('./data/locations.json');const picture='assets/partners/aide.jpg';import('https://www.gstatic.com/firebasejs/app.js');");
  const first='a'.repeat(40),second='b'.repeat(40);await buildRelease(dir,first);await buildRelease(dir,second);await buildRelease(dir,second);
  const html=await fs.readFile(path.join(dir,'index.html'),'utf8'),module=await fs.readFile(path.join(dir,'app.mjs'),'utf8'),manifest=JSON.parse(await fs.readFile(path.join(dir,'version.json'),'utf8'));
  assert.equal((html.match(/name="app-version"/g)||[]).length,1);assert.ok(html.includes('style.css?v='+second));assert.ok(html.includes('app.mjs?v='+second));assert.ok(html.includes('three.module.js?v='+second));
  for(const asset of ['./engine.mjs','./data/locations.json','assets/partners/aide.jpg'])assert.ok(module.includes(asset+'?v='+second));
  assert.ok(module.includes("import('https://www.gstatic.com/firebasejs/app.js')"));assert.ok(!module.includes('?v='+first));assert.equal(manifest.version,second);assert.equal(manifest.releases[0].title,'검증');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('release stamping refuses to modify the source checkout',async()=>{
 const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));await assert.rejects(()=>buildRelease(root,'a'.repeat(40)),/배포용 복사본/);
});
