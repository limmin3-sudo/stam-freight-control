import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {launchOptions,DEFAULT_LOG_PORT} from '../scripts/log-link-server.mjs';
import {startLogService} from '../integration/log/live-server.mjs';
const exec=promisify(execFile);
test('ordinary launches retain the same origin; temporary ports must be explicit',()=>{
 assert.equal(launchOptions(['--file','Game.log']).port,41454);
 assert.equal(launchOptions(['--file','Game.log']).port,DEFAULT_LOG_PORT);
 assert.equal(launchOptions(['--file','Game.log','--port','0']).port,0);
 assert.equal(launchOptions(['--port','45123']).port,45123);
 for(const value of ['','-1','65536','1e3','12.5',' 41454','Infinity'])assert.throws(()=>launchOptions([`--port=${value}`]),/invalid-port/);
});
test('occupied launch port reports the fix and never silently opens another origin',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'stam-launch-')),file=join(dir,'test.log');
 t.after(()=>rm(dir,{recursive:true,force:true}));await writeFile(file,'');
 const service=await startLogService({file});t.after(()=>service.close());
 let failure;try{await exec(process.execPath,['scripts/log-link-server.mjs','--file',file,'--port',new URL(service.origin).port],{cwd:new URL('..',import.meta.url),timeout:10000});}catch(e){failure=e;}
 assert.equal(failure?.code,1);assert.match(failure.stderr,/이미 사용 중/);assert.match(failure.stderr,/Ctrl\+C/);
 assert.ok(!failure.stdout.includes('#token='));assert.ok(!failure.stderr.includes(file));
 const response=await fetch(service.origin+'/api/status',{headers:{Authorization:'Bearer '+service.token}});assert.equal(response.status,200);
});
