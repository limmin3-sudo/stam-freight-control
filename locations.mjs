export const LOCATION_KEY='sfc-location-overrides-v1';
export const SYSTEMS=['stanton','pyro','nyx'];
export const LOCATION_TYPES={Manmade:'우주 정거장',Outpost:'지상기지·전초기지',LandingZone:'도시·우주공항',PointOfInterest:'물류센터·기타 시설'};
const str=(s,max=160)=>String(s??'').trim().slice(0,max);
export function validateLocationEdit(raw){
 if(!raw||typeof raw!=='object')throw Error('장소 정보가 올바르지 않습니다.');
 const id=str(raw.id),name=str(raw.name),system=str(raw.system),type=str(raw.type);
 if(!/^[a-z0-9][a-z0-9:._-]{1,159}$/i.test(id)||!name||!SYSTEMS.includes(system)||!type)throw Error('장소 이름·행성계·유형을 확인하세요.');
 const position=raw.position===null?null:raw.position;
 if(position!==null&&(!Array.isArray(position)||position.length!==3||!position.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<1e15)))throw Error('좌표는 행성계 기준 X·Y·Z(m) 세 값이 필요합니다.');
 const aliases=Array.isArray(raw.aliases)?[...new Set(raw.aliases.map(s=>str(s,100)).filter(Boolean))].slice(0,20):[];
 return {id,name,system,type,position,aliases,parentId:raw.parentId?str(raw.parentId):null,qt:raw.qt===true,checkedVersion:str(raw.checkedVersion,100),source:str(raw.source,500),updatedAt:str(raw.updatedAt,40)||new Date().toISOString()};
}
export function parseLocationBackup(value){
 if(value?.format!=='sfc-locations-v1'||!Array.isArray(value.locations)||value.locations.length>1000)throw Error('장소 관리에서 내보낸 백업 파일을 선택하세요. 최대 1,000개 장소를 지원합니다.');
 const records=value.locations.map(validateLocationEdit),ids=new Set();for(const l of records){if(ids.has(l.id))throw Error('백업에 중복된 장소 ID가 있습니다.');ids.add(l.id);}return records;
}
export function readLocationEdits(storage=globalThis.localStorage){const raw=storage.getItem(LOCATION_KEY);return raw?parseLocationBackup(JSON.parse(raw)):[];}
export function locationBackup(records){return {format:'sfc-locations-v1',exportedAt:new Date().toISOString(),locations:records.map(validateLocationEdit)};}
export function mergeLocations(base,edits){
 const locations=new Map(base.locations.map(l=>[l.id,{...l}])),drafts=[];
 for(const raw of edits){const l=validateLocationEdit(raw),original=locations.get(l.id);if(original&&original.system!==l.system)throw Error(l.name+': 기존 장소의 행성계는 변경할 수 없습니다.');
  // A coordinate-less override must not fall back to an old coordinate silently.
  if(l.position===null){if(original?.isGateway)throw Error(l.name+': 점프 연결 지점에는 확인된 좌표가 필요합니다.');locations.delete(l.id);drafts.push(l);continue;}
  locations.set(l.id,{...original,...l,uuid:original?.uuid||l.id,isGateway:original?.isGateway||false,custom:true});
 }
 const ids=new Set(locations.keys());for(const l of locations.values()){if(l.parentId&&!ids.has(l.parentId))l.parentId=null;if(l.custom&&l.parentId&&locations.get(l.parentId).system!==l.system)throw Error(l.name+': 소속 천체의 행성계가 다릅니다.');}
 return {...base,locations:[...locations.values()],jumps:base.jumps.filter(j=>ids.has(j.from)&&ids.has(j.to)),drafts};
}
