import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {scmdbCatalog} from '../scripts/build-scmdb-missions.mjs';
import {supplementMissions} from '../scripts/wiki-mission-supplement.mjs';
import {refreshWiki} from '../scripts/refresh-missions.mjs';
import {definitionDraft} from '../mission-catalog.mjs';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const primary=()=>scmdbCatalog({version:'4.10.2-live.12913470',contracts:[{id,title:'Primary title',contractorName:'Primary company',missionType:'Hauling',description:'',rewardUEC:0,illegal:false,canBeShared:false,haulingOrders:[{resource:'ore',minSCU:2,maxSCU:16,maxContainerSize:4}]}],legacyContracts:[],resourcePools:{ore:{name:'Ore'}},locationPools:{}});
const row=(uuid=id,patch={})=>({uuid,title:'Wiki title',description:'Wiki description',mission_giver:'Wiki company',mission_type:'Hauling - Local',released:true,not_for_release:false,illegal:true,shareable:true,reward_min:500,reward_max:500,reward_currency:'UEC',version:'4.10.2-LIVE.12881860',game_version:'4.10.2-LIVE.12881860',debug_name:'Other_CargoHauling',hauling_orders:[{kind:'Resource',name:'Ore',min_scu:1,max_scu:8,max_container_size:2}],...patch});
const snapshot=records=>({schema:1,source:{name:'Star Citizen Wiki',url:'https://api.star-citizen.wiki/api/missions',version:'4.10.2-LIVE.12881860',sha256:createHash('sha256').update(JSON.stringify(records)).digest('hex')},records});
const entry=(result,uuid=id)=>result.details.entries[result.details.definitions[uuid]];
test('Wiki fills only missing fields by exact ID, keeping SCMDB zero, false and rule precedence',()=>{
 const base=primary(),before=structuredClone(base),result=supplementMissions(base,snapshot([row(),row(other)])),info=entry(result);
 assert.deepEqual(base,before);assert.equal(info.values.title,'Primary title');assert.equal(info.values.description,'Wiki description');assert.equal(info.values.reward.min,0);assert.equal(info.values.illegal,false);assert.equal(info.values.shareable,false);assert.deepEqual(info.provenance.description,['wiki']);assert.equal(info.preferred.title,'scmdb');assert.equal(result.details.differences[info.differenceIndex].title.length,2);
 assert.equal(result.catalog.definitions.find(d=>d.id===id).rules.orders[0].maxScu,16);assert.equal(result.catalog.definitions.find(d=>d.id===other).rulesSource,'wiki');
 assert.equal(entry(result,other).values.reward.min,500);assert.equal(definitionDraft({definitionId:other},[],result.catalog).source,'wiki');
 assert.equal(definitionDraft({definitionId:null,title:'Wiki title'},[],result.catalog),null,'matching titles do not confer identity');
});
test('unresolved primary conflicts stay unresolved instead of becoming a guessed Wiki value',()=>{
 const base=primary(),info=base.details.entries[0];delete info.values.reward;delete info.provenance.reward;info.differenceIndex=0;base.details.differences=[{reward:[{value:{min:100,max:100},sources:['scmdb']},{value:{min:200,max:200},sources:['scmdb']}]}];
 const result=supplementMissions(base,snapshot([row()]));assert.equal(entry(result).values.reward,undefined);assert.equal(result.details.differences[entry(result).differenceIndex].reward.length,2);
});
test('refresh is idempotent and updates or removes only prior Wiki-derived material',()=>{
 const first=supplementMissions(primary(),snapshot([row(),row(other)]));
 assert.deepEqual(supplementMissions(first,snapshot([row(),row(other)])),first);
 const next=supplementMissions(first,snapshot([row(id,{description:'New Wiki text'})]));assert.equal(entry(next).values.description,'New Wiki text');assert.equal(entry(next).values.title,'Primary title');assert.equal(next.details.definitions[other],undefined);assert.equal(next.catalog.definitions.some(d=>d.id===other),false);
});
test('variant links do not copy a parent payout to another definition UUID',()=>{
 const result=supplementMissions(primary(),snapshot([row(other,{variants:[{uuid:'33333333-3333-4333-8333-333333333333'}]})]));assert.equal(result.details.definitions['33333333-3333-4333-8333-333333333333'],undefined);
});
test('offline refresh keeps the validated Wiki cache, corrupt input never replaces any file',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'stam-wiki-'));try{
  const base=primary(),names=['mission-details','log-mission-index','hauling-missions'];for(const [i,data]of [base.details,base.catalog,base.missions].entries())await writeFile(path.join(dir,names[i]+'.json'),JSON.stringify(data));
  await refreshWiki({directory:dir,snapshot:snapshot([row(),row(other)])});
  const old=await Promise.all([...names,'wiki-mission-supplement'].map(n=>readFile(path.join(dir,n+'.json'),'utf8')));
  assert.equal((await refreshWiki({directory:dir,fetchImpl:async()=>{throw Error('offline');}})).status,'cached');
  assert.deepEqual(await Promise.all([...names,'wiki-mission-supplement'].map(n=>readFile(path.join(dir,n+'.json'),'utf8'))),old);
  await assert.rejects(refreshWiki({directory:dir,snapshot:{...snapshot([row(),row(other)]),source:{version:'wrong',sha256:'bad'}}}));
  assert.deepEqual(await Promise.all([...names,'wiki-mission-supplement'].map(n=>readFile(path.join(dir,n+'.json'),'utf8'))),old);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('a Wiki template alias cannot shadow the unique primary SCMDB alias',()=>{
 const base=primary();base.catalog.definitions[0].templateNames=['Twin_CargoHauling'];
 const result=supplementMissions(base,snapshot([row(other,{debug_name:'Twin_CargoHauling'})]));
 const resolved=definitionDraft({definitionId:'33333333-3333-4333-8333-333333333333',markerObservations:[{template:'Twin_CargoHauling'}]},[],result.catalog);
 assert.equal(resolved.id,id);assert.equal(resolved.source,'scmdb');
});
