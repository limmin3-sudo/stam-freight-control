import {exactFreightReference,placeResolver,referenceStops,wikiFixedQuantity} from './receipt-reference.mjs';
import {matchLocation,norm} from './aliases.mjs';
import groupSource from './data/log-order-groups.json' with {type:'json'};
const caches=new WeakMap();
export function catalogIndex(data){if(!data?.definitions)return null;if(!caches.has(data))caches.set(data,new Map(data.definitions.map(d=>[d.id,{...d,rules:{...d.rules,pools:(d.rules?.pools||[]).map(p=>({...p,candidates:p.candidates||data.pools?.[p.candidatesKey]||[]}))}}])));return caches.get(data);}
const ports={'teasaspaceport':'Lorville','rikermemorialspaceport':'Area18','augustdunlowspaceport':'Orison','newbabbageinterstellarspaceport':'New Babbage'};
export function catalogPlace(name,places){const wanted=ports[norm(name)];if(wanted){const hits=places.filter(p=>p.name===wanted);return hits.length===1?hits[0]:null;}return matchLocation(name,places);}
export function routeFromTitle(title,places){const tail=String(title||'').split('|').at(-1).replace(/\s*\[[^\]]*\]\s*$/,'').trim(),parts=tail.split(/\s*(?:>|→)\s*/);if(parts.length===2)return {pickup:catalogPlace(parts[0],places),dropoff:catalogPlace(parts[1],places)};const from=tail.match(/\bfrom\s+(.+)$/i),to=tail.match(/\bto\s+(.+)$/i);return {pickup:from?catalogPlace(from[1],places):null,dropoff:to?catalogPlace(to[1],places):null};}
const rankWords=['trainee','rookie','junior','member','experienced','senior','master'];
export function rankOf(m){return Number.isInteger(m.rank)?m.rank:rankWords.findIndex(word=>new RegExp('\\b'+word+'\\b','i').test(m.title||''));}
export function definitionOrders(definition){return definition?.rules?.orders||[];}
export function definitionDraft(contract,places,catalog,missionDb,{pickups=[],dropoffs=[],markers=[],wiki=null}={}){
 const index=catalogIndex(catalog);if(!index)return null;
 const route=routeFromTitle(contract.title,places);const local=exactFreightReference(catalog,contract);
 // SCMDB supplies build-specific resource rules; Wiki supplies exact-ID address tokens.
 const useLiveAddresses=wiki&&(wiki.slots.pickup.length||wiki.slots.dropoff.length)&&
  (!local?.slots||!local.slots.pickup.length&&!local.slots.dropoff.length);
 const external=local&&useLiveAddresses
  ?{...local,slots:wiki.slots,build:{...local.build,wikiVersion:wiki.build.wikiVersion,wikiUrl:wiki.build.wikiUrl}}
  :local||wiki;
 const otherBuild=catalog.sourceName==='SCMDB'&&contract.gameBuild?.status==='known'&&/^\d+\.\d+\.\d+-live\.(\d+)$/i.test(catalog.version)&&catalog.version.split('.').at(-1)!==String(contract.gameBuild.value);
 let definition=local?.definition||(local&&index.get(contract.definitionId))||wiki?.definition||(!otherBuild&&index.get(contract.definitionId)),basis='definition-id';
 if(!definition&&catalog.sourceName==='SCMDB'&&!contract.conflicts?.length){
  const names=[...new Set((contract.markerObservations||[]).map(m=>m.template).filter(Boolean))];
  if(names.length===1){const all=[...index.values()].filter(d=>d.released&&!d.notForRelease&&d.templateNames?.includes(names[0])),primary=all.filter(d=>d.rulesSource==='scmdb'),matches=primary.length?primary:all;if(matches.length===1){definition=matches[0];basis='exact-template-name';}}
 }
 if(!definition&&catalog.sourceName!=='SCMDB'&&route.pickup&&route.dropoff){const title=String(contract.title||''),rank=rankWords.find(w=>new RegExp('\\b'+w+'\\b','i').test(title)),direct=/\bdirect\b/i.test(title),bulk=/\bbulk\b/i.test(title);
  if(rank&&direct&&bulk){const candidates=[...index.values()].filter(d=>d.released&&!d.notForRelease&&new RegExp('\\b'+rank+'\\b','i').test(d.title)&&/direct.*bulk/i.test(d.title)&&['pickup','dropoff'].every(role=>d.rules?.locations?.filter(s=>new RegExp(role==='pickup'?'^Location':'^Destination').test(s.slot)).some(s=>s.candidates.some(name=>catalogPlace(name,places)?.id===route[role].id))));if(candidates.length===1){definition=candidates[0];basis='unique-title-route';}}
 }
 if(!definition?.released||definition.notForRelease||definition.rules?.sourceConflict)return null;
 const lookedUp=external&&basis==='definition-id'?referenceStops(external,places,{pickups,dropoffs}):null;
 const rules=definition.rules.objectiveIdsFromMarkers?{...definition.rules,haulingObjectives:[...new Set(markers.map(m=>m.objectiveId?.match(/^(?:pickup|dropoff)_([a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})_\d+$/i)?.[1]).filter(Boolean))]}:definition.rules,orders=definitionOrders(definition),db=missionDb?.missions||[],meta=db.find(m=>m.id===definition.id)||db.find(m=>definition.parents?.includes(m.id));
 const pools=rules.pools||[],poolNames=role=>[...new Set(orders.map(o=>o[role+'Pool']).filter(Boolean))];
 const exactPlace=placeResolver(places);
 const poolId=p=>exactPlace(p.id)||exactPlace(p.name);
 // Verified order groups only link stops already observed in this instance.
 const profile=basis==='definition-id'&&contract.gameBuild?.status==='known'&&contract.gameBuild.value===groupSource.build
  ?groupSource.definitions[definition.id]:null;
 const groups=profile&&orders.length===profile.items.length&&orders.every((o,i)=>o.orderIndex===i&&o.name===profile.items[i])?profile:null;
 const groupedMulti=role=>groups&&new Set(groups[role].filter(Boolean)).size>1;
 const templates=definition.templateNames||[];
 const flattenedSide=role=>{
  const pattern=role==='pickup'?/Multi\d*ToSingle/i:/SingleToMulti\d*/i;
  return templates.length>0&&templates.every(name=>pattern.test(name));
 };
 const fromReference=(role,order)=>lookedUp?(lookedUp.ordered(role,order,orders)||lookedUp.fixed[role]):'';
 const resolve=(role,order)=>{
  const name=order?.[role+'Pool'],names=poolNames(role),rolePools=pools.filter(p=>new RegExp(role==='pickup'?'^Location':'^Destination').test(p.purpose||'')),multi=names.length>1||!names.length&&rolePools.length>1,pool=pools.find(p=>p.name===name);
  if(groups&&order&&groups[role][order.orderIndex]){
   const observed=new Set();
   for(const m of markers){
    if(m.role!==role||!m.pointId)continue;
    const i=orders.findIndex(o=>m.objectiveId===`${role}_${groups.objective}_${o.orderIndex}`);
    if(i>=0&&groups[role][i]===groups[role][order.orderIndex])observed.add(m.pointId);
   }
   if(observed.size)return observed.size===1?[...observed][0]:'';
   if(groupedMulti(role))return fromReference(role,order);
  }
  // Without explicit groups, bind only the marker for this order. One observed
  // stop on a multi-stop side cannot fill all the remaining orders.
  const roleMarkers=markers.filter(m=>m.role===role&&m.pointId);
  if(groupedMulti(role)||(!names.length&&multi)||(!multi&&(flattenedSide(role)||new Set(roleMarkers.map(m=>m.pointId)).size>1))){
   if(!order||!rules.objectiveOrderIndicesVerified)return fromReference(role,order);
   const ids=new Set(roleMarkers.filter(m=>(rules.haulingObjectives||[]).some(id=>m.objectiveId===`${role}_${id}_${order.orderIndex}`)).map(m=>m.pointId));
   return ids.size===1?[...ids][0]:ids.size?'':fromReference(role,order);
  }
  const scoped=markers.filter(m=>m.role===role&&m.pointId).filter(m=>{if(!multi)return true;if(!rules.objectiveOrderIndicesVerified)return false;return (rules.haulingObjectives||[]).some(id=>{const prefix=role+'_'+id+'_';if(!m.objectiveId?.startsWith(prefix))return false;const i=Number(m.objectiveId.slice(prefix.length));return orders.find(o=>o.orderIndex===i)?.[role+'Pool']===name;});});
  const bound=[...new Set(scoped.map(m=>m.pointId))];if(bound.length===1)return bound[0];if(bound.length>1)return '';
  if(!multi){const observed=[...new Set(role==='pickup'?pickups:dropoffs)];if(observed.length===1)return observed[0];if(observed.length>1)return '';if(route[role]&&exactPlace(route[role].id))return route[role].id;}
  // An exact SCMDB template alias can describe another region of the same
  // contract. Its resource rules apply, but its candidate places do not.
  if(basis==='exact-template-name'||!places.length)return '';
  if(lookedUp)return fromReference(role,order);
  if(pool){const ids=new Set(pool.candidates.map(poolId));return ids.size===1?[...ids][0]||'':'';}
  const slots=(rules.locations||[]).filter(s=>new RegExp(role==='pickup'?'^Location':'^Destination').test(s.slot));if(slots.length!==1)return '';const candidates=slots[0].candidates.map(exactPlace);return candidates.length&&candidates.every(id=>id&&id===candidates[0])?candidates[0]:'';
 };
 const rows=orders.filter(o=>['Resource','Entity','MissionItem'].includes(o.kind)&&o.name).map(o=>{
  const entity=o.kind!=='Resource',min=entity?o.minAmount:o.minScu,max=entity?o.maxAmount:o.maxScu;
  const quantity=entity&&o.name!=='CryoPod'?'':Number.isSafeInteger(o.fixedQuantity)&&o.fixedQuantity>0?o.fixedQuantity:Number.isSafeInteger(min)&&min>0&&min===max?min:wikiFixedQuantity(external,o,orders);
  const limit=[1,2,4,8,16,24,32].includes(o.maxBoxScu)?o.maxBoxScu:null;
  return {commodity:o.name,scu:quantity,pickupId:resolve('pickup',o),dropoffId:resolve('dropoff',o),boxes:[],...(limit?{maxBoxSize:limit,_maxBoxSource:o.limitSource||'wiki',_catalog:{source:o.limitSource||'wiki',id:definition.id,commodity:o.name,maxBoxSize:limit,orderIndex:o.orderIndex,objectives:rules.haulingObjectives||[]}}:{}),_quantityBounds:{min,max,unit:entity?'items':'SCU'},_catalogBasis:o.fixedQuantity?'definition-fixed-quota':'definition-bounds'};
 });
 return {id:definition.id,title:definition.title,company:definition.giver||meta?.giver||'',rank:definition.rank??meta?.rank,rows,basis,version:definition.quantityVersion||catalog.version,source:definition.rulesSource||'wiki',catalogStops:lookedUp?.stops,lookupMetadata:referenceMetadata(external,definition.id),pickupId:resolve('pickup'),dropoffId:resolve('dropoff'),multiplePickups:!!groupedMulti('pickup')||flattenedSide('pickup')||poolNames('pickup').length>1||pools.filter(p=>/^Location/.test(p.purpose||'')).length>1,multipleDropoffs:!!groupedMulti('dropoff')||flattenedSide('dropoff')||poolNames('dropoff').length>1||pools.filter(p=>/^Destination/.test(p.purpose||'')).length>1};
}
function referenceMetadata(reference,id){
 if(!reference)return null;
 const {build,metadata,metadataSource='scmdb'}=reference;
 const sources={};
 if(build.url&&reference.hasScmdb!==false)sources.scmdb={name:'SCMDB',version:build.version,url:build.url};
 if(reference.slots||reference.hasScmdb===false)sources.wiki={name:'Star Citizen Wiki',version:build.wikiVersion,url:build.wikiUrl||
  'https://github.com/StarCitizenWiki/scunpacked-data/blob/'+build.wikiCommit+'/contracts/'+id+'.json'};
 return {values:metadata||{},provenance:Object.fromEntries(Object.keys(metadata||{}).map(k=>[k,[metadataSource]])),sources,freightDefinitionId:id};
}
// Restore exact definition limits after legacy name/type enrichment. User changes
// and actual box layouts remain authoritative; the old packer receives its usual
// wiki limit and continues to compute the maximum-container provisional layout.
export function retainCatalogLimits(original,enriched){
 if(!original?._logInbox?.definition)return enriched;
 for(let i=0;i<enriched.cargo.length;i++){const before=original.cargo[i],after=enriched.cargo[i],e=before?._catalog;
  if(!e||e.id!==original._logInbox.definition.id||before.commodity!==e.commodity||before.maxBoxSize!==e.maxBoxSize)continue;
  after.maxBoxSize=e.maxBoxSize;after._maxBoxSource=e.source||'wiki';after._catalog={...e};
 }
 const d=original._logInbox.definition;enriched._wiki={source:d.source==='scmdb'?'SCMDB':'Wiki',id:d.id,title:original.title,giver:original.company,rank:d.rank,version:d.version,candidates:1,ambiguous:false};return enriched;
}
