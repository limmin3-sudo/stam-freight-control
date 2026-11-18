import official from '../../../data/stam-korean.json' with {type:'json'};
import supplemental from '../../../data/ai-korean.json' with {type:'json'};
import type {Commodity} from './trade-data';
type GoodName = Pick<Commodity, 'name' | 'code'>;

export function commoditySearchTerms(item?:GoodName, fallback=''):string[] {
 return item ? [item.name, item.code ?? ''] : [fallback];
}

// UEX reuses codes. Derive the distinguishing words from the entire catalogue so
// filtering out a sibling never changes the label of the remaining commodity.
export function commodityCodeVariants(items:Commodity[]) {
 const groups=new Map<string, Commodity[]>();
 for(const item of items) {
  if(!item.code) continue;
  const group=groups.get(item.code);
  if(group) group.push(item);
  else groups.set(item.code,[item]);
 }
 const variants=new Map<number,string>();
 for(const group of groups.values()) {
  if(group.length<2) continue;
  const names=group.map(item=>item.name.split(/\s+/));
  const first=names[0]!;
  let start=0, end=0;
  while(start<first.length && names.every(words=>words[start]===first[start])) start++;
  while(names.every(words=>words.length>start+end && words.at(-1-end)===first.at(-1-end))) end++;
  group.forEach((item,i)=>{
   const words=names[i]!;
   const qualifier=words.slice(start,words.length-end).join(' ').replace(/^\((.*)\)$/, '$1');
   variants.set(item.id,qualifier);
  });
 }
 return variants;
}
// An exact ticker lookup takes precedence over incidental matches in terminal names.
export function matchingCommodityCodes(query:string, items:Commodity[], variants:Map<number,string>) {
 const input=normalize(query.replaceAll('·',''));
 if(!input) return new Set<number>();
 const matches=items.filter(item=>{
  if(!item.code) return false;
  const code=normalize(item.code);
  const qualifier=variants.get(item.id);
  return input===code || (qualifier && input===code+normalize(qualifier));
 });
 return new Set(matches.map(item=>item.id));
}
type Kind='goods'|'places';
const dictionaries={goods:{...supplemental.goods,...official.goods},places:{...supplemental.places,...official.places}} as Record<Kind,Record<string,string>>;
export const tradeLabel=(name:string,kind:Kind,locale:string)=>locale==='ko'?dictionaries[kind][name]||name:name;
const normalize=(text:string)=>text.normalize('NFKC').toLocaleLowerCase().replace(/[’‘]/g,"'").replace(/[\s\-_]+/g,'');
// Search both canonical and display names in every language, without changing IDs.
export function tradeMatches(query:string,goods:string[]=[],places:string[]=[]){
 const terms=query.trim().split(/[\s·]+/).filter(Boolean).map(normalize);
 const names=[...goods.flatMap(n=>[n,dictionaries.goods[n]??'']),...places.flatMap(n=>[n,dictionaries.places[n]??''])].map(normalize).join(' ');
 return terms.every(term=>names.includes(term));
}
