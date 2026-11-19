// Builds data/stam-korean.json (English data name → Korean) from the STAM fleet official Korean patch.
// Only the place and commodity names this tool already uses are kept; the patch and the English game text
// are never committed. Patch and English text are joined by their shared localisation keys.
// Usage: node scripts/import-stam-korean.mjs <StarCitizenKoreanPatch-*.exe | korean global.ini> <english global.ini> [English build] [label]
import fs from 'node:fs';
const [patchPath,englishPath,englishBuildArg=null,label='STAM 함대 공식 한글패치']=process.argv.slice(2);
if(!patchPath||!englishPath){console.error('사용법: node scripts/import-stam-korean.mjs <패치 exe 또는 한글 global.ini> <영어 global.ini> [영어 빌드] [패치 이름]');process.exit(1);}

// The installer embeds its translation as one JSON object ({formatVersion, build, sourceSha256, count, complete, fullText}).
function readPatch(path){
 const bytes=fs.readFileSync(path);
 if(!/\.exe$/i.test(path))return {meta:{},text:bytes.toString('utf8')};
 const key=bytes.indexOf('"fullText"');if(key<0)throw Error('패치 exe에서 번역 데이터를 찾지 못했습니다.');
 const text=bytes.subarray(Math.max(0,key-4000)).toString('utf8');
 for(let i=text.indexOf('{');i>=0&&i<4000;i=text.indexOf('{',i+1)){
  let depth=0,inString=false;
  for(let j=i;j<text.length;j++){const c=text[j];
   if(inString){if(c==='\\')j++;else if(c==='"')inString=false;continue;}
   if(c==='"')inString=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){
    try{const o=JSON.parse(text.slice(i,j+1));if(typeof o.fullText==='string'){const {fullText,...meta}=o;return {meta,text:fullText};}}catch{}break;}
  }
 }
 throw Error('패치 exe의 번역 데이터를 해석하지 못했습니다.');
}
const parse=text=>{const kv=new Map();for(const line of text.replace(/^\uFEFF/,'').split(/\r?\n/)){if(line.startsWith(';'))continue;const i=line.indexOf('=');if(i<1)continue;kv.set(line.slice(0,i).split(',')[0].trim().toLowerCase(),line.slice(i+1).trim());}return kv;};

const patch=readPatch(patchPath),ko=parse(patch.text),en=parse(fs.readFileSync(englishPath,'utf8'));
const englishBuild=englishBuildArg;
const byEnglish=new Map();
for(const [k,v] of en){if(v.length>70||v.includes('\\n')||/(desc|_long|tooltip)/.test(k))continue;const n=v.toLowerCase();if(!byEnglish.has(n))byEnglish.set(n,[]);byEnglish.get(n).push(k);}
// The patch may append the canonical English name to a Korean place label.
// Keep the Korean label in Korean mode, including meaningful qualifiers.
function displayName(value, name){
 const suffix=value?.match(/\s*\(\s*([^()]+?)\s*\)\s*$/);
 return suffix && suffix[1].toLowerCase()===name.toLowerCase() ? value.slice(0,suffix.index).trim() : value;
}
const usable=v=>v&&/[가-힣]/.test(v)&&v.length<70&&!v.includes('\\n')&&!v.includes('~');

// Lower rank wins. Mission-location and commodity keys carry the names players see on contracts.
const placeRank=k=>/^(human_|hud_|area_name|shipselector|event_|mission_contractor|mission_client|item_name|vehicle_name|text_)|decal/.test(k)?null:/^mission_location_/.test(k)?0:/^(rr_|stanton|pyro|nyx|terra|collector_station|ui_)/.test(k)?1:2;
const goodRank=k=>/^(human_|hud_|area_name|shipselector|event_|text_|mg_)/.test(k)?null:/^items_commodities_(?!type_)/.test(k)?0:/^items_commodities_type_/.test(k)?1:/^mission_item_/.test(k)?2:/^mineabletype_/.test(k)?3:4;
// Keys for current catalogue entries introduced or renamed after the English reference build.
const additionalKeys=new Map(Object.entries({
 'Transit Point Glaciem Alpha':'nyx_transit_Glaciem_01',
 'Transit Point Glaciem Bravo':'nyx_transit_Glaciem_02',
 'Transit Point Glaciem Charlie':'nyx_transit_Glaciem_03',
 'H4-PBF Ammo Carrier':'item_Name_cds_combat_superheavy_backpack_01_01_01',
 'TH-01 Propulsor':'item_NameCarryable_2H_FL_MissionItem_prototype_ship_component_1_a',
 'Vendetta HMG':'item_Nameapar_hmg_ballistic_01',
}));
function translate(name,rank){
 const keyed=displayName(ko.get(additionalKeys.get(name)?.toLowerCase()),name);
 if(usable(keyed))return keyed;
 const options=[];for(const k of byEnglish.get(String(name).toLowerCase())||[]){const r=rank(k),v=rank===placeRank?displayName(ko.get(k),name):ko.get(k);if(r!==null&&usable(v))options.push({r,v});}
 if(!options.length)return null;const best=Math.min(...options.map(o=>o.r)),count=new Map();
 for(const o of options.filter(o=>o.r===best))count.set(o.v,(count.get(o.v)||0)+1);
 return [...count].sort((a,b)=>b[1]-a[1])[0][0];
}
const placeholder=n=>/^<=.*=>$/.test(n);
const locations=JSON.parse(fs.readFileSync('data/locations.json','utf8')).locations;
const missions=JSON.parse(fs.readFileSync('data/hauling-missions.json','utf8')).missions;
// Keep lookup keys for saved contracts and locations no longer present in the live catalogue.
const savedPlaceNames=[...additionalKeys.keys()].filter(name=>name.startsWith('Transit Point '));
const savedGoodNames=['CryoPod','CryoPod (Vanduul)', ...[...additionalKeys.keys()].filter(name=>!savedPlaceNames.includes(name))];
const places={},goods={};
for(const n of [...new Set([...savedPlaceNames,...locations.map(p=>p.name)])].sort()){if(placeholder(n))continue;const v=translate(n,placeRank);if(v)places[n]=v;}
for(const n of [...new Set([...savedGoodNames,...missions.flatMap(m=>m.orders.map(o=>o[0]))])].sort()){if(placeholder(n))continue;const v=translate(n,goodRank);if(v)goods[n]=v;}
const out={schema:1,source:label,patch:{build:patch.meta.build||null,count:patch.meta.count??ko.size},englishBuild,places,goods};
fs.writeFileSync('data/stam-korean.json',JSON.stringify(out,null,2)+'\n');
console.log({places:Object.keys(places).length,goods:Object.keys(goods).length,patchBuild:out.patch.build,englishBuild});
