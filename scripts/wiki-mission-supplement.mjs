// SCMDB stays primary. Wiki records supplement exact UUIDs, never title guesses.
import {createHash} from 'node:crypto';
import {plain} from './scmdb-fields.mjs';
const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const present=value=>value!==null&&value!==undefined&&value!==''&&(!Array.isArray(value)||value.length>0);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function compactWikiSnapshot(snapshot){
 const keys=['uuid','title','description','mission_giver','mission_type','rank_index','illegal','shareable','reward_min','reward_max','reward_currency','time_to_complete_minutes','star_systems','min_standing_name','cost','debug_name','released','not_for_release','game_version','version'];
 const records=snapshot.records.map(row=>({...Object.fromEntries(keys.filter(k=>row[k]!==undefined).map(k=>[k,row[k]])),
  ...(row.min_standing?{min_standing:{name:row.min_standing.name}}:{}),
  ...(row.hauling_orders?{hauling_orders:row.hauling_orders.map(o=>Object.fromEntries(['kind','name','min_scu','max_scu','min_amount','max_amount','max_container_size'].filter(k=>o[k]!==undefined).map(k=>[k,o[k]])))}:{}),
  ...(row.mission_tokens?{mission_tokens:Object.fromEntries(Object.entries(row.mission_tokens).filter(([key])=>/\|Address$/.test(key)))}:{})}));
 return {...snapshot,source:{...snapshot.source,sha256:digest(records)},records};
}
export function wikiFields(row){
 const min=row.reward_min,max=row.reward_max===0&&min>0?min:row.reward_max;
 const reward=Number.isSafeInteger(min)&&min>=0&&Number.isSafeInteger(max)&&max>=min?{min,max,currency:'aUEC'}:undefined;
 return {title:plain(row.title),company:plain(row.mission_giver),type:plain(row.mission_type),description:plain(row.description),rank:row.rank_index,rankName:plain(row.min_standing?.name||row.min_standing_name),systems:row.star_systems,illegal:row.illegal,shareable:row.shareable,reward,referenceMinutes:row.time_to_complete_minutes,buyIn:row.cost,
  cargoRules:row.hauling_orders?.every(o=>o.kind==='Resource')?row.hauling_orders.map(o=>({commodity:plain(o.name),minSCU:o.min_scu,maxSCU:o.max_scu,maxContainerSCU:o.max_container_size})):undefined};
}
export function wikiDefinition(row){
 if(!row.released||row.not_for_release||!uuid.test(row.uuid||'')||!row.hauling_orders?.length)return null;
 const orders=row.hauling_orders.map((o,index)=>({kind:o.kind,name:plain(o.name),minScu:o.min_scu??null,maxScu:o.max_scu??null,minAmount:o.min_amount??null,maxAmount:o.max_amount??null,maxBoxScu:o.max_container_size??null,orderIndex:index,limitSource:'wiki'}));
 if(orders.some(o=>!o.name||!['Resource','Entity','MissionItem'].includes(o.kind)))return null;
 // Tokens are candidate pools, not the locations chosen by an accepted instance.
 const locations=Object.entries(row.mission_tokens||{}).filter(([key,v])=>/^(?:Location|Pickup|Destination|DropOff)\d*\|Address$/i.test(key)&&Array.isArray(v)).map(([slot,names])=>({slot,candidates:names.filter(n=>typeof n==='string')}));
 return {id:row.uuid.toLowerCase(),title:plain(row.title),giver:plain(row.mission_giver),rank:row.rank_index,parents:[row.uuid.toLowerCase()],templateNames:row.debug_name?[row.debug_name]:[],released:true,notForRelease:false,quantityVersion:row.game_version||row.version,rulesSource:'wiki',rules:{orders,locations,pools:[],haulingObjectives:[],objectiveOrderIndicesVerified:false,source:'wiki'}};
}
function primaryEntry(entry,differences){
 if(entry.origin==='wiki')return null;
 const values={},provenance={};for(const [key,value]of Object.entries(entry.values||{}))if(!entry.provenance?.[key]||entry.provenance[key].includes('scmdb')){values[key]=value;provenance[key]=['scmdb'];}
 const diff=Object.fromEntries(Object.entries(differences||{}).map(([key,variants])=>[key,variants.filter(v=>v.sources.includes('scmdb')).map(v=>({...v,sources:['scmdb']}))]).filter(([,variants])=>variants.length>1));
 const {differenceIndex,...rest}=entry;return {...rest,origin:'scmdb',values,provenance,differences:diff};
}
export function supplementMissions(primary,snapshot){
 if(snapshot.schema!==1||!Array.isArray(snapshot.records)||!snapshot.source?.version||snapshot.source.sha256!==digest(snapshot.records))throw Error('Invalid Wiki supplement');
 const details=structuredClone(primary.details),catalog=structuredClone(primary.catalog),missions=structuredClone(primary.missions);
 const entries=new Map();for(const [id,index]of Object.entries(details.definitions||{})){const old=details.entries[index],entry=old&&primaryEntry(old,details.differences?.[old.differenceIndex]);if(entry)entries.set(id,entry);}
 const primaryDefinitions=catalog.definitions.filter(d=>d.rulesSource!=='wiki'),definitions=new Map(primaryDefinitions.map(d=>[d.id,d]));
 let filled=0,added=0;for(const row of snapshot.records){
  if(!uuid.test(row.uuid||'')||row.released!==true||row.not_for_release)continue;
  const id=row.uuid.toLowerCase(),values=wikiFields(row);let entry=entries.get(id);
  if(!entry){entry={origin:'wiki',values:{},provenance:{},preferred:{},differences:{}};entries.set(id,entry);added++;}
  for(const [key,value]of Object.entries(values)){
   if(!present(value))continue;
   if(!present(entry.values[key])){
    // An unresolved SCMDB conflict is not missing information.
    if(entry.differences[key]?.length)continue;
    entry.values[key]=value;entry.provenance[key]=['wiki'];filled++;
   }else if(JSON.stringify(entry.values[key])===JSON.stringify(value)){
    if(!entry.provenance[key].includes('wiki'))entry.provenance[key].push('wiki');
   }else{
    const variants=entry.differences[key]||[{value:entry.values[key],sources:[...entry.provenance[key]]}];
    if(!variants.some(v=>v.sources.includes('wiki')&&JSON.stringify(v.value)===JSON.stringify(value)))variants.push({value,sources:['wiki']});
    entry.differences[key]=variants;if(entry.provenance[key].includes('scmdb'))entry.preferred={...entry.preferred,[key]:'scmdb'};
   }
  }
  if(!definitions.has(id)){const definition=wikiDefinition(row);if(definition)definitions.set(id,definition);}
 }
 details.sources={...details.sources,wiki:snapshot.source};details.primarySource='scmdb';details.sourcePolicy='scmdb-first-wiki-missing';details.definitions={};details.entries=[];details.differences=[];
 for(const [id,entry]of [...entries].sort(([a],[b])=>a.localeCompare(b))){const {differences,...value}=entry;details.definitions[id]=details.entries.length;if(Object.keys(differences).length){value.differenceIndex=details.differences.length;details.differences.push(differences);}details.entries.push(value);}
 details.stats={...details.stats,definitions:details.entries.length,haulingDefinitions:definitions.size,wikiOnlyDefinitions:added,wikiFilledFields:filled};
 catalog.definitions=[...definitions.values()];catalog.supplementalSources={wiki:snapshot.source};catalog.scope='SCMDB first; exact-UUID Wiki-only definitions supplement missing missions. Actual accepted-instance evidence takes priority.';
 const primaryIds=new Set(primaryDefinitions.map(d=>d.id));missions.missions=missions.missions.filter(m=>primaryIds.has(m.id));
 for(const d of catalog.definitions)if(d.rulesSource==='wiki')missions.missions.push({id:d.id,title:d.title,giver:d.giver,rank:d.rank,orders:d.rules.orders.map(o=>[o.name,o.kind==='Resource'?(o.maxScu===0?o.minScu:o.maxScu):null,o.kind==='Resource'?o.maxBoxScu:-1])});
 missions.meta={...missions.meta,sourcePolicy:'scmdb-first-wiki-missing',supplementalSources:{wiki:snapshot.source},definitions:missions.missions.length,variants:missions.missions.length};
 return {details,catalog,missions};
}
const api='https://api.star-citizen.wiki/api/';
async function pooled(items,limit,fn){let cursor=0;const output=Array(items.length);await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(cursor<items.length){const index=cursor++;output[index]=await fn(items[index],index);}}));return output;}
export async function downloadWikiSupplement({previous,fetchImpl=fetch,onProgress=()=>{}}={}){
 const get=async url=>{const response=await fetchImpl(url,{signal:AbortSignal.timeout(45000)});if(response.status===404)return null;if(!response.ok)throw Error('Wiki HTTP '+response.status);return response.json();};
 const v=await get(api+'game-versions/default'),version=v?.data?.code;if(!/^\d+\.\d+\.\d+-LIVE\.\d+$/i.test(version||''))throw Error('Invalid Wiki LIVE version');
 const first=await get(api+'missions?'+new URLSearchParams({'page[size]':'200','page[number]':'1',version}));
 if(!Array.isArray(first?.data)||!Number.isSafeInteger(first.meta?.last_page)||first.meta.last_page>100)throw Error('Invalid Wiki mission index');
 const rest=await pooled(Array.from({length:first.meta.last_page-1},(_,i)=>i+2),3,async page=>{const value=await get(api+'missions?'+new URLSearchParams({'page[size]':'200','page[number]':String(page),version}));if(!Array.isArray(value?.data)||value.meta.current_page!==page)throw Error('Incomplete Wiki mission index');return value.data;});
 const rows=[...first.data,...rest.flat()];if(rows.length<100||rows.length!==first.meta.total||new Set(rows.map(r=>r.uuid)).size!==rows.length)throw Error('Incomplete Wiki mission records');
 if(rows.some(r=>(r.game_version||r.version)!==version))throw Error('Mixed Wiki versions');
 const records=new Map(rows.map(row=>[row.uuid,row])),targets=new Map(),hashes={};
 for(const row of rows){hashes[row.uuid]=digest(row);if(!row.released||row.not_for_release||!/CargoHauling|HaulCargo/i.test(row.debug_name||''))continue;
  for(const id of [row.uuid,...(row.variants||[]).map(v=>v.uuid)])if(uuid.test(id||''))targets.set(id,{family:row.uuid,hash:hashes[row.uuid]});}
 const cached=new Map(previous?.source?.version===version?(previous.records||[]).filter(r=>r.hauling_orders).map(r=>[r.uuid,r]):[]);let completed=0;
 await pooled([...targets],4,async([id,{family,hash}])=>{
  const prior=previous?.indexHashes?.[family]===hash?cached.get(id):null;
  const detail=prior||((await get(api+'missions/'+id+'?version='+encodeURIComponent(version)))?.data);
  if(detail){if(detail.uuid?.toLowerCase()!==id.toLowerCase()||(detail.game_version||detail.version)!==version)throw Error('Wiki definition/version mismatch');records.set(id,detail);}
  completed++;if(completed%50===0||completed===targets.size)onProgress({completed,total:targets.size});
 });
 const after=await get(api+'game-versions/default');if(after?.data?.code!==version)throw Error('Wiki version changed during refresh');
 const data=[...records.values()].sort((a,b)=>a.uuid.localeCompare(b.uuid));
 return compactWikiSnapshot({schema:1,source:{name:'Star Citizen Wiki',version,url:api+'missions',checkedAt:new Date().toISOString(),sha256:digest(data)},indexHashes:hashes,records:data});
}
