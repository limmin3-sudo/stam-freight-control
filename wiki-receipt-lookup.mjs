import {wikiDefinition} from './wiki-freight-definition.mjs';
import {receiptBuildVersion} from './receipt-reference.mjs';

const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const live=/^\d+\.\d+\.\d+-LIVE\.(\d+)$/i;
export function lookupKey(contract){
 const id=contract.definitionId,build=contract.gameBuild;
 if(!uuid.test(id)||build?.status!=='known'||!/^\d+$/.test(build.value))return '';
 return build.value+':'+id.toLowerCase();
}

function wikiRecord(row,id,build,url){
 const version=row?.game_version||row?.version;
 if(row?.uuid?.toLowerCase()!==id||live.exec(version)?.[1]!==build)return null;
 const definition=wikiDefinition(row);
 if(!definition)return null;
 const slots={items:definition.rules.orders.map(o=>o.name),fixed:definition.rules.orders.map(o=>
  o.kind==='Resource'&&o.minScu>0&&(o.maxScu===0||o.maxScu===o.minScu)?o.minScu:null)};
 for(const role of ['pickup','dropoff']){
  const pattern=role==='pickup'?/^(?:Location|Pickup)/i:/^(?:Destination|Dropoff)/i;
  slots[role]=definition.rules.locations.filter(s=>pattern.test(s.slot)).map(s=>s.candidates);
 }
 const metadata={description:row.description,type:row.mission_type,company:row.mission_giver};
 return {definition,slots,pairs:[],metadata,metadataSource:'wiki',build:{version,wikiVersion:version,wikiUrl:url}};
}

// Cache only public build + definition keys. One batch shares a deadline and
// concurrent readers share requests. Failed lookups can retry on a later receipt.
export function createWikiLookup(fetchImpl=globalThis.fetch){
 const cache=new Map(),pending=new Map();
 const known=key=>{const item=cache.get(key);return item&&item.expires>Date.now()?item:null;};
 async function read(key,signal){
  const [build,id]=key.split(':'),version=receiptBuildVersion(build);
  const url='https://api.star-citizen.wiki/api/missions/'+id+(version?'?version='+encodeURIComponent(version):'');
  let record=null;
  try{
   const res=await fetchImpl(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(res.ok)record=wikiRecord((await res.json()).data,id,build,url);
  }catch{/* Local receipts remain available when the public API is offline. */}
  if(cache.size>=2048)cache.delete(cache.keys().next().value);
  cache.set(key,{record,expires:Date.now()+(record?86400000:300000)});
  pending.delete(key);
 }
 async function fill(keys){
  const queue=[...new Set(keys)].filter(key=>/^\d+$/.test(key.split(':')[0])&&uuid.test(key.split(':')[1])&&!known(key));
  const signal=AbortSignal.timeout(3000);
  async function run(){
   while(queue.length&&!signal.aborted){
    const key=queue.shift();
    if(!pending.has(key))pending.set(key,read(key,signal));
    await pending.get(key);
   }
  }
  await Promise.all(Array.from({length:Math.min(4,queue.length)},run));
 }
 return {get:key=>known(key)?.record,has:key=>!!known(key),fill};
}
