// Builds data/ko-names.json ({한글 지명: English data name}) from the Korean patch global.ini of
// 스타 시티즌 유저 한국어 프로젝트 (https://sc.galaxyhub.kr/).
// Only place names are extracted; the patch file itself is never committed. Usage:
//   node scripts/extract-ko-names.mjs <global.ini> [data/locations.json] [data/ko-names.json]
// Credit the patch in README (출처 표시, 비영리 사용 조건).
import fs from 'node:fs';
const [ini,locs='data/locations.json',out='data/ko-names.json']=process.argv.slice(2);if(!ini){console.error('사용법: node scripts/extract-ko-names.mjs <global.ini>');process.exit(1);}
const norm=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');
const L=JSON.parse(fs.readFileSync(locs,'utf8')).locations;
const pairs=[];
for(const line of fs.readFileSync(ini,'utf8').replace(/^﻿/,'').split(/\r?\n/)){const i=line.indexOf('=');if(i<1)continue;const key=line.slice(0,i),val=line.slice(i+1).trim();
 if(!/^(Stanton|Pyro|Nyx|RR_|Terra|LZ_|Bloom|Monox)/i.test(key)||/_desc|Desc$/i.test(key))continue;
 const m=val.match(/^([^\[\]]*[가-힣][^\[\]]*?)\s*\[([^\]]+)\]$/);if(m)pairs.push({key,ko:m[1].trim(),en:m[2].trim()});}
const out2={},byLoc=new Map(),unmatched=[];
for(const p of pairs){const e=norm(p.en);let hits=L.filter(l=>norm(l.name)===e);if(!hits.length)hits=L.filter(l=>norm(l.name).includes(e)&&e.length>=4);
 if(hits.length===1){const l=hits[0];if(!byLoc.has(l.id))byLoc.set(l.id,{name:l.name,ko:p.ko,key:p.key});}else unmatched.push(p.en+(hits.length?`(${hits.length}곳)`:''));}
// Second pass: names without an English bracket ("아크콥 채광 구역 056", "라야리 델타나 연구 기지").
const T=[['아크콥','ArcCorp'],['허드','Hurston Dynamics'],['슈빈','Shubin'],['라야리','Rayari'],['채광 구역','Mining Area'],['채광 시설','Mining Facility'],['처리 센터','Processing Center'],['보안 초소','Security Post'],['연구 기지','Research Outpost'],['스테이션','Station'],['우주정거장','Station']];
for(const line of fs.readFileSync(ini,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/)){const i=line.indexOf('=');if(i<1)continue;const key=line.slice(0,i),val=line.slice(i+1).trim();
 if(!/^(Stanton|Pyro|Nyx)\w*_/i.test(key)||/_desc|Desc|_Short|_Long|_Title/i.test(key)||val.includes('[')||!/[가-힣]/.test(val)||val.length>30)continue;
 let en=val;for(const [k,v] of T)en=en.split(k).join(' '+v+' ');en=en.replace(/\s+/g,' ').trim();
 let hits=L.filter(l=>norm(l.name)===norm(en));
 if(!hits.length){const code=(val.match(/[A-Za-z0-9-]*\d[A-Za-z0-9-]*$/)||[''])[0];if(code.length>=3){const words=en.split(' ').filter(w=>/^[A-Z]/.test(w)&&w!==code);hits=L.filter(l=>norm(l.name).endsWith(norm(code))&&words.every(w=>norm(l.name).includes(norm(w))));}}
 if(hits.length===1&&!byLoc.has(hits[0].id))byLoc.set(hits[0].id,{name:hits[0].name,ko:val,key});}
for(const v of byLoc.values())out2[v.ko]=v.name;
// Official Korean cargo names (items_commodities_* plus hauling cargo shown under other keys) for typo correction.
const goods=new Set();
for(const line of fs.readFileSync(ini,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/)){const i=line.indexOf('=');if(i<1)continue;const key=line.slice(0,i).replace(/,P$/,''),val=line.slice(i+1).trim();
 if((/^items_commodities_/i.test(key)&&!/_desc|_type_/i.test(key)||/^(Hints_Ship_Ammo_Title|Item_Name_Container_CryoPod_01)$/.test(key))&&val&&val.length<=24&&!/[.\n\\]/.test(val))goods.add(val);}
const goodsOut=out.replace(/ko-names\.json$/,'ko-commodities.json');fs.writeFileSync(goodsOut,JSON.stringify([...goods].sort((a,b)=>a.localeCompare(b,'ko')),null,1)+'\n');console.log('공식 품목명',goods.size,'→',goodsOut);
fs.writeFileSync(out,JSON.stringify(Object.fromEntries(Object.entries(out2).sort((a,b)=>a[1].localeCompare(b[1]))),null,1)+'\n');
console.log('지명 후보',pairs.length,'| 지도와 연결',byLoc.size,'/',L.length);
if(process.env.VERBOSE)console.log('예시:',[...byLoc.values()].slice(0,12).map(v=>v.name+' = '+v.ko).join(' | '));
if(process.env.VERBOSE)console.log('연결 안 됨 예시:',unmatched.slice(0,15).join(', '));
if(process.env.VERBOSE){const miss=L.filter(l=>!byLoc.has(l.id)&&!['Asteroid'].includes(l.type));console.log('한글 없는 데이터 지명 예시:',miss.slice(0,15).map(l=>l.name+'('+l.type+')').join(', '));}
