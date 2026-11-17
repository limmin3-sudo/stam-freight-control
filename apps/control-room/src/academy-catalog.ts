import type {ArchiveRecord,MissionArchiveData} from './mission-archive-data.mjs';
export type AcademyMission={record:ArchiveRecord;company:string;systems:string[];legal:boolean;rankName:string};
export type AcademyFilters={rank:number;company:string;system:string;search:string;capacity:number;maxBox:number;includeInterstellar?:boolean};
export function academyMissions(data:MissionArchiveData):AcademyMission[]{
 return data.filter({}).filter(r=>/^Hauling(?:\b|\s*-)/i.test(r.type)).map(record=>{
  const fields=data.reference(record.ids[0]??record.id)?.fields??[],value=(key:string)=>fields.find(f=>f.key===key)?.value;
  const company=value('company'),systems=value('systems'),rankName=value('rankName');
  return {record,company:typeof company==='string'?company:record.giver,systems:Array.isArray(systems)?systems.filter((s):s is string=>typeof s==='string'):[],legal:value('illegal')===false,rankName:typeof rankName==='string'?rankName:''};
 });
}
export function filterAcademy(rows:AcademyMission[],o:AcademyFilters){
 if(!Number.isInteger(o.rank)||o.rank<0||o.rank>6||!Number.isFinite(o.capacity)||o.capacity<=0)return [];
 const search=o.search.trim().normalize('NFKC').toLowerCase();
 return rows.filter(({record:r,company,systems,legal})=>legal&&(o.includeInterstellar||!r.type.includes('Interstellar'))&&r.rank>=0&&r.rank<=o.rank&&(o.company==='all'||company===o.company)&&(o.system==='all'||systems.includes(o.system))&&r.quantity.known&&r.quantity.max!==null&&r.quantity.max<=o.capacity&&r.box.known&&r.box.max!==null&&r.box.max<=o.maxBox&&(!search||[r.title,company,...r.pickup,...r.dropoff,...r.orders.flatMap(v=>[v.name,v.label])].join(' ').normalize('NFKC').toLowerCase().includes(search))).sort((a,b)=>a.record.rank-b.record.rank||(a.record.quantity.max??Infinity)-(b.record.quantity.max??Infinity)||a.record.id.localeCompare(b.record.id));
}
const common=(sets:string[][])=>sets.length? [...new Set(sets[0])].filter(s=>sets.every(a=>a.includes(s))):[];
export function analyzeAcademySelection(rows:AcademyMission[],capacity:number){
 const known=rows.length>0&&rows.every(r=>r.record.quantity.known&&r.record.quantity.min!==null&&r.record.quantity.max!==null);
 const min=known?rows.reduce((n,r)=>n+r.record.quantity.min!,0):null,max=known?rows.reduce((n,r)=>n+r.record.quantity.max!,0):null;
 return {min,max,withinCapacity:max!==null&&max<=capacity,sameCompany:rows.length>0&&!!rows[0]!.company&&rows.every(r=>r.company===rows[0]!.company),pickup:common(rows.map(r=>r.record.pickup)),dropoff:common(rows.map(r=>r.record.dropoff))};
}
// Bounded reference suggestions, never live contract availability or a reputation/hour ranking.
export function academyPairs(rows:AcademyMission[],capacity:number){
 const candidates=rows.slice(0,60),pairs:{rows:AcademyMission[];analysis:ReturnType<typeof analyzeAcademySelection>}[]=[];
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
  const selected=[candidates[i]!,candidates[j]!],analysis=analyzeAcademySelection(selected,capacity);
  if(analysis.sameCompany&&analysis.withinCapacity&&(analysis.pickup.length||analysis.dropoff.length))pairs.push({rows:selected,analysis});
 }
 return pairs.sort((a,b)=>(Number(!!b.analysis.pickup.length)+Number(!!b.analysis.dropoff.length))-(Number(!!a.analysis.pickup.length)+Number(!!a.analysis.dropoff.length))||a.analysis.max!-b.analysis.max!).slice(0,6);
}
