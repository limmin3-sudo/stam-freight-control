import locations from '../../../data/locations.json' with {type:'json'};
import type {Draft,Job} from './mission-trial';
// User-confirmed Hull B itinerary. Source: route-optimization.test.mjs and
// WORKLOG-2026-10-30. Only resolved quantities are included; no private log IDs.
const place=(name:string)=>{const p=locations.locations.find(p=>p.name===name);if(!p)throw Error('Practice location unavailable: '+name);return p.id;};
type Row=readonly [number,string,string];
const routes:readonly (readonly Row[])[]=[
 [[2,'HDMS-Norgaard','Sunset Mesa'],[1,"Brio's Breaker Yard",'Sunset Mesa'],[4,'Shubin Mining Facility SMCa-8','Sunset Mesa'],[2,'ArcCorp Mining Area 056','Sunset Mesa']],
 [[16,'CRU-L4 Shallow Fields Station',"Seer's Canyon"],[8,'CRU-L4 Shallow Fields Station',"Seer's Canyon"],[16,'CRU-L4 Shallow Fields Station','Ashland'],[4,'CRU-L4 Shallow Fields Station','Ashland'],[4,'CRU-L4 Shallow Fields Station','Ashland']],
 [[2,'Grim HEX','Sunset Mesa'],[1,'Grim HEX',"Seer's Canyon"],[1,'Grim HEX',"Seer's Canyon"],[1,'Grim HEX','Ashland'],[1,'Grim HEX','Ashland']],
 [[64,'Orison','Gaslight'],[64,'Orison','Orbituary']],
 [[4,'Lorville','Sunset Mesa']],
 [[32,'Orison','Sunset Mesa'],[32,'Orison','Sunset Mesa'],[20,'Orison','Sunset Mesa'],[32,'Orison','Bueno Ravine'],[32,'Orison','Bueno Ravine'],[20,'Orison','Bueno Ravine']],
];
export function practiceJobs():Job[]{return routes.map((rows,index)=>({id:`practice-${index+1}`,title:[`연습 계약 ${index+1}`,`Practice contract ${index+1}`],pay:0,rewardUnknown:true,
 shipments:rows.map(([scu,from,to],n)=>({id:`practice-${index+1}-${n+1}`,cargo:['연습 화물','Practice freight'],scu,from:place(from),to:place(to)}))}));}
export function practiceDraft():Draft{return {received:false,jobs:[],start:place('Orison'),ship:'misc-hull-b',partner:'navigator',partnerSelected:true,reviewed:false,allowUpperBounds:false,locationEdits:[]};}
