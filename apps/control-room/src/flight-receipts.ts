import type {Draft,Job} from './mission-trial';
import type {Session,ReceiptReview} from './flight-session.ts';
import {adoptReplan,contextOf,elapsed} from './flight-session.ts';
import {calculateFlight,flightShipments} from './flight-engine.mjs';
import {receiptEvidence} from './receipt-cache.ts';

export type ReceiptAction='apply'|'keep'|'exclude';
export type ReceiptChange={id:string;before:Job;latest:Job;evidence:string;kind:'ended'|'conflict'|'changed';canApply:boolean;reason:string};
const emptyReview=():ReceiptReview=>({observed:[],accepted:{},excluded:[],log:[]});
export function receiptBaseline(draft:Draft,raw:Job[]):ReceiptReview{
 const observed=raw.filter(r=>draft.jobs.some(j=>j.signature&&j.id===r.id));
 return {...emptyReview(),observed,accepted:Object.fromEntries(observed.map(r=>[r.id,receiptEvidence(r)]))};
}
export function observeReceipts(session:Session,raw:Job[]):Session{
 if(!session.run?.started||session.run.finished)return session;
 const review=session.receiptReview||emptyReview(),observed=new Map(review.observed.map(r=>[r.id,r]));let changed=false;
 for(const r of raw){
  if(!session.draft.jobs.some(j=>j.signature&&j.id===r.id))continue;
  if(!observed.has(r.id)||receiptEvidence(observed.get(r.id)!)!==receiptEvidence(r)){observed.set(r.id,r);changed=true;}
 }
 // A rotated/truncated log lacking a contract is not evidence of cancellation.
 return changed?{...session,receiptReview:{...review,observed:[...observed.values()]}}:session;
}
function applyProblem(session:Session,before:Job,latest:Job):string{
 if(session.heldDischarges?.some(e=>e.boxes.some(b=>b.missionId===before.id)))return '이미 하역 확인한 취소 화물이 있습니다. 기존 제외 상태를 유지하고 새 수주 계약으로 확인하세요.';
 try{
  const simple=session.plan?.mode==='simple';
  const previous=flightShipments({...session.draft,jobs:[before]},simple,session.plan?.ship);
  const proposed=flightShipments({...session.draft,jobs:[latest]},simple,session.plan?.ship);
  const touched=new Set([...(session.run?.picked||[]),...(session.run?.delivered||[])]);
  const shape=(s:typeof previous[number])=>JSON.stringify({pickup:s.pickupId,dropoff:s.dropoffId,commodity:s.commodity,...(!simple?{scu:s.scu,boxes:s.boxes.map(b=>{const x=b as {size:number;boxId:string;_cargoShape?:string};return typeof b==='object'?{size:x.size,id:x.boxId,shape:x._cargoShape}:b;}),reservation:s.reservation}:{})});
  if(previous.some(s=>touched.has(s.id)&&shape(s)!==shape(proposed.find(n=>n.id===s.id)||{...s,pickupId:'missing'})))
   return '이미 처리한 화물의 수량·규격·거점이 달라 기존 기록과 바로 합칠 수 없습니다. 기존 내용을 유지하거나 게임에서 화물을 확인하세요.';
  return '';
 }catch{return '거점이나 수량이 미확인되어 최신 내용으로 계산할 수 없습니다. 기존 입력값을 유지하거나 새 로그에서 확인하세요.';}
}
export function pendingReceiptChanges(session:Session):ReceiptChange[]{
 if(!session.run?.started||session.run.finished||!session.plan)return [];
 return (session.receiptReview?.observed||[]).flatMap(latest=>{
  const before=session.draft.jobs.find(j=>j.id===latest.id);if(!before?.signature)return [];
  const evidence=receiptEvidence(latest),accepted=session.receiptReview?.accepted[latest.id];
  if(accepted===evidence||(!accepted&&latest.signature===before.signature&&!['ended','conflict'].includes(latest.state||'')))return [];
  const kind=latest.state==='ended'?'ended':latest.state==='conflict'?'conflict':'changed';
  const reason=kind==='conflict'?'수신 기록이 충돌합니다. 기존 운항 내용을 유지하고 새 로그를 확인하세요.':kind==='ended'?'':applyProblem(session,before,latest);
  return [{id:latest.id,before,latest,evidence,kind,canApply:kind==='changed'&&!reason,reason}];
 });
}
export const receiptChangeToken=(changes:ReceiptChange[])=>JSON.stringify(changes.map(c=>[c.id,c.evidence]));
export function prepareReceiptUpdate(session:Session,actions:Record<string,ReceiptAction>,token:string,now=Date.now()):Session{
 const changes=pendingReceiptChanges(session);
 if(!changes.length||receiptChangeToken(changes)!==token)throw Error('수신 내용이 다시 바뀌었습니다. 변경 사항을 다시 확인하세요.');
 const review=structuredClone(session.receiptReview!),excluded=new Set(review.excluded),jobs=[...session.draft.jobs];
 for(const c of changes){
  const action=actions[c.id];if(!action)throw Error('각 계약의 처리 방법을 확인하세요.');
  if(c.kind==='ended'?action!=='exclude':!['keep','apply'].includes(action)||action==='apply'&&!c.canApply)throw Error('각 계약의 처리 방법을 확인하세요.');
  if(action==='exclude')excluded.add(c.id);
  if(action==='apply'){jobs[jobs.findIndex(j=>j.id===c.id)]=structuredClone(c.latest);excluded.delete(c.id);}
  review.accepted[c.id]=c.evidence;review.log.push({at:now,id:c.id,kind:c.kind,action,evidence:c.evidence});
 }
 review.excluded=[...excluded];
 return {...session,draft:{...session.draft,jobs},receiptReview:review};
}
export function replanReceiptUpdate(session:Session,actions:Record<string,ReceiptAction>,token:string,now=Date.now()):Session{
 const next=prepareReceiptUpdate(session,actions,token,now),prior=session.run!;
 const plan=calculateFlight(next.draft,{...contextOf(prior),mode:session.plan!.mode,disabledGrids:session.plan!.ship.grids.filter(g=>g.disabled).map(g=>g.id),excludedMissionIds:next.receiptReview!.excluded});
 const run=adoptReplan(prior);
 // Only confirmed run actions mark deliveries. An ended log never adds to delivered.
 const finished=!plan.visits.length&&!run.aboard.length;
 return {...next,plan,run:{...run,finished,...(!plan.visits.length?{elapsed:elapsed(prior,now),since:null}:{}),loadScu:plan.mode==='simple'?prior.loadScu:run.aboard.reduce((n,b)=>n+b.size,0)}};
}
