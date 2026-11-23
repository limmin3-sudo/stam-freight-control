// Build the offline definition-ID lookup from the same public inputs as the mission catalogue.
// Usage: node scripts/build-receipt-catalogs.mjs <directory containing the pinned stam-scmdb-BUILD.json exports> <wiki-freight-pools.py output.json>
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {wikiDefinition} from '../wiki-freight-definition.mjs';
import {scmdbCatalog} from './build-scmdb-missions.mjs';
import {scmdbDefinitionIds} from './scmdb-fields.mjs';

const pins=[
 ['12881860','b1f95428b0ea5f3cfc6599ec0c0ede919ea851a6','b2c17b7e54c22bb0d1e4e287df3ee33cbcdf69c47fd5d72ab21fd5f01673bbe3'],
 ['12913470','937f66810a392aa5682b9615a1afbff20fe96e3f','72153c1ba58e497549628f134168c2f2c97b342c76e436292a304407a61a5186'],
 ['13165946','97f28fbbadafe76e9f2f6af5caf0e736844d2f52','5e076817794f584f2bf31f07c98a7710593ec531b7caf13aec5ab8423a841f99'],
 ['13220821','3b6cd49e06619b4f81a5213af8621c8685d6fd93','1f6bde42cc72e3045d3affe97f54cb126bd157b496b60e49250898743a320a72']
];
const builds={},values=[],seen=new Map();
function share(value){
 const key=JSON.stringify(value);
 if(!seen.has(key)){seen.set(key,values.length);values.push(value);}
 return seen.get(key);
}
const wiki=JSON.parse(await readFile(new URL('../data/wiki-mission-supplement.json',import.meta.url)));
if(createHash('sha256').update(JSON.stringify(wiki.records)).digest('hex')!==wiki.source.sha256)throw Error('Wiki snapshot checksum mismatch');
const unpacked=JSON.parse(await readFile(process.argv[3],'utf8'));
const older=JSON.parse(await readFile(new URL('../tests/fixtures/legacy-catalogue/log-mission-index.json',import.meta.url)));
const olderPools={};
for(const d of older.definitions.filter(d=>d.released&&!d.notForRelease)){
 const r=d.rules,packed={items:r.orders.map(o=>o.name),fixed:r.orders.map(o=>o.kind==='Resource'?o.fixedQuantity||null:null)};
 for(const role of ['pickup','dropoff']){
  const groups=(r.pools||[]).filter(p=>p.purpose?.startsWith(role==='pickup'?'Location':'Destination'));
  if(!groups.length)continue;
  const sites=new Map(groups.map(p=>[p.name,(p.candidates||older.pools[p.candidatesKey]||[]).map(l=>l.id||l.name||'')]));
  packed[role]=[...sites.values()];
  packed[role+'Orders']=r.orders.map(o=>sites.get(o[role+'Pool'])||null);
 }
 if(packed.pickup||packed.dropoff)olderPools[d.id]=packed;
}
function packSlots(raw){
 const out={};
 for(const role of ['pickup','dropoff']){
  if(raw[role])out[role]=raw[role].map(share);
  if(raw[role+'Orders'])out[role+'Orders']=raw[role+'Orders'].map(g=>g?share(g):null);
 }
 if(raw.items)out.items=share(raw.items);
 if(raw.fixed?.some(Boolean))out.fixed=share(raw.fixed);
 return share(out);
}
let previousSignatures=new Map(),previousBuild=null;
for(const [build,commit,sha256] of pins){
 const bytes=await readFile(join(process.argv[2],`stam-scmdb-${build}.json`));
 if(createHash('sha256').update(bytes).digest('hex')!==sha256)throw Error('SCMDB checksum mismatch: '+build);
 const raw=JSON.parse(bytes);
 if(raw.version.split('.').at(-1)!==build)throw Error('SCMDB build mismatch');
 const generated=scmdbCatalog(raw,{commit,sha256});
 const defs={},routes={},pairs=new Map(),wikiSlots={},signatures=new Map();
 for(const c of [...raw.contracts,...raw.legacyContracts]){
  if(!c.haulingOrders?.length)continue;
  for(const id of scmdbDefinitionIds(c)){
   if(!pairs.has(id))pairs.set(id,new Set());
   for(const variant of [c,...(c.locationSets||[])]){
    // Preserve broad and unresolved candidates. Dropping a system/unknown place
    // could turn a random pool into a falsely fixed terminal.
    const names=ids=>[...new Set((ids||[]).map(k=>raw.locationPools[k]?.name||''))].sort();
    pairs.get(id).add(share([share(names(variant.locations)),share(names(variant.destinations))]));
   }
  }
 }
 for(const d of generated.catalog.definitions){
   const pools=d.rules.pools.map(p=>({...p,candidates:share(p.candidates)}));
   const entry=generated.details.entries[generated.details.definitions[d.id]];
   const metadata=Object.fromEntries(Object.entries(entry.values).filter(([k])=>['reward','company','rank','description','type'].includes(k)));
   defs[d.id]=share({metadata:share(metadata),title:d.title,giver:d.giver,rank:d.rank,templateNames:d.templateNames,
    orders:share(d.rules.orders),pools:share(pools),verified:d.rules.objectiveOrderIndicesVerified});
  routes[d.id]=share([...pairs.get(d.id)]);
  signatures.set(d.id,JSON.stringify([d.rules.orders,d.templateNames,d.rules.pools,routes[d.id]]));
 }
 if(wiki.source.version.split('.').at(-1)===build){
  for(const row of wiki.records){
   if(!row.released||row.not_for_release||!row.hauling_orders?.length)continue;
   const slots={};
   for(const [name,items] of Object.entries(row.mission_tokens||{})){
    const side=/^(?:Location|Pickup)\d*\|Address$/i.test(name)?'pickup':/^(?:Destination|DropOff)\d*\|Address$/i.test(name)?'dropoff':null;
    if(side)(slots[side]??=[]).push(share(Array.isArray(items)?items:[]));
   }
   if(Object.keys(slots).length)wikiSlots[row.uuid.toLowerCase()]=share(slots);
  }
 }
 const sourceWiki=build==='12881860'?olderPools:build==='13165946'?unpacked:null;
 const wikiVersion=sourceWiki?(build==='12881860'?older.version:wiki.source.version):previousBuild.wikiVersion;
 const wikiCommit=sourceWiki?(build==='12881860'?older.rawSource.commit:'3cc8072b24df2a2d71eb6207708e2039f909b342'):previousBuild.wikiCommit;
 if(sourceWiki){
  for(const [id,record] of Object.entries(sourceWiki)){
   const old=values[wikiSlots[id]]||{};
   wikiSlots[id]=share({...old,...values[packSlots(record)]});
  }
 }else if(raw.version.split('-')[0]===previousBuild.version.split('-')[0]){
  // Carry forward reference addresses across a hotfix only when the exact
  // definition, ordered resources, templates and SCMDB location sets agree.
  for(const [id,signature] of signatures)if(signature===previousSignatures.get(id)&&Object.hasOwn(previousBuild.wikiSlots,id))wikiSlots[id]=previousBuild.wikiSlots[id];
 }
 // Wiki can publish freight definitions that have no matching SCMDB export.
 const wikiOnly=build==='12881860'?older.definitions:build==='13165946'?wiki.records.map(wikiDefinition):[];
 for(const d of wikiOnly){
  if(!d?.released||d.notForRelease||!d.rules?.orders?.length||d.rules.sourceConflict||Object.hasOwn(defs,d.id))continue;
  const pools=(d.rules.pools||[]).map(p=>({name:p.name,purpose:p.purpose,candidates:share([])}));
  defs[d.id]=share({wiki:true,title:d.title,giver:d.giver,rank:d.rank,templateNames:d.templateNames,
   orders:share(d.rules.orders),pools:share(pools),objectives:share(d.rules.haulingObjectives||[]),
   verified:d.rules.objectiveOrderIndicesVerified});

 }
 builds[build]={version:raw.version,url:generated.catalog.source,defs,routes,wikiSlots,wikiVersion,wikiCommit};
 previousSignatures=signatures;previousBuild=builds[build];
}
const output={builds,values,wiki:{url:wiki.source.url,version:wiki.source.version}};
await writeFile(new URL('../data/receipt-catalogs.json',import.meta.url),JSON.stringify(output)+'\n');
