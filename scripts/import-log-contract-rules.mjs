// Project public datamined orders and explicit location-pool bindings into the
// reviewed intake catalogue. Never include raw user logs or accepted runtime IDs.
// Usage: node scripts/import-log-contract-rules.mjs /path/to/public/contracts
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const sourceCommit='1340c8303709904165e2da0fa7060bce0624260b',path=new URL('../data/log-mission-index.json',import.meta.url);
const catalog=JSON.parse(await readFile(path,'utf8'));if(catalog.version!=='4.10.2-LIVE.12881860')throw Error('source-version-mismatch');
const directory=process.argv[2];if(!directory)throw Error('public-contract-directory-required');
let matched=0,skipped=0,scaffolds=0;const poolKeys=new Map(),sharedPools={};
const share=candidates=>{const key=JSON.stringify(candidates);if(!poolKeys.has(key)){const id='pool-'+poolKeys.size;poolKeys.set(key,id);sharedPools[id]=candidates;}return poolKeys.get(key);};
for(const d of catalog.definitions){let raw;try{raw=JSON.parse(await readFile(join(directory,d.id+'.json'),'utf8'));}catch{skipped++;continue;}
 const orders=raw.HaulingOrders,previous=d.rules.orders;
 // The pinned extraction must agree with the existing API identities and order
 // sequence. Unsupported flattened Or lists keep their existing bounds.
 const alreadyProjected=d.rules.source?.commit===sourceCommit;
 if(raw.UUID!==d.id||!Array.isArray(orders)||(alreadyProjected?previous.some(o=>orders[o.orderIndex]?.Name!==o.name||orders[o.orderIndex]?.Kind!==o.kind):orders.length!==previous.length||orders.some((o,i)=>o.Name!==previous[i].name||o.Kind!==previous[i].kind))){skipped++;continue;}
 const concrete=orders.some(o=>o.MaxContainerSize>0),removed=[];
 d.rules.orders=orders.flatMap((o,i)=>{
  // Blueprint's default Iron sentinel survives the public inheritance dump even
  // when generated cargo replaces it (corroborated by the 452 SCU contract).
  if(concrete&&o.Kind==='Resource'&&o.Name==='Iron'&&o.MinScu===1&&o.MaxScu===0&&o.MaxContainerSize===-1&&o.PickupPool?.endsWith('_BP')&&o.DropoffPool?.endsWith('_BP')){removed.push(i);scaffolds++;return [];}
  const min=o.Kind==='Resource'?o.MinScu:o.MinAmount,max=o.Kind==='Resource'?o.MaxScu:o.MaxAmount,fixed=Number.isSafeInteger(min)&&min>0&&(max===0||max===min);
  return [{...(alreadyProjected?previous.find(p=>p.orderIndex===i):previous[i]),minScu:o.MinScu??null,maxScu:o.MaxScu??null,minAmount:o.MinAmount??null,maxAmount:o.MaxAmount??null,...(fixed?{fixedQuantity:min}:{}),pickupPool:String(o.PickupPool||'').replace(/_BP$/,''),dropoffPool:String(o.DropoffPool||'').replace(/_BP$/,''),orderIndex:i}];
 });
 d.rules.pools=Object.entries(raw.LocationPools||{}).map(([name,p])=>({name,purpose:p.Purpose,candidatesKey:share((p.ResolvedLocations||[]).map(l=>({name:l.Name||'',id:l.StarmapUUID||''})).filter(l=>l.name||l.id))}));
 d.rules.haulingObjectives=(raw.ObjectiveTokens||[]).filter(o=>o.HandlerType==='ObjectiveHandler_Hauling').map(o=>o.Id);
 d.rules.objectiveOrderIndicesVerified=removed.length===0;
 d.giver=raw.MissionGiver||'';d.rank=raw.RankIndex;
 d.rules.source={commit:sourceCommit,path:'contracts/'+d.id+'.json'};matched++;
}
if(matched<1700)throw Error('insufficient-public-contracts');
catalog.pools=sharedPools;
catalog.rawSource={repository:'StarCitizenWiki/scunpacked-data',commit:sourceCommit,version:catalog.version,matched,skipped,scope:'Original generated demand and pool candidates; no runtime location choices or aboard inventory.'};
await writeFile(path,JSON.stringify(catalog)+'\n');console.log({matched,skipped,scaffolds});
