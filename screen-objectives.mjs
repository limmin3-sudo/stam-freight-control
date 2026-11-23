// Parse the labelled objectives shown in the accepted-contract detail pane.
// The counter is delivery progress. It is never a share collected at each pickup.
const trim=s=>s?.trim().replace(/^[◆◇♦◊•▶\s]+|[.。\s]+$/gu,'')||'';
const number=s=>Number(s.replaceAll(',',''));
export const screenKey=s=>String(s||'').replace(/[ㆍᆞ]/g,' ').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function pickupInstructions(text){
 const instructions=[];
 for(const line of text.split('\n')){
  const s=trim(line).replace(/^[^\p{L}\d]*(?:[oO]{1,2}\s+)?(?=Collect\b)/iu,'');
  const match=s.match(/^(.+?)(?:을|를)\s*(.+?)에서\s*(?:수집|수령|픽업|회수)/u)||s.match(/^Collect\s+(.+?)\s+(?:at|from)[’'!:]?\s+(.+)$/i);
  if(match)instructions.push({item:trim(match[1]),place:trim(match[2])});
 }
 return instructions;
}
export function screenObjectives(text){
 const normalized=String(text).replace(/[ㆍᆞ]/g,'·').normalize('NFKC').replace(/\r/g,'')
  .replace(/(\d\s*\/\s*[\d,]+\s+)(?:504|5CU|S0U|5C[UV])(?=\s*[·•|]?\s*(?:화물|Cargo))/gi,'$1SCU');
 const header=/(?:납품|배송|Deliver(?:ed|y)?)\s*[:：.]?\s*([\d,]+)\s*\/\s*([\d,]+)\s*S\s*C\s*U\b/gi;
 const hits=[...normalized.matchAll(header)],goals=[];
 for(const [i,hit] of hits.entries()){
  const block=normalized.slice(hit.index+hit[0].length,hits[i+1]?.index);
  const labels=block.match(/(?:화물|Cargo|Commodity)\s*:\s*([^\n·•|]+?)\s*[·•|\s]+(?:목적지|Destination)\s*:\s*([^\n]+)/i);
  const prose=labels?null:block.split(/\bCollect\b/i,1)[0].trim().match(/^of\s+([^\n]+?)\s+to\s+([\s\S]{1,220}?)(?:\.\s|\.$|$)/i);
  const fields=labels||prose;if(!fields)continue;
  const item=trim(fields[1]).replace(/\s+[‘’](?=\p{L})/gu," "),destination=trim(fields[2].replace(/[^\S\n]+[:|]\s*\n/g,"\n").replace(/\s+/g," ")),total=number(hit[2]),done=number(hit[1]);
  if(!item||!destination||!Number.isSafeInteger(total)||total<=0||total>10000||done>total)continue;
  const rest=labels?block.slice(labels.index+labels[0].length):block,pickups=[];
  for(const p of pickupInstructions(rest))if(screenKey(p.item)===screenKey(item)&&p.place)pickups.push(p.place);
  goals.push({item,destination,total,done,pickups:[...new Set(pickups)]});
 }
 return goals;
}
export function screenLocation(text,places,translations={}){
 const site=text.replace(/\s*\([^()]*\)\s*$/,'').replace(/\s+(?:on|above)\s+(?:microTech|Hurston|Crusader|ArcCorp|Pyro\s+[IVX]+)[.\s]*$/i,'');
 const name=screenKey(site);
 if(!name)return '';
 const matches=places.filter(p=>!['Star','Planet','Moon','Asteroid'].includes(p.type)&&
  [p.name,translations[p.name],...(p.aliases||[])].some(n=>screenKey(n)===name));
 if(matches.length)return matches.length===1?matches[0].id:'';
 // Correct O/0 only within a depot code, and only if the known facility
 // catalogue yields one match (S4LDO1, or an extra O in S4LD0O1).
 const code=site.match(/^(.*\bS\dLD)([0-9O]+)$/i);
 if(!code||!/[oO]/.test(code[2]))return '';
 const possible=new Set([code[2].replace(/O/gi,'0'),code[2].replace(/O/gi,'')].map(n=>screenKey(code[1]+n)));
 const verified=places.filter(p=>possible.has(screenKey(p.name)));
 return verified.length===1?verified[0].id:'';
}
