import type {FlightPlan,Visit} from './flight-types';
import type {Job} from './mission-trial';
export const normalized=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[\s·.,!?_-]/g,'');
export function cargoRoom(plan:FlightPlan|null,visits:Visit[],aboard:number,personal:number){
 if(plan?.capacity==null||visits.some(v=>v.events.some(e=>e.pickupQuantityUnknown&&!e.reservationScu)))return null;
 const peak=Math.max(aboard,...visits.map(v=>v.load));
 return plan.capacity-peak-personal;
}
export function contractMatches(cards:Job[],query:string){
 const search=normalized(query
  .replace(/(?:경로|항로)\s*(?:다시\s*)?(?:짜|계산)(?:해)?(?:줘|주세요)?/g,'')
  .replace(/(?:추가|제외|삭제)(?:해(?:줘|주세요)?|하고)?|빼(?:줘|주세요)|넣어(?:줘|주세요)?|방금|새로|받은|짜리|(?:미션|계약)(?:을|를|에)?|\b(?:add|remove|received|mission|contract)\b/gi,''));
 if(!search)return cards;
 return cards.filter(j=>[...j.title,j.id,...j.shipments.flatMap(x=>x.cargo)].some(n=>normalized(n).includes(search))||
  (search.match(/\d+/)?.[0]&&j.shipments.some(x=>String(x.scu)===search.match(/\d+/)?.[0]&&x.cargo.some(c=>search.includes(normalized(c))))));
}
export function changeStops(stops:string[],target:string,anchor?:string,remove=false){
 const next=[...stops];
 if(anchor===target)throw Error('같은 거점을 기준과 목적지로 지정했습니다.');
 if(remove){if(next.filter(x=>x===target).length!==1)throw Error('남은 항로에서 뺄 거점을 하나로 특정할 수 없습니다.');next.splice(next.indexOf(target),1);}
 else if(anchor){if(next.filter(x=>x===anchor).length!==1)throw Error('기준 거점을 남은 항로에서 하나로 특정할 수 없습니다.');if(next.filter(x=>x===target).length===1)next.splice(next.indexOf(target),1);next.splice(next.indexOf(anchor)+1,0,target);}
 else{if(next.filter(x=>x===target).length===1)next.splice(next.indexOf(target),1);next.unshift(target);}
 if(!next.length)throw Error('남은 거점이 없습니다.');return next;
}
export const applyWord=(s:string)=>/^(적용해줘|적용해|적용|확정해|확정|confirm|apply)[.! ]*$/i.test(s.trim());
export const cancelWord=(s:string)=>/^(취소해줘|취소해|취소|됐어|cancel)[.! ]*$/i.test(s.trim());
