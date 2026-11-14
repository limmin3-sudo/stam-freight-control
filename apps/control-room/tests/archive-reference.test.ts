import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {archiveReference,referenceValue} from '../src/archive-reference.mjs';

const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const fixture=()=>({definitions:{[a]:0,[b]:1},sources:{scmdb:{name:'SCMDB',version:'v1',url:'javascript:alert(1)'},wiki:{name:'Wiki',version:'v2',url:'https://api.star-citizen.wiki/api/missions'}},entries:[
 {origin:'scmdb',values:{reward:{min:0,max:0},shareable:false,type:'Hauling'},provenance:{reward:['scmdb'],shareable:['scmdb','wiki'],type:['wiki']},differenceIndex:0},
 {origin:'wiki',values:{reward:{min:0,max:0},shareable:false,type:'Hauling'},provenance:{reward:['wiki'],shareable:['wiki'],type:['wiki']}},
 ],differences:[{reward:[{value:{min:0,max:0},sources:['scmdb']},{value:{min:100,max:100},sources:['wiki']}],buyIn:[{value:10,sources:['scmdb']},{value:20,sources:['scmdb']}]}]});
test('exact definitions retain distinct provenance, matched false/zero, supplementation and unresolved conflicts',()=>{
 const db=fixture(),before=structuredClone(db),info=archiveReference(db,a)!;
 const fields=Object.fromEntries(info.fields.map(f=>[f.key,f]));
 assert.equal(fields.reward!.status,'preferred');assert.deepEqual(fields.reward!.value,{min:0,max:0});
 assert.equal(fields.shareable!.status,'matched');assert.equal(fields.shareable!.value,false);
 assert.equal(fields.type!.status,'supplemented');assert.equal(fields.buyIn!.status,'unresolved');assert.equal(fields.buyIn!.value,null);assert.equal(fields.buyIn!.variants.length,2);
 assert.equal(fields.description!.status,'unknown');
 assert.equal(archiveReference(db,b)!.fields.find(f=>f.key==='reward')!.status,'wiki-only');
 assert.equal(archiveReference(db,'33333333-3333-4333-8333-333333333333'),null);assert.equal(archiveReference(db,'Hauling'),null);
 assert.deepEqual(db,before,'read-only projection must not resolve or mutate references');
 assert.equal(info.sources[0]!.url,null);assert.equal(info.sources[1]!.url,'https://api.star-citizen.wiki/api/missions/'+a);
});
test('reference formatting preserves unknown bounds and separates currencies, units and catalogue time',()=>{
 assert.equal(referenceValue('reward',{min:0,max:0},'en'),'0 aUEC');
 assert.equal(referenceValue('reward',{min:null,max:100},'en'),'Unknown');
 assert.equal(referenceValue('shareable',false,'en'),'No');assert.equal(referenceValue('buyIn',0,'en'),'0 aUEC');
 assert.equal(referenceValue('referenceMinutes',6.05,'en'),'6.05 min');
 assert.equal(referenceValue('cargoRules',{commodity:'Ore',minSCU:16,maxSCU:0,maxContainerSCU:8},'en'),'Ore · 16 SCU · Max container 8 SCU');
 assert.equal(referenceValue('cargoRules',{commodity:'Ore',minSCU:null,maxSCU:16,maxContainerSCU:-1},'en'),'Ore · Up to 16 SCU · Max container Unknown');
 assert.equal(referenceValue('cargoRules',{commodity:'Ore',minSCU:null,maxSCU:0,maxContainerSCU:null},'en'),'Ore · Unknown · Max container Unknown');
 assert.equal(referenceValue('cargoRules',{commodity:'Ore',minSCU:0,maxSCU:0},'en'),'Ore · Unknown · Max container Unknown');
 assert.equal(referenceValue('description','[DESTINATION] <img src=x>','en'),'[DESTINATION] <img src=x>','render as React text, never HTML');
});
test('published data keeps each field value and every differing variant without filling absent actual quantities',async()=>{
 const db=JSON.parse(await readFile(new URL('../../../data/mission-details.json',import.meta.url),'utf8'));
 let compared=0;
 for(const [id,index] of Object.entries(db.definitions)){
  const entry=db.entries[index as number],info=archiveReference(db,id)!;
  for(const [key,value] of Object.entries(entry.values))assert.deepEqual(info.fields.find(f=>f.key===key)!.value,value);
  for(const [key,variants] of Object.entries(db.differences[entry.differenceIndex]||{})){assert.deepEqual(info.fields.find(f=>f.key===key)!.variants,variants);compared++;}
 }
 assert(compared>0);
});
