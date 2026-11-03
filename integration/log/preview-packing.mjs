import {jumpLinks,routeEvidence} from './preview-routes.mjs';
import {originalPackingPreview,resolveOriginalManifest} from './manifest.mjs';
import {resolveBoxProfile} from './box-profiles.mjs';
import {definitionReference} from './catalog.mjs';
import {contractLocations,locationIndex} from './locations.mjs';
import {fullLoadLayout,planRoute,COLORS,SIZES} from '../../engine.mjs';
import {withDeparture} from '../../route-departure.mjs';
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

// Readiness is recomputed from evidence, not from a caller's saved planning flag.
// A missing allocation must not silently turn into six mandatory input forms.
export function previewReadiness(contract,catalog,locations) {
  try {
    const preview=createPreview(contract,catalog,locations);
    return {ready:true,preview,label:'경로·수량·상자 자동 연결'};
  } catch {
    try {
      const input=previewOrders(contract,catalog,locations);
      if(resolveBoxProfile(contract).status==='quantity-conflict')return {ready:false,input,
        label:'자동 연결 보류 · 로그 수량이 검증된 유형과 일치하지 않습니다'};
      const missing=[];
      if(input.pickups.length>1)missing.push('픽업지별 품목·수량 배분');
      if(input.deliveries.length>1)missing.push('배송지별 품목·수량 배분');
      if(!missing.length)missing.push('주문별 실제 수량과 목표 연결');
      return {ready:false,input,label:`자동 연결 보류 · ${missing.join(' / ')} 미확인`};
    } catch(e) { return {ready:false,label:e.message}; }
  }
}
// Original-demand planning depends on resolved inputs, not repeated log timestamps,
// progress notices or marker provenance. Revalidate before comparing every update.
export function previewContractSignature(contract,catalog,locations) {
  const readiness=previewReadiness(contract,catalog,locations);
  return JSON.stringify(readiness.ready ? {
    missionId:contract.missionId,title:contract.title,status:contract.status,
    participation:contract.participation?.state,conflicts:contract.conflicts,
    gameBuild:contract.gameBuild,scope:readiness.preview.scope,mission:readiness.preview.mission,
  } : contract);
}

export const MAX_PREVIEW_CONTRACTS = 12;
export function previewLocations(locationData) {
  const counts = new Map();
  for (const p of locationData.locations) counts.set(p.id, (counts.get(p.id) || 0) + 1);
  return locationData.locations.filter(p => p.id && counts.get(p.id) === 1 &&
    Array.isArray(p.position) && p.position.length === 3 && p.position.every(Number.isFinite));
}

export function calculatePreview({contract, contracts = contract ? [contract] : [], catalogData, locationData,
  confirmation, confirmations = {}, ship: rawShip, startId, partner = 'navigator'}) {
  if (!contracts.length || contracts.length > MAX_PREVIEW_CONTRACTS ||
      new Set(contracts.map(c => c.missionId)).size !== contracts.length)
    throw Error(`서로 다른 계약을 1~${MAX_PREVIEW_CONTRACTS}개 선택해 주세요.`);
  if (!['navigator', 'operator'].includes(partner)) throw Error('운항 파트너를 선택해 주세요.');
  const catalog = new Map(catalogData), locations = locationIndex(locationData);
  const previews = contracts.map(c => createPreview(c, catalog, locations,
    confirmations[c.missionId] || (contracts.length === 1 ? confirmation : undefined)));
  const missions = previews.map(p => p.mission);
  // Bound work before allocating boxes. Larger jobs can be split explicitly;
  // never silently truncate a selected contract or its cargo.
  if (missions.reduce((n, m) => n + m.cargo.length, 0) > 64)
    throw Error('주문이 64개를 넘습니다. 계획할 계약을 나누어 선택해 주세요.');
  let count = 0;
  for (const cargo of missions.flatMap(m => m.cargo)) {
    if (cargo.boxes.length) count += cargo.boxes.reduce((n, b) => n + b.count, 0);
    else {
      let left = cargo.scu;
      for (const size of [...SIZES].sort((a,b) => b-a).filter(s => s <= cargo.maxBoxSize)) {
        count += Math.floor(left / size); left %= size;
      }
    }
  }
  if (count > 2048) throw Error('미리보기 상자가 2,048개를 넘습니다. 계약을 나누어 계산해 주세요.');
  const ship = withStacking(validateShip(rawShip));
  // Use the public world positions, never parent-relative log coordinates.
  const gateIds = new Set(jumpLinks.flatMap(j => [j.from, j.to]));
  const routeLocations = previewLocations(locationData).map(p => ({...p, isGateway: gateIds.has(p.id)}));
  const map = new Map(routeLocations.map(p => [p.id, p]));
  if (!map.has(startId)) throw Error('계획 출발지를 선택해 주세요.');
  if (missions.some(m => m.cargo.some(c => !map.has(c.pickupId) || !map.has(c.dropoffId))))
    throw Error('유일한 좌표가 있는 경로만 미리 볼 수 있습니다.');
  const jumps = jumpLinks.filter(j => map.has(j.from) && map.has(j.to));
  const route = withDeparture(planRoute({locations: routeLocations, jumps}, missions, startId,
    {ship, includeReturn: false, routePolicy: partner === 'operator' ? 'delivery-first' : 'batch'}));
  // Reuse the engine's shipments and full-load frame. Do not build and pack all
  // shipments twice, or show an unrelated dense layout before the route layout.
  const {shipments, warnings} = route;
  const colors = new Map([...new Set(shipments.map(s => s.dropoffId))].sort().map((id,i) => [id,COLORS[i%COLORS.length]]));
  const colorPacking = p => { for (const b of p?.boxes || []) b.color = colors.get(b.dropoffId); return p; };
  const boxCount = shipments.reduce((n,s) => n+s.boxes.length, 0);
  const destinations = [...new Set(route.visits.flatMap(v => v.events.filter(e => e.type === 'delivery').map(() => v.locationId)))];
  const fullFrame = route.visits.find(v => v.packing.boxes.length === boxCount);
  const packing = colorPacking(fullFrame?.packing || fullLoadLayout(shipments.map(s =>
    ({items:s.boxes,rank:destinations.indexOf(s.dropoffId)/Math.max(1,destinations.length-1)})), [], ship));
  for (const v of route.visits) colorPacking(v.packing);
  return {scope: 'original-contracts-preview', ship, packing, route, stops: routeLocations, routeEvidence,
    warnings: [...new Set(warnings)], partner, contractCount: contracts.length,
    contracts: contracts.map(c => ({id: c.missionId, title: c.title})),
    estimated: shipments.some(s => s.estimated),
    boxCount, totalScu: shipments.reduce((n,s) => n+s.scu, 0),
    currentInventoryVerified: false, remainingCargoVerified: false};
}
