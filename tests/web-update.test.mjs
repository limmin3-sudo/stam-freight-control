import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createWebUpdates,digest,readWebManifest,WEB_CHANNEL} from '../desktop/web-update.mjs';
import {startLogService} from '../integration/log/live-server.mjs';

function release(label,protocol=1) {
  const objects=new Map();
  const files=Object.entries({'index.html':`<html><script type="importmap">{"imports":{"three":"./new-three.mjs"}}</script>${label}</html>`,
    'new-three.mjs':'export const shared = true;', 'new-route.mjs':`export const route = '${label}';`}).map(([name,body])=>{
    const bytes=Buffer.from(body),sha256=digest(bytes);objects.set(sha256,bytes);
    return {path:name,bytes:bytes.length,sha256};
  });
  const payload={schema:1,protocol,snapshotSchema:1,sourceRevision:'a'.repeat(40),files};
  return {manifest:{...payload,id:digest(JSON.stringify(payload))},objects};
}
async function fixture(t) {
  const directory=await mkdtemp(path.join(tmpdir(),'stam-web-update-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  let remote=release('A'),offline=false,corrupt=false;const requests=[];
  const fetchImpl=async(url,options)=>{
    assert.ok(String(url).startsWith(WEB_CHANNEL));
    assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.headers,undefined);
    requests.push(String(url));
    if(offline)throw Error('offline');
    const name=String(url).slice(WEB_CHANNEL.length);
    return name==='web-release.json'?new Response(JSON.stringify(remote.manifest)):
      new Response(corrupt?'bad bytes':remote.objects.get(name.split('/')[1]));
  };
  return {directory,requests,manager:()=>createWebUpdates({directory,fetchImpl}),
    remote:value=>remote=value,offline:()=>offline=true,corrupt:()=>corrupt=true};
}
test('site route/UI changes stage independently and apply on next launch without switching a live service',async t=>{
  const f=await fixture(t),first=f.manager();
  assert.equal(await first.select(),null);await first.check();assert.equal(first.status().phase,'ready');
  const second=f.manager(),active=await second.select();
  assert.match((await active.read('/')).body.toString(),/>A<\/html>/);
  f.remote(release('B'));f.requests.length=0;await second.check();
  assert.equal(second.status().phase,'ready');
  assert.match((await active.read('/')).body.toString(),/>A<\/html>/);
  assert.equal(f.requests.length,3,'manifest + changed HTML + route; unchanged library stays cached');
  const next=await f.manager().select();assert.match((await next.read('/')).body.toString(),/>B<\/html>/);
  assert.equal(await next.read('/desktop/bridge.mjs'),null);
});
test('offline and incompatible site releases keep the installed compatible control room',async t=>{
  const f=await fixture(t);await f.manager().check();const manager=f.manager(),active=await manager.select();
  f.remote(release('future',2));await manager.check();assert.equal(manager.status().phase,'app-update-required');
  assert.match((await active.read('/')).body.toString(),/>A<\/html>/);
  f.offline();await manager.check();assert.equal(manager.status().phase,'unavailable');
  assert.match((await (await f.manager().select()).read('/')).body.toString(),/>A<\/html>/);
});
test('corrupt or incomplete downloads never replace the ready pointer',async t=>{
  const f=await fixture(t);await f.manager().check();const before=await readFile(path.join(f.directory,'ready.json'),'utf8');
  const manager=f.manager();await manager.select();f.remote(release('B'));f.corrupt();await manager.check();
  assert.equal(manager.status().phase,'unavailable');assert.equal(await readFile(path.join(f.directory,'ready.json'),'utf8'),before);
});
test('damaged latest cached release falls back to verified previous release or bundled UI',async t=>{
  const f=await fixture(t);await f.manager().check();const manager=f.manager();await manager.select();
  const b=release('B');f.remote(b);await manager.check();
  await writeFile(path.join(f.directory,'objects',b.manifest.files[0].sha256),'damaged');
  const previous=await f.manager().select();assert.match((await previous.read('/')).body.toString(),/>A<\/html>/);
  await writeFile(path.join(f.directory,'previous.json'),'damaged');assert.equal(await f.manager().select(),null);
});
test('manifest rejects traversal, duplicate paths, native executables and checksum tampering',()=>{
  const r=release('A').manifest;
  for(const name of ['../escape.mjs','/abs.mjs','x//a.mjs','x/./a.mjs','desktop/bridge.mjs','STAM.exe','https://other/a.mjs','a%2fmjs'])
    assert.throws(()=>readWebManifest({...r,files:[{...r.files[0],path:name}]}));
  assert.throws(()=>readWebManifest({...r,files:[...r.files,r.files[0]]}));
  assert.throws(()=>readWebManifest({...r,id:'b'.repeat(64)}));
  assert.throws(()=>readWebManifest({...r,files:[{...r.files[0],bytes:128*1024*1024}]}));
});
test('cached release serves new frontend files with the same protected bridge, without mixing bundled files',async t=>{
  const f=await fixture(t);await f.manager().check();const manager=f.manager(),webBundle=await manager.select();
  const file=path.join(f.directory,'Game.log');await writeFile(file,'');
  const service=await startLogService({file,webBundle,webUpdateStatus:manager.status});t.after(()=>service.close());
  const page=await fetch(service.origin+'/index.html'),body=await page.text();assert.match(body,/>A<\/html>/);
  const map=body.match(/<script type="importmap">(.*?)<\/script>/)[1];
  assert.ok(page.headers.get('content-security-policy').includes("'sha256-"+Buffer.from(digest(map),'hex').toString('base64')+"'"));
  assert.equal((await fetch(service.origin+'/new-route.mjs?v=123')).status,200);
  assert.equal((await fetch(service.origin+'/cargo-scene.mjs')).status,404,'never mix in bundled code missing from selected release');
  assert.equal((await fetch(service.origin+'/api/snapshot')).status,401);
  const status=await (await fetch(service.origin+'/api/status',{headers:{Authorization:'Bearer '+service.token}})).json();
  assert.equal(status.protocol,1);assert.equal(status.webUpdate.current,webBundle.id);
  assert.equal(await readFile(file,'utf8'),'');
});
