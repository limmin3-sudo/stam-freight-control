import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function normalize(raw,version){
 if(!Array.isArray(raw?.data)||!Array.isArray(raw?.connections)||!version)throw Error('지도 원본 또는 게임 버전 형식이 올바르지 않습니다.');
 const gateIds=new Set(raw.connections.flatMap(c=>[c.entry_uuid,c.exit_uuid]));
 const candidates=raw.data.filter(l=>['stanton','pyro','nyx'].includes(l.system)&&l.uuid&&(!l.hidden||gateIds.has(l.uuid))&&l.type!=='unknown'&&[l.x,l.y,l.z].every(Number.isFinite));
 const groups=new Map();for(const l of candidates){const key=l.system+':'+l.uuid;const list=groups.get(key)||[];list.push(l);groups.set(key,list);}
 const locations=[];let ambiguous=0;
 for(const [id,ls] of groups){const unique=[...new Map(ls.map(l=>[[l.x,l.y,l.z].join(','),l])).values()];if(unique.length>1){ambiguous++;continue;}const l=ls[0];locations.push({id,uuid:l.uuid,name:l.name,system:l.system,type:l.type,parentId:l.parent_uuid?l.system+':'+l.parent_uuid:null,qt:l.qt_valid,position:[l.x,l.y,l.z].map(v=>Math.round(v*1000)/1000),isGateway:gateIds.has(l.uuid)});}
 const ids=new Set(locations.map(l=>l.id));
 const jumps=raw.connections.map(c=>({from:c.entry_system+':'+c.entry_uuid,to:c.exit_system+':'+c.exit_uuid})).filter(c=>ids.has(c.from)&&ids.has(c.to));
 return {meta:{source:'https://api.star-citizen.wiki/api/locations/positions',version,downloaded:'2026-10-30',units:'meters',attribution:'Star Citizen Wiki game data / Cloud Imperium Games',license:'https://starcitizen.tools/Star_Citizen_Wiki:DISCLAIMER',omittedAmbiguous:ambiguous,notes:'A source snapshot, not live navigation. Multi-position identifiers omitted; unavailable Nyx planets are map references only. Jump connections reflect this dataset.'},locations,jumps};
}
export function validateSnapshot(data,previous=null){
 if(!Array.isArray(data?.locations)||!data.locations.length||!Array.isArray(data.jumps)||!data.meta?.version)throw Error('빈 지도 또는 잘못된 지도 응답입니다.');
 const ids=new Set();for(const l of data.locations){if(!l.id||ids.has(l.id)||!l.name||!['stanton','pyro','nyx'].includes(l.system)||!Array.isArray(l.position)||l.position.length!==3||!l.position.every(n=>Number.isFinite(n)&&Math.abs(n)<1e15))throw Error('장소 ID·이름·좌표 검증에 실패했습니다.');ids.add(l.id);}
 for(const s of ['stanton','pyro','nyx'])if(!data.locations.some(l=>l.system===s))throw Error(s+' 행성계 데이터가 누락됐습니다.');
 if(!data.jumps.length||data.jumps.some(j=>!ids.has(j.from)||!ids.has(j.to)||j.from===j.to))throw Error('점프 연결 검증에 실패했습니다.');
 const before=new Map((previous?.locations||[]).map(l=>[l.id,l])),after=new Map(data.locations.map(l=>[l.id,l])),signature=l=>JSON.stringify([l.name,l.system,l.type,l.parentId,l.position,l.qt,l.isGateway]);
 const added=data.locations.filter(l=>!before.has(l.id)),changed=data.locations.filter(l=>before.has(l.id)&&signature(l)!==signature(before.get(l.id))),removed=[...before.values()].filter(l=>!after.has(l.id));
 if(previous){if(removed.length>Math.max(5,before.size*.2))throw Error('기존 장소가 20% 이상 사라졌습니다. 원본 확인 전에는 기존 배포를 유지합니다.');for(const j of previous.jumps||[])if(!data.jumps.some(k=>k.from===j.from&&k.to===j.to||k.from===j.to&&k.to===j.from))throw Error('기존 점프 연결이 사라졌습니다. 수동 확인이 필요합니다.');}
 return {comparedWith:previous?.meta?.version||null,added:added.length,changed:changed.length,removed:removed.length,addedNames:added.slice(0,20).map(l=>l.name),changedNames:changed.slice(0,20).map(l=>l.name),removedNames:removed.slice(0,20).map(l=>l.name)};
}
export async function downloadSnapshot(fetcher=fetch){
 const get=async url=>{const r=await fetcher(url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error('지도 데이터 요청 실패: '+r.status);return r.json();};
 const v=await get('https://api.star-citizen.wiki/api/game-versions/default');if(!v?.data?.code)throw Error('게임 버전을 확인하지 못했습니다.');
 const raw=await get('https://api.star-citizen.wiki/api/locations/positions?version='+encodeURIComponent(v.data.code));
 const after=await get('https://api.star-citizen.wiki/api/game-versions/default');if(after?.data?.code!==v.data.code)throw Error('다운로드 중 기본 게임 버전이 바뀌었습니다. 다음 갱신에서 재시도합니다.');
 const data=normalize(raw,v.data.code);data.meta.downloaded=new Date().toISOString().slice(0,10);data.meta.checkedAt=new Date().toISOString();return data;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 let previous=null;const previousUrl=process.argv[process.argv.indexOf('--previous-url')+1];
 const fallbackFile=process.argv.includes('--fallback-file')?process.argv[process.argv.indexOf('--fallback-file')+1]:null;
 if(process.argv.includes('--previous-url')){const r=await fetch(previousUrl,{signal:AbortSignal.timeout(60000)});
  // 새 Pages 경로의 첫 배포처럼 이전 배포가 아직 없을 때(404)만 저장소에 커밋된 기준 스냅샷과 비교한다.
  if(r.status===404&&fallbackFile){previous=JSON.parse(await fs.readFile(path.resolve(base,fallbackFile),'utf8'));console.log('이전 배포 없음(404) · 기준 스냅샷과 비교: '+fallbackFile);}
  else{if(!r.ok)throw Error('이전 배포를 확인하지 못했습니다: '+r.status);previous=await r.json();}
  validateSnapshot(previous);}
 else{try{previous=JSON.parse(await fs.readFile(path.join(base,'data/locations.json'),'utf8'));}catch{}}
 const data=await downloadSnapshot();data.meta.changes=validateSnapshot(data,previous);
 const target=path.join(base,'data/locations.json');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target+'.tmp',JSON.stringify(data));await fs.rename(target+'.tmp',target);
 const c=data.meta.changes,summary=`지도 ${data.meta.version}: ${data.locations.length}개 좌표 / ${data.jumps.length}개 점프 연결\n이전 배포 대비 추가 ${c.added} · 변경 ${c.changed} · 삭제 ${c.removed}\n`;
 console.log(summary);if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
}
