import {test} from 'node:test';import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {createInterface} from 'node:readline';import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {desktopFiles} from '../scripts/build-desktop.mjs';
test('desktop bridge opens selected log read-only, serves guide, and exits when launcher pipe closes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'stam-bridge-')),file=join(dir,'Game.log'),original='synthetic private player line\n';await writeFile(file,original);
 const child=spawn(process.execPath,['desktop/bridge.mjs',file,'--self-test'],{stdio:['pipe','pipe','pipe']});let stderr='';child.stderr.on('data',d=>stderr+=d);
 const exit=once(child,'exit'),lines=createInterface({input:child.stdout});const timeout=setTimeout(()=>child.kill(),15000);
 try{
  const [line]=await once(lines,'line'),message=JSON.parse(line);assert.equal(message.type,'ready');assert.ok(!line.includes('private'));
  const url=new URL(message.url),headers={Authorization:'Bearer '+url.hash.slice(7)};
  assert.equal((await (await fetch(url.origin+'/api/status',{headers})).json()).protocol,1);
  assert.equal((await fetch(url.origin+'/api/status')).status,401);
  child.stdin.write(JSON.stringify({type:'position',system:'pyro',position:[1,2,3]})+'\n');
  let state;for(let i=0;i<20;i++){state=await(await fetch(url.origin+'/api/status',{headers})).json();if(state.position)break;await new Promise(r=>setTimeout(r,25));}
  assert.deepEqual(state.position.position,[1,2,3]);assert.equal(state.position.source,'showlocation-clipboard');
  child.stdin.write(JSON.stringify({type:'position',system:'other',position:[9,9,9]})+'\n');
  assert.equal((await(await fetch(url.origin+'/api/status',{headers})).json()).position.system,'pyro');
  child.stdin.write('{"type":"position-off"}\n');
  for(let i=0;i<20;i++){state=await(await fetch(url.origin+'/api/status',{headers})).json();if(!state.position)break;await new Promise(r=>setTimeout(r,25));}assert.equal(state.position,null);
  assert.match(await (await fetch(url.origin+'/guide.html')).text(),/출항 안내/);
  child.stdin.end();assert.equal((await exit)[0],0);assert.equal(await readFile(file,'utf8'),original);assert.equal(stderr,'');
 }finally{clearTimeout(timeout);child.kill();lines.close();await rm(dir,{recursive:true,force:true});}
});
test('desktop package inventory excludes old patches, player files and unrelated legacy code',async()=>{
 const files=await desktopFiles();assert.ok(files.some(f=>f.endsWith('/desktop/bridge.mjs')||f.endsWith('\\desktop\\bridge.mjs')));
 for(const file of files)assert.doesNotMatch(file,/(?:ko-(names|commodities|hauling)\.json|global\.ini|\.log$|\.env$|legacy-planner\.html|\.git[\\/])/i);
 assert.ok(files.some(f=>f.endsWith('guide.html')));assert.ok(files.some(f=>f.endsWith('planning-task.mjs')));
});
