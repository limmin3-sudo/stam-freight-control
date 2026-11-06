import {applyContractInfo} from '../contract-info.mjs';
import {definitionDraft} from '../mission-catalog.mjs';
import {deliveryGroups,quantitiesReady,actualQuantity} from '../delivery-totals.mjs';
// The inbox projects evidence into editable drafts. Receiving never changes planner missions.
const key=s=>String(s||'').normalize('NFKC').trim().toLowerCase();
const text=s=>String(s||'').slice(0,240);
const idPattern=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
export function inboxCards(snapshot,places=[],index=null,catalog=null,missionDb=null){
 if(snapshot?.identity?.mixedPlayers)return {blocked:true,cards:[]};
 const all=[...(snapshot?.contracts||[]),...(snapshot?.pendingContracts||[])],unique=new Map();
 const placeId=point=>{const found=places.filter(p=>p.id===point?.id||(p.uuid===point?.id&&p.system===point?.system));return found.length===1?found[0].id:'';};
 const byName=name=>{const found=places.filter(p=>key(p.name)===key(name));return found.length===1?found[0].id:'';};
 for(const c of all){
  if(!idPattern.test(c.missionId||'')||unique.has(c.missionId)||!(c.acceptanceObservations?.some(e=>e.actor!=='other')||c.participation?.selfJoinObserved))continue;
  const markerPlaces=(c.markerObservations||[]).map(m=>({role:m.role,objectiveId:m.objectiveId,...index?.match(m.position)})).filter(m=>m.status==='coordinate-match'&&m.candidates.length===1).map(m=>({role:m.role,objectiveId:m.objectiveId,point:m.candidates[0]}));
  const pickupIds=[...new Set(markerPlaces.filter(m=>m.role==='pickup').map(m=>placeId(m.point)).filter(Boolean))];
  const useOriginal=catalog?.sourceName==='Wiki'&&c.originalManifest?.status==='resolved-original-manifest';
  let rows=[],quantityHints=[];
  if(useOriginal)rows=c.originalManifest.shipments.map(s=>({commodity:text(s.commodity),scu:s.scu,pickupId:placeId({id:s.pickupId,system:c.originalManifest.pickup.system}),dropoffId:placeId({id:s.dropoffId,system:c.originalManifest.deliveries.find(d=>d.id===s.dropoffId)?.system}),boxes:s.boxes.map(b=>({...b}))}));
  else{
   const goals=new Map();for(const q of c.quantityObservations||[]){if(!goals.has(q.objectiveId))goals.set(q.objectiveId,[]);goals.get(q.objectiveId).push(q);}
   for(const group of goals.values()){
    if(new Set(group.map(q=>q.total)).size!==1)continue;
    const q=[...group].sort((a,b)=>a.at.localeCompare(b.at)).at(-1);
    const line=String(q.notification||'').replace(/:\s*$/, '').trim().replace(/^(?:새 목표|새로운 목표|목표 완료):\s*/,'');
    let m=line.match(/^(?:New Objective:\s*|Objective Complete:\s*)?Deliver\s+\d+\/(\d+)\s*SCU\s+of\s+(.+?)\s+to\s+(.+?)\.?$/i);
    if(m){const scu=Number(m[1]);if(scu===q.total&&scu>0&&scu<=10000)rows.push({commodity:text(m[2]),scu,pickupId:pickupIds.length===1?pickupIds[0]:'',dropoffId:byName(m[3]),_dropoffText:text(m[3]),boxes:[],_objectiveId:q.objectiveId});continue;}
    m=line.match(/^(.+?)(?:을\(를\)|을|를)\s*\d+\/(\d+)\s*SCU\s+(.+?)에\s*배송(?:하십시오|하세요)[.!]?$/);
    if(m&&Number(m[2])===q.total&&q.total>0&&q.total<=10000){rows.push({commodity:text(m[1]),scu:q.total,pickupId:pickupIds.length===1?pickupIds[0]:'',dropoffId:byName(m[3]),_dropoffText:text(m[3]),boxes:[],_objectiveId:q.objectiveId});continue;}
    m=line.match(/^(.+?)에\s*\d+\/(\d+)\s*SCU의\s+(.+?)(?:을\(를\)|을|를)\s*(?:배달|배송)(?:하십시오|하세요)[.!]?$/);
    if(m&&Number(m[2])===q.total&&q.total>0&&q.total<=10000)rows.push({commodity:text(m[3]),scu:q.total,pickupId:pickupIds.length===1?pickupIds[0]:'',dropoffId:byName(m[1]),_dropoffText:text(m[1]),boxes:[],_objectiveId:q.objectiveId});
   }
  }
  const reference=definitionDraft(c,places,catalog,missionDb,{markers:markerPlaces.map(m=>({role:m.role,objectiveId:m.objectiveId,pointId:placeId(m.point)})),pickups:pickupIds,dropoffs:[...new Set(markerPlaces.filter(m=>m.role==='dropoff').map(m=>placeId(m.point)).filter(Boolean))]});
  if(reference?.multiplePickups&&!reference.multipleDropoffs&&!useOriginal){
   const matchesOrder=(row,base)=>(base._catalog?.objectives||[]).some(id=>row._objectiveId===`dropoff_${id}_${base._catalog.orderIndex}`);
   // A single delivery counter can aggregate several pickup orders. Show that
   // evidence, but never assign the whole amount to just the first pickup.
   rows=rows.filter(row=>{const base=reference.rows.find(b=>matchesOrder(row,b)),commodity=base?.commodity||row.commodity,siblings=reference.rows.filter(b=>key(b.commodity)===key(commodity)),complete=siblings.every(b=>rows.some(r=>matchesOrder(r,b)));if(siblings.length<2||complete)return true;quantityHints.push({commodity,scu:row.scu,dropoffId:row.dropoffId||reference.dropoffId,dropoffText:row._dropoffText});return false;});
  }
  if(reference){if(!rows.length)rows=reference.rows;else if(!useOriginal){
   const observed=rows,used=new Set();rows=reference.rows.map(base=>{const available=observed.map((row,i)=>({row,i})).filter(({i})=>!used.has(i)),exact=available.filter(({row})=>(base._catalog?.objectives||[]).some(id=>row._objectiveId===`dropoff_${id}_${base._catalog.orderIndex}`)),matches=exact.length?exact:available.filter(({row})=>key(row.commodity)===key(base.commodity)&&(!base.dropoffId||row.dropoffId===base.dropoffId));if(matches.length!==1)return base;const {row,i}=matches[0];used.add(i);return {...base,...row,commodity:base.commodity,pickupId:row.pickupId||base.pickupId,dropoffId:row.dropoffId||base.dropoffId};});for(const [i,row] of observed.entries())if(!used.has(i))rows.push({...row,pickupId:row.pickupId||reference.pickupId,dropoffId:row.dropoffId||reference.dropoffId});
  }}
  rows=rows.map(({_objectiveId,...row})=>row);
  const ended=c.status==='end-observed'||c.participation?.state==='left-observed';
  const card={id:c.missionId,title:text(reference?.title||c.title||'수신한 계약'),company:reference?.company||'',definition:reference?{id:reference.id,basis:reference.basis,version:reference.version,rank:reference.rank,source:reference.source}:null,observedDefinitionId:idPattern.test(c.definitionId||'')?c.definitionId:null,acceptedAt:c.acceptedAt||null,ended,conflict:c.status==='conflict'||!!c.conflicts?.length,rows,pickupNames:[...new Set(markerPlaces.filter(p=>p.role==='pickup').map(p=>p.point.name))],pendingType:!reference&&(c.status==='classification-pending'||!(c.markerObservations||[]).some(m=>m.hauling))};
  if(quantityHints.length)card.quantityHints=quantityHints;
  card.signature=JSON.stringify([card.ended,card.conflict,card.rows,card.quantityHints]);unique.set(card.id,card);
 }
 return {blocked:false,cards:[...unique.values()].sort((a,b)=>(b.acceptedAt||'').localeCompare(a.acceptedAt||'')||a.id.localeCompare(b.id))};
}
export function cardDraft(card){
 if(!card||card.ended||card.conflict)throw Error('이 계약의 현재 기록을 먼저 확인해 주세요.');
 return {id:card.id,company:card.company||'',title:card.title,reward:0,cargo:card.rows.length?structuredClone(card.rows):[{commodity:'',scu:'',pickupId:'',dropoffId:'',boxes:[]}],_logInbox:{version:1,signature:card.signature,...(card.definition?{definition:card.definition}:{}),...(card.observedDefinitionId?{observedDefinitionId:card.observedDefinitionId}:{})}};
}

// Actual-quantity readiness; upper-bound estimates require a separate opt-in.
export function cardReady(card,places=[]){const ids=new Set(places.map(p=>p.id));return !!card&&!card.ended&&!card.conflict&&card.rows.length>0&&quantitiesReady({cargo:card.rows,_deliveryTotals:card.deliveryTotals})&&card.rows.every(r=>typeof r.commodity==='string'&&r.commodity.trim()&&ids.has(r.pickupId)&&ids.has(r.dropoffId));}

export function cardMissing(card,places=[]){
 const ids=new Set(places.map(p=>p.id)),rows=card?.rows||[],missing=new Set();
 if(!rows.length)return ['commodity','quantity','pickup','dropoff'];
 const reserved=new Set(deliveryGroups({cargo:rows,_deliveryTotals:card?.deliveryTotals}).filter(g=>g.reservation).map(g=>g.dropoffId));
 for(const r of rows){if(!r.commodity?.trim())missing.add('commodity');if(!actualQuantity(r)&&!reserved.has(r.dropoffId))missing.add('quantity');if(!ids.has(r.pickupId))missing.add('pickup');if(!ids.has(r.dropoffId))missing.add('dropoff');}
 return [...missing];
}

export function cardRouteReady(card,places=[]){const ids=new Set(places.map(p=>p.id));return !!card&&!card.ended&&!card.conflict&&card.rows.length>0&&card.rows.every(r=>ids.has(r.pickupId)&&ids.has(r.dropoffId));}

// Receipt selection and reviewed inputs are separate from the saved hauling plan.
export function upperBoundDraft(draft){const next=structuredClone(draft);for(const r of next.cargo){if(Number.isSafeInteger(r.scu)&&r.scu>0&&!r._scuEstimated)continue;const b=r._quantityBounds,max=b?.unit==='SCU'?b.max:(r.commodity==='CryoPod'||r._cargoShape==='cryopod')&&b?.unit==='items'?b.max:null;if(Number.isSafeInteger(max)&&max>0&&max<=10000){r.scu=max;r._scuEstimated=true;r.boxes=[];}}return next;}
export function upperBoundReady(card,places=[]){return cardReady({...card,rows:card.rows.map(r=>{if(!r._scuEstimated)return r;const b=r._quantityBounds,valid=(b?.unit==='SCU'||(r.commodity==='CryoPod'||r._cargoShape==='cryopod')&&b?.unit==='items')&&r.scu===b.max;return valid?{...r,_scuEstimated:false}:r;})},places);}
export function cardCertainty(card){
 const deliveries=deliveryGroups({cargo:card.rows,_deliveryTotals:card.deliveryTotals}),reserved=new Set(deliveries.filter(g=>g.reservation).map(g=>g.dropoffId));
 if(card.rows.some(r=>r._scuEstimated&&!reserved.has(r.dropoffId)))return 'upper-bound';
 if(!card.rows.length||card.rows.some(r=>!actualQuantity(r)&&!reserved.has(r.dropoffId)))return 'unavailable';
 const validBoxes=(boxes,total)=>boxes?.length&&boxes.every(b=>[1,2,4,8,16,24,32].includes(b.size)&&Number.isSafeInteger(b.count)&&b.count>0)&&boxes.reduce((n,b)=>n+b.size*b.count,0)===total;
 const groups=new Map();for(const row of card.rows){const key=(reserved.has(row.dropoffId)?'':row.pickupId)+'|'+row.dropoffId;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const confirmed=[...groups.values()].every(rows=>{const pending=reserved.has(rows[0].dropoffId);if(!pending&&rows.every(r=>validBoxes(r.boxes,r.scu)))return true;const configs=(card.destinationBoxes||[]).filter(c=>c.pickupId===(pending?null:rows[0].pickupId)&&c.dropoffId===rows[0].dropoffId),total=pending?deliveries.find(g=>g.dropoffId===rows[0].dropoffId).total:rows.reduce((n,r)=>n+r.scu,0);return configs.length===1&&configs[0].origin!=='template'&&validBoxes(configs[0].boxes,total);});
 return confirmed?'boxes':'quantity';
}

export function withDeliveryTotal(draft,dropoffId,scu){
 const next=structuredClone(draft),rows=next.cargo.filter(r=>r.dropoffId===dropoffId);
 if(!rows.length||!Number.isSafeInteger(scu)||scu<1||scu>rows.length*10000)throw Error('invalid-delivery-total');
 const unknown=rows.filter(r=>r._scuEstimated||r._scuAssumed||!Number.isSafeInteger(r.scu)||r.scu<=0),known=rows.filter(r=>!unknown.includes(r)).reduce((n,r)=>n+r.scu,0);
 if(rows.length===1){rows[0].scu=scu;rows[0]._scuEstimated=false;rows[0]._scuAssumed=false;}
 else if(unknown.length===1){const remaining=scu-known;if(remaining<1||remaining>10000)throw Error('invalid-delivery-total');unknown[0].scu=remaining;unknown[0]._scuEstimated=false;unknown[0]._scuAssumed=false;}
 else if(!unknown.length&&scu!==known)throw Error('conflicting-delivery-total');
 else if(unknown.length>1){const bounded=unknown.every(r=>r._quantityBounds?.unit==='SCU'&&Number.isSafeInteger(r._quantityBounds.max)&&r._quantityBounds.max>0);if(bounded){const min=known+unknown.reduce((n,r)=>n+(r._quantityBounds.min>0?r._quantityBounds.min:1),0),max=known+unknown.reduce((n,r)=>n+r._quantityBounds.max,0);if(scu<min||scu>max){const error=Error('delivery-total-outside-bounds');error.min=min;error.max=max;throw error;}}}
 next._deliveryTotals=[...(next._deliveryTotals||[]).filter(t=>t.dropoffId!==dropoffId),{dropoffId,scu}];return next;
}

export class InboxSelection {
 constructor(places,missions=()=>[],details=()=>null){this.details=details;this.places=places;this.missions=missions;this.cards=[];this.useUpperBounds=true;this.selected=new Map();this.reviewed=new Map();}
 sync(cards){this.cards=cards;for(const [id,signature] of this.selected){const raw=cards.find(c=>c.id===id);if(!raw||raw.signature!==signature||!this.ready(this.effective(raw)))this.selected.delete(id);}}
 current(draft){const c=this.cards.find(c=>c.id===draft.id);return !!c&&!c.ended&&!c.conflict&&c.signature===draft._logInbox?.signature;}
 draft(raw,estimate=true){const base=cardDraft(raw),saved=this.reviewed.get(raw.id),reviewed=saved?._logInbox?.signature===raw.signature,prior=this.missions().find(m=>m.id===raw.id);let refreshed=false;const next={...structuredClone(reviewed?saved:prior||base),_logInbox:{...base._logInbox,reviewed}};
  for(const [i,row] of next.cargo.entries())if(row._scuEstimated){const actual=base.cargo[i],matches=actual&&(actual.commodity===row.commodity||actual._catalog?.id&&actual._catalog.id===row._catalog?.id&&actual._catalog.orderIndex===row._catalog.orderIndex)&&actual.pickupId===row.pickupId&&actual.dropoffId===row.dropoffId;if(matches&&Number.isSafeInteger(actual.scu)&&actual.scu>0){next.cargo[i]={...row,...actual};delete next.cargo[i]._scuEstimated;refreshed=true;}else{row.scu='';delete row._scuEstimated;}}
  if(refreshed)next._logInbox.refreshedEstimate=true;const enriched=applyContractInfo(next,this.details());return estimate&&this.useUpperBounds?upperBoundDraft(enriched):enriched;
 }
 ready(card){return cardReady(card,this.places)||this.useUpperBounds&&upperBoundReady(card,this.places);}
 effective(raw){if(raw.ended||raw.conflict)return raw;const draft=this.draft(raw);return {...raw,rows:draft.cargo,destinationBoxes:draft.destinationBoxes,deliveryTotals:draft._deliveryTotals,details:draft._definitionDetails,rewardReference:draft._rewardReference,reward:draft.reward,_rewardKnown:draft._rewardKnown,_rewardReference:draft._rewardReference};}
 toggle(id,checked){const raw=this.cards.find(c=>c.id===id);if(!raw||!this.ready(this.effective(raw)))return false;if(checked)this.selected.set(id,raw.signature);else this.selected.delete(id);return true;}
 saveReviewed(drafts){for(const d of drafts)if(!this.current(d)||!cardReady({rows:d.cargo,deliveryTotals:d._deliveryTotals},this.places))throw Error('계약 정보가 바뀌었거나 필수 정보가 부족합니다. 수신함에서 다시 확인하십시오.');for(const d of drafts){this.reviewed.set(d.id,structuredClone(d));this.selected.delete(d.id);}}
 saveDeliveryDrafts(drafts){for(const d of drafts){if(!this.current(d)||!d._deliveryTotals?.length)throw Error('stale-delivery-total');for(const t of d._deliveryTotals)withDeliveryTotal(d,t.dropoffId,t.scu);}for(const d of drafts)this.reviewed.set(d.id,structuredClone(d));}
 drafts(){this.sync(this.cards);return [...this.selected.keys()].map(id=>this.draft(this.cards.find(c=>c.id===id)));}
 committed(ids){for(const id of ids)this.reviewed.delete(id);}
}
