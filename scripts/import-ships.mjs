// Add ships that are missing from data/ships.json from a SuperCargo cargoGrids.ts file (MIT, see
// vendor/SUPERCARGO-LICENSE.txt). Existing ships are never changed. Usage:
//   node scripts/import-ships.mjs <path/to/cargoGrids.ts>
// Rules: reference-only grids (autoLoad false) are skipped; a ship whose cargo comes only from optional
// modules is added as "(화물 모듈 장착 시)"; anything that does not fit the app's grid model is reported, not guessed.
import fs from 'node:fs/promises';
const file=process.argv[2];if(!file){console.error('usage: node scripts/import-ships.mjs <cargoGrids.ts>');process.exit(1);}
const root=new URL('../',import.meta.url),shipsUrl=new URL('data/ships.json',root),ships=JSON.parse(await fs.readFile(shipsUrl,'utf8'));
const upstream={};for(const m of (await fs.readFile(file,'utf8')).matchAll(/^ {2}("(?:[^"\\]|\\.)*"): (\{.*\}),?$/gm))upstream[JSON.parse(m[1])]=JSON.parse(m[2]);
// Snub craft without a quantum drive cannot fly the planned routes, so they are not offered.
const NO_QUANTUM=new Set(['Argo MPUV Cargo','Argo MPUV Tractor']);
const have=new Set(ships.map(s=>s.name)),ids=new Set(ships.map(s=>s.id)),SIZES=[1,2,4,8,16,24,32],added=[],skipped=[];
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
for(const [name,src] of Object.entries(upstream)){if(have.has(name))continue;if(NO_QUANTUM.has(name)){skipped.push(`${name}: 퀀텀 드라이브 없음(소형정)`);continue;}
 const loadable=src.grids.filter(g=>g.autoLoad!==false),base=loadable.filter(g=>!g.moduleId),grids=base.length?base:loadable;
 if(!grids.length){skipped.push(`${name}: 실을 수 있는 그리드 없음`);continue;}
 const bad=grids.filter(g=>!['w','h','l'].every(k=>Number.isInteger(g[k])&&g[k]>=1&&g[k]<=64)||g.floor&&g.floor!=='y-');
 if(bad.length){skipped.push(`${name}: 앱 그리드 형식과 다름(${bad.map(g=>g.name).join(', ')})`);continue;}
 const modules=!base.length;const id=slug(name)+(modules?'-modules':'');if(ids.has(id)){skipped.push(`${name}: ID 중복`);continue;}
 ships.push({id,name:modules?`${name} (화물 모듈 장착 시)`:name,source:'SuperCargo cargoGrids.ts (community reference)',sourceUrl:'https://github.com/AquatikJustice/SuperCargo/blob/main/src/shared/cargoGrids.ts',layout:src.layout,
  grids:grids.map(g=>({id:g.id,name:g.name,w:g.w,h:g.h,l:g.l,x:g.x,y:g.y,z:g.z,maxBoxSize:g.maxSize?Math.max(...SIZES.filter(s=>s<=g.maxSize)):32,rotation:Array.isArray(g.rot)?g.rot:[0,0,0]}))});
 ids.add(id);added.push(`${name}${modules?' (모듈)':''} ${grids.reduce((n,g)=>n+g.w*g.h*g.l,0)} SCU`);
 if(base.length&&base.length<loadable.length)skipped.push(`${name}: 선택 모듈 그리드 ${loadable.length-base.length}개는 넣지 않음(기본 장착 ${base.reduce((n,g)=>n+g.w*g.h*g.l,0)} SCU만)`);}
ships.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
await fs.writeFile(shipsUrl,JSON.stringify(ships,null,1)+'\n');
console.log(`추가 ${added.length}종\n`+added.join('\n'));if(skipped.length)console.log(`\n참고·제외\n`+skipped.join('\n'));
