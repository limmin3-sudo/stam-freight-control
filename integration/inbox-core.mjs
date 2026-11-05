// The inbox projects evidence into editable drafts. Receiving never changes planner missions.
const key=s=>String(s||'').normalize('NFKC').trim().toLowerCase();
const text=s=>String(s||'').slice(0,240);
const idPattern=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
export function inboxCards(snapshot,places=[],index=null){
 if(snapshot?.identity?.mixedPlayers)return {blocked:true,cards:[]};
 const all=[...(snapshot?.contracts||[]),...(snapshot?.pendingContracts||[])],unique=new Map();
 const placeId=point=>{const found=places.filter(p=>p.id===point?.id||(p.uuid===point?.id&&p.system===point?.system));return found.length===1?found[0].id:'';};
 const byName=name=>{const found=places.filter(p=>key(p.name)===key(name));return found.length===1?found[0].id:'';};
 for(const c of all){
  if(!idPattern.test(c.missionId||'')||unique.has(c.missionId)||!(c.acceptanceObservations?.some(e=>e.actor!=='other')||c.participation?.selfJoinObserved))continue;
  const markerPlaces=(c.markerObservations||[]).map(m=>({role:m.role,...index?.match(m.position)})).filter(m=>m.status==='coordinate-match'&&m.candidates.length===1).map(m=>({role:m.role,point:m.candidates[0]}));
  const pickupIds=[...new Set(markerPlaces.filter(m=>m.role==='pickup').map(m=>placeId(m.point)).filter(Boolean))];
  let rows=[];
  if(c.originalManifest?.status==='resolved-original-manifest')rows=c.originalManifest.shipments.map(s=>({commodity:text(s.commodity),scu:s.scu,pickupId:placeId({id:s.pickupId,system:c.originalManifest.pickup.system}),dropoffId:placeId({id:s.dropoffId,system:c.originalManifest.deliveries.find(d=>d.id===s.dropoffId)?.system}),boxes:s.boxes.map(b=>({...b}))}));
  else{
   const goals=new Map();for(const q of c.quantityObservations||[]){if(!goals.has(q.objectiveId))goals.set(q.objectiveId,[]);goals.get(q.objectiveId).push(q);}
   for(const group of goals.values()){
    if(new Set(group.map(q=>q.total)).size!==1)continue;
    const q=[...group].sort((a,b)=>a.at.localeCompare(b.at)).at(-1);
    const line=String(q.notification||'').replace(/:\s*$/, '').trim();
    let m=line.match(/^(?:New Objective:\s*|Objective Complete:\s*)?Deliver\s+\d+\/(\d+)\s*SCU\s+of\s+(.+?)\s+to\s+(.+?)\.?$/i);
    if(m){const scu=Number(m[1]);if(scu===q.total&&scu>0&&scu<=10000)rows.push({commodity:text(m[2]),scu,pickupId:pickupIds.length===1?pickupIds[0]:'',dropoffId:byName(m[3]),_dropoffText:text(m[3]),boxes:[]});continue;}
    m=line.match(/^(.+?)(?:을\(를\)|을|를)\s*\d+\/(\d+)\s*SCU\s+(.+?)에\s*배송(?:하십시오|하세요)[.!]?$/);
    if(m&&Number(m[2])===q.total&&q.total>0&&q.total<=10000)rows.push({commodity:text(m[1]),scu:q.total,pickupId:pickupIds.length===1?pickupIds[0]:'',dropoffId:byName(m[3]),_dropoffText:text(m[3]),boxes:[]});
   }
  }
  const ended=c.status==='end-observed'||c.participation?.state==='left-observed';
  const card={id:c.missionId,title:text(c.title||'수신한 계약'),acceptedAt:c.acceptedAt||null,ended,conflict:c.status==='conflict'||!!c.conflicts?.length,rows,pickupNames:[...new Set(markerPlaces.filter(p=>p.role==='pickup').map(p=>p.point.name))],pendingType:c.status==='classification-pending'||!(c.markerObservations||[]).some(m=>m.hauling)};
  card.signature=JSON.stringify([card.ended,card.conflict,card.rows]);unique.set(card.id,card);
 }
 return {blocked:false,cards:[...unique.values()].sort((a,b)=>(b.acceptedAt||'').localeCompare(a.acceptedAt||'')||a.id.localeCompare(b.id))};
}
export function cardDraft(card){
 if(!card||card.ended||card.conflict)throw Error('이 계약의 현재 기록을 먼저 확인해 주세요.');
 return {id:card.id,company:'',title:card.title,reward:0,cargo:card.rows.length?structuredClone(card.rows):[{commodity:'',scu:'',pickupId:'',dropoffId:'',boxes:[]}],_logInbox:{version:1,signature:card.signature}};
}
