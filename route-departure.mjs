// Add an explicit departure step without changing the planner's pickup/delivery order,
// first travel leg, elapsed time, or packing. Replans of an active trip keep their progress.
import {planRoute as detailed} from './engine.mjs';
import {planRoutesOnly as simple} from './route-only.mjs';

export const isDeparture=v=>v?.events?.some(e=>e.type==='departure')||false;
export function withDeparture(plan){
 if(!plan||(plan.settings?.resume&&!plan.settings.showDeparture)||isDeparture(plan.visits[0]))return plan;
 const id=plan.settings.startId,packing=plan.initialPacking||{boxes:[],used:0};
 const departure={locationId:id,events:[{type:'departure',shipmentId:'departure:'+id,commodity:'',scu:0}],packing,load:packing.used||0,seconds:0,elapsed:0,leg:{nodes:[id],meters:0,seconds:0,jumps:0,gateways:[]}};
 return {...plan,visits:[departure,...plan.visits]};
}
export const planRoute=(...args)=>withDeparture(detailed(...args));
export const planRoutesOnly=(...args)=>withDeparture(simple(...args));

// A jump log has no cargo locationId: use its exit gateway, never the next pickup.
export function currentPosition(run,plan){
 const last=[...(run.log||[])].reverse().find(l=>l.locationId);
 return run.positionId||last?.locationId||plan?.settings?.startId||run.startId;
}
