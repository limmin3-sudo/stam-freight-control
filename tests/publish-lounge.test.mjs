import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {publishLounge} from '../scripts/publish-lounge.mjs';

test('public lounge preserves the real flight entry and immutable desktop release',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'stam-lounge-')),out=path.join(dir,'public'),dist=path.join(dir,'dist');
 try{
  await mkdir(out);await mkdir(path.join(dist,'assets'),{recursive:true});await mkdir(path.join(out,'assets'));
  const legacy='<html><head></head><script src="app.mjs?v=old"></script></html>',version='b'.repeat(40);
  await writeFile(path.join(out,'index.html'),legacy);await writeFile(path.join(out,'version.json'),JSON.stringify({version}));await writeFile(path.join(out,'web-release.json'),'immutable-flight-snapshot');
  await writeFile(path.join(out,'assets','legacy.png'),'original');await writeFile(path.join(dist,'index.html'),'<html><head></head><script src="./assets/lounge.js"></script></html>');await writeFile(path.join(dist,'assets','lounge.js'),'lounge');
  await publishLounge(out,dist);
  assert.equal(await readFile(path.join(out,'flight.html'),'utf8'),legacy);
  assert.match(await readFile(path.join(out,'index.html'),'utf8'),/lounge.js/);
  assert.ok((await readFile(path.join(out,'index.html'),'utf8')).includes(version));
  assert.equal(await readFile(path.join(out,'web-release.json'),'utf8'),'immutable-flight-snapshot');assert.equal(await readFile(path.join(out,'assets','legacy.png'),'utf8'),'original');
 }finally{await rm(dir,{recursive:true,force:true});}
});
