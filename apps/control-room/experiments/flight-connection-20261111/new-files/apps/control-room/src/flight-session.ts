import type {Draft} from './mission-trial';
import type {FlightPlan,Resume} from './flight-types';
export type Progress = Resume & {index:number;jump:number;positionId:string;started:boolean;finished:boolean;startedAt:number|null;elapsed:number;since:number|null};
export type Run = Progress & {history:Progress[]};
export type Session = {version:1;draft:Draft;plan:FlightPlan|null;run:Run|null};
export const sessionKey='stam.control-room.flight.v1';
export const fingerprint=(draft:Draft)=>JSON.stringify({...draft,reviewed:false,received:false});
export function blankRun(plan:FlightPlan):Run {return {index:0,jump:0,positionId:plan.startId,started:false,finished:false,startedAt:null,elapsed:0,since:null,picked:[],delivered:[],aboard:plan.initialPacking.boxes,history:[]};}
export function elapsed(run:Progress,now=Date.now()){return run.elapsed+(run.since===null?0:Math.max(0,now-run.since)/1000);}
export function startRun(run:Run,now=Date.now()):Run {return run.finished?run:{...run,started:true,startedAt:run.startedAt??now,since:run.since??now};}
export function pauseRun(run:Run,now=Date.now()):Run {return run.since===null?startRun(run,now):{...run,elapsed:elapsed(run,now),since:null};}
export function completeStep(plan:FlightPlan,run:Run,now=Date.now()):Run {
 if(!run.started||run.finished)return run;
 const visit=plan.visits[run.index];if(!visit)return run;
 const {history,...before}=run;
 const next:Run={...run,history:[...history,structuredClone(before)]};
 const jump=visit.jumps[run.jump];
 if(jump)return {...next,jump:run.jump+1,positionId:jump.exitId};
 next.picked=[...new Set([...run.picked,...visit.events.filter(e=>e.type==='pickup').map(e=>e.shipmentId)])];
 next.delivered=[...new Set([...run.delivered,...visit.events.filter(e=>e.type==='delivery').map(e=>e.shipmentId)])];
 next.aboard=visit.packing.boxes;next.positionId=visit.locationId;next.index++;next.jump=0;
 if(next.index===plan.visits.length){next.finished=true;next.elapsed=elapsed(run,now);next.since=null;}
 return next;
}
export function undoStep(run:Run,now=Date.now()):Run {
 const previous=run.history.at(-1);if(!previous)return run;
 // Undo changes cargo/progress, never rewinds the clock or silently resumes a paused timer.
 return {...previous,elapsed:elapsed(run,now),since:run.since===null?null:now,history:run.history.slice(0,-1)};
}
export function contextOf(run:Run){return {startId:run.positionId,resume:{picked:run.picked,delivered:run.delivered,aboard:run.aboard}};}
export function adoptReplan(run:Run):Run {return {...run,index:0,jump:0,history:[]};}
export function decodeSession(text:string|null):Session|null {
 if(!text)return null;
 const s=JSON.parse(text) as Session;
 if(s.version!==1||!Array.isArray(s.draft?.jobs)||!['operator','navigator'].includes(s.draft.partner))throw Error('저장된 운송 형식을 확인할 수 없습니다.');
 if(s.plan){
  if(!s.plan.visits.length||!s.plan.points.length||!s.plan.ship.grids.length||!s.run)throw Error('저장된 항로가 불완전합니다.');
  const r=s.run;if(!Number.isInteger(r.index)||r.index<0||r.index>s.plan.visits.length||!Array.isArray(r.history)||!Array.isArray(r.aboard)||!Array.isArray(r.picked)||!Array.isArray(r.delivered)||!r.positionId)throw Error('저장된 운항 진행을 확인할 수 없습니다.');
 }
 return s;
}
