// Korean names (user Korean patch) and common nicknames → English location names in the data.
// A fuller table can be generated from the Korean patch's global.ini into data/ko-names.json
// ({"한글 이름":"English Name", …}); it is merged in at start-up when present.
export const KO_NAMES={
 // Stanton planets / numbering
 '허스턴':'Hurston','스탠턴1':'Hurston','스탠턴i':'Hurston','크루세이더':'Crusader','스탠턴2':'Crusader','스탠턴ii':'Crusader','아크코프':'ArcCorp','아크코퍼레이션':'ArcCorp','스탠턴3':'ArcCorp','스탠턴iii':'ArcCorp','마이크로텍':'microTech','마이크로테크':'microTech','스탠턴4':'microTech','스탠턴iv':'microTech',
 // Stanton moons
 '아리엘':'Arial','애리얼':'Arial','애버딘':'Aberdeen','에버딘':'Aberdeen','마그다':'Magda','막다':'Magda','이타':'Ita','셀린':'Cellin','데이마':'Daymar','데이마르':'Daymar','옐라':'Yela','리리아':'Lyria','왈라':'Wala','칼리오페':'Calliope','클리오':'Clio','유터피':'Euterpe','에우테르페':'Euterpe',
 // Stanton cities, spaceports, stations
 '로빌':'Lorville','로어빌':'Lorville','로르빌':'Lorville','티사우주공항':'Lorville','티사스페이스포트':'Lorville','티사우주항':'Lorville','teasaspaceport':'Lorville','에어리어18':'Area18','에어리어열여덟':'Area18','라이커메모리얼우주공항':'Area18','rikermemorialspaceport':'Area18','오리슨':'Orison','어거스트던로우우주공항':'Orison','augustdunlowspaceport':'Orison','뉴배비지':'New Babbage','뉴배비지성간우주공항':'New Babbage','newbabbageinterstellarspaceport':'New Babbage',
 '에버러스하버':'Everus Harbor','에버러스항구':'Everus Harbor','에버루스하버':'Everus Harbor','세라핌정거장':'Seraphim Station','세라핌스테이션':'Seraphim Station','바이지니포인트':'Baijini Point','바이니포인트':'Baijini Point','베이지니포인트':'Baijini Point','포트트레슬러':'Port Tressler','트레슬러항구':'Port Tressler','그림헥스':'Grim HEX','그림핵스':'Grim HEX',
 // Gateways
 '스탠턴게이트웨이':'Stanton Gateway','파이로게이트웨이':'Pyro Gateway','닉스게이트웨이':'Nyx Gateway','테라게이트웨이':'Terra Gateway',
 // Pyro planets / numbering (Pyro II = Monox, III = Bloom, VI = Terminus)
 '파이로1':'Pyro I','파이로i':'Pyro I','파이로2':'Monox','파이로ii':'Monox','모녹스':'Monox','파이로3':'Bloom','파이로iii':'Bloom','블룸':'Bloom','파이로4':'Pyro IV','파이로iv':'Pyro IV','파이로5':'Pyro V','파이로v':'Pyro V','파이로5a':'Ignis','파이로va':'Ignis','파이로5b':'Vatra','파이로vb':'Vatra','파이로6':'Terminus','파이로vi':'Terminus','터미누스':'Terminus','테르미누스':'Terminus',
 // Pyro moons
 '이그니스':'Ignis','바트라':'Vatra','아디르':'Adir','페어로':'Fairo','푸에고':'Fuego','부르':'Vuur','뷔르':'Vuur',
 // Pyro sites
 '카나드뷰':'Canard View','마지막착륙지':'Last Landings','애쉬랜드':'Ashland','애시랜드':'Ashland','에쉬랜드':'Ashland','오비츄어리':'Orbituary','잭슨교환소':"Jackson's Swap",'부에노골짜기':'Bueno Ravine','부에노협곡':'Bueno Ravine','잭슨스스왑':"Jackson's Swap",'체크메이트':'Checkmate','오비추어리':'Orbituary','오비튜어리':'Orbituary','루인정거장':'Ruin Station','루인스테이션':'Ruin Station','엔드게임':'Endgame','패치시티':'Patch City','가스라이트':'Gaslight','쥐구멍':"Rat's Nest",'랫츠네스트':"Rat's Nest",'스타라이트서비스스테이션':'Starlight Service Station','메구미급유소':'Megumi Refueling','더들리앤도터스':'Dudley & Daughters','촐라의해변':"Chawla's Beach",'촐라스비치':"Chawla's Beach",
 // Nyx
 '레브스키':'Levski','레브스키정거장':'Levski','닉스1':'Nyx I','닉스2':'Nyx II','닉스3':'Nyx III'
};
// Translated Korean words inside site names → the English words used in the data, so
// "슈빈 채광 시설 SMCa-8" can be compared with "Shubin Mining Facility SMCa-8".
export const KO_TERMS=[['채광시설','Mining Facility'],['채광 시설','Mining Facility'],['채광구역','Mining Area'],['채광 구역','Mining Area'],['함선 폐기장','Breaker Yard'],['함선폐기장','Breaker Yard'],['폐기장','Breaker Yard'],['슈빈','Shubin'],['아크코프','ArcCorp'],['아크코퍼레이션','ArcCorp'],['노가드','Norgaard'],['브리오',"Brio's"],['브레오',"Brio's"],['선셋 메사','Sunset Mesa'],['선셋메사','Sunset Mesa'],['섈로우 필즈','Shallow Fields'],['섈로우필즈','Shallow Fields'],['스테이션','Station'],['시어스 캐니언',"Seer's Canyon"],['시어스캐니언',"Seer's Canyon"]];
export function translateKoTerms(s){let t=String(s||'');for(const [k,v] of KO_TERMS)t=t.split(k).join(' '+v+' ');return t.replace(/\s+/g,' ').trim();}

// Korean display names shown next to English place names (game Korean client spelling where known).
export const KO_DISPLAY={'Stanton':'스탠턴','Pyro':'파이로','Nyx':'닉스','Hurston':'허스턴','Crusader':'크루세이더','ArcCorp':'아크코프','microTech':'마이크로텍','Arial':'아리엘','Aberdeen':'애버딘','Magda':'마그다','Ita':'이타','Cellin':'셀린','Daymar':'데이마','Yela':'옐라','Lyria':'리리아','Wala':'왈라','Calliope':'칼리오페','Clio':'클리오','Euterpe':'유터피',
 'Lorville':'로빌','Area18':'에어리어18','Orison':'오리슨','New Babbage':'뉴 배비지','Everus Harbor':'에버러스 하버','Seraphim Station':'세라핌 스테이션','Baijini Point':'바이지니 포인트','Port Tressler':'포트 트레슬러','Grim HEX':'그림 헥스',
 'Stanton Gateway':'스탠턴 게이트웨이','Pyro Gateway':'파이로 게이트웨이','Nyx Gateway':'닉스 게이트웨이','Terra Gateway':'테라 게이트웨이',
 'Monox':'모녹스','Bloom':'블룸','Terminus':'터미누스','Ignis':'이그니스','Vatra':'바트라','Adir':'아디르','Fairo':'페어로','Fuego':'푸에고','Vuur':'부르',
 'Canard View':'카나드 뷰','Last Landings':'마지막 착륙지','Ashland':'애쉬랜드',"Jackson's Swap":'잭슨 교환소','Checkmate':'체크메이트','Orbituary':'오비츄어리','Ruin Station':'루인 스테이션','Endgame':'엔드게임','Patch City':'패치 시티','Gaslight':'가스라이트',"Rat's Nest":'쥐구멍','Starlight Service Station':'스타라이트 서비스 스테이션','Megumi Refueling':'메구미 급유소','Dudley & Daughters':'더들리 앤 도터스',"Chawla's Beach":'촐라의 해변',
 'Levski':'레브스키','Bueno Ravine':'부에노 골짜기','Sunset Mesa':'선셋 메사',"Seer's Canyon":'시어스 캐니언','HDMS-Norgaard':'HDMS-노가드',"Brio's Breaker Yard":'브리오 함선 폐기장'};
// English words inside data names → Korean client words, for names not in the table ("Shubin Mining Facility SMCa-8").
const EN_TERMS=[['Shallow Fields','섈로우 필즈'],['Mining Facility','채광 시설'],['Mining Area','채광 구역'],['Breaker Yard','함선 폐기장'],['Spaceport','우주공항'],['Gateway','게이트웨이'],['Station','스테이션'],['Shubin','슈빈'],['ArcCorp','아크코프'],['Hurston','허스턴'],['Crusader','크루세이더'],['microTech','마이크로텍']];
export function koName(l){if(!l)return '';const own=(l.aliases||[]).find(a=>/[가-힣]/.test(a));if(own)return own;if(KO_DISPLAY[l.name])return KO_DISPLAY[l.name];
 let t=' '+l.name+' ';for(const [en,ko] of EN_TERMS)t=t.split(' '+en+' ').join(' '+ko+' ');t=t.trim();
 // Only when every leftover Latin word is a code (SMCa-8, 056, CRU-L4); a half-translated name is worse than none.
 return /[가-힣]/.test(t)&&!t.split(/\s+/).some(w=>/^[A-Za-z'’&]+$/.test(w)&&/[a-z]/.test(w))?t:'';}
export const placeLabel=l=>{if(!l)return '';const k=koName(l);return k&&k!==l.name?`${l.name} (${k})`:l.name;};

export const norm=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');
let extra={};
export async function loadKoNames(url='./data/ko-names.json'){try{const r=await fetch(url);if(r.ok){const j=await r.json();extra=Object.fromEntries(Object.entries(j).map(([k,v])=>[norm(k),v]));}}catch{}return Object.keys(extra).length;}
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
