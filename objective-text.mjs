import patch from './data/stam-korean.json' with {type:'json'};
import AI from './data/ai-korean.json' with {type:'json'};
import {KO_NAMES,norm} from './aliases.mjs';
import {lexGood} from './data/ai-korean-lexicon.mjs';

const goods=new Map();
function add(index,label,value){const key=norm(label);if(!key)return;if(!index.has(key))index.set(key,new Set());index.get(key).add(value);}
for(const [en,ko] of Object.entries(AI.goods))for(const name of [en,ko,lexGood(en)])add(goods,name,en);
for(const [en,ko] of Object.entries(patch.goods))for(const name of [en,ko])add(goods,name,en);
const unique=set=>set?.size===1?[...set][0]:null;
export function canonicalObjectiveGood(name){return unique(goods.get(norm(name)))||name.trim();}

// Resolve complete names and published aliases, optionally prefixed by a known
// celestial body. Similar spellings alone never establish a delivery location.
export function objectivePlaceLookup(places){
 const names=new Map(),bodies=new Set(),english=new Map(),stars=new Set(places.filter(p=>p.type==='Star').map(p=>p.id));
 for(const p of places){if(!english.has(p.name))english.set(p.name,[]);english.get(p.name).push(p);for(const name of [p.name,...(p.aliases||[])]){add(names,name,p.id);if(['Star','Planet','Moon'].includes(p.type))bodies.add(norm(name));}}
 for(const [ko,en] of Object.entries(KO_NAMES))for(const p of english.get(en)||[]){add(names,ko,p.id);add(names,ko+' ('+en+')',p.id);if(['Star','Planet','Moon'].includes(p.type))bodies.add(norm(ko));}
 for(const [en,ko] of Object.entries(patch.places))for(const p of english.get(en)||[])add(names,ko,p.id);
 return text=>{
  // e.g. “Pyro III의 L3 Lagrange에 위치한 Patch City”. The whole station name
  // must resolve uniquely; arbitrary trailing words are never fuzzy-matched.
  const qualified=String(text||'').match(/^(.+?)의\s*L[1-5]\s+Lagrange에\s+위치한\s+(.+)$/i);
  if(qualified&&bodies.has(norm(qualified[1])))return unique(names.get(norm(qualified[2])))||'';
  const query=norm(text),ids=new Set(names.get(query)||[]);for(const body of bodies)for(const suffix of ['의','상공의']){const prefix=body+suffix;if(query.startsWith(prefix))for(const id of names.get(query.slice(prefix.length))||[])ids.add(id);}const station=String(text||'').match(/^([a-z]{3}-L[1-5])\s+.+?(?:스테이션|정거장)\s*\[([a-z][a-z '-]+)\]$/i);
  const research=String(text||'').match(/^(?:라야리|레이아리)\s+.+?연구\s*기지\s*\[([a-z][a-z '-]+)\]$/i);
  const shelter=String(text||'').match(/^.+?비상\s*대피소\s*\[([a-z][a-z '-]+)\]$/i);
  const lookup=shelter?`${shelter[1]} Emergency Shelter`:station?`${station[1]} ${station[2]} Station`:research?`Rayari ${research[1]} Research Outpost`:'';
  for(const id of names.get(norm(lookup))||[])ids.add(id);
  for(const id of stars)ids.delete(id);
  return unique(ids)||'';};
}

export function deliveryNotice(notification){
 const line=String(notification||'').replace(/<[^>]*>/g,'').replace(/(\d)\s*\/\s*(?=\d)/g,'$1/').replace(/:\s*$/,'').trim().replace(/^(?:New Objective|Objective Complete|새 목표|새로운 목표|목표 달성|목표 완료):\s*/i,'');
 let m=line.match(/^Deliver\s+\d+\/(\d+)\s*SCU\s+of\s+(.+?)\s+to\s+(.+?)\.?$/i),commodity,scu,dropoffText;
 if(m)[,scu,commodity,dropoffText]=m;
 else if(m=line.match(/^(.+?)(?:을\(를\)|을|를)\s*\d+\/(\d+)\s*SCU\s+(.+?)에\s*배송(?:하십시오|하세요)[.!]?$/))[,commodity,scu,dropoffText]=m;
 else if(m=line.match(/^(.+?)에\s*\d+\/(\d+)\s*SCU의\s+(.+?)(?:을\(를\)|을|를)\s*(?:배달|배송)(?:하십시오|하세요)[.!]?$/))[,dropoffText,scu,commodity]=m;
 else if(m=line.match(/^(.+?)에\s+(.+?)\s+\d+\/(\d+)\s*SCU\s+전달[.!]?$/))[,dropoffText,commodity,scu]=m;
 else if(m=line.match(/^\d+\/(\d+)\s*SCU의\s+(.+?)(?:을\(를\)|을|를)\s+(.+?)에\s*전달(?:하십시오|하세요)[.!]?$/))[,scu,commodity,dropoffText]=m;
 else return null;
 return {commodity:canonicalObjectiveGood(commodity),scu:Number(scu),dropoffText:dropoffText.trim()};
}

// Non-bulk freight can log its item and stop without ever reporting a volume.
export function namedCargoGoal(notification){
 const line=String(notification||'').replace(/<[^>]*>/g,'').trim()
  .replace(/^(?:New Objective|Objective Complete|새 목표|새로운 목표|목표 달성|목표 완료)\s*[:：]\s*/i,'')
  .replace(/[.:：!]+$/,'').trim();
 const counted=line.match(/^(?:Collect|Pick up|Retrieve)\s+\d+\s*\/\s*\d+\s*SCU\s+of\s+(.+?)\s+(?:from|at)\s+(.+)$/i);
 if(counted)return {role:'pickup',commodity:canonicalObjectiveGood(counted[1]),place:counted[2].trim()};
 const pickup=line.match(/^(.+?)에서\s+(.+?)\s+\d+\s*\/\s*\d+\s*SCU\s+(?:수령|수거|픽업)$/);
 if(pickup)return {role:'pickup',place:pickup[1].trim(),commodity:canonicalObjectiveGood(pickup[2])};
 if(/\d\s*\/\s*\d|\bSCU\b/i.test(line))return null;
 let match,role,place,commodity;
 if(match=line.match(/^(.+?)에서\s+(.+?)\s+(?:수령|수거|픽업)$/)){
  [,place,commodity]=match;role='pickup';
 }else if(match=line.match(/^(.+?)에\s+(.+?)\s+(?:전달|배송|배달)$/)){
  [,place,commodity]=match;role='dropoff';
 }else if(match=line.match(/^(?:Collect|Pick up|Retrieve)\s+(.+?)\s+(?:from|at)\s+(.+)$/i)){
  [,commodity,place]=match;role='pickup';
 }else if(match=line.match(/^Deliver\s+(.+?)\s+to\s+(.+)$/i)){
  [,commodity,place]=match;role='dropoff';
 }else return null;
 return {role,place:place.trim(),commodity:canonicalObjectiveGood(commodity)};
}
