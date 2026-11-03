import {jumpLinks,routeEvidence} from './preview-routes.mjs';
import {originalPackingPreview,resolveOriginalManifest} from './manifest.mjs';
import {definitionReference} from './catalog.mjs';
import {contractLocations,locationIndex} from './locations.mjs';
import {makeShipments,packBoxes,planRoute,COLORS,SIZES} from '../../engine.mjs';
import {validateShip,withStacking} from '../../ships.mjs';

// Preview inputs never become a verified manifest or an active run. User
// confirmation concerns each order's quota/route, never its actual box recipe.
export function previewOrders(contract,catalog,locations) {
  if(contract.conflicts.length || contract.definitionObservations.length!==1)throw Error('기록 충돌을 먼저 확인해 주세요.');
  const reference=definitionReference(contract,catalog);
  const orders=reference.rules?.orders;
  if(reference.status!=='matched'||!orders?.length||orders.length>64||orders.some(o=>o.kind!=='Resource'||!SIZES.includes(o.maxBoxScu)))
    throw Error('이 유형은 주문별 품목·상자 상한이 확인되지 않아 예상 구성을 만들 수 없습니다.');
  const compared=contractLocations(contract,locations);
  if(compared.objectives.some(o=>o.status!=='coordinate-match'||o.quantityConflict))throw Error('경로 마커의 위치 또는 수량 충돌을 확인해 주세요.');
  const stops=role=>[...new Map(compared.objectives.filter(o=>o.role===role).map(o=>[o.candidates[0].id,o.candidates[0]])).values()];
  const pickups=stops('pickup'),deliveries=stops('dropoff');
  if(!pickups.length||!deliveries.length)throw Error('확인된 픽업·배송 마커가 필요합니다.');
  return {orders,reference,pickups,deliveries};
}
export function createPreview(contract,catalog,locations,confirmation) {
  if(resolveOriginalManifest(contract,locations).status==='resolved-original-manifest')return originalPackingPreview(contract,locations);
  const input=previewOrders(contract,catalog,locations);
  if(confirmation?.confirmed!==true||confirmation.rows?.length!==input.orders.length)throw Error('주문별 수량과 경로를 확인해 주세요.');
  const cargo=input.orders.map((order,i)=>{
    const row=confirmation.rows[i];
    if(!Number.isInteger(row.scu)||row.scu<1||row.scu>10000||!input.pickups.some(s=>s.id===row.pickupId)||!input.deliveries.some(s=>s.id===row.dropoffId)||row.pickupId===row.dropoffId)
      throw Error('주문별 수량과 픽업·배송지를 확인해 주세요.');
    return {commodity:order.name,scu:row.scu,pickupId:row.pickupId,dropoffId:row.dropoffId,
      maxBoxSize:order.maxBoxScu,_maxBoxSource:'wiki',boxes:[],orderIndex:i};
  });
  return {scope:'estimated-original-contract-preview',mission:{id:contract.missionId,title:contract.title,cargo},
    evidence:{allocation:'user-confirmed-per-order',boxComposition:'estimated-max-per-order',source:input.reference.source,version:input.reference.version},
    currentInventoryVerified:false,remainingCargoVerified:false};
}
export function calculatePreview({contract,catalogData,locationData,confirmation,ship:rawShip,startId}) {
  const catalog=new Map(catalogData),locations=locationIndex(locationData);
  const preview=createPreview(contract,catalog,locations,confirmation);
  const ship=withStacking(validateShip(rawShip));
  // The log matching index uses parent-relative coordinates; routing must use
  // original world coordinates from the public snapshot, never those offsets.
  const wanted=new Set(preview.mission.cargo.flatMap(c=>[c.pickupId,c.dropoffId]));
  const stops=locationData.locations.filter(p=>wanted.has(p.id));
  if(stops.length!==wanted.size)throw Error('유일한 좌표가 있는 경로만 미리 볼 수 있습니다.');
  if(!wanted.has(startId))throw Error('미리보기 출발지를 선택해 주세요.');
  const map=new Map(stops.map(p=>[p.id,p]));
  const {shipments,warnings}=makeShipments([preview.mission],map,{ship});
  const colors=new Map([...new Set(shipments.map(s=>s.dropoffId))].sort().map((id,i)=>[id,COLORS[i%COLORS.length]]));
  const colorPacking=p=>{for(const b of p?.boxes||[])b.color=colors.get(b.dropoffId);return p;};
  const packing=colorPacking(packBoxes(shipments.flatMap(s=>s.boxes),[],ship));
  const counts=new Map();for(const p of locationData.locations)counts.set(p.id,(counts.get(p.id)||0)+1);
  const gateIds=new Set(jumpLinks.flatMap(j=>[j.from,j.to]));
  const routeLocations=locationData.locations.filter(p=>p.id&&counts.get(p.id)===1).map(p=>({...p,isGateway:gateIds.has(p.id)}));
  const ids=new Set(routeLocations.map(p=>p.id));
  const jumps=jumpLinks.filter(j=>ids.has(j.from)&&ids.has(j.to));
  const route=planRoute({locations:routeLocations,jumps},[preview.mission],startId,{ship,includeReturn:false});
  for(const v of route.visits)colorPacking(v.packing);
  return {scope:preview.scope,ship,packing,route,stops:routeLocations,routeEvidence,warnings,estimated:shipments.some(s=>s.estimated),
    boxCount:shipments.reduce((n,s)=>n+s.boxes.length,0),totalScu:shipments.reduce((n,s)=>n+s.scu,0),
    currentInventoryVerified:false,remainingCargoVerified:false};
}
