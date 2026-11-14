import type {Draft,Job} from './mission-trial';
import type {FlightPlan,Resume} from './flight-types';
export type Progress = Resume & {index:number;jump:number;positionId:string;loadScu?:number;started:boolean;finished:boolean;completedStops?:number;distanceMeters?:number;startedAt:number|null;elapsed:number;since:number|null};
export type CompletedStep = {locationId:string;entryId?:string;name?:string;at:number;seconds:number|null;estimate:number|null};
export type Run = Progress & {history:Progress[];log?:CompletedStep[]};
export type ReceiptReview={observed:Job[];accepted:Record<string,string>;excluded:string[];log:{at:number;id:string;kind:string;action:'apply'|'keep'|'exclude';evidence:string}[]};
export type HeldDischarge={at:number;locationId:string;boxes:Resume['aboard']};
export type Session = {heldDischarges?:HeldDischarge[];receiptReview?:ReceiptReview;version:1;draft:Draft;plan:FlightPlan|null;run:Run|null};
export const sessionKey='stam.control-room.flight.v1';
export const fingerprint=(draft:Draft)=>JSON.stringify({...draft,reviewed:false,received:false});
export function blankRun(plan:FlightPlan):Run {return {index:0,jump:0,positionId:plan.startId,started:false,finished:false,startedAt:null,elapsed:0,since:null,picked:[],delivered:[],aboard:plan.initialPacking.boxes,history:[],log:[]};}
export function elapsed(run:Progress,now=Date.now()){return run.elapsed+(run.since===null?0:Math.max(0,now-run.since)/1000);}
export function startRun(run:Run,now=Date.now()):Run {return run.finished?run:{...run,started:true,startedAt:run.startedAt??now,since:run.since??now};}
export function pauseRun(run:Run,now=Date.now()):Run {return run.since===null?startRun(run,now):{...run,elapsed:elapsed(run,now),since:null};}
export function completeStep(plan:FlightPlan,run:Run,now=Date.now()):Run {
 if(!run.started||run.finished)return run;
 const visit=plan.visits[run.index];if(!visit)return run;
 const {history,log=[],...before}=run;
 const jump=visit.jumps[run.jump];
 const at=elapsed(run,now);
 const last=log.at(-1)?.at ?? (!run.completedStops && !run.index && !run.jump ? 0 : null);
 const step:CompletedStep={locationId:jump?.exitId??visit.locationId,entryId:jump?.entryId,
   at,seconds:last===null?null:Math.max(0,at-last),estimate:jump?null:visit.seconds};
 const next:Run={...run,history:[...history,structuredClone(before)],log:[...log,step]};
 if(jump)return {...next,jump:run.jump+1,positionId:jump.exitId};
 next.picked=[...new Set([...run.picked,...visit.events.filter(e=>e.type==='pickup').map(e=>e.shipmentId)])];
 next.delivered=[...new Set([...run.delivered,...visit.events.filter(e=>e.type==='delivery').map(e=>e.shipmentId)])];
 next.completedStops=(run.completedStops||0)+1;next.distanceMeters=(run.distanceMeters||0)+(visit.leg.meters||0);
 next.loadScu=visit.load;next.aboard=visit.packing.boxes;next.positionId=visit.locationId;next.index++;next.jump=0;
 if(next.index===plan.visits.length){next.finished=next.aboard.length===0;next.elapsed=elapsed(run,now);next.since=null;}
 return next;
}
export function undoStep(run:Run,now=Date.now()):Run {
 const previous=run.history.at(-1);if(!previous)return run;
 // Undo changes cargo/progress, never rewinds the clock or silently resumes a paused timer.
 const paused = run.finished ? previous.since === null : run.since === null;
 return {...previous,elapsed:elapsed(run,now),since:paused ? null : now,history:run.history.slice(0,-1),log:run.log?.slice(0,-1)};
}
export function contextOf(run:Run){return {startId:run.positionId,resume:{picked:run.picked,delivered:run.delivered,aboard:run.aboard}};}
export function adoptReplan(run:Run,plan?:FlightPlan):Run {return {...run,index:0,jump:0,history:[],...(plan&&!plan.visits.length?{finished:run.aboard.length===0,elapsed:elapsed(run),since:null}:{})};}
export function decodeSession(text:string|null):Session|null {
 if(!text)return null;
 const s=JSON.parse(text) as Session;
 if(s.version!==1||!Array.isArray(s.draft?.jobs)||!['operator','navigator'].includes(s.draft.partner))throw Error('저장된 운송 형식을 확인할 수 없습니다.');
 if(s.plan){
  if(!s.plan.points.length||!s.plan.ship.grids.length||!s.run)throw Error('저장된 항로가 불완전합니다.');
  const r=s.run;if(!Number.isInteger(r.index)||r.index<0||r.index>s.plan.visits.length||!Array.isArray(r.history)||!Array.isArray(r.aboard)||!Array.isArray(r.picked)||!Array.isArray(r.delivered)||!r.positionId)throw Error('저장된 운항 진행을 확인할 수 없습니다.');
 }
 return s;
}
