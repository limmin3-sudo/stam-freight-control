// This allowlist is the entire cloud payload for the rebuilt planner.
// Log evidence, contract drafts, pairing tokens and device quality never enter it.
export const PLANNING_KEY='stam-log-account-settings-v1';
export function cleanPlanningPreferences(value){
 const obj=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const id=v=>typeof v==='string'&&v.length<=160?v:'';
 const disabled={};
 if(obj.disabled&&typeof obj.disabled==='object'&&!Array.isArray(obj.disabled))
  for(const [ship,ids] of Object.entries(obj.disabled).slice(0,300))
   if(id(ship)&&Array.isArray(ids)&&ids.length<=500&&ids.every(v=>typeof v==='string'&&v.length<=160))
    Object.defineProperty(disabled,ship,{value:[...new Set(ids)],enumerable:true,writable:true,configurable:true});
 return {shipId:id(obj.shipId),startId:id(obj.startId),partner:obj.partner==='operator'?'operator':'navigator',disabled};
}
