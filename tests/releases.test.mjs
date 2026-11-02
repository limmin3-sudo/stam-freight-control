import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Update history: every entry carries a semantic version (design = patch, feature = minor, overhaul = major)
// and a KST date; the newest entry is first, so versions and dates never go up further down the list.
test('release history has descending versions and dates',()=>{
 const releases=JSON.parse(fs.readFileSync(new URL('../data/releases.json',import.meta.url),'utf8'));
 const num=v=>v.split('.').map(Number),cmp=(a,b)=>{for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
 assert.ok(releases.length>0);
 for(let i=0;i<releases.length;i++){const r=releases[i];
  assert.match(r.version,/^\d+\.\d+\.\d+$/,`${r.id} version`);
  assert.match(r.date,/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/,`${r.id} date`);
  if(i){const prev=releases[i-1];assert.ok(cmp(num(prev.version),num(r.version))>0,`${prev.version} should be above ${r.version}`);assert.ok(prev.date>=r.date,`${prev.id} date order`);}}
});
