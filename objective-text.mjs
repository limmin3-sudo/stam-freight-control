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
 for(const p of places){if(!english.has(p.name))english.set(p.name,[]);english.get(p.name).push(p);for(const name of [p.name,...(p.aliases||[])]){add(names,name,p.id);if(['Star','Planet','Moon'].includes(p.type))bodies.add(norm(name));}}
 for(const [ko,en] of Object.entries(KO_NAMES))for(const p of english.get(en)||[]){add(names,ko,p.id);if(['Star','Planet','Moon'].includes(p.type))bodies.add(norm(ko));}
 return text=>{const query=norm(text),ids=new Set(names.get(query)||[]);for(const body of bodies)for(const suffix of ['의','상공의']){const prefix=body+suffix;if(query.startsWith(prefix))for(const id of names.get(query.slice(prefix.length))||[])ids.add(id);}return unique(ids)||'';};
}

export function deliveryNotice(notification){
 const line=String(notification||'').replace(/<[^>]*>/g,'').replace(/:\s*$/,'').trim().replace(/^(?:New Objective|Objective Complete|새 목표|새로운 목표|목표 완료):\s*/i,'');
 let m=line.match(/^Deliver\s+\d+\/(\d+)\s*SCU\s+of\s+(.+?)\s+to\s+(.+?)\.?$/i),commodity,scu,dropoffText;
 if(m)[,scu,commodity,dropoffText]=m;
 else if(m=line.match(/^(.+?)(?:을\(를\)|을|를)\s*\d+\/(\d+)\s*SCU\s+(.+?)에\s*배송(?:하십시오|하세요)[.!]?$/))[,commodity,scu,dropoffText]=m;
 else if(m=line.match(/^(.+?)에\s*\d+\/(\d+)\s*SCU의\s+(.+?)(?:을\(를\)|을|를)\s*(?:배달|배송)(?:하십시오|하세요)[.!]?$/))[,dropoffText,scu,commodity]=m;
 else if(m=line.match(/^(.+?)에\s+(.+?)\s+\d+\/(\d+)\s*SCU\s+전달[.!]?$/))[,dropoffText,commodity,scu]=m;
 else return null;
 return {commodity:canonicalObjectiveGood(commodity),scu:Number(scu),dropoffText:dropoffText.trim()};
}
