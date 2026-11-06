import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compareReleases,releaseKey,requestedRelease,releaseLabel} from '../release-channel.mjs';

// Update history: every entry carries a semantic version picked by how much users notice it (see docs/DEVELOPMENT.md)
// and a KST date; the newest entry is first, so versions and dates never go up further down the list.
test('release history has descending versions and dates',()=>{
 const releases=JSON.parse(fs.readFileSync(new URL('../data/releases.json',import.meta.url),'utf8'));
 assert.ok(releases.length>0);
 assert.equal(new Set(releases.map(releaseKey)).size,releases.length);
 for(let i=0;i<releases.length;i++){const r=releases[i];
  assert.match(r.version,/^\d+\.\d+\.\d+$/,`${r.id} version`);
  assert.ok(['alpha','beta','stable'].includes(r.channel),`${r.id} channel`);
  assert.match(r.date,/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/,`${r.id} date`);
  if(i){const prev=releases[i-1];assert.ok(compareReleases(prev,r)>0,`${releaseKey(prev)} should be above ${releaseKey(r)}`);assert.ok(prev.date>=r.date,`${prev.id} date order`);}}
});

test('beta reset keeps distinct alpha identities and legacy release links',()=>{
 const beta={channel:'beta',version:'1.0.0'},recent={channel:'alpha',version:'3.18.0'},old={channel:'alpha',version:'1.0.0'},records=[beta,recent,old];
 assert.ok(compareReleases(beta,recent)>0);assert.notEqual(releaseKey(beta),releaseKey(old));
 assert.equal(requestedRelease(records,null,null),beta);
 assert.equal(requestedRelease(records,'1.0.0','beta'),beta);assert.equal(requestedRelease(records,'1.0.0','alpha'),old);
 assert.equal(requestedRelease(records,'1.0.0',null),old);assert.equal(requestedRelease(records,'3.18.0',null),recent);
 assert.equal(requestedRelease(records,'missing','beta'),beta);
 assert.equal(releaseLabel(beta),'베타 1.0.0');assert.equal(releaseLabel(old,true),'Alpha 1.0.0');
});
