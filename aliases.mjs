// Korean names (user Korean patch) and common nicknames → English location names in the data.
// A fuller table can be generated from the Korean patch's global.ini into data/ko-names.json
// ({"한글 이름":"English Name", …}); it is merged in at start-up when present.
export const KO_NAMES={
 // Stanton planets / numbering
 '허스턴':'Hurston','스탠턴1':'Hurston','스탠턴i':'Hurston','크루세이더':'Crusader','스탠턴2':'Crusader','스탠턴ii':'Crusader','아크코프':'ArcCorp','아크코퍼레이션':'ArcCorp','스탠턴3':'ArcCorp','스탠턴iii':'ArcCorp','마이크로텍':'microTech','마이크로테크':'microTech','스탠턴4':'microTech','스탠턴iv':'microTech',
 // Stanton moons
 '아리엘':'Arial','애리얼':'Arial','애버딘':'Aberdeen','에버딘':'Aberdeen','마그다':'Magda','막다':'Magda','이타':'Ita','셀린':'Cellin','데이마':'Daymar','데이마르':'Daymar','옐라':'Yela','리리아':'Lyria','왈라':'Wala','칼리오페':'Calliope','클리오':'Clio','유터피':'Euterpe','에우테르페':'Euterpe',
 // Stanton cities, spaceports, stations
 '로빌':'Lorville','로어빌':'Lorville','로르빌':'Lorville','티사우주공항':'Lorville','teasaspaceport':'Lorville','에어리어18':'Area18','에어리어열여덟':'Area18','라이커메모리얼우주공항':'Area18','rikermemorialspaceport':'Area18','오리슨':'Orison','어거스트던로우우주공항':'Orison','augustdunlowspaceport':'Orison','뉴배비지':'New Babbage','뉴배비지성간우주공항':'New Babbage','newbabbageinterstellarspaceport':'New Babbage',
 '에버러스하버':'Everus Harbor','에버러스항구':'Everus Harbor','에버루스하버':'Everus Harbor','세라핌정거장':'Seraphim Station','세라핌스테이션':'Seraphim Station','바이지니포인트':'Baijini Point','바이니포인트':'Baijini Point','베이지니포인트':'Baijini Point','포트트레슬러':'Port Tressler','트레슬러항구':'Port Tressler','그림헥스':'Grim HEX','그림핵스':'Grim HEX',
 // Gateways
 '스탠턴게이트웨이':'Stanton Gateway','파이로게이트웨이':'Pyro Gateway','닉스게이트웨이':'Nyx Gateway','테라게이트웨이':'Terra Gateway',
 // Pyro planets / numbering (Pyro II = Monox, III = Bloom, VI = Terminus)
 '파이로1':'Pyro I','파이로i':'Pyro I','파이로2':'Monox','파이로ii':'Monox','모녹스':'Monox','파이로3':'Bloom','파이로iii':'Bloom','블룸':'Bloom','파이로4':'Pyro IV','파이로iv':'Pyro IV','파이로5':'Pyro V','파이로v':'Pyro V','파이로6':'Terminus','파이로vi':'Terminus','터미누스':'Terminus','테르미누스':'Terminus',
 // Pyro moons
 '이그니스':'Ignis','바트라':'Vatra','아디르':'Adir','페어로':'Fairo','푸에고':'Fuego','부르':'Vuur','뷔르':'Vuur',
 // Pyro sites
 '카나드뷰':'Canard View','마지막착륙지':'Last Landings','애쉬랜드':'Ashland','애시랜드':'Ashland','잭슨교환소':"Jackson's Swap",'잭슨스스왑':"Jackson's Swap",'체크메이트':'Checkmate','오비추어리':'Orbituary','오비튜어리':'Orbituary','루인정거장':'Ruin Station','루인스테이션':'Ruin Station','엔드게임':'Endgame','패치시티':'Patch City','가스라이트':'Gaslight','쥐구멍':"Rat's Nest",'랫츠네스트':"Rat's Nest",'스타라이트서비스스테이션':'Starlight Service Station','메구미급유소':'Megumi Refueling','더들리앤도터스':'Dudley & Daughters','촐라의해변':"Chawla's Beach",'촐라스비치':"Chawla's Beach",
 // Nyx
 '레브스키':'Levski','레브스키정거장':'Levski','닉스1':'Nyx I','닉스2':'Nyx II','닉스3':'Nyx III'
};
export const norm=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');
let extra={};
export async function loadKoNames(url='./data/ko-names.json'){try{const r=await fetch(url);if(r.ok){const j=await r.json();extra=Object.fromEntries(Object.entries(j).map(([k,v])=>[norm(k),v]));}}catch{}return Object.keys(extra).length;}
// Find the most specific location mentioned in free text (English or Korean). Longer matches win,
// so "파이로 VI의 카나드 뷰" resolves to Canard View rather than Terminus.
export function matchLocation(text,locations,{system=null}={}){const n=norm(text);if(!n)return null;const pool=system?locations.filter(l=>l.system===system):locations;let best=null,bestLen=0;
 // A specific site (station, outpost, city) beats the planet named next to it; then the longer match wins.
 const rank=l=>(['Planet','Moon','Star'].includes(l.type)?0:1000);
 const consider=(len,name)=>{const hits=pool.filter(l=>l.name===name);if(!hits.length)return;const score=len+rank(hits[0]);if(score<=bestLen)return;best=hits[0];bestLen=score;};
 for(const [k,v] of Object.entries({...KO_NAMES,...extra}))if(n.includes(norm(k)))consider(norm(k).length,v);
 for(const l of pool){const k=norm(l.name);if(k.length>=4&&n.includes(k))consider(k.length+.5,l.name);}
 if(!best&&n.length>=2){const starts=pool.filter(l=>norm(l.name).startsWith(n));if(starts.length)best=starts.sort((a,b)=>a.name.length-b.name.length)[0];}
 return best;}
