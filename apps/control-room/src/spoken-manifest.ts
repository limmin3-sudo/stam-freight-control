import type {Job,Name,Shipment} from './mission-trial';
import {reviewReceipt} from './receipt-edit.mjs';
import {canonicalLocationId} from './personal-locations.mjs';

type Side='pickup'|'delivery';
export type ManifestStop={id:string;label:string;units?:number};
export type ManifestDraft={pickup:ManifestStop[];delivery:ManifestStop[];cargo?:Name;waiting?:{side:Side;id:string};sourceChoice?:boolean};
export function finishManifest(job:Job,draft:ManifestDraft,en:boolean,allowSplit=false):{question:string;job?:Job;summary?:string}{
 const say=(ko:string,english:string)=>en?english:ko;
 const ask=(question:string)=>({question});
 const sides=['pickup','delivery'] as const;
 if(!draft.cargo)return ask(say('이 거점들에서 운송할 품목은 무엇인가요?','Which commodity is moving between these stops?'));
 const cargo=draft.cargo,rows=job.shipments.filter(r=>!r.cargo.some(Boolean)||r.cargo.some(c=>cargo.includes(c)));
 const knownOther=job.shipments.filter(r=>!rows.includes(r));
 if(knownOther.length&&rows.some(r=>!r.cargo.some(Boolean)))return ask(say('품목이 비어 있는 기존 화물 줄이 있어요. 그 줄의 품목을 먼저 확인해 주세요.','Identify the commodity on the existing unnamed row first.'));
 for(const side of sides){
  if(!draft[side].length)return ask(say(side==='pickup'?'어디에서 싣나요?':'어디로 배송하나요?',side==='pickup'?'Where is the pickup?':'Where is the delivery?'));
  for(const stop of draft[side]){
   const target=side==='pickup'?'from':'to';
   const group=rows.filter(r=>canonicalLocationId(r[target])===stop.id);
   const confirmed=group.reduce((n,r)=>n+r.scu,0);
   if(stop.units!==undefined&&confirmed>stop.units)return ask(say(stop.label+'의 수량이 기존 카드보다 작아요. 이 거점의 총 SCU를 다시 알려주세요.','The amount at '+stop.label+' is below the confirmed cargo. Repeat the stop total.'));
   if(stop.units===undefined&&confirmed&&group.every(r=>r.scu>0)&&rows.every(r=>r[target]))stop.units=confirmed;
   if(stop.units===undefined&&side==='delivery'&&job.reservations?.[stop.id]&&!knownOther.length)stop.units=job.reservations[stop.id];
  }
 }
 const total=(side:Side)=>draft[side].reduce((n,p)=>n+(p.units??0),0);
 for(const side of sides){
  const other=side==='pickup'?'delivery':'pickup';
  const open=draft[side].filter(p=>p.units===undefined);
  if(open.length===1&&draft[other].every(p=>p.units!==undefined)){
   const remaining=total(other)-total(side);
   if(remaining>0)open[0]!.units=remaining;
  }
 }
 for(const side of sides){
  const missing=draft[side].find(p=>p.units===undefined);
  if(missing){
   draft.waiting={side,id:missing.id};
   return ask(say(missing.label+(side==='pickup'?'에서 몇 SCU를 실어요?':'에 몇 SCU를 내려요?'), 'How many SCU '+(side==='pickup'?'from ':'to ')+missing.label+'?'));
  }
 }
 if(total('pickup')!==total('delivery'))return ask(say('수거 '+total('pickup')+' SCU, 배송 '+total('delivery')+' SCU예요. 수정할 거점과 수량을 알려주세요.','Pickup and delivery totals differ. Give the corrected stop and amount.'));
 const sources=new Map(draft.pickup.map(p=>[p.id,p.units!])),destinations=new Map(draft.delivery.map(p=>[p.id,p.units!]));
 if([...sources.keys()].some(id=>destinations.has(id)))return ask(say('같은 거점이 수거와 배송에 있어요. 화물 줄별로 연결을 알려주세요.','A stop has both roles. Specify the individual shipment rows.'));
 const lanes:Shipment[]=[];
 const make=(from:string,to:string,scu:number,original?:Shipment)=>{
  lanes.push({...original,id:original?.id??crypto.randomUUID(),cargo:original?.cargo.some(Boolean)?original.cargo:cargo,from,to,scu});
  sources.set(from,sources.get(from)!-scu);destinations.set(to,destinations.get(to)!-scu);
 };
 const conflict=()=>ask(say('수신한 화물 줄과 맞지 않아요. 기존 픽업지·배송지에 연결된 수량을 확인해 주세요.','The allocation conflicts with the existing receipt. Check its pickup and delivery links.'));
 const allowed=(r:Shipment,from:string,to:string)=>(!r.from||canonicalLocationId(r.from)===from)&&(!r.to||canonicalLocationId(r.to)===to);
 const specific=rows.filter(r=>r.from&&r.to);
 const partial=rows.filter(r=>!r.from||!r.to);
 // Preserve fixed shipment IDs, amounts, facilities and box data.
 for(const r of specific.filter(r=>r.scu)){
  const from=canonicalLocationId(r.from),to=canonicalLocationId(r.to);
  if((sources.get(from)??0)<r.scu||(destinations.get(to)??0)<r.scu)return conflict();
  make(from,to,r.scu,r);
 }
 const open=specific.filter(r=>!r.scu);
 let progress=true;
 while(progress&&open.length){
  progress=false;
  for(const [i,r] of open.entries()){
   const from=canonicalLocationId(r.from),to=canonicalLocationId(r.to);
   const lastFrom=!partial.length&&open.filter(o=>canonicalLocationId(o.from)===from).length===1;
   const lastTo=!partial.length&&open.filter(o=>canonicalLocationId(o.to)===to).length===1;
   if(!lastFrom&&!lastTo)continue;
   const n=lastFrom?sources.get(from):destinations.get(to);
   if(!n||n>(sources.get(from)??0)||n>(destinations.get(to)??0))return conflict();
   make(from,to,n,r);open.splice(i,1);progress=true;break;
  }
 }
 if(open.length)return ask(say('같은 거점에 연결된 기존 화물 줄이 여러 개예요. 카드의 화물 줄 번호와 수량을 말씀해 주세요.','Multiple existing shipment rows share these stops. Give the shipment row number and quantity.'));
 const remainingSources=[...sources].filter(([,n])=>n>0);
 const remainingDestinations=[...destinations].filter(([,n])=>n>0);
 if(specific.length&&!partial.length&&(remainingSources.length||remainingDestinations.length))return conflict();
 if(remainingSources.length>1&&remainingDestinations.length>1&&!allowSplit){
  draft.sourceChoice=true;
  return ask(say('어느 픽업 화물을 어느 곳에 내릴지 지정돼 있나요? 같은 품목을 자유롭게 나눠도 되면 “자유 배분”이라고 해주세요. 지정돼 있으면 “화물 줄별로”라고 해주세요.','Can this commodity be mixed across pickups? Say “free allocation” or “by shipment row” for assigned cargo.'));
 }
 for(const [from] of remainingSources)for(const [to] of remainingDestinations){
  const n=Math.min(sources.get(from)!,destinations.get(to)!);
  if(n)make(from,to,n);
 }
 const newRows=lanes.filter(r=>!specific.some(s=>s.id===r.id));
 for(const r of partial.slice().sort((a,b)=>Number(!!b.from)+Number(!!b.to)-Number(!!a.from)-Number(!!a.to))){
  const fits=newRows.filter(n=>allowed(r,n.from,n.to)&&(!r.scu||r.scu===n.scu));
  if(!fits.length)return conflict();
  if(fits.length>1&&(r.scu||r.boxes?.length||r.pickupFacility||r.deliveryFacility||r.cargoShape||r.maxBoxSize))return conflict();
  const lane=fits[0]!;
  Object.assign(lane,{...r,id:r.id,from:lane.from,to:lane.to,cargo,scu:lane.scu});
  newRows.splice(newRows.indexOf(lane),1);
 }
 if(!lanes.length)return conflict();
 const corrected=reviewReceipt(job,{...job,shipments:[...job.shipments.map(r=>lanes.find(n=>n.id===r.id)??r),...lanes.filter(n=>!job.shipments.some(r=>r.id===n.id))]},true);
 if(corrected.shipments.some(r=>!r.from||!r.to||!r.cargo.some(Boolean)))corrected.state='incomplete';
 const describe=(side:Side)=>draft[side].map(s=>s.label+' '+s.units).join(', ');
 return {question:'',job:corrected,summary:cargo[en?1:0]+' · '+say('수거 ','Pickup ')+describe('pickup')+' / '+say('배송 ','Delivery ')+describe('delivery')+' SCU'};
}

// Explicit pickup–delivery pairs in the utterance keep their identity even when several cargo types share a stop.
export function applySpokenLanes(job:Job,legs:Shipment[],en:boolean,label:(id:string)=>string):{job?:Job;question:string;summary?:string}{
 const say=(ko:string,english:string)=>en?english:ko;
 const available=[...job.shipments],changed=new Map<string,Shipment>(),added:Shipment[]=[];
 const seen=new Set<string>();
 for(const leg of legs){
  const key=JSON.stringify([leg.from,leg.to,leg.cargo[1]]);
  if(seen.has(key))return {question:say('같은 화물이 같은 구간에 두 번 나왔어요. 그 구간의 총 SCU를 말씀해 주세요.','Give the total SCU for the repeated shipment.')};
  seen.add(key);
  const candidates=available.filter(r=>(!r.from||canonicalLocationId(r.from)===leg.from)&&(!r.to||canonicalLocationId(r.to)===leg.to)&&(!r.cargo.some(Boolean)||r.cargo.some(c=>leg.cargo.includes(c))));
  const confirmed=candidates.filter(r=>r.from&&r.to&&r.cargo.some(Boolean));
  const compatible=(confirmed.length?confirmed:candidates).filter(r=>!r.scu||r.scu===leg.scu);
  if((candidates.length&&!compatible.length)||compatible.length>1)return {question:say('기존 화물 줄과 수량을 하나로 연결할 수 없어요. 해당 화물 줄 번호와 수량을 알려주세요.','Give the shipment row number and quantity for the ambiguous entry.')};
  const row=compatible[0];
  if(row){available.splice(available.indexOf(row),1);changed.set(row.id,{...row,...leg,id:row.id});}
  else added.push(leg);
 }
 const shipments=[...job.shipments.map(r=>changed.get(r.id)??r),...added];
 const corrected=reviewReceipt(job,{...job,shipments},true);
 if(shipments.some(r=>!r.from||!r.to||!r.cargo.some(Boolean)))corrected.state='incomplete';
 return {job:corrected,question:'',summary:legs.map(r=>{
  return r.cargo[en?1:0]+' '+r.scu+' SCU · '+label(r.from)+' → '+label(r.to);
 }).join(' / ')};
}
