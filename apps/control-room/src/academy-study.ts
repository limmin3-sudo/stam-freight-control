import {practiceDraft,practiceJobs} from './guide-practice.ts';
import {calculateFlight} from './flight-engine.mjs';
import type {FlightPlan} from './flight-types';
export type StudyRequest={ids:string[];ship:string};
export function academyCase(){return practiceJobs().map((job,i)=>({...job,title:[`사례 계약 ${i+1}`,`Case contract ${i+1}`] as [string,string]}));}
const clean=(plan:FlightPlan):FlightPlan=>({...plan,visits:plan.visits.map(v=>({...v,events:v.events.map(({type,shipmentId,missionId,commodity,scu,containers,estimatedBoxes,deliveryId})=>({type,shipmentId,missionId,commodity,scu,containers,estimatedBoxes,deliveryId}))}))});
export function compareAcademyCase(request:StudyRequest){
 const all=academyCase(),jobs=all.filter(j=>request.ids.includes(j.id));if(!jobs.length||jobs.length!==new Set(request.ids).size||request.ids.length!==new Set(request.ids).size)throw Error('selection');
 const draft={...practiceDraft(),ship:request.ship,jobs,received:true,reviewed:true};
 // Isolated study data only. This function has no storage or active-flight writes.
 const results:{id:'combined'|'separate';plan:FlightPlan|null;error:string|null}[]=[];
 for(const id of ['combined','separate'] as const)try{
  if(id==='combined'){results.push({id,plan:calculateFlight(draft),error:null});continue;}
  let start=draft.start,elapsed=0;const plans:FlightPlan[]=[];
  for(const job of jobs){const plan=calculateFlight({...draft,start,jobs:[job]});plans.push({...plan,visits:plan.visits.map(v=>({...v,elapsed:v.elapsed+elapsed}))});elapsed+=plan.seconds;start=plan.visits.at(-1)?.locationId??start;}
  const first=plans[0]!;results.push({id,error:null,plan:{...first,visits:plans.flatMap(p=>p.visits),seconds:elapsed,peak:Math.max(...plans.map(p=>p.peak)),points:[...new Map(plans.flatMap(p=>p.points.map(x=>[x.id,x] as const))).values()],warnings:[...new Set(plans.flatMap(p=>p.warnings))]}});
 }catch(e){results.push({id,plan:null,error:e instanceof Error?e.message:'calculation'});}
 for(const r of results)if(r.plan)r.plan=clean(r.plan);
 return {total:jobs.flatMap(j=>j.shipments).reduce((n,s)=>n+s.scu,0),contracts:jobs.length,results};
}
export type StudyResult=ReturnType<typeof compareAcademyCase>;
