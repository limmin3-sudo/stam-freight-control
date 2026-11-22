import AI from './data/ai-korean.json' with {type:'json'};
import {KO_NAMES,norm} from './aliases.mjs';
import {lexGood} from './data/ai-korean-lexicon.mjs';

const goods=new Map();
function add(index,label,value){const key=norm(label);if(!key)return;if(!index.has(key))index.set(key,new Set());index.get(key).add(value);}
for(const [en,ko] of Object.entries(AI.goods))for(const name of [en,ko,lexGood(en)])add(goods,name,en);
const unique=set=>set?.size===1?[...set][0]:null;
export function canonicalObjectiveGood(name){return unique(goods.get(norm(name)))||name.trim();}

// Resolve complete names and published aliases, optionally prefixed by a known
// celestial body. Similar spellings alone never establish a delivery location.
export function objectivePlaceLookup(places){
 const names=new Map(),bodies=new Set(),english=new Map();
 const pyroStops=new Set(places.filter(p=>p.system==='pyro'&&!['Star','Planet','Moon'].includes(p.type)).map(p=>p.id));
 for(const p of places){if(!english.has(p.name))english.set(p.name,[]);english.get(p.name).push(p);for(const name of [p.name,...(p.aliases||[])]){add(names,name,p.id);if(['Star','Planet','Moon'].includes(p.type))bodies.add(norm(name));}}
 for(const [ko,en] of Object.entries(KO_NAMES))for(const p of english.get(en)||[]){add(names,ko,p.id);add(names,ko+' ('+en+')',p.id);if(['Star','Planet','Moon'].includes(p.type))bodies.add(norm(ko));}
 return text=>{
  const query=norm(text),ids=new Set(names.get(query)||[]);
  for(const body of bodies)for(const suffix of ['의','상공의']){
   const prefix=body+suffix;
   if(query.startsWith(prefix))for(const id of names.get(query.slice(prefix.length))||[])ids.add(id);
  }
  // Korean mission objectives append orbital addresses in parentheses to the stop name.
  const qualified=String(text||'').trim().match(/^(.+?)\s*\(\s*파이로\s+[IVX]+(?:의)?\s*(?:L[1-5]\s*라그랑주\s*지점|상공|궤도)\s*\)$/i);
  if(qualified)for(const id of names.get(norm(qualified[1]))||[])if(pyroStops.has(id))ids.add(id);
  return unique(ids)||'';
 };
}

export function deliveryNotice(notification){
 const line=String(notification||'').replace(/<[^>]*>/g,'').replace(/:\s*$/,'').trim().replace(/^(?:New Objective|Objective Complete|새 목표|새로운 목표|목표 달성|목표 완료):\s*/i,'');
 let m=line.match(/^Deliver\s+\d+\/(\d+)\s*SCU\s+of\s+(.+?)\s+to\s+(.+?)\.?$/i),commodity,scu,dropoffText;
 if(m)[,scu,commodity,dropoffText]=m;
 else if(m=line.match(/^(?:납품|배송|전달)\s*[:：]\s*\d+\s*\/\s*(\d+)\s*SCU\s*[·•]\s*화물\s*[:：]\s*(.+?)\s*[·•]\s*목적지\s*[:：]\s*(.+?)[.!]?$/i))[,scu,commodity,dropoffText]=m;
 else if(m=line.match(/^(.+?)(?:을\(를\)|을|를)\s*\d+\/(\d+)\s*SCU\s+(.+?)에\s*배송(?:하십시오|하세요)[.!]?$/))[,commodity,scu,dropoffText]=m;
 else if(m=line.match(/^(.+?)에\s*\d+\/(\d+)\s*SCU의\s+(.+?)(?:을\(를\)|을|를)\s*(?:배달|배송)(?:하십시오|하세요)[.!]?$/))[,dropoffText,scu,commodity]=m;
 else if(m=line.match(/^(.+?)에\s+(.+?)\s+\d+\/(\d+)\s*SCU\s+전달[.!]?$/))[,dropoffText,commodity,scu]=m;
 else if(m=line.match(/^\d+\/(\d+)\s*SCU의\s+(.+?)(?:을\(를\)|을|를)\s+(.+?)에\s*전달(?:하십시오|하세요)[.!]?$/))[,scu,commodity,dropoffText]=m;
 else return null;
 return {commodity:canonicalObjectiveGood(commodity),scu:Number(scu),dropoffText:dropoffText.trim()};
}

// Only a collection instruction attached to a pickup objective can identify a source.
export function pickupPlaceText(notification){
 const line=String(notification||'').replace(/<[^>]*>/g,'').trim().replace(/:\s*$/,'').trim()
  .replace(/^(?:New Objective|Objective Complete|새 목표|새로운 목표|목표 달성|목표 완료):\s*/i,'');
 const english=line.match(/^(?:Collect|Pick up)\s+.+?\s+from\s+(.+?)[.!]?$/i);
 if(english)return english[1];
 const korean=line.match(/^.+?(?:을\(를\)|을|를)\s+(.+?)에서\s*(?:수집|수거|수령)(?:하십시오|하세요)[.!]?$/);
 return korean?.[1]||'';
}
