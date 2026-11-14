import {contractInfo} from '../../../contract-info.mjs';

export const referenceFields=['reward','cargoRules','type','company','title','description','rank','rankName','systems','illegal','shareable','referenceMinutes','buyIn'];
const present=value=>value!==null&&value!==undefined&&value!==''&&(!Array.isArray(value)||value.length>0);
const sourceUrl=(source,id)=>{
 const url=source?.url||'';
 if(/^https:\/\/api\.star-citizen\.wiki\/api\/missions(?:\/[a-f\d-]{36})?$/i.test(url))return 'https://api.star-citizen.wiki/api/missions/'+id;
 if(/^https:\/\/github\.com\/KrovaxCode\/SCMDB_DATA\/blob\/[a-f\d]{40}\/data\/merged-[a-z\d.-]+\.json$/i.test(url))return url;
 return null;
};
// Resolve each exact definition separately: catalogue groups may share values,
// but their field provenance and conflicting variants need not be identical.
export function archiveReference(catalog,id){
 const info=contractInfo(catalog,id);if(!info)return null;
 const values=info.values||{},provenance=info.provenance||{},differences=info.differences||{};
 const keys=[...new Set([...referenceFields,...Object.keys(values),...Object.keys(differences)])];
 return {id:info.definitionId,origin:info.origin||null,
  sources:Object.entries(info.sources||{}).map(([key,source])=>({key,name:source.name||key,version:source.version||'',checkedAt:source.checkedAt||null,url:sourceUrl(source,info.definitionId)})),
  fields:keys.map(key=>{
   const known=present(values[key]),sources=[...(provenance[key]||[])];
   const variants=(differences[key]||[]).map(v=>({value:v.value,sources:[...v.sources]}));
   const status=!known?(variants.length?'unresolved':'unknown'):variants.length?'preferred':sources.includes('scmdb')&&sources.includes('wiki')?'matched':sources.includes('wiki')&&!sources.includes('scmdb')?(info.origin==='wiki'?'wiki-only':'supplemented'):'primary';
   return {key,value:known?values[key]:null,sources,variants,status};
  })};
}

export function referenceValue(field,value,locale='ko'){
 const en=locale==='en',unknown=en?'Unknown':'미확인',number=n=>n.toLocaleString(en?'en-US':'ko-KR');
 if(!present(value))return unknown;
 if(typeof value==='boolean')return value?(en?'Yes':'예'):(en?'No':'아니요');
 if(typeof value==='number')return Number.isFinite(value)?number(value)+(field==='buyIn'?' aUEC':field==='referenceMinutes'?(en?' min':'분'):''):unknown;
 if(Array.isArray(value))return value.map(v=>referenceValue(field,v,locale)).join('\n');
 if(typeof value==='object'){
  if(field==='reward')return Number.isFinite(value.min)&&Number.isFinite(value.max)&&value.min>=0&&value.max>=value.min?(value.min===value.max?number(value.min):number(value.min)+'–'+number(value.max))+' aUEC':unknown;
  if(field==='cargoRules'&&'commodity'in value){
   const min=value.minSCU,max=value.maxSCU,validMin=Number.isFinite(min)&&min>=0,validMax=Number.isFinite(max)&&max>=0;
   const qty=validMin&&min>0&&max===0?number(min):validMin&&validMax&&max>0&&max>=min?(min===max?number(min):number(min)+'–'+number(max)):!validMin&&validMax&&max>0?(en?'Up to ':'최대 ')+number(max):unknown;
   const box=[1,2,4,8,16,24,32].includes(value.maxContainerSCU)?number(value.maxContainerSCU)+' SCU':unknown;
   return `${value.commodity} · ${qty}${qty===unknown?'':' SCU'} · ${en?'Max container':'최대 상자'} ${box}`;
  }
  return JSON.stringify(value);
 }
 return String(value);
}
