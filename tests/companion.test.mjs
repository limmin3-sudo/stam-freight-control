import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,appendFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {discoverLogs,automaticLog,installationRoots} from '../desktop/discover-log.mjs';
import {desktopFiles} from '../scripts/build-desktop.mjs';

test('known-install search prefers a unique LIVE, never arbitrarily selects multiple installs or test channels',async()=>{
 const root=path.join('games','StarCitizen'),live=path.join(root,'LIVE','Game.log');
 const files=new Map([[live,10],[path.join(root,'PTU','Game.log'),100]]);
 const inspect=async file=>{if(!files.has(file))throw Error('absent');return {isFile:()=>true,mtimeMs:files.get(file)};};
 const found=await discoverLogs({roots:[root],inspect});
 assert.equal(found.length,2);assert.equal(automaticLog(found),live);
 assert.equal(automaticLog(found.filter(f=>f.channel==='PTU')),null);
 assert.equal(automaticLog([...found,{channel:'LIVE',file:'/other/LIVE/Game.log'}]),null);
 const roots=installationRoots({ProgramFiles:'C:\\Program Files'},['C:','D:']);
 assert.ok(roots.includes('C:\\Program Files\\Roberts Space Industries\\StarCitizen'));
 assert.equal(new Set(roots.map(r=>r.toLowerCase())).size,roots.length);assert.ok(roots.length<48);
});
test('companion package carries its real fonts and auto discovery without bundling the website',async()=>{
 const files=(await desktopFiles()).map(f=>f.split(path.sep).join('/'));
 for(const suffix of ['/desktop/discover-log.mjs','/desktop/fonts/Barlow-Medium.ttf','/desktop/fonts/SUIT-Medium.ttf','/desktop/fonts/SUIT-LICENSE.txt'])assert.ok(files.some(f=>f.endsWith(suffix)),suffix);
 assert.equal(files.some(f=>f.endsWith('/index.html')),false);
});
test('stdio bridge waits for a missing log, reads appended contracts, and exits with its parent',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'stam-companion-')),file=path.join(dir,'Game.log');
 const child=spawn(process.execPath,['desktop/bridge.mjs',file,'--self-test'],{stdio:['pipe','pipe','pipe']});
 const messages=[];let text='';child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{text+=chunk;let end;while((end=text.indexOf('\n'))>=0){messages.push(JSON.parse(text.slice(0,end)));text=text.slice(end+1);}});
 const exit=new Promise(resolve=>child.once('exit',resolve));
 async function until(check){for(let i=0;i<100;i++){const value=check();if(value)return value;await new Promise(r=>setTimeout(r,50));}assert.fail('bridge timeout');}
 try{
  const ready=await until(()=>messages.find(m=>m.type==='ready'));assert.equal(ready.file,file);
  await until(()=>messages.some(m=>m.phase==='waiting-file'));
  const mission='11111111-1111-4111-8111-111111111111';
  const accepted=`<2026-11-05T10:00:00.000Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Accepted: Test haul" [1] to queue. MissionId: [${mission}], ObjectiveId: [dropoff_test_1]\n`;
  await writeFile(file,accepted);await until(()=>messages.some(m=>m.phase==='watching'&&m.bytesRead>0));
  const uri=new URL(ready.url),headers={Authorization:'Bearer '+uri.hash.slice(7)};
  const snapshot=await fetch(new URL('/api/snapshot',uri),{headers}).then(r=>r.text());assert.ok(snapshot.includes(mission));
  const second='22222222-2222-4222-8222-222222222222';await appendFile(file,accepted.replaceAll(mission,second));
  await until(()=>messages.some(m=>m.type==='status'&&m.revision>=2));
  const next=await fetch(new URL('/api/snapshot',uri),{headers}).then(r=>r.text());assert.ok(next.includes(second));
  assert.equal(await readFile(file,'utf8'),accepted+accepted.replaceAll(mission,second));
  assert.ok(messages.filter(m=>m.type==='status').every(m=>!JSON.stringify(m).includes(mission)&&!('token' in m)));
  child.stdin.end();assert.equal(await Promise.race([exit,new Promise(r=>setTimeout(()=>r('timeout'),4000))]),0);
 }finally{child.kill();await rm(dir,{recursive:true,force:true});}
});
