import type {Session} from './flight-session';
import {adoptReplan,contextOf,elapsed} from './flight-session.ts';
import {pendingReceiptChanges} from './flight-receipts.ts';
import {calculateFlight} from './flight-engine.mjs';
export function heldCargo(session:Session){return session.run?.aboard.filter(b=>session.receiptReview?.excluded.includes(b.missionId))||[];}
export function confirmHeldDischarge(session:Session,ids:string[],now=Date.now()):Session{
 if(!session.run?.started||!session.plan||session.draft.partner!=='navigator')throw Error('진행 중인 항해사 운항에서 보류 화물을 확인하세요.');
 if(pendingReceiptChanges(session).length)throw Error('계약 변경 내용을 먼저 확인하세요.');
 const selected=new Set(ids),held=heldCargo(session);
 if(!ids.length||selected.size!==ids.length||ids.some(id=>!held.some(b=>b.boxId===id)))throw Error('현재 선내 보류 상자만 선택하세요.');
 const boxes=held.filter(b=>selected.has(b.boxId)),prior=session.run;
 const aboard=prior.aboard.filter(b=>!selected.has(b.boxId));
 const nextRun={...prior,aboard,loadScu:aboard.reduce((n,b)=>n+b.size,0)};
 const plan=calculateFlight(session.draft,{...contextOf(nextRun),mode:session.plan.mode,excludedMissionIds:session.receiptReview?.excluded,
  disabledGrids:session.plan.ship.grids.filter(g=>g.disabled).map(g=>g.id)});
 const run=adoptReplan(nextRun,plan);
 return {...session,plan,run:{...run,finished:!plan.visits.length&&!aboard.length,...(!plan.visits.length?{elapsed:elapsed(prior,now),since:null}:{})},
  heldDischarges:[...(session.heldDischarges||[]),{at:now,locationId:prior.positionId,boxes:structuredClone(boxes)}]};
}
