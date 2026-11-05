import {matchLocation,norm} from './aliases.mjs';
const caches=new WeakMap();
export function catalogIndex(data){if(!data?.definitions)return null;if(!caches.has(data))caches.set(data,new Map(data.definitions.map(d=>[d.id,{...d,rules:{...d.rules,pools:(d.rules?.pools||[]).map(p=>({...p,candidates:p.candidates||data.pools?.[p.candidatesKey]||[]}))}}])));return caches.get(data);}
const ports={'teasaspaceport':'Lorville','rikermemorialspaceport':'Area18','augustdunlowspaceport':'Orison','newbabbageinterstellarspaceport':'New Babbage'};
export function catalogPlace(name,places){const wanted=ports[norm(name)];if(wanted){const hits=places.filter(p=>p.name===wanted);return hits.length===1?hits[0]:null;}return matchLocation(name,places);}
export function routeFromTitle(title,places){const tail=String(title||'').split('|').at(-1).replace(/\s*\[[^\]]*\]\s*$/,'').trim(),parts=tail.split(/\s*(?:>|→)\s*/);if(parts.length===2)return {pickup:catalogPlace(parts[0],places),dropoff:catalogPlace(parts[1],places)};const from=tail.match(/\bfrom\s+(.+)$/i),to=tail.match(/\bto\s+(.+)$/i);return {pickup:from?catalogPlace(from[1],places):null,dropoff:to?catalogPlace(to[1],places):null};}
const rankWords=['trainee','rookie','junior','member','experienced','senior','master'];
export function rankOf(m){return Number.isInteger(m.rank)?m.rank:rankWords.findIndex(word=>new RegExp('\\b'+word+'\\b','i').test(m.title||''));}
export function definitionOrders(definition){return definition?.rules?.orders||[];}
export function definitionDraft(contract,places,catalog,missionDb,{pickups=[],dropoffs=[],markers=[]}={}){
 const index=catalogIndex(catalog);if(!index)return null;
 const route=routeFromTitle(contract.title,places);let definition=index.get(contract.definitionId),basis='definition-id';
 if(!definition&&route.pickup&&route.dropoff){const title=String(contract.title||''),rank=rankWords.find(w=>new RegExp('\\b'+w+'\\b','i').test(title)),direct=/\bdirect\b/i.test(title),bulk=/\bbulk\b/i.test(title);
  if(rank&&direct&&bulk){const candidates=[...index.values()].filter(d=>d.released&&!d.notForRelease&&new RegExp('\\b'+rank+'\\b','i').test(d.title)&&/direct.*bulk/i.test(d.title)&&['pickup','dropoff'].every(role=>d.rules?.locations?.filter(s=>new RegExp(role==='pickup'?'^Location':'^Destination').test(s.slot)).some(s=>s.candidates.some(name=>catalogPlace(name,places)?.id===route[role].id))));if(candidates.length===1){definition=candidates[0];basis='unique-title-route';}}
 }
 if(!definition?.released||definition.notForRelease)return null;
 const rules=definition.rules,orders=definitionOrders(definition),db=missionDb?.missions||[],meta=db.find(m=>m.id===definition.id)||db.find(m=>definition.parents?.includes(m.id));
 const pools=rules.pools||[],poolNames=role=>[...new Set(orders.map(o=>o[role+'Pool']).filter(Boolean))];
 const idsOf=pool=>[...new Set((pool?.candidates||[]).map(p=>places.find(l=>l.uuid===p.id||l.id===p.id)||catalogPlace(p.name,places)).filter(Boolean).map(p=>p.id))];
 const resolve=(role,order)=>{
  const name=order?.[role+'Pool'],names=poolNames(role),rolePools=pools.filter(p=>new RegExp(role==='pickup'?'^Location':'^Destination').test(p.purpose||'')),multi=names.length>1||!names.length&&rolePools.length>1,pool=pools.find(p=>p.name===name);
  // Some public definitions omit per-order pool names. When their order indices
  // are verified, bind the exact objective suffix to that row; a single marker
  // from a multi-location side must never fill every row.
  if(!names.length&&multi){if(!order||!rules.objectiveOrderIndicesVerified)return '';const ids=[...new Set(markers.filter(m=>m.role===role&&m.pointId&&(rules.haulingObjectives||[]).some(id=>m.objectiveId===`${role}_${id}_${order.orderIndex}`)).map(m=>m.pointId))];return ids.length===1?ids[0]:'';}
  const scoped=markers.filter(m=>m.role===role&&m.pointId).filter(m=>{if(!multi)return true;if(!rules.objectiveOrderIndicesVerified)return false;return (rules.haulingObjectives||[]).some(id=>{const prefix=role+'_'+id+'_';if(!m.objectiveId?.startsWith(prefix))return false;const i=Number(m.objectiveId.slice(prefix.length));return orders.find(o=>o.orderIndex===i)?.[role+'Pool']===name;});});
  const bound=[...new Set(scoped.map(m=>m.pointId))];if(bound.length===1)return bound[0];if(bound.length>1)return '';
  if(!multi){const observed=[...new Set(role==='pickup'?pickups:dropoffs)];if(observed.length===1)return observed[0];if(observed.length>1)return '';if(route[role])return route[role].id;}
  if(pool){const candidates=idsOf(pool);if(candidates.length===1&&pool.candidates.every(p=>places.some(l=>(l.uuid===p.id||l.id===p.id))||catalogPlace(p.name,places)))return candidates[0];return '';}
  const slots=(rules.locations||[]).filter(s=>new RegExp(role==='pickup'?'^Location':'^Destination').test(s.slot));if(slots.length!==1)return '';const candidates=slots[0].candidates.map(name=>catalogPlace(name,places));return candidates.length&&candidates.every(p=>p?.id&&p.id===candidates[0]?.id)?candidates[0].id:'';
 };
 const rows=orders.filter(o=>['Resource','Entity','MissionItem'].includes(o.kind)&&o.name).map(o=>{
  const entity=o.kind!=='Resource',min=entity?o.minAmount:o.minScu,max=entity?o.maxAmount:o.maxScu;
  const quantity=entity&&o.name!=='CryoPod'?'':Number.isSafeInteger(o.fixedQuantity)&&o.fixedQuantity>0?o.fixedQuantity:Number.isSafeInteger(min)&&min>0&&min===max?min:'';
  const limit=[1,2,4,8,16,24,32].includes(o.maxBoxScu)?o.maxBoxScu:null;
  return {commodity:o.name,scu:quantity,pickupId:resolve('pickup',o),dropoffId:resolve('dropoff',o),boxes:[],...(limit?{maxBoxSize:limit,_maxBoxSource:'wiki',_catalog:{id:definition.id,commodity:o.name,maxBoxSize:limit,orderIndex:o.orderIndex,objectives:rules.haulingObjectives||[]}}:{}),_quantityBounds:{min,max,unit:entity?'items':'SCU'},_catalogBasis:o.fixedQuantity?'definition-fixed-quota':'definition-bounds'};
 });
 return {id:definition.id,title:definition.title,company:definition.giver||meta?.giver||'',rank:definition.rank??meta?.rank,rows,basis,version:catalog.version,pickupId:resolve('pickup'),dropoffId:resolve('dropoff')};
}
// Restore exact definition limits after legacy name/type enrichment. User changes
// and actual box layouts remain authoritative; the old packer receives its usual
// wiki limit and continues to compute the maximum-container provisional layout.
export function retainCatalogLimits(original,enriched){
 if(!original?._logInbox?.definition)return enriched;
 for(let i=0;i<enriched.cargo.length;i++){const before=original.cargo[i],after=enriched.cargo[i],e=before?._catalog;
  if(!e||e.id!==original._logInbox.definition.id||before.commodity!==e.commodity||before.maxBoxSize!==e.maxBoxSize)continue;
  after.maxBoxSize=e.maxBoxSize;after._maxBoxSource='wiki';after._catalog={...e};
 }
 const d=original._logInbox.definition;enriched._wiki={id:d.id,title:original.title,giver:original.company,rank:d.rank,version:d.version,candidates:1,ambiguous:false};return enriched;
}
