import korean from '../../../data/stam-korean.json' with {type:'json'};
import {canonicalLocationId,currentLocationPoint,currentLocationData} from './personal-locations.mjs';
import {reviewReceipt} from './receipt-edit.mjs';
import {applySpokenLanes,finishManifest,type ManifestDraft} from './spoken-manifest.ts';
import {repairReceiptWords} from './receipt-word-match.mjs';
import {spokenScu} from './spoken-contract.ts';
import type {Job,Name,Shipment} from './mission-trial';

const ordinalWords=['첫','두','세','네','다섯','여섯','일곱','여덟','아홉','열'];
const ordinalPattern='(\\d+|첫|두|세|네|다섯|여섯|일곱|여덟|아홉|열|[일이삼사오육칠팔구십]+)\\s*(?:번째|번|째)';
function slot(n:string){const i=ordinalWords.indexOf(n);return i<0?spokenScu(n):i+1;}
const addressed=new RegExp('(?:'+ordinalPattern+'\\s*(?:미션|계약)|(?:미션|계약)\\s*'+ordinalPattern+'|(?:mission|contract)\\s*#?(\\d+))','i');
export const isReceiptRemoval=(text:string)=>/미션|계약|contract|mission/i.test(text)&&/제외|삭제|빼|remove|exclude/i.test(text);
export function receiptNumber(text:string){const m=addressed.exec(text);return m?(/^이번\s*(미션|계약)/.test(m[0])?0:slot(m[1]||m[2]||m[3]!)):null;}
export function receiptAddress(text:string){
 const m=addressed.exec(text);
 if(!m||isReceiptRemoval(text)||/추가|\badd\b/i.test(text))return null;
 // 이번 미션 can mean “this mission”. Ask for its visible number.
 const number=/^이번\s*(미션|계약)/.test(m[0])?0:slot(m[1]||m[2]||m[3]!);
 return {number,body:(text.slice(0,m.index)+' '+text.slice(m.index+m[0].length).replace(/^(?:은|는|이요|에)?[\s,，:]*/,'')).trim()};
}

const key=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/\s+/g,'');
type Alias={word:string;id:string};
const shortPlaces:Record<string,string[]>={"Sacren's Plot":['세이크'],"Chawla's Beach":['차울라','차올라'],'Ruin Station':['루인','루인 스테이션']};
const places=korean.places as Record<string,string>;
const goods=new Map<string,Name>();
for(const [en,ko] of Object.entries(korean.goods))goods.set(en,[ko,en]);
const goodsAliases=[...goods].flatMap(([id,labels])=>labels.map(label=>({word:key(label),id})));
let lastData:ReturnType<typeof currentLocationData>|undefined,ports:Alias[]=[];
function placeAliases(){
 const data=currentLocationData();
 if(data!==lastData){
  ports=data.locations.filter(p=>p.type!=='Star'&&p.position).flatMap(p=>
   [p.name,places[p.name],...(shortPlaces[p.name]||[]),...('aliases' in p&&Array.isArray(p.aliases)?p.aliases:[])].filter(Boolean).map(s=>({word:key(s),id:p.id})));
  lastData=data;
 }
 return ports;
}
// Only completed destination/commodity pairs are acoustic hints. Card numbers follow the visible order.
export function receiptVoiceHints(cards:readonly Job[]){
 const hints=new Set<string>();
 for(const [index,card] of cards.entries()){
  for(const row of card.shipments){
   const place=currentLocationPoint(row.to)?.name;
   if(!place)continue;
   const cargo=row.cargo[0].trim();
   const to=shortPlaces[place]?.[0]||places[place];
   if(!to||![to,cargo].every(word=>/^[가-힣 ]{2,28}$/.test(word)))continue;
   hints.add((index+1)+'|'+to+'|'+cargo);
   if(hints.size>48)return [];
  }
 }
 return [...hints];
}
export function quantityPlaceNames(draft:ReceiptConversation){
 return draft.quantityPlace?.ids.map(id=>{
  const name=currentLocationPoint(id)?.name||'';
  return shortPlaces[name]?.[0]||places[name]||name;
 });
}
function mentions(text:string,aliases:Alias[],raw:string){
 const words=raw.normalize('NFKC').toLowerCase().split(/\s+/);
 const boundaries=new Set<number>([0]);let offset=0;
 for(const word of words){offset+=word.length;boundaries.add(offset);}
 const hits:{start:number;end:number;id:string}[]=[];
 for(const a of aliases){
  if(a.word.length<2)continue;
  for(let start=text.indexOf(a.word);start>=0;start=text.indexOf(a.word,start+a.word.length)){
   const end=start+a.word.length;
   if(/^[a-z]/.test(a.word)&&!boundaries.has(start)&&/[a-z]/.test(text.charAt(start-1)))continue;
   if(/[a-z]$/.test(a.word)&&!boundaries.has(end)&&/[a-z]/.test(text.charAt(end)))continue;
   hits.push({start,end,id:a.id});
  }
 }
 const longest=hits.filter(h=>!hits.some(l=>l.start<=h.start&&h.end<=l.end&&l.end-l.start>h.end-h.start));
 return longest.filter((h,i)=>!longest.slice(0,i).some(l=>l.start===h.start&&l.end===h.end&&l.id===h.id)).sort((a,b)=>a.start-b.start);
}
const tens=['','열','스물','서른','마흔','쉰','예순','일흔','여든','아흔'];
const ones=['','하나','둘','셋','넷','다섯','여섯','일곱','여덟','아홉'];
const numbers=new Map<string,number>();
for(let t=0;t<tens.length;t++)for(let i=0;i<ones.length;i++)if(t||i)numbers.set(tens[t]!+ones[i]!,10*t+i);
numbers.set('스무',20);
const enOnes=['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
enOnes.forEach((n,i)=>{if(i)numbers.set(n,i);});
for(const [i,word] of ['twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'].entries()){
 for(let n=0;n<10;n++)numbers.set(word+enOnes[n],(i+2)*10+n);
}
const quant='(\\d{1,3}(?:,\\d{3})+|\\d+|'+[...numbers.keys()].sort((a,b)=>b.length-a.length).join('|')+'|[일이삼사오육칠팔구십백천만]+)';
const amount='(-?(?:'+quant.slice(1,-1)+'))';
const unitAmount=new RegExp(amount+'(?:scu|에스씨유|에스시유|스큐)','gi');
const labelledAmount=new RegExp('(?:수량|물량|양)(?:은|는|이|가)?'+amount);
const bareAmount=new RegExp('^'+amount+'(?:개|이야|이에요|예요)?$');
export function revisedReceiptQuantity(reply:string){
 const value=key(reply).replace(/^(?:수량은?|quantity)/,'').replace(/(?:이에요|예요|이야|야|요|instead)[.!?]?$/,'').replace(/(?:scu|에스씨유|에스시유|스큐)$/,'').replace(/^\[(\d+)\]$/,'$1');
 const hasUnit=/(?:scu|에스씨유|에스시유|스큐)/i.test(reply);
 const native=value.length===1&&!hasUnit?value:value.replace(/[한두세네]$/,c=>({한:'하나',두:'둘',세:'셋',네:'넷'}[c]!));
 return numbers.get(native)??spokenScu(value);
}
export type VoiceFields={from?:string;to?:string;cargo?:Name;scu?:number};
export type ReceiptConversation={repaired?:boolean;quantityEdit?:number;quantitySelector?:string;quantityRows?:number[];quantityPlace?:{role:"from"|"to";ids:string[]};manifest?:ManifestDraft;fields:VoiceFields;row?:number;place?:string;expected?:keyof VoiceFields;region?:Partial<Record<'from'|'to',string>>};
// Match every word of a selector against the same shipment. Unknown qualifiers
// must not be dropped, even if the card contains just one row.
function quantitySelectorMatches(selector:string,row:Shipment){
 const query=key(selector);
 if(!query)return !selector.trim();
 const from=canonicalLocationId(row.from),to=canonicalLocationId(row.to);
 const tokens:{word:string;role:string}[]=[];
 function add(word:string,role:string,endings:string[],prefix=''){
  if(word)for(const end of endings)tokens.push({word:prefix+word+end,role});
 }
 for(const cargo of row.cargo)add(key(cargo),'cargo',['','만','을','를','은','는','으로','화물']);
 for(const alias of placeAliases()){
  if(alias.id===from){
   add(alias.word,'from',['에서','에서실을','에서실은','에서싣는','에서수거할']);
   add(alias.word,'from',[''],'from');
  }
  if(alias.id===to){
   add(alias.word,'to',['','에','로','으로','까지','행','에내릴','에내리는','에배송할','로보낼','으로보낼','로가는','으로가는']);
   add(alias.word,'to',[''],'to');
  }
 }
 function consume(rest:string,used:string[]):boolean{
  if(!rest)return true;
  return tokens.some(({word,role})=>!used.includes(role)&&rest.startsWith(word)&&consume(rest.slice(word.length),[...used,role]));
 }
 const polite=query.replace(/(?:이요|이야|요|야)$/,'');
 return consume(query,[])||Boolean(polite&&polite!==query&&consume(polite,[]));
}
const quantityRowNumber=new RegExp('^(?:'+ordinalPattern+'\\s*(?:화물|품목|줄)|(?:row|shipment)\\s*(\\d+))$','i');
const listedOrdinal=new RegExp('^'+ordinalPattern+'(?:이요|이야|요)?$','i');
const englishOrdinals=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];
export function listedPlaceChoice(selector:string,previous:NonNullable<ReceiptConversation['quantityPlace']>){
 const ko=listedOrdinal.exec(selector);
 const digits=/^(?:option\s+)?(\d+)(?:st|nd|rd|th)?$/i.exec(selector);
 if(ko||digits){
  const n=ko?slot(ko[1]!):Number(digits![1]);
  return n&&n>0&&n<=previous.ids.length?n-1:-1;
 }
 const index=englishOrdinals.indexOf(selector.toLowerCase().replace(/ one$/,''));
 if(index>=0)return index<previous.ids.length?index:-1;
 const suffix=previous.role==='to'?/(?:쪽|으로가는거|로가는거|에내릴거|으로|로|행|에|까지)$/:/(?:쪽|에서싣는거|에서실을거|에서받는거|에서)$/;
 const answer=key(selector).replace(/(?:이요|이에요|예요|이야|요)$/,'');
 const name=answer.replace(suffix,'');
 const ids=new Set(placeAliases().filter(a=>previous.ids.includes(a.id)&&(a.word===name||a.word===answer)).map(a=>a.id));
 return ids.size===1?previous.ids.indexOf([...ids][0]!):-1;
}
function quantityRequest(text:string){
 const missing=/^(.*?)\s*(?:수량|물량)(?:을|만)?\s*(?:바꿔|수정해|고쳐|변경해)(?:\s*(?:줘|주세요))?[.! ]*$/i.exec(text);
 if(missing)return {selector:missing[1]!,quantity:null};
 const change=text.match(/^(.+?)으?로\s*(?:바꿔|고쳐|수정해|변경해)(?:\s*(?:줘|주세요))?[.! ]*$/i);
 const body=(change?change[1]!:text).trim();
 const labelled=/^(?:(.*?)\s+)?(?:수량|물량)(?:을|은|이)?\s*(.+)$/i.exec(body)||
  /^(?:set|change) (.*?)quantity to (.+?)[.! ]*$/i.exec(body);
 if(labelled){
  const quantity=revisedReceiptQuantity(labelled[2]!);
  if(quantity||change||!labelled[1])return {selector:labelled[1]||'',quantity};
  return;
 }
 if(!change)return;
 // Try whole word boundaries, so “열 네 SCU” stays one number and 114 never becomes 14.
 const words=body.split(/\s+/);
 for(let i=0;i<words.length;i++){
  const quantity=revisedReceiptQuantity(words.slice(i).join(' '));
  if(quantity)return {selector:words.slice(0,i).join(' '),quantity};
 }
 return {selector:body,quantity:null};
}
// Only an explicit quantity edit can replace a value that already came from the log.
export function receiptQuantityEdit(job:Job,text:string,draft:ReceiptConversation,en:boolean){
 let request=quantityRequest(text.trim());
 if(!request&&draft.quantitySelector!==undefined)request={selector:draft.quantitySelector,quantity:revisedReceiptQuantity(text)};
 if(!job.shipments.length){
  if(request?.selector)return {question:en?'This contract has no shipment rows yet. Give the pickup, delivery, cargo and quantity.':'아직 이 계약에 등록된 화물이 없어요. 수거지, 배송지, 품목, 수량을 말씀해 주세요.'};
  return;
 }
 if(!request&&draft.quantityEdit===undefined)return;
 const quantity=request?request.quantity:draft.quantityEdit;
 if(!quantity){
  delete draft.quantityPlace;
  delete draft.quantityEdit;
  const scope=request?.selector||'';
  if(!scope||job.shipments.some(row=>quantitySelectorMatches(scope,row))){
   draft.quantitySelector=scope;
   return {question:(scope?scope+' · ':'')+(en?'How many SCU should it be?':'몇 SCU로 바꿀까요?')};
  }
  delete draft.quantitySelector;
  draft.quantityRows=[];
  return {question:en?'Repeat the shipment and whole SCU quantity.':'화물과 변경할 수량을 함께 다시 말씀해 주세요.'};
 }
 delete draft.quantitySelector;
 draft.quantityEdit=quantity;
 const selector=(request?request.selector:text).trim();
 const ordinal=quantityRowNumber.exec(selector);
 const all=job.shipments.map((row,i)=>({row,i}));
 const candidates=request?.selector||!draft.quantityRows?all:all.filter(({i})=>draft.quantityRows!.includes(i));
 const previous=!request&&!ordinal?draft.quantityPlace:undefined;
 delete draft.quantityPlace;
 let rows;
 if(previous){
  // A listed place number is local to this question. Shipment row numbers stay absolute.
  const index=listedPlaceChoice(selector,previous);
  rows=index<0?[]:candidates.filter(({row})=>canonicalLocationId(row[previous.role])===previous.ids[index]);
 }else rows=candidates.filter(({row,i})=>ordinal?i+1===slot(ordinal[1]||ordinal[2]!):quantitySelectorMatches(selector,row));
 if(rows.length!==1){
  if(rows.length)draft.quantityRows=rows.map(({i})=>i);
  else if(request?.selector||draft.quantityRows?.length===0){
   draft.quantityRows=[];
   return {question:en?'No such shipment. Repeat the place, commodity and quantity.':'그 조건에 맞는 화물이 없어요. 거점, 품목, 수량을 함께 다시 말씀해 주세요.'};
  }
  const choices=rows.length?rows:candidates;
  const label=(id:string)=>{const n=currentLocationData().locations.find(p=>p.id===id)?.name||id;return en?n:places[n]||n;};
  const stops=(role:'from'|'to')=>[...new Set(choices.map(({row})=>canonicalLocationId(row[role])))];
  const drops=stops('to'),pickups=stops('from');
  const goods=[...new Set(choices.map(({row})=>row.cargo[en?1:0]).filter(Boolean))];
  let prompt=en?'Which shipment row? Give its number.':'몇 번째 화물인가요? 화물 줄 번호를 알려 주세요.';
  const role=drops.length>1&&!drops.includes('')?'to':goods.length===1&&pickups.length>1&&!pickups.includes('')?'from':undefined;
  if(role){
   const ids=role==='to'?drops:pickups;
   draft.quantityPlace={role,ids};
   prompt=(role==='to'?(en?'Which delivery? ':'어느 배송지 물량인가요? '):(en?'Which pickup? ':'어느 수거지 물량인가요? '))+
    ids.map((id,i)=>en?(i+1)+'. '+label(id):(i+1)+'번 '+label(id)).join(' / ');
  }else if(selector&&goods.length===choices.length&&goods.length>1)prompt=(en?'Which commodity? ':'어느 품목인가요? ')+goods.join(' / ');
  return {question:(rows.length?'':en?'No matching row. ':'일치하는 화물이 없어요. ')+prompt};
 }
 const {row,i}=rows[0]!;
 if(row.scu===quantity)return {unchanged:true,question:en?'Already '+quantity+' SCU.':'이미 '+quantity+' SCU예요.'};
 const corrected=reviewReceipt(job,{...job,shipments:job.shipments.map((r,n)=>n===i?{...r,scu:quantity}:r)},true);
 if(corrected.shipments.some(r=>!r.from||!r.to||!r.cargo.some(Boolean)))corrected.state='incomplete';
 return {job:corrected,question:'',row:i};
}
function readManifest(job:Job,s:string,hits:ReturnType<typeof mentions>,fields:VoiceFields,draft:ReceiptConversation,en:boolean){
 const t=(ko:string,eng:string)=>en?eng:ko;
 const ask=(question:string)=>({question});
 const previous=draft.manifest;
 const manifest:ManifestDraft=previous?structuredClone(previous):{pickup:[],delivery:[]};
 if(manifest.cargo&&fields.cargo&&manifest.cargo[1]!==fields.cargo[1])return ask(t('지금 보완 중인 품목부터 마칠까요? 다른 품목이면 계약 번호로 다시 시작해 주세요.','Finish the current commodity or restart with the receipt number.'));
 const knownGoods=job.shipments.map(r=>r.cargo).filter(c=>c.some(Boolean));
 manifest.cargo=fields.cargo??manifest.cargo??(knownGoods.length&&knownGoods.every(c=>c[1]===knownGoods[0]![1])?knownGoods[0]:undefined);
 const free=manifest.sourceChoice===true&&/^(?:자유배분|자유롭게나눠|freeallocation)[.!]?$/.test(s);
 const numberOf=(n:string)=>numbers.get(n)??spokenScu(n);
 const valueAfter=new RegExp('^(?:에서|에다가|에|까지|으로|로|은|는|이랑|랑|하고|,|:)*'+quant+'(?=scu|units|에스|스큐|씩|을|를|싣|실|받|내|배송|하역|이야|이요|이고|그리고|and|to|from|[,./]|$)');
 for(const [i,h] of hits.entries()){
  const point=lastData!.locations.find(p=>p.id===h.id)!;
  if(point.type==='Planet'||point.type==='Moon')return ask(t((places[point.name]||point.name)+'의 시설 이름으로 말씀해 주세요.','Please name the facility on '+point.name+'.'));
  const before=s.slice(i?hits[i-1]!.end:0,h.start),after=s.slice(h.end,hits[i+1]?.start);
  let side:'pickup'|'delivery'|undefined;
  if(/^에서/.test(after)||/(?:from|pickup(?:at)?)$/.test(before))side='pickup';
  else if(/^(?:으로|로|에|까지|배송|하역)/.test(after)||/(?:to|deliver(?:to)?|dropoffat)$/.test(before))side='delivery';
  else if(manifest.pickup.some(p=>p.id===h.id))side='pickup';
  else if(manifest.delivery.some(p=>p.id===h.id))side='delivery';
  else if(/^(?:랑|와|과|하고|이랑)/.test(after)&&hits[i+1]){
   const tail=s.slice(hits[i+1]!.end);
   side=/^에서/.test(tail)?'pickup':/^(?:에|으로|로|까지)/.test(tail)?'delivery':undefined;
  }
  if(!side)return ask(t((places[point.name]||point.name)+'에서는 싣나요, 내리나요? 픽업은 “에서”, 배송은 “에”로 알려주세요.','Specify pickup or delivery for '+point.name+'.'));
  let stop=manifest[side].find(p=>p.id===h.id);
  if(!stop){stop={id:h.id,label:en?point.name:places[point.name]||point.name};manifest[side].push(stop);}
  const m=valueAfter.exec(after);
  if(m){const units=numberOf(m[1]!);if(!units||units>10000)return ask(t('거점별 수량을 정수 SCU로 알려주세요.','Give whole SCU quantities per stop.'));stop.units=units;}
 }
 if(!hits.length&&manifest.waiting){
  const m=new RegExp('^(?:거기|거기에|그곳에)?'+quant+'(?:scu|에스씨유|스큐)?(?:이야|이요|요|이에요|내려|실어)?[.!]?$').exec(s);
  if(m){const value=numberOf(m[1]!);if(value){manifest[manifest.waiting.side].find(p=>p.id===manifest.waiting!.id)!.units=value;delete manifest.waiting;}}
 }
 draft.manifest=manifest;
 return finishManifest(job,manifest,en,free);
}
export function fillSpokenReceipt(job:Job,input:string,draft:ReceiptConversation,en=false):{question:string;job?:Job;summary?:string}{
 const t=(ko:string,english:string)=>en?english:ko;
 const ask=(question:string)=>({question});
 let text=input.normalize('NFKC');
 if(/말고|아니고|아닌|아니라|대신|rather than|instead of/i.test(text))
  return ask(t('최종적으로 넣을 값만 말씀해 주세요.','Please give only the final value.'));
 const rowNumber=text.match(new RegExp(ordinalPattern+'\\s*(?:화물|품목|줄)|(?:row|shipment)\\s*(\\d+)','i'));
 if(rowNumber){
  const number=slot(rowNumber[1]||rowNumber[2]!);
  if(!number||number>Math.max(1,job.shipments.length))return ask(t('카드에 표시된 화물 줄 번호를 알려주세요.','Which shipment row on the card?'));
  if(draft.row!==undefined&&draft.row!==number-1){draft.fields={};delete draft.place;delete draft.region;delete draft.expected;}
  draft.row=number-1;text=text.replace(rowNumber[0],'');
 }
 const contextRows=draft.row===undefined?job.shipments:job.shipments.slice(draft.row,draft.row+1);
 const originalText=text;
 text=repairReceiptWords(text,{ports:placeAliases(),goods:goodsAliases,expected:draft.expected,
  pickup:new Set([...contextRows.map(r=>r.from),...(job.observedStops?.pickup??[])].map(canonicalLocationId)),
  delivery:new Set([...contextRows.map(r=>r.to),...(job.observedStops?.dropoff??[])].map(canonicalLocationId)),
  cargo:new Set(contextRows.map(r=>r.cargo[1]))});
 if(text!==originalText)draft.repaired=true;
 const s=key(text),fields={...draft.fields},found=mentions(s,goodsAliases,text);
 const hits=mentions(s,placeAliases(),text);
 if(hits.some(h=>hits.some(l=>l!==h&&l.start===h.start&&l.end===h.end&&l.id!==h.id)))
  return ask(t('같은 이름의 거점이 있어요. 정확한 시설 이름을 알려주세요.','Several stops match. Give the full facility name.'));
 if(rowNumber||s==='화물줄별로'||s==='byshipmentrow'){
  if(draft.manifest){delete draft.manifest;if(!rowNumber)return ask(t('화물 줄 번호와 픽업지·배송지 또는 수량을 알려주세요.','Give the shipment row number and its missing details.'));}
 }
 const clauses=text.split(/(?<!\d)[,，]|[,，](?!\d{3}\b)|[;；]|(?:그리고|그다음|다음은)|\band then\b/i).map(p=>p.trim()).filter(Boolean);
 if(!rowNumber&&clauses.length>1&&clauses.every(p=>mentions(key(p),placeAliases(),p).length===2)){
  const legs:Shipment[]=[];
  let item=fields.cargo??(job.shipments.length&&job.shipments.every(r=>r.cargo[1]===job.shipments[0]!.cargo[1])?job.shipments[0]!.cargo:undefined);
  for(const clause of clauses){
   const fresh={...job,shipments:[],reservations:undefined,mission:undefined};
   const parse=fillSpokenReceipt(fresh,clause,{fields:{cargo:item}},en);
   if(!parse.job)return ask(parse.question);
   const leg=parse.job.shipments[0]!;item=leg.cargo;legs.push({...leg,id:crypto.randomUUID()});
  }
  return applySpokenLanes(job,legs,en,id=>{
   const name=currentLocationData().locations.find(p=>p.id===id)?.name||id;
   return en?name:places[name]||name;
  });
 }
 if(new Set(found.map(h=>h.id)).size>1)return ask(t('품목별로 묶어서 알려주세요. 첫 품목은 어디서 얼마나 싣고 내리나요?','Give one commodity at a time. What are its pickups and deliveries?'));
 if(found[0])fields.cargo=goods.get(found[0].id);
 if(!rowNumber&&(draft.manifest||new Set(hits.map(h=>h.id)).size>=3))return readManifest(job,s,hits,fields,draft,en);
 const tagged:VoiceFields={};
 for(const [i,h] of hits.entries()){
  const before=s.slice(i?hits[i-1]!.end:0,h.start),after=s.slice(h.end,hits[i+1]?.start);
  const from=/^(?:에서|(?:이|가|은|는)?(?:출발|픽업|싣는곳|실을곳)|(?:들러서|들러)(?:싣|실|받))/.test(after)||/(?:픽업지|출발지|싣는곳|실을곳|from|pickup)(?:는|은|가|이)?$/.test(before);
  const to=/^(?:까지|으로|로|(?:이|가|은|는)?(?:도착|배송|목적지)|(?:가는|갈거|갈게|가야|갖다|내려|내리|내릴)|에(?!서))/.test(after)||/(?:배송지|목적지|도착지|내리는곳|내릴곳|to|destination)(?:는|은|가|이)?$/.test(before);
  const point=lastData?.locations.find(p=>p.id===h.id);
  const expectedRole=draft.expected==='from'||draft.expected==='to'?draft.expected:undefined;
  const role=from&&!to?'from':to&&!from?'to':hits.length===1?expectedRole:undefined;
  if(point&&(point.type==='Planet'||point.type==='Moon')){
   if(!role)return ask(t('그 천체에서 싣나요, 내리나요? 시설 이름도 함께 말씀해 주세요.','Is that the pickup or delivery? Include the facility name.'));
   (draft.region??={})[role]=point.id;
   continue;
  }
  if(role){
   if(tagged[role]&&tagged[role]!==h.id)return ask(t('한 화물 줄의 픽업지와 배송지를 알려주세요.','Give the pickup and delivery for one shipment.'));
   tagged[role]=h.id;
  }else if(hits.length===1)draft.place=h.id;
  else return ask(t('어디에서 싣고 어디로 배송하나요?','Which stop is the pickup and which is the delivery?'));
 }
 if(tagged.from||tagged.to)delete draft.place;
 if(draft.place&&!hits.length){
  if(/^(?:픽업|출발|적재|pickup)/i.test(s)){tagged.from=draft.place;delete draft.place;}
  else if(/^(?:배송|도착|목적|하역|delivery)/i.test(s)){tagged.to=draft.place;delete draft.place;}
 }
 for(const role of ['from','to'] as const){
  const region=draft.region?.[role],stop=tagged[role];
  if(!region||!stop)continue;
  const data=currentLocationData();
  let node=data.locations.find(p=>p.id===stop);
  while(node&&node.id!==region&&node.parentId){
   const parent=node.parentId;
   node=data.locations.find(p=>p.id===parent);
  }
  if(node?.id!==region)return ask(t('말씀하신 천체에 속한 시설 이름을 알려주세요.','Give a facility on the specified planet or moon.'));
  delete draft.region![role];
 }
 Object.assign(fields,tagged);
 // Units can be implicit in the common “티타늄 마흔 실을 거야”.
 const afterGoods=found[0]?s.slice(found[0].end):'';
 const cargoAmount=new RegExp('^(?:은|는)?'+amount+'(?:을|를|싣|실|가져|운송|배송|$)').exec(afterGoods);
 const amounts=[...s.matchAll(unitAmount)].map(m=>m[1]!);
 if(!amounts.length){const m=labelledAmount.exec(s)||cargoAmount||(draft.expected==='scu'?bareAmount.exec(s):null);if(m)amounts.push(m[1]!);}
 if(amounts.length){
  const values=amounts.map(n=>numbers.get(n)??spokenScu(n));
  if(!values[0]||new Set(values).size!==1)return ask(t('이 화물 한 줄의 수량을 정수 SCU로 알려주세요.','Give one whole SCU quantity for this shipment.'));
  fields.scu=values[0];
 }
 const empty:Shipment={id:job.id+'-voice-1',cargo:['',''],from:'',to:'',scu:0};
 const rows=job.shipments.length?job.shipments:[empty];
 const compatible=(r:Shipment)=>(!fields.from||!r.from||canonicalLocationId(r.from)===fields.from)&&
  (!fields.to||!r.to||canonicalLocationId(r.to)===fields.to)&&(!fields.scu||!r.scu||r.scu===fields.scu)&&
  (!fields.cargo||!r.cargo.some(Boolean)||r.cargo.some(c=>fields.cargo!.some(n=>key(n)===key(c))));
 const candidates=rows.filter((r,i)=>(draft.row===undefined||draft.row===i)&&compatible(r));
 if(!candidates.length)return ask(t('말씀하신 내용이 카드에 있는 정보와 달라요. 계약 번호와 빈 항목을 다시 알려주세요.','That conflicts with the receipt. Check the number and the missing field.'));
 draft.fields=fields;
 if(draft.place)return ask(t('방금 말한 거점은 픽업지인가요, 배송지인가요?','Is that stop the pickup or delivery?'));
 if(candidates.length!==1)return ask(t('어느 화물 줄인가요? “두 번째 화물”처럼 말씀해 주세요.','Which shipment row? Say “row 2”, for example.'));
 const row=candidates[0]!,index=rows.indexOf(row);draft.row=index;
 const next={...row,from:row.from||fields.from||'',to:row.to||fields.to||'',cargo:row.cargo.some(Boolean)?row.cargo:fields.cargo||row.cargo,scu:row.scu||fields.scu||0};
 if(next.from&&next.to&&canonicalLocationId(next.from)===canonicalLocationId(next.to)){draft.fields={};delete draft.expected;return ask(t('픽업지와 배송지가 같아요. 두 거점을 다시 알려주세요.','The stops coincide. Please repeat both stops.'));}
 const missing=!next.from?'from':!next.to?'to':!next.cargo.some(Boolean)?'cargo':!next.scu&&!job.reservations?.[next.to]?'scu':undefined;
 if(missing){
  draft.expected=missing;
  const region=(missing==='from'||missing==='to')&&draft.region?.[missing];
  if(region){
   const point=currentLocationData().locations.find(p=>p.id===region)!;
   return ask(t((places[point.name]||point.name)+'의 어느 항구나 시설에서 '+(missing==='from'?'실을까요?':'내릴까요?'),'Which facility on '+point.name+' is the '+(missing==='from'?'pickup?':'delivery?')));
  }
  return ask({from:t('어디에서 실을까요?','Where is the pickup?'),to:t('어디로 배송할까요?','Where is the delivery?'),cargo:t('어떤 품목인가요?','What commodity?'),scu:t('그 품목은 몇 SCU인가요?','How many SCU?')}[missing]);
 }
 if(next.from===row.from&&next.to===row.to&&next.scu===row.scu&&next.cargo===row.cargo)return ask(t('그 화물 줄에는 이미 정보가 모두 있어요.','That shipment already has all its details.'));
 const corrected=reviewReceipt(job,{...job,shipments:rows.map((r,i)=>i===index?next:r)},true);
 if(corrected.shipments.some(r=>!r.from||!r.to||!r.cargo.some(Boolean)))corrected.state='incomplete';
 return {job:corrected,question:''};
}
