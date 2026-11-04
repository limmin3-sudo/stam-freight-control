// Public component values and user planning overrides; never live equipped-item telemetry.
export const PERFORMANCE_KEY='vh-ship-performance';
const own=(obj,key)=>obj&&Object.hasOwn(obj,key)?obj[key]:undefined;
const positive=n=>Number.isFinite(n)&&n>0;
export function checkedDrive(value){
 if(!value||typeof value.name!=='string'||!value.name||value.name.length>120||!Number.isInteger(value.size)||value.size<1||value.size>10||!['maxSpeed','a1','a2'].every(k=>positive(value[k]))||!['engageSpeed','spool','cooldown'].every(k=>Number.isFinite(value[k])&&value[k]>=0)||value.engageSpeed>value.maxSpeed)throw Error('퀀텀 드라이브 성능을 확인해 주세요.');
 return Object.fromEntries(['name','size','maxSpeed','a1','a2','engageSpeed','spool','cooldown'].map(k=>[k,value[k]]));
}
export function catalogDrive(item,version){
 if(item?.type!=='QuantumDrive'||item.version!==version||typeof item.uuid!=='string'||!item.uuid||!/^https:\/\/api\.star-citizen\.wiki\/api\/items\//.test(item.link||''))throw Error('Drive source/version mismatch');
 const q=item.quantum_drive?.standard_jump;
 const drive=checkedDrive({name:item.name,size:item.size,maxSpeed:q?.drive_speed,a1:q?.stage_one_accel_rate,a2:q?.stage_two_accel_rate,engageSpeed:q?.engage_speed,spool:q?.spool_up_time,cooldown:q?.cooldown_time});
 return {id:item.uuid,...drive,grade:typeof item.grade==='string'?item.grade:null,class:typeof item.class==='string'?item.class:null,sourceUrl:item.link,version};
}
export function performanceKey(ship){return ship.performanceId||ship.id;}
export function driveChoices(data,catalog,ship){
 const profile=own(data.profiles,performanceKey(ship)),size=profile?.driveSize;
 if(!Number.isInteger(size)||catalog?.version!==data.version)return [];
 return (Array.isArray(catalog.drives)?catalog.drives:[]).filter(d=>d.size===size&&d.version===data.version).map(d=>({...d,...checkedDrive(d)}));
}
export function resolvePerformance(data,catalog,ship,override={}){
 if(!data?.profiles||!data?.drives)throw Error('함선 성능 자료를 불러오지 못했습니다.');
 if(!override||typeof override!=='object'||Array.isArray(override))throw Error('저장된 비행 설정을 확인해 주세요.');
 const profile=own(data.profiles,performanceKey(ship)),size=profile?.driveSize;
 const auto=own(data.drives,({1:'atlas',2:'hemera',3:'erebos'})[size])||profile?.factoryDrive||null;
 const mode=override.driveMode??(auto?'auto':'custom');
 if(!['auto','factory','custom','catalog'].includes(mode))throw Error('저장된 드라이브 선택을 확인해 주세요.');
 let drive=mode==='custom'?null:mode==='factory'?profile?.factoryDrive:mode==='catalog'?driveChoices(data,catalog,ship).find(d=>d.id===override.driveId):auto;
 if(mode!=='custom'&&(!drive||drive.size!==size))throw Error('선택한 드라이브가 이 함선 슬롯과 맞는지 확인해 주세요.');
 if(drive)drive={...checkedDrive(drive),...(drive.id?{id:drive.id}:{}),sourceUrl:drive.sourceUrl||profile?.sourceUrl||null,version:data.version};
 const number=(key,fallback,min,max)=>{const value=own(override,key)===undefined?fallback:override[key];if(value===null)return null;if(!Number.isFinite(value)||value<min||value>max)throw Error('저장된 비행 속도를 확인해 주세요.');return value;};
 const scm=number('scm',profile?.scm||null,1,10000),maxSpeed=number('maxSpeed',profile?.maxSpeed||null,1,10000);
 const approachSpeed=number('approachSpeed',scm?Math.round(scm*.65):null,1,10000),quantumSpeed=number('quantumSpeed',180000,1000,2000000);
 if(mode==='custom'&&!quantumSpeed)throw Error('평균 퀀텀 속도를 입력해 주세요.');
 return {driveMode:mode,drive,scm,maxSpeed,approachSpeed,quantumSpeed,sourceUrl:profile?.sourceUrl||null,version:data.version,slot:size||null,assumed:!profile||mode==='custom'};
}
export function checkedPerformance(value){
 if(value===undefined)return undefined;
 if(!value||typeof value!=='object')throw Error('비행 성능 설정을 확인해 주세요.');
 const result={drive:value.drive?checkedDrive(value.drive):null};
 for(const key of ['scm','maxSpeed','approachSpeed','quantumSpeed']){
  const n=value[key];if(n!==null&&(!positive(n)||n>(key==='quantumSpeed'?2000000:10000)))throw Error('비행 속도 설정을 확인해 주세요.');result[key]=n;
 }
 if(!result.drive&&!result.quantumSpeed)throw Error('퀀텀 비행 속도를 확인해 주세요.');return result;
}
export function createPerformanceStore(storage){
 const owner=()=>{try{return JSON.parse(storage?.getItem('vh-account-meta')||'null')?.uid||'guest';}catch{return 'guest';}};const initial=owner();
 function read(){if(owner()!==initial)throw Error('계정이 바뀌었습니다. 화면을 새로 열어 주세요.');const raw=storage?.getItem(PERFORMANCE_KEY);if(!raw)return {};let data;try{if(raw.length>900000)throw Error();data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error();}catch{throw Error('저장된 비행 설정을 읽지 못했습니다. 기존 기록을 먼저 확인해 주세요.');}return data;}
 return {get(ship){return own(read(),performanceKey(ship))??{};},save(ship,value){const data=read();if(value===null)delete data[performanceKey(ship)];else Object.defineProperty(data,performanceKey(ship),{value,enumerable:true,writable:true,configurable:true});const raw=JSON.stringify(data);if(raw.length>900000)throw Error('비행 설정 저장 공간이 부족합니다.');try{if(!storage)throw Error();storage.setItem(PERFORMANCE_KEY,raw);}catch{throw Error('비행 설정을 저장하지 못했습니다. 이전 설정을 유지합니다.');}}};
}
