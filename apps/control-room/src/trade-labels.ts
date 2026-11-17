import official from '../../../data/stam-korean.json' with {type:'json'};
import supplemental from '../../../data/ai-korean.json' with {type:'json'};
type Kind='goods'|'places';
const dictionaries={goods:{...supplemental.goods,...official.goods},places:{...supplemental.places,...official.places}} as Record<Kind,Record<string,string>>;
export const tradeLabel=(name:string,kind:Kind,locale:string)=>locale==='ko'?dictionaries[kind][name]||name:name;
const normalize=(text:string)=>text.normalize('NFKC').toLocaleLowerCase().replace(/[’‘]/g,"'").replace(/[\s\-_]+/g,'');
// Search both canonical and display names in every language, without changing IDs.
export function tradeMatches(query:string,goods:string[]=[],places:string[]=[]){
 const terms=query.trim().split(/\s+/).filter(Boolean).map(normalize);
 const names=[...goods.flatMap(n=>[n,dictionaries.goods[n]??'']),...places.flatMap(n=>[n,dictionaries.places[n]??''])].map(normalize).join(' ');
 return terms.every(term=>names.includes(term));
}
