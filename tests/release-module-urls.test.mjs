import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {buildRelease} from '../scripts/build-release.mjs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('published nested inbox modules version parent imports so cached old catalogues cannot bypass regional fixes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'stam-release-imports-')),version='a'.repeat(40);
 try{
  await mkdir(dir+'/data');await mkdir(dir+'/integration/log',{recursive:true});await writeFile(dir+'/data/releases.json','[]');
  await writeFile(dir+'/integration/inbox-core.mjs',"import {deliveryNotice} from '../objective-text.mjs';import {definitionDraft} from '../mission-catalog.mjs?v=bbbb';");
  await writeFile(dir+'/integration/log/locations.mjs',"import {MISSION_LOCATION_ALIASES} from '../../mission-location-aliases.mjs';const external='https://example.com/data.json';");
  await buildRelease(dir,version);
  const inbox=await readFile(dir+'/integration/inbox-core.mjs','utf8'),locations=await readFile(dir+'/integration/log/locations.mjs','utf8');
  for(const path of ['../objective-text.mjs','../mission-catalog.mjs'])assert.ok(inbox.includes(path+'?v='+version));
  assert.ok(locations.includes('../../mission-location-aliases.mjs?v='+version));assert.ok(locations.includes("'https://example.com/data.json'"));
  assert.equal(JSON.parse(await readFile(dir+'/web-release.json')).sourceRevision,version);
 }finally{await rm(dir,{recursive:true,force:true});}
});
