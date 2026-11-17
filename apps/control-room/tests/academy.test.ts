import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {academyMissions,filterAcademy,academyPairs,analyzeAcademySelection,type AcademyMission} from '../src/academy-catalog.ts';
import {academyCase,compareAcademyCase} from '../src/academy-study.ts';
import {loadMissionArchive} from '../src/mission-archive-data.mjs';
const row=(id:string,patch:Partial<AcademyMission>={}):AcademyMission=>({company:'Same contractor',systems:['Stanton'],legal:true,rankName:'Rookie',record:{id,ids:[id],title:id,giver:'Same contractor',rank:1,type:'Hauling - Local',quantity:{known:true,min:4,max:8},box:{known:true,max:4},reward:null,orders:[],pickup:['A'],dropoff:['B'],description:'',illegal:false,sources:['scmdb']},...patch});
const options={rank:1,company:'all',system:'Stanton',search:'',capacity:46,maxBox:16};
test('beginner catalogue filters unknown legality, rank, quantity, boxes and interstellar hauls conservatively',()=>{
 const good=row('good'),unknown=row('unknown',{legal:false}),rank=row('rank'),quantity=row('quantity'),box=row('box'),far=row('far');rank.record.rank=-1;quantity.record.quantity={known:false,min:null,max:null};box.record.box={known:true,max:32};far.record.type='Hauling - Interstellar';
 assert.deepEqual(filterAcademy([good,unknown,rank,quantity,box,far],options).map(r=>r.record.id),['good']);assert.equal(filterAcademy([far],{...options,includeInterstellar:true}).length,1);assert.equal(filterAcademy([good],{...options,capacity:NaN}).length,0);
});
test('combination suggestions preserve per-contractor reputation and conservative capacity boundaries',()=>{
 const a=row('a'),b=row('b'),foreign=row('c',{company:'Other'}),separate=row('d');separate.record.pickup=['C'];separate.record.dropoff=['D'];
 assert.equal(academyPairs([a,b,foreign,separate],46).length,1);assert.equal(academyPairs([a,b],15).length,0);const v=analyzeAcademySelection([a,b],16);assert.deepEqual({min:v.min,max:v.max,pickup:v.pickup,dropoff:v.dropoff},{min:8,max:16,pickup:['A'],dropoff:['B']});assert(!analyzeAcademySelection([a,foreign],46).sameCompany);assert.equal(analyzeAcademySelection([],46).max,null);
});
test('actual SCMDB/Wiki catalogue produces sourced starter candidates without modifying reference values',async()=>{
 const oldFetch=globalThis.fetch;globalThis.fetch=async input=>new Response(await readFile(new URL(String(input))));
 try{const data=await loadMissionArchive(),before=data.filter({}),all=academyMissions(data),filtered=filterAcademy(all,options);assert(filtered.length>0);for(const m of filtered){assert(m.legal);assert(m.record.quantity.max!<=46);assert(m.record.rank>=0&&m.record.rank<=1);assert(m.systems.includes('Stanton'));assert(!m.record.type.includes('Interstellar'));assert(data.reference(m.record.ids[0]!)?.sources.length);}for(const p of academyPairs(filtered,46)){assert(p.analysis.max!<=46);assert(p.analysis.sameCompany);}assert.deepEqual(data.filter({}),before);
 }finally{globalThis.fetch=oldFetch;}
});
test('confirmed six-contract case compares one combined crossing with sequential trips while preserving deliveries',()=>{
 const jobs=academyCase(),before=JSON.stringify(jobs);assert.equal(jobs.length,6);assert.equal(jobs.flatMap(j=>j.shipments).reduce((n,s)=>n+s.scu,0),363);const result=compareAcademyCase({ids:jobs.map(j=>j.id),ship:'misc-hull-b'});
 for(const r of result.results){assert.equal(r.error,null);assert(r.plan);const picked=new Set<string>(),delivered=new Map<string,number>();for(const v of r.plan.visits){assert(v.load<=r.plan.capacity!);for(const e of v.events){if(!['pickup','delivery'].includes(e.type))continue;if(e.type==='pickup')picked.add(e.shipmentId);else{assert(picked.has(e.shipmentId));delivered.set(e.missionId!,(delivered.get(e.missionId!)??0)+e.scu);}}}for(const job of jobs)assert.equal(delivered.get(job.id),job.shipments.reduce((n,s)=>n+s.scu,0));assert.equal(r.plan.visits.at(-1)!.load,0);}
 assert.equal(result.results[0]!.plan!.visits.reduce((n,v)=>n+v.jumps.length,0),1);assert.equal(result.results[1]!.plan!.visits.reduce((n,v)=>n+v.jumps.length,0),11);assert.equal(JSON.stringify(jobs),before);assert.throws(()=>compareAcademyCase({ids:[],ship:'misc-hull-b'}));assert.throws(()=>compareAcademyCase({ids:['missing'],ship:'misc-hull-b'}));
});
