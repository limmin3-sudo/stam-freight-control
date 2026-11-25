import {jamo,typoDistance} from '../../../aliases.mjs';

const indexes=new WeakMap();
function indexFor(aliases){
 let index=indexes.get(aliases);
 if(index)return index;
 index=new Map();
 for(const alias of aliases){
  const sound=jamo(alias.word);
  if(sound.length<4||sound.length>40||/\d/.test(sound))continue;
  if(!index.has(sound.length))index.set(sound.length,[]);
  index.get(sound.length).push({...alias,sound});
 }
 indexes.set(aliases,index);
 return index;
}

// Compare whole names in a place or cargo slot. A short substring of a damaged sentence
// is insufficient evidence. Names with digits require exact recognition.
function nearest(raw,aliases,preferred){
 const spelling=raw.toLowerCase().replace(/\s+/g,'');
 if(!/^(?:[가-힣]{3,16}|[a-z]{4,32})$/.test(spelling))return null;
 const sound=jamo(spelling),index=indexFor(aliases),matches=new Map();
 for(let length=sound.length-2;length<=sound.length+2;length++)for(const candidate of index.get(length)||[]){
  if(candidate.word===spelling)return {word:raw};
  const limit=preferred.has(candidate.id)&&sound.length>=9?2:1;
  if(Math.abs(sound.length-length)>limit)continue;
  const distance=typoDistance(sound,candidate.sound);
  if(distance>limit)continue;
  const previous=matches.get(candidate.id);
  if(!previous||distance<previous.distance)matches.set(candidate.id,{...candidate,distance});
 }
 const ranked=[...matches.values()].sort((a,b)=>a.distance-b.distance);
 if(!ranked.length)return null;
 if(ranked[1]?.distance===ranked[0].distance)return {ambiguous:true};
 return {word:ranked[0].word};
}

export function repairReceiptWords(text,{ports,goods,pickup,delivery,cargo,expected}){
 const spans=[];
 function suffix(end,kind){
  const start=text.slice(0,end).search(/[A-Za-z가-힣]+(?:\s+[A-Za-z가-힣]+){0,2}$/);
  if(start<0)return;
  const words=[...text.slice(start,end).matchAll(/[A-Za-z가-힣]+/g)];
  const aliases=kind==='cargo'?goods:ports;
  const preferred=kind==='from'?pickup:kind==='to'?delivery:cargo;
  for(const word of words){
   const offset=start+word.index;
   if(offset>0&&/[A-Za-z가-힣0-9]/.test(text[offset-1]))continue;
   const match=nearest(text.slice(offset,end),aliases,preferred);
   if(!match)continue;
   if(match.word&&match.word!==text.slice(offset,end))spans.push({offset,end,word:match.word});
   return;
  }
 }
 for(const m of text.matchAll(/(에서|으로|까지|에|로)(?=\s|[,.;!?]|$)/g))suffix(m.index,m[1]==='에서'?'from':'to');
 for(const m of text.matchAll(/\s+(?=(?:\d[\d,]*|[일이삼사오육칠팔구십백천]+|마흔|스물|스무|서른)\s*(?:scu|에스씨유|을|를|실|싣|$))/gi))suffix(m.index,'cargo');
 if(expected&&expected!=='scu'&&/^[가-힣a-z]+(?:\s+[가-힣a-z]+){0,2}$/i.test(text))suffix(text.length,expected);
 let end=text.length;
 for(const span of spans.sort((a,b)=>b.end-a.end)){
  if(span.end>end)continue;
  text=text.slice(0,span.offset)+span.word+text.slice(span.end);
  end=span.offset;
 }
 return text;
}
