import {matchLocation,norm} from './aliases.mjs';
const caches=new WeakMap();
export function catalogIndex(data){if(!data?.definitions)return null;if(!caches.has(data))caches.set(data,new Map(data.definitions.map(d=>[d.id,d])));return caches.get(data);}
const ports={'teasaspaceport':'Lorville','rikermemorialspaceport':'Area18','augustdunlowspaceport':'Orison','newbabbageinterstellarspaceport':'New Babbage'};
export function catalogPlace(name,places){const wanted=ports[norm(name)];if(wanted){const hits=places.filter(p=>p.name===wanted);return hits.length===1?hits[0]:null;}return matchLocation(name,places);}
export function routeFromTitle(title,places){const tail=String(title||'').split('|').at(-1).replace(/\s*\[[^\]]*\]\s*$/,'').trim(),parts=tail.split(/\s*(?:>|→)\s*/);if(parts.length===2)return {pickup:catalogPlace(parts[0],places),dropoff:catalogPlace(parts[1],places)};const from=tail.match(/\bfrom\s+(.+)$/i);return {pickup:from?catalogPlace(from[1],places):null,dropoff:null};}
const rankWords=['trainee','rookie','junior','member','experienced','senior','master'];
export function rankOf(m){return Number.isInteger(m.rank)?m.rank:rankWords.findIndex(word=>new RegExp('\\b'+word+'\\b','i').test(m.title||''));}
// An observed original 452 SCU direct haul corroborates this one definition's quotas.
// This is original demand, never proof of remaining or aboard cargo.
const confirmed=new Map([['6528ac09-f0b3-4f83-a198-72f098754d95',[['Ammonia',168,24],['Hydrogen Fuel',168,24],['Argon',48,24],['Pressurized Ice',48,8],['Construction Materials',20,2]]]]);
export function definitionDraft(contract,places,catalog,missionDb,{pickups=[],dropoffs=[]}={}){
 const index=catalogIndex(catalog);if(!index)return null;const route=routeFromTitle(contract.title,places);let definition=index.get(contract.definitionId),basis='definition-id';
 if(!definition&&route.pickup&&route.dropoff){const title=String(contract.title||''),rank=rankWords.find(w=>new RegExp('\\b'+w+'\\b','i').test(title)),direct=/\bdirect\b/i.test(title),bulk=/\bbulk\b/i.test(title);if(rank&&direct&&bulk){const candidates=[...index.values()].filter(d=>d.released&&!d.notForRelease&&new RegExp('\\b'+rank+'\\b','i').test(d.title)&&/direct.*bulk/i.test(d.title)&&['pickup','dropoff'].every(role=>d.rules?.locations?.filter(s=>new RegExp(role==='pickup'?'^Location':'^Destination').test(s.slot)).some(s=>s.candidates.some(name=>catalogPlace(name,places)?.id===route[role].id))));if(candidates.length===1){definition=candidates[0];basis='unique-title-route';}}}
 if(!definition?.released||definition.notForRelease)return null;
 const db=missionDb?.missions||[],meta=db.find(m=>m.id===definition.id)||db.find(m=>definition.parents?.includes(m.id));
 const resolve=(role,observed)=>{const values=[...new Set(observed)];if(values.length===1)return values[0];if(values.length>1)return '';if(route[role])return route[role].id;const slots=(definition.rules?.locations||[]).filter(s=>new RegExp(role==='pickup'?'^Location':'^Destination').test(s.slot));if(slots.length!==1)return '';const candidates=slots[0].candidates.map(name=>catalogPlace(name,places));return candidates.length&&candidates.every(p=>p?.id&&p.id===candidates[0]?.id)?candidates[0].id:'';};
 const pickupId=resolve('pickup',pickups),dropoffId=resolve('dropoff',dropoffs),verified=confirmed.get(definition.id),orders=verified?verified.map(([name,quantity,maxBoxScu])=>({kind:'Resource',name,minScu:quantity,maxScu:quantity,maxBoxScu})):definition.rules?.orders||[];
 const rows=orders.filter(o=>['Resource','Entity','MissionItem'].includes(o.kind)&&o.name).map(o=>{const entity=o.kind!=='Resource',min=entity?o.minAmount:o.minScu,max=entity?o.maxAmount:o.maxScu;return {commodity:o.name,scu:Number.isSafeInteger(min)&&min>0&&min===max?min:'',pickupId,dropoffId,boxes:[],...(Number.isFinite(o.maxBoxScu)&&o.maxBoxScu>0?{maxBoxSize:o.maxBoxScu}:{}),_quantityBounds:{min,max,unit:entity?'items':'SCU'},_catalogBasis:verified?'observed-original-quota':'definition-bounds'};});
 return {id:definition.id,title:definition.title,company:meta?.giver||'',rows,basis,version:catalog.version,pickupId,dropoffId};
}
