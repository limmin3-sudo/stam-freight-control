import {gameEn} from './i18n.mjs';
import AI from './data/ai-korean.json' with {type:'json'};
import {aiPlace} from './data/ai-korean-lexicon.mjs';
export const KO_NAMES=Object.fromEntries(Object.entries(AI.places).map(([en,ko])=>[ko.replace(/\s/g,''),en]));
Object.assign(KO_NAMES,{'마지막착륙장':'Last Landings','마지막착륙지':'Last Landings','브리오함선폐기장':"Brio's Breaker Yard",'브레오함선폐기장':"Brio's Breaker Yard",'티사우주공항':'Lorville','티사스페이스포트':'Lorville','teasaspaceport':'Lorville','로빌':'Lorville','로어빌':'Lorville'});
export const KO_DISPLAY=Object.fromEntries(Object.entries(KO_NAMES).map(([ko,en])=>[en,aiPlace(en)]));
export const KO_TERMS=[['채광 시설','Mining Facility'],['채광 구역','Mining Area'],['보안 초소','Security Post'],['연구 전초기지','Research Outpost'],['구호 대피소','Aid Shelter'],['비상 대피소','Emergency Shelter'],['데이터센터','DataCenter'],['정거장','Station'],['슈빈','Shubin'],['아크코프','ArcCorp']];
export function translateKoTerms(s){let out=String(s||'');for(const [ko,en]of KO_TERMS)out=out.split(ko).join(' '+en+' ');return out.replace(/\s+/g,' ').trim();}
export function koName(l){if(!l||gameEn)return '';return (l.aliases||[]).find(a=>/[가-힣]/.test(a))||extraDisplay[l.name]||aiPlace(l.name);}
export const placeLabel=l=>l?(koName(l)||l.name):'';
export const norm=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');
let extra=Object.fromEntries(Object.entries(KO_NAMES).map(([ko,en])=>[norm(ko),en])),extraDisplay=AI.places;
export async function loadAiNames(url='./data/ai-korean.json'){try{const r=await fetch(url);if(r.ok){const j=await r.json();extraDisplay=j.places||{};extra=Object.fromEntries(Object.entries(extraDisplay).map(([en,ko])=>[norm(ko),en]));}}catch{}return Object.keys(extra).length;}
// Find the most specific location mentioned in free text (English or Korean). Longer matches win,
// so "파이로 VI의 카나드 뷰" resolves to Canard View rather than Terminus.
export function matchLocation(text,locations,{system=null,fuzzy=false}={}){const query=norm(text),personal=locations.filter(l=>(!system||l.system===system)&&l.aliases?.some(a=>{const n=norm(a);return n===query||n.length>=4&&query.includes(n);}));if(personal.length===1)return personal[0];if(personal.length>1)return null;const exact=matchExact(text,locations,system);if(exact||!fuzzy)return exact;return fuzzyLocations(text,locations,{system,limit:1})[0]?.loc||null;}
function matchExact(text,locations,system){const n=norm(text);if(!n)return null;const pool=system?locations.filter(l=>l.system===system):locations;let best=null,bestLen=0;
 // A specific site (station, outpost, city) beats the planet named next to it; then the longer match wins.
 const rank=l=>(['Planet','Moon','Star'].includes(l.type)?0:1000);
 const consider=(len,name)=>{const hits=pool.filter(l=>l.name===name);if(!hits.length)return;const score=len+rank(hits[0]);if(score<=bestLen)return;best=hits[0];bestLen=score;};
 for(const [k,v] of Object.entries({...KO_NAMES,...extra}))if(n.includes(norm(k)))consider(norm(k).length,v);
 for(const l of pool){const k=norm(l.name);if(k.length>=4&&n.includes(k))consider(k.length+.5,l.name);}
 if(!best&&n.length>=2){const starts=pool.filter(l=>norm(l.name).startsWith(n));if(starts.length)best=starts.sort((a,b)=>a.name.length-b.name.length)[0];}
 return best;}

// ---- Fuzzy matching: typos and "sounds-like" Korean spellings ---------------------------------
// Korean input is turned into a coarse consonant skeleton (ㅂ/ㅍ/v/f → P, ㄱ/ㅋ/g/k → K, …) and compared with the
// same skeleton built from the English names, so 뉴배버지 → New Babbage, 에버러스 하바 → Everus Harbor,
// 그린 글레이드 → HUR-L1 Green Glade Station. Korean alias keys are also compared letter by letter (jamo),
// so small typos in translated names (마지막 착륙장) still resolve.
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ',JUNG='ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ',JONG=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const KC={'ㄱ':'K','ㄲ':'K','ㅋ':'K','ㄷ':'T','ㄸ':'T','ㅌ':'T','ㅂ':'P','ㅃ':'P','ㅍ':'P','ㅅ':'S','ㅆ':'S','ㅈ':'J','ㅉ':'J','ㅊ':'J','ㄹ':'L','ㅁ':'M','ㄴ':'N','ㅎ':'H','ㅇ':''};
const KF={'ㄱ':'K','ㄲ':'K','ㅋ':'K','ㄳ':'K','ㄺ':'K','ㄴ':'N','ㄵ':'N','ㄶ':'N','ㄷ':'T','ㅅ':'T','ㅆ':'T','ㅈ':'T','ㅊ':'T','ㅌ':'T','ㅎ':'T','ㄹ':'L','ㄼ':'L','ㄽ':'L','ㄾ':'L','ㅀ':'L','ㅁ':'M','ㄻ':'M','ㅂ':'P','ㅍ':'P','ㅄ':'P','ㄿ':'P','ㅇ':'Q'};
const KV={'ㅏ':'a','ㅑ':'a','ㅘ':'a','ㅓ':'e','ㅕ':'e','ㅝ':'o','ㅐ':'e','ㅔ':'e','ㅒ':'e','ㅖ':'e','ㅙ':'e','ㅞ':'e','ㅚ':'e','ㅗ':'o','ㅛ':'o','ㅜ':'u','ㅠ':'u','ㅡ':'','ㅣ':'i','ㅟ':'i','ㅢ':'i'};
const isHangul=c=>c>=0xAC00&&c<=0xD7A3;
export function jamo(s){let o='';for(const ch of String(s||'')){const c=ch.codePointAt(0);if(isHangul(c)){const i=c-0xAC00;o+=CHO[Math.floor(i/588)]+JUNG[Math.floor(i%588/28)]+JONG[i%28];}else if(/[\p{L}\p{N}]/u.test(ch))o+=ch.toLowerCase();}return o.replace(/[ㅐㅒㅖ]/g,'ㅔ');}
const KO_WORDS=[['우주정거장','스테이션'],['정거장','스테이션'],['우주공항','스페이스포트'],['공항','스페이스포트'],['항구','하버'],['전초기지','아웃포스트'],['게이트','게이트웨이']];
function koSound(s){s=String(s||'');for(const [a,b] of KO_WORDS)s=s.split(a).join(b);let o='';for(const ch of String(s||'')){const c=ch.codePointAt(0);if(isHangul(c)){const i=c-0xAC00;o+=KC[CHO[Math.floor(i/588)]]+KV[JUNG[Math.floor(i%588/28)]]+(KF[JONG[i%28]]||'');}else if(/[a-z]/i.test(ch))o+=ch;else o+=' ';}return o;}
function enSound(s){return String(s||'').toLowerCase().split(/[^a-z]+/).filter(Boolean).map(w=>{w=w.replace(/tch/g,'ch').replace(/ph/g,'f').replace(/ck/g,'k').replace(/qu/g,'k').replace(/wh/g,'w').replace(/x/g,'ks').replace(/(.)\1/g,'$1').replace(/ti(?=[aeiou])/g,'sh').replace(/ng$/,'Q').replace(/ng(?=[^aeiouy]|$)/g,'Q');
  const V='aeiouy';let o='';for(let i=0;i<w.length;i++){const c=w[i],n=w[i+1]||'',n2=w.slice(i,i+2);
   if(n2==='ch'){o+='J';i++;continue;}if(n2==='sh'||n2==='th'){o+='S';i++;continue;}if(n2==='gh'){i++;continue;}
   if(V.includes(c)){o+=c==='y'?(i===0?'':'i'):c;continue;}
   switch(c){case 'b':case 'p':case 'v':case 'f':o+='P';break;case 'd':case 't':o+='T';break;case 'k':case 'q':o+='K';break;
    case 'c':o+='eiy'.includes(n)?'S':'K';break;case 'g':o+='eiy'.includes(n)?'J':'K';break;case 'j':case 'z':o+='J';break;case 's':o+='S';break;
    case 'l':o+='L';break;case 'r':o+=n&&V.includes(n)?'L':'';break;case 'm':o+='M';break;case 'n':o+='N';break;case 'h':o+=(!n||!V.includes(n))?'':'H';break;case 'Q':o+='Q';break;default:break;}}
  return o;}).join(' ');}
const skel=s=>s.replace(/[^A-Z]/g,'').replace(/(.)\1+/g,'$1');
const vowels=s=>s.replace(/[^aeiou]/g,'');
function lev(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[n];}
// Best edit distance of `q` against any substring of `t` (ends are free).
function subLev(q,t){const m=q.length,n=t.length;if(!m)return 0;let p=new Array(n+1).fill(0);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(q[i-1]===t[j-1]?0:1));p=c;}return Math.min(...p);}
const TYPE_W={Planet:4,Moon:4,LandingZone:4,Manmade:3,Star:2,Outpost:2,PointOfInterest:1,Manmade_VisibleOnInteraction:1,Asteroid_ValidQT:0,Asteroid:-1,Anomaly:0,NavPoint:0};
const cache=new WeakMap();
function soundOf(l){let v=cache.get(l);if(!v){const e=enSound(l.name);v={sk:skel(e),vw:vowels(e),words:e.split(' ').map(skel).filter(Boolean)};cache.set(l,v);}return v;}
export function fuzzyLocations(text,locations,{system=null,limit=5}={}){const raw=String(text||'').trim();if(!raw)return [];const pool=system?locations.filter(l=>l.system===system):locations;const out=new Map();
 const add=(l,score)=>{if(!l)return;const s=score+(TYPE_W[l.type]??0)*.004;const prev=out.get(l.id);if(!prev||prev.score<s)out.set(l.id,{loc:l,score:s});};
 // 1) Korean alias keys, letter by letter (catches typos in translated names).
 const qj=jamo(raw).replace(/\s/g,'');if(qj.length>=4)for(const [k,v] of Object.entries({...KO_NAMES,...extra})){const kj=jamo(k);if(!/[ㄱ-ㅣ]/.test(kj))continue;const d=Math.min(lev(qj,kj),kj.length>qj.length?lev(qj,kj.slice(0,qj.length))+1:99),sc=1-d/Math.max(qj.length,Math.min(kj.length,qj.length+2));if(sc>=.72)for(const l of pool)if(l.name===v)add(l,sc);}
 // 2) Sounds-like match against English names (Korean or misspelt English input).
 const qe=/[가-힣]/.test(raw)?koSound(raw):enSound(raw),qs=skel(qe),qv=vowels(qe);
 if(qs.length>=2)for(const l of pool){const s=soundOf(l);if(!s.sk)continue;let sc=0;
  const full=1-lev(qs,s.sk)/Math.max(qs.length,s.sk.length);if(qs.length>=3||full===1)sc=full;
  if(qs.length>=3){const pre=1-lev(qs,s.sk.slice(0,qs.length))/qs.length;sc=Math.max(sc,pre*.93);}
  if(qs.length>=4){const sub=1-subLev(qs,s.sk)/qs.length;sc=Math.max(sc,sub*.9);}
  if(sc<(qs.length<=3?.92:.74))continue;let wb=0;for(let i=0;i<s.words.length&&!wb;i++){let acc='';for(let j=i;j<s.words.length;j++){acc=skel(acc+s.words[j]);if(acc===qs){wb=i===0?.05:.03;break;}if(acc.length>qs.length)break;}}sc+=wb;const vw=s.vw.length>qv.length+1&&full<1?s.vw.slice(0,qv.length):s.vw,vb=qv&&vw?(1-lev(qv,vw)/Math.max(qv.length,vw.length))*.08:0;add(l,sc+vb);}
 return [...out.values()].sort((a,b)=>b.score-a.score).slice(0,limit);}

// Ranked, explicit suggestions: native datalists cannot search Korean aliases of English values.
export function suggestLocations(text,locations,{limit=8}={}){
 const q=norm(text);if(!q)return [];const aliases=new Map();
 for(const [alias,name] of Object.entries({...KO_NAMES,...extra,...Object.fromEntries(Object.entries(KO_DISPLAY).map(([en,ko])=>[ko,en]))})){
  if(!aliases.has(name))aliases.set(name,[]);aliases.get(name).push(norm(alias));}
 const hits=[];
 for(const loc of locations){if(loc.type==='Star')continue;const names=[loc.name,...(loc.aliases||[]),...(aliases.get(loc.name)||[])].map(norm);let score=0;
  for(const name of names){if(name===q)score=Math.max(score,100);else if(name.startsWith(q))score=Math.max(score,80+q.length/name.length);else if(name.includes(q))score=Math.max(score,60+q.length/name.length);}
  if(score)hits.push({loc,score});}
 const seen=new Set(hits.map(h=>h.loc.id));if(q.length>=2)for(const h of fuzzyLocations(text,locations,{limit})){if(!seen.has(h.loc.id)){hits.push({loc:h.loc,score:h.score*40});seen.add(h.loc.id);}}
 return hits.sort((a,b)=>b.score-a.score||a.loc.name.localeCompare(b.loc.name)).slice(0,limit).map(h=>h.loc);
}
