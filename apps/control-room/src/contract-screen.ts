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
 const rewardLine=text.split('\n').find(l=>/^\s*(?:Reward\b|보상)(?:\s|[:：])/i.test(l));
 const exact=rewardLine?.match(/^\s*(?:Reward|보상)\s*[:：]?\s*(?:[¤$₡₩₳ao]\s*)?(\d{1,3}(?:,\d{3})+|\d+)\s*(?:aUEC)?\s*$/i);
 const pay=rewardLine?(exact?Number(exact[1]!.replaceAll(',','')):null):parsed.rewardKnown?parsed.reward:null;
 return {key:original,header:text,text:original,goals,
  continuations,title,pay,missionId:parsed.missionId,image};
}
const available=(job:Job)=>job.state==='ready'||job.state==='incomplete';
function sameGoods(row:Shipment,item:string){return row.cargo.some(c=>norm(c)===norm(item));}
// Never use a catalogue cargo range or the number of blank fields to break a tie.
const itemIds=new Map(Object.entries(ko.goods).flatMap(([en,kr])=>[[norm(en),en],[norm(kr),en]] as [string,string][]));
const untitled=(j:Job)=>!j.title.some(t=>t&&t!=='수신한 계약'&&t!=='—');
// Korean OCR can render a short Hangul word as Latin glyphs. Both unchanged
// sides must anchor the same full title. The match still needs log evidence.
function damagedTitle(observed:string,expected:string){
 const gap=/^([가-힣]{3,})[a-z]{1,4}([가-힣]{3,})$/.exec(norm(observed));
 const name=norm(expected);
 if(!gap || !/^[가-힣]+$/.test(name))return false;
 const missing=name.length-gap[1]!.length-gap[2]!.length;
 return missing>=1&&missing<=4&&name.startsWith(gap[1]!)&&name.endsWith(gap[2]!);
}
export function frameCandidates(frame:Frame,jobs:Job[]){
 if(frame.missionId)return jobs.filter(j=>j.id.toLowerCase()===frame.missionId?.toLowerCase());
 if(!frame.acceptedTab||!frame.title)return [];
 const goal=frame.goals.length===1?frame.goals[0]:undefined;
 const loc=(name:string)=>screenLocation(name,currentLocationData().locations,ko.places);
 const from=goal?.pickups.length===1?loc(goal.pickups[0]!):'';
 const to=goal?loc(goal.destination):'';
 const item=goal&&itemIds.get(norm(goal.item));
 return jobs.filter(job=>{
  if(!untitled(job)&&!job.title.some(t=>norm(t)===norm(frame.title)||damagedTitle(frame.title,t)))return false;
  if(frame.pay!==null&&!job.rewardUnknown&&job.pay!==frame.pay)return false;
  if(goal?.total&&job.singleDeliveryScu&&job.singleDeliveryScu!==goal.total)return false;
  const e=job.directEvidence;
  if(!e)return true;
  const known=itemIds.get(norm(e.cargo));
  return !(item&&known&&item!==known||from&&e.from&&canonicalLocationId(e.from)!==from||
   to&&e.to&&canonicalLocationId(e.to)!==to);
 });
}
export function matchFrame(frame:Frame,jobs:Job[]){
 const active=jobs.filter(available);
 if(frame.missionId)return frameCandidates(frame,active);
 const plausible=frameCandidates(frame,active);
 if(plausible.length!==1||untitled(plausible[0]!))return [];
 const quota=frame.goals.length===1?frame.goals[0]!.total:null;
 const job=plausible[0]!;
 const items=[...frame.goals,...frame.continuations];
 if(!items.length)return [];
 const known=job.shipments.filter(r=>r.cargo.some(Boolean));
 const matchesCargo=known.some(r=>items.some(g=>sameGoods(r,g.item)));
 const observed=job.directEvidence;
 const loc=(name:string)=>screenLocation(name,currentLocationData().locations,ko.places);
 const matchesStop=!!observed&&frame.goals.some(g=>observed.to&&loc(g.destination)===canonicalLocationId(observed.to)||
  observed.from&&g.pickups.some(p=>loc(p)===canonicalLocationId(observed.from)));
 const exactTitle=job.title.some(t=>norm(t)===norm(frame.title));
 if(!exactTitle && !(quota && job.singleDeliveryScu===quota && (matchesCargo||matchesStop)))return [];
 const matchesReward=frame.pay!==null&&!job.rewardUnknown&&frame.pay===job.pay;
 if(known.length&&!matchesCargo||!matchesCargo&&!matchesStop&&!matchesReward&&!(quota&&job.singleDeliveryScu===quota))return [];

 return [job];
}
// Use the role the pilot named. A place occurring at opposite ends on two
// contracts is only distinctive after accounting for pickup versus delivery.
export function spokenScreenChoice(text:string,jobs:Job[],place:(id:string)=>string){
 const ordinal=text.trim().match(/^(?:#|number\s+)?(\d{1,3}|첫|첫째|첫번째|하나|일|두|둘|이|세|셋|삼|네|사|one|two|three|four)\s*(?:번(?:째)?|번째)?(?:이요|요)?[.! ]*$/i);
 if(ordinal){
  const words:Record<string,number>={첫:1,첫째:1,첫번째:1,하나:1,일:1,one:1,두:2,둘:2,이:2,two:2,세:3,셋:3,삼:3,three:3,네:4,사:4,four:4};
  return jobs[(words[ordinal[1]!.toLowerCase()]??Number(ordinal[1]))-1];
 }
 if(/아니|말고|취소|제외|don't|not\b/i.test(text))return;
 const delivery=/내리|내릴|내려|하역|배송|납품|도착|deliver|unload|drop/i.test(text);
 const pickup=/싣|실[어을었]|상차|수거|픽업|출발|pick.?up|\bload|from/i.test(text)||!delivery&&/에서/.test(text);
 const phrase=norm(text);
 const matches=jobs.filter(j=>{
  const aliases=j.shipments.flatMap(r=>[...(!delivery||pickup?[r.from&&place(r.from),...(r.pickupFacility||[])]:[]),
   ...(!pickup||delivery?[r.to&&place(r.to),...(r.deliveryFacility||[])]:[]),...(!pickup&&!delivery?r.cargo:[])]);
  return aliases.some(a=>a&&norm(a).length>=2&&phrase.includes(norm(a)));
 });
 return matches.length===1?matches[0]:undefined;
}
export function retryFrame(frame:Frame,capturedIds:string[],jobs:Job[]){
 if(frame.missionId)return matchFrame(frame,jobs)[0];
 if(!capturedIds.length)return;
 const cohort=jobs.filter(j=>capturedIds.includes(j.id));
 // A cancellation, disappearing card or newly accepted lookalike does not
 // establish which contract was on screen when this frame was captured.
 if(cohort.length!==capturedIds.length||frameCandidates(frame,cohort).some(j=>!available(j)))return;
 return matchFrame(frame,cohort)[0];
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
 frames=frames.filter(f=>!f.missionId||f.missionId.toLowerCase()===job.id.toLowerCase());
 if(!frames.length||!available(job))return job;
 const shipments=job.shipments.map(r=>({...r})),used=new Set<string>(),reservations={...job.reservations};
 const locations=currentLocationData().locations,loc=(s:string):string=>screenLocation(s,locations,ko.places);
 const goals=collectedGoals(frames),unresolved=new Set<string>(),groupTotals=new Map<string,number>(),needTotal=new Set<string>();
 // An empty UI placeholder has no order identity. Let a multi-objective screen
 // create its own rows, retaining any row that carries real manifest metadata.
 const blank=shipments.length===1?shipments[0]:undefined;
 if(goals.length>1&&blank&&!job.mission?.cargo.length&&!blank.from&&!blank.to&&!blank.scu&&!blank.cargo.some(Boolean)&&
    !blank.pickupFacility&&!blank.deliveryFacility&&!blank.maxBoxSize&&!blank.boxes?.length&&!blank.cargoShape)shipments.pop();
 for(const [i,g] of goals.entries()){
  const to=loc(g.destination);
  if(to){groupTotals.set(to,(groupTotals.get(to)||0)+g.total);if(g.pickups.length!==1)needTotal.add(to);}
  for(const [k,pickup] of (g.pickups.length?g.pickups:['']).entries()){
   const from=loc(pickup),scu=g.pickups.length===1?g.total:0;
   const compatible=(r:Shipment)=> (!r.cargo.some(Boolean)||sameGoods(r,g.item))&&
    (!scu||!r.scu||r.scu===scu)&&(!to||!r.to||canonicalLocationId(r.to)===to)&&(!from||!r.from||canonicalLocationId(r.from)===from);
   const unused=shipments.filter(r=>!used.has(r.id));
   const candidates=unused.filter(compatible);
   // Missing values are not evidence of ownership. A partially filled row
   // must be the only possible row for this goal in both directions.
   if(candidates.length>1){unresolved.add(to);continue;}
   const row=candidates[0];
   if(row){
    const alternatives=goals.filter(other=>(!row.cargo.some(Boolean)||sameGoods(row,other.item))&&
     (!row.to||!loc(other.destination)||loc(other.destination)===canonicalLocationId(row.to))&&
     (!row.scu||other.pickups.length!==1||other.total===row.scu)&&
     (!row.from||!other.pickups.length||other.pickups.some(p=>!loc(p)||loc(p)===canonicalLocationId(row.from))));
    if(alternatives.length>1){unresolved.add(to);continue;}
   }else if(unused.some(r=>!r.cargo.some(Boolean)||sameGoods(r,g.item))){
    unresolved.add(to);continue;
   }
   const cargo:Shipment['cargo']=row?.cargo.some(Boolean)?row.cargo:[g.item,g.item];
   const next:Shipment={...row,id:row?.id||job.id+'-screen-'+i+'-'+k,cargo,
    from:row?.from||from,to:row?.to||to,scu:g.pickups.length>1&&row&&!row.from&&row.scu===g.total&&!row.boxes?.length?0:row?.scu||scu,
    pickupFacility:row?.pickupFacility||(pickup?[pickup,pickup]:undefined),
    deliveryFacility:row?.deliveryFacility||[g.destination,g.destination]};
   if(row)shipments[shipments.indexOf(row)]=next;else shipments.push(next);
   used.add(next.id);
  }
 }
 if(!used.size)return job;
 for(const id of needTotal)if(!unresolved.has(id)&&!reservations[id]&&shipments.filter(r=>r.to===id).every(r=>used.has(r.id)))reservations[id]=groupTotals.get(id)!;
 const recent=job.rewardUnknown?[...frames].reverse().find(f=>f.pay!==null):undefined;
 const form={...job,shipments,reservations,pay:recent?.pay??job.pay,rewardUnknown:recent?false:job.rewardUnknown};
 try{
  const reviewed=reviewReceipt(job,form,true);
  if(reviewed.shipments.some(r=>!r.from||!r.to))reviewed.state='incomplete';
  return reviewed;
 }catch{return job;}
}
