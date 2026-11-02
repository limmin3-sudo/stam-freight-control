// Builds data/ko-hauling.json (Korean client names → English names used by the wiki mission data) from the Korean
// patch global.ini of 스타 시티즌 유저 한국어 프로젝트 (https://sc.galaxyhub.kr/, credit required, non-commercial).
// Only commodity and contractor names are extracted; the patch file itself is never committed.
// The patch has Korean text only, so commodities are linked through the wiki commodity keys
// (items_commodities_<key>) and contractors through their reputation/sender keys (<Name>_RepUI_Name, <Name>_From).
// Usage: node scripts/extract-ko-hauling.mjs <global.ini> [data/hauling-missions.json] [data/ko-hauling.json]
import fs from 'node:fs';
const [iniPath,dbPath='data/hauling-missions.json',outPath='data/ko-hauling.json']=process.argv.slice(2).filter(a=>!a.startsWith('--'));
if(!iniPath){console.error('사용법: node scripts/extract-ko-hauling.mjs <global.ini>');process.exit(1);}
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const hangul=/[가-힣]/;
const ini=new Map();
for(const line of fs.readFileSync(iniPath,'utf8').replace(/^﻿/,'').split(/\r?\n/)){const i=line.indexOf('=');if(i<1)continue;const key=line.slice(0,i).replace(/,P$/,'').trim(),val=line.slice(i+1).trim();if(!ini.has(key))ini.set(key,val);}
const db=JSON.parse(fs.readFileSync(dbPath,'utf8'));

// Commodity names: wiki name → wiki key(s) → items_commodities_<key> (keys compared without case or separators).
const goods=new Map(),loose=new Map(),typeOnly=new Map();
// Plural/singular and "type_" spellings differ between wiki keys and patch keys (ConstructionMaterialScrap ↔
// ConstructionMaterialsScraps, QuantumFuel ↔ type_quantumFuel), so an "s"-less form is a fallback.
const unS=s=>norm(s).replace(/s/g,'');
for(const [k,v] of ini){const m=k.match(/^items_commodities_(.+)$/i);if(!m||/_desc$/i.test(m[1])||!hangul.test(v)||v.length>30)continue;
 if(/^type_/i.test(m[1])){typeOnly.set(norm(m[1].slice(5)),v);continue;}goods.set(norm(m[1]),v);if(!loose.has(unS(m[1])))loose.set(unS(m[1]),v);}
const wiki=[];for(let page=1;page<10;page++){const r=await fetch(`https://api.star-citizen.wiki/api/commodities?page%5Bsize%5D=200&page%5Bnumber%5D=${page}`);if(!r.ok)throw Error('commodity index '+r.status);const j=await r.json();wiki.push(...j.data);if(page>=(j.meta?.last_page||1))break;}
const keysOf=new Map();for(const c of wiki){if(!keysOf.has(c.name))keysOf.set(c.name,[]);keysOf.get(c.name).push(c.key);}
// Names the patch keeps under other keys (checked against the in-game Korean text).
const EXTRA={'Ship Ammunition':'Hints_Ship_Ammo_Title','CryoPod':'Item_Name_Container_CryoPod_01'};
const names=[...new Set(db.missions.flatMap(m=>m.orders.map(o=>o[0])))].sort();
const commodities={},missing=[];
for(const name of names){let ko=EXTRA[name]?ini.get(EXTRA[name]):null;
 for(const key of keysOf.get(name)||[]){if(ko)break;const swapped=key.replace(/^(Ore|Raw)_(.+)$/i,'$2_$1');for(const k of [key,swapped,name]){if(goods.has(norm(k))){ko=goods.get(norm(k));break;}}}
 if(!ko&&goods.has(norm(name)))ko=goods.get(norm(name));
 if(!ko)for(const key of keysOf.get(name)||[]){ko=loose.get(unS(key))||typeOnly.get(norm(key));if(ko)break;}
 if(ko&&hangul.test(ko)){if(!commodities[ko])commodities[ko]=name;}else missing.push(name);}

// Contractors: wiki giver → reputation/sender keys whose name part matches the start of the giver name.
const givers=[...new Set(db.missions.map(m=>m.giver).filter(g=>g&&!/[<=]/.test(g)&&!/^MissionGiver_/.test(g)))];
const senders=[];for(const [k,v] of ini){const m=k.match(/^(.+?)_(RepUI_Name|From)$/i);if(m&&hangul.test(v)&&!/~mission/.test(v)&&v.length<=30)senders.push([norm(m[1]),v]);}
const companies={},unmatched=[];
// Contractors whose patch key does not share the English name (CitizensForPyro_RepUI_Name, CDF_RepUI_Name).
const COMPANY_KEYS={'Citizens for Prosperity':'CitizensForPyro_RepUI_Name','Citizens For Prosperity':'CitizensForPyro_RepUI_Name','Civilian Defense Force':'CDF_RepUI_Name'};
for(const [g,k] of Object.entries(COMPANY_KEYS)){const v=ini.get(k);if(v&&hangul.test(v)&&!companies[v])companies[v]=g;}
for(const g of givers){const n=norm(g);const hits=senders.filter(([k])=>k.length>=4&&(n.startsWith(k)||k.startsWith(n)));
 if(!hits.length){if(!COMPANY_KEYS[g])unmatched.push(g);continue;}for(const [,v] of hits)if(!companies[v])companies[v]=g;}

// Keep entries confirmed by hand earlier (known misreads, short client forms) unless the patch says otherwise.
let previous={};try{previous=JSON.parse(fs.readFileSync(outPath,'utf8'));}catch{}
for(const [k,v] of Object.entries(previous.commodities||{}))if(!commodities[k])commodities[k]=v;
for(const [k,v] of Object.entries(previous.companies||{}))if(!companies[k])companies[k]=v;
const out={_note:'한글 게임 화면 이름 → Star Citizen Wiki 미션 데이터 영어 이름. 출처: 스타 시티즌 유저 한국어 프로젝트 한글 패치(global.ini, https://sc.galaxyhub.kr/, 출처 표시·비영리 사용)에서 품목·발주처 이름만 추출. 갱신: node scripts/extract-ko-hauling.mjs <global.ini>',
 commodities:Object.fromEntries(Object.entries(commodities).sort((a,b)=>a[1].localeCompare(b[1]))),companies:Object.fromEntries(Object.entries(companies).sort((a,b)=>a[1].localeCompare(b[1])))};
fs.writeFileSync(outPath,JSON.stringify(out,null,1)+'\n');
console.log(JSON.stringify({commodities:Object.keys(out.commodities).length,hauledNames:names.length,missing:missing.length,companies:Object.keys(out.companies).length,givers:givers.length,unmatchedGivers:unmatched}));
if(process.argv.includes('--verbose'))console.log('missing:',missing.join(' | '));
