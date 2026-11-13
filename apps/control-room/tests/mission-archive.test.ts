import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadMissionArchive} from '../src/mission-archive-data.mjs';

test('archive adapter reads reference-only catalogue and reuses filters',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async input=>new Response(await readFile(new URL(String(input))));
 try{
 const data=await loadMissionArchive();
 assert.ok(data.total>0);assert.ok(data.definitions>=data.total);
 const all=data.filter({});assert.equal(all.length,data.total);
 const company=data.companies.find(company=>data.filter({company:company.value}).length>0)!;
 assert.ok(data.filter({company:company.value}).length>0);
 assert.equal(data.filter({search:'__no_matching_catalogue_19874__'}).length,0);
 const sorted=data.filter({sort:'reward'});
 for(let i=1;i<sorted.length;i++)assert.ok((sorted[i-1]!.reward?.max??-1)>=(sorted[i]!.reward?.max??-1));
 assert.ok(all.every(row=>row.ids.length>0&&Array.isArray(row.orders)));
 assert.deepEqual((await loadMissionArchive()).filter({}),all);
 }finally{globalThis.fetch=original;}
});
