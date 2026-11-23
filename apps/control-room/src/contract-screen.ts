import type {Job,Shipment} from './mission-trial';
import {reviewReceipt} from './receipt-edit.mjs';
import {currentLocationData,canonicalLocationId} from './personal-locations.mjs';
import ko from '../../../data/stam-korean.json' with {type:'json'};
import {pickupInstructions,screenKey,screenLocation,screenObjectives} from '../../../screen-objectives.mjs';
import {parseMissionText} from '../../../ocr.mjs';

type Goal={item:string;destination:string;pickups:string[];total:number;done:number};
export type Frame={key:string;acceptedTab?:boolean;header:string;text:string;goals:Goal[];title:string;pay:number|null;missionId:string|null;image:Blob;continuations:{item:string;place:string}[]};
const norm=(s:string)=>screenKey(s) as string;
const goods=new Map(Object.entries(ko.goods).flatMap(([en,kr])=>[[norm(en),en],[norm(kr),kr]] as [string,string][]));
export function objectiveScore(text:string){
 const goals:Goal[]=screenObjectives(text),locations=currentLocationData().locations;
 const loc=(name:string)=>screenLocation(name,locations,ko.places);
 return goals.reduce((sum,g)=>sum+4+(loc(g.destination)?5:0)+(g.pickups.some(loc)?5:0),0);
}
export function readFrame(text:string,image:Blob,original=text):Frame|null{
 const goals:Goal[]=screenObjectives(text).map(g=>({...g,item:goods.get(norm(g.item))||g.item}));
 const cutoff=text.search(/(?:납품|배송|deliver(?:ed|y)?)\s*[:：]?\s*\d+\s*\//i);
 const continuations=pickupInstructions(cutoff<0?text:text.slice(0,cutoff));
 if(!goals.length&&!continuations.length&&!/주요\s*목표|Primary\s*Objectives/i.test(text))return null;
 const parsed=parseMissionText(text);
 const title=parsed.title.split(/\s{3,}|\s+Contract Availability/i)[0]!.trim();
 const rewardLine=text.split('\n').find(l=>/^\s*(?:Reward|보상)\b/i.test(l));
 const exact=rewardLine?.match(/^\s*(?:Reward|보상)\s*[:：]?\s*(?:[¤$₡₩₳ao]\s*)?(\d{1,3}(?:,\d{3})+|\d+)\s*(?:aUEC)?\s*$/i);
 const pay=rewardLine?(exact?Number(exact[1]!.replaceAll(',','')):null):parsed.rewardKnown?parsed.reward:null;
 return {key:original,header:text,text:original,goals,
  continuations,title,pay,missionId:parsed.missionId,image};
}
const available=(job:Job)=>job.state==='ready'||job.state==='incomplete';
function sameGoods(row:Shipment,item:string){return row.cargo.some(c=>norm(c)===norm(item));}
export function matchFrame(frame:Frame,jobs:Job[]){
 const active=jobs.filter(available);
 if(frame.missionId)return active.filter(j=>j.id===frame.missionId);
 if(!frame.acceptedTab)return [];
 const titled=active.filter(j=>frame.title&&j.title.some(t=>norm(t)===norm(frame.title)));
 // The title is often repeated across multiple accepted contracts. Never
 // eliminate a sibling on catalogue quantities that may change per instance.
 if(titled.length!==1)return [];
 const job=titled[0]!;
 const items=[...frame.goals,...frame.continuations];
 if(!items.length)return [];
 const known=job.shipments.filter(r=>r.cargo.some(Boolean));
 if(known.length&&!known.some(r=>items.some(g=>sameGoods(r,g.item))))return [];
 if(active.some(j=>j!==job&&!j.title.some(t=>t&&t!=='수신한 계약'&&t!=='—')))return [];
 if(frame.pay!==null&&!job.rewardUnknown&&frame.pay!==job.pay)return [];
 return [job];
}
type SeenGoal=Goal&{ordinal:number};
export function collectedGoals(frames:Frame[]):SeenGoal[]{
 const merged:SeenGoal[]=[];
 for(const frame of frames){
  // A clipped pickup instruction can complete one previously visible goal on
  // this receipt. Two matching goals require more of the screen.
  for(const instruction of frame.continuations||[]){
   const possible=merged.filter(g=>norm(g.item)===norm(instruction.item));
   if(possible.length===1&&!possible[0]!.pickups.some(p=>norm(p)===norm(instruction.place)))possible[0]!.pickups=[...possible[0]!.pickups,instruction.place];
  }
  const used=new Set<number>();
  for(const g of frame.goals){
   const similar=merged.map((prior,i)=>({prior,i})).filter(({prior,i})=>!used.has(i)&&
    norm(prior.item)===norm(g.item)&&norm(prior.destination)===norm(g.destination)&&prior.total===g.total);
   const same=(a:string[],b:string[])=>a.length===b.length&&a.every(x=>b.some(y=>norm(x)===norm(y)));
   const exact=similar.find(({prior})=>same(prior.pickups,g.pickups));
   const partial=similar.filter(({prior})=>prior.pickups.every(x=>g.pickups.some(y=>norm(x)===norm(y)))||
    g.pickups.every(x=>prior.pickups.some(y=>norm(x)===norm(y))));
   const match=exact||(partial.length===1?partial[0]:null);
   if(match){
    used.add(match.i);merged[match.i]={...g,ordinal:match.prior.ordinal,
     pickups:g.pickups.length>=match.prior.pickups.length?g.pickups:match.prior.pickups};
   }else{used.add(merged.length);merged.push({...g,pickups:[...g.pickups],ordinal:merged.length});}
  }
 }
 return merged;
}
export function withScreens(job:Job,frames:Frame[]):Job{
 if(!frames.length||!available(job))return job;
 const shipments=job.shipments.map(r=>({...r})),used=new Set<string>(),reservations={...job.reservations};
 const locations=currentLocationData().locations,loc=(s:string):string=>screenLocation(s,locations,ko.places);
 const goals=collectedGoals(frames),groupTotals=new Map<string,number>(),needTotal=new Set<string>();
 for(const [i,g] of goals.entries()){
  const to=loc(g.destination);
  if(to){groupTotals.set(to,(groupTotals.get(to)||0)+g.total);if(g.pickups.length!==1)needTotal.add(to);}
  for(const [k,pickup] of (g.pickups.length?g.pickups:['']).entries()){
   const from=loc(pickup),scu=g.pickups.length===1?g.total:0;
   const candidates=shipments.filter(r=>!used.has(r.id)&&sameGoods(r,g.item)&&
    (!scu||!r.scu||r.scu===scu)&&(!to||!r.to||canonicalLocationId(r.to)===to)&&(!from||!r.from||canonicalLocationId(r.from)===from));
   let row=candidates.find(r=>from&&to&&canonicalLocationId(r.from)===from&&canonicalLocationId(r.to)===to)||candidates[0];
   if(!row){
    const same=shipments.filter(r=>!used.has(r.id)&&sameGoods(r,g.item));
    if(same.length===1&&goals.filter(other=>norm(other.item)===norm(g.item)).length===1&&g.pickups.length===1&&from&&to)row=same[0];
   }
   if(!row){
    // An inconsistent catalogue row cannot be silently counted again as new freight.
    if(shipments.some(r=>!used.has(r.id)&&sameGoods(r,g.item)))continue;
   }
   const next:Shipment={...row,id:row?.id||job.id+'-screen-'+i+'-'+k,cargo:row?.cargo||[g.item,g.item],
    from:from||row?.from||'',to:to||row?.to||'',scu:scu||row?.scu||0,
    boxes:row?.scu&&scu&&row.scu!==scu?[]:row?.boxes,
    pickupFacility:pickup?[pickup,pickup]:row?.pickupFacility,deliveryFacility:[g.destination,g.destination]};
   if(row)shipments[shipments.indexOf(row)]=next;else shipments.push(next);
   used.add(next.id);
  }
 }
 if(!used.size)return job;
 for(const id of needTotal)if(shipments.filter(r=>r.to===id).every(r=>used.has(r.id)))reservations[id]=groupTotals.get(id)!;
 const recent=[...frames].reverse().find(f=>f.pay!==null);
 const form={...job,shipments,reservations,pay:recent?.pay??job.pay,rewardUnknown:recent?false:job.rewardUnknown};
 try{
  const reviewed=reviewReceipt(job,form,true);
  if(reviewed.shipments.some(r=>!r.from||!r.to))reviewed.state='incomplete';
  return reviewed;
 }catch{return job;}
}
