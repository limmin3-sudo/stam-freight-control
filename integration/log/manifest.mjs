import {resolveBoxProfile} from './box-profiles.mjs';
import {contractLocations} from './locations.mjs';

// One curated symmetric route, not a general objective-index/grouping algorithm.
// Each published delivery pool explicitly has these same three orders. The
// user's full contract texts corroborate each destination's quotas. See docs.
const OBJECTIVE = '1358ecdf-36d4-41b2-820b-5d403a56b76e';
const expectedMarkers = new Map([
  [`pickup_${OBJECTIVE}_0`, 'pickup'],
  [`dropoff_${OBJECTIVE}_0`, 'dropoff'],
  [`dropoff_${OBJECTIVE}_3`, 'dropoff'],
]);
const pickups = new Set([
  '42cb64bc-0f83-48ce-8ada-f63ad61e1d2c', '63a3482b-59a3-4c95-923f-77ac16b39d91',
  '6ba5e25d-4096-433e-91bd-28d46cdf42e0', 'dd89bae8-d170-45f4-8d2d-f4677254e4f7',
  '567f92d7-d34c-42fa-b57b-f1939d4c5f5b',
]);
const dropoffs = new Set([
  'd2cccd21-41a2-43fc-bebb-9bce14f6c59b', '6654a246-09af-4e6a-bbab-764dce07d635',
  '57a9e4e4-477a-40c8-971c-5b4129f6b73b', '310f1f19-11f7-45b1-b897-0685b01ab570',
  '399b5e2a-603b-4c4e-a1f8-c86f8e00713a', '15f00205-1b3a-49ec-9b21-d74b60cf2b86',
  'd4086e66-2a16-4b58-be48-2bde84620f2e',
]);
const bundle = [
  {commodityId:'984c2ac5-70dc-43be-85a2-15b8db95dcd2', size:16, count:2, scu:32},
  {commodityId:'530da47b-c6bb-4d95-a1ee-23a1e4e27b45', size:16, count:2, scu:32},
  {commodityId:'d5506a24-5729-4354-81fb-0959173357c4', size:2, count:10, scu:20},
];
export const ALLOCATION_SOURCE = 'https://github.com/StarCitizenWiki/scunpacked-data/blob/1340c8303709904165e2da0fa7060bce0624260b/contracts/461d27cf-9431-4391-89e9-288b3a424385.json';

// Original contract demand only. Never describes remaining/aboard cargo, current
// participation, completed pickups, or permission to mutate an active run.
export function resolveOriginalManifest(contract, index) {
  const profile = resolveBoxProfile(contract);
  if (profile.status !== 'matched-fixed-profile') return {status:'box-profile-unresolved'};
  if (!index) return {status:'location-catalog-unavailable'};
  const locations = contractLocations(contract, index);
  if (locations.objectives.length !== expectedMarkers.size || locations.objectives.some(o =>
    expectedMarkers.get(o.objectiveId) !== o.role)) return {status:'marker-set-unresolved'};
  if (locations.objectives.some(o => o.status !== 'coordinate-match' || o.candidates.length !== 1 || o.quantityConflict)) {
    return {status:'location-unresolved'};
  }
  const stops = locations.objectives.map(o => ({objectiveId:o.objectiveId, role:o.role, ...o.candidates[0]}));
  if (stops.some(s => !(s.role === 'pickup' ? pickups : dropoffs).has(s.id)) || new Set(stops.map(s => s.id)).size !== 3) {
    return {status:'route-outside-profile'};
  }
  const pickup = stops.find(s => s.role === 'pickup');
  const deliveries = stops.filter(s => s.role === 'dropoff').sort((a,b) => a.id.localeCompare(b.id));
  const shipments = deliveries.flatMap(destination => bundle.map(order => {
    const commodity = profile.commodities.find(c => c.commodityId === order.commodityId);
    return {id:`${contract.missionId}:${destination.id}:${order.commodityId}`, missionId:contract.missionId,
      commodityId:order.commodityId, commodity:commodity.name, pickupId:pickup.id, dropoffId:destination.id,
      scu:order.scu, boxes:[{size:order.size, count:order.count}]};
  }));
  // Check the explicit per-pool orders against independently confirmed totals;
  // never produce a bundle by dividing a mission total by its destination count.
  if (profile.commodities.some(c => {
    const rows = shipments.filter(s => s.commodityId === c.commodityId);
    return rows.reduce((n,s) => n+s.scu,0) !== c.totalScu ||
      rows.some(s => s.boxes.some(b => b.size !== c.scu)) ||
      rows.reduce((n,s) => n+s.boxes.reduce((v,b)=>v+b.count,0),0) !== c.count;
  })) return {status:'bundle-conflict'};
  return {status:'resolved-original-manifest', scope:'original-contract', missionId:contract.missionId,
    definitionId:contract.definitionId, gameBuild:contract.gameBuild.value,
    pickup, deliveries, shipments, totalScu:168, boxCount:28,
    evidence:{boxComposition:profile.evidence, allocation:{kind:'corroborated-symmetric-pools',
      source:ALLOCATION_SOURCE, sourceBuild:'12881860',
      orderCrosscheck:'https://scmdb.net/data/merged-4.10.2-live.12913470.json',
      orderCrosscheckSha256:'72153c1ba58e497549628f134168c2f2c97b342c76e436292a304407a61a5186',
      userContractQuotasConfirmed:true}, locations:locations.metadata},
    currentInventoryVerified:false, remainingCargoVerified:false};
}

// Deliberately named preview: recompute from evidence, not a caller-supplied
// manifest/planning flag. Consumers must not overwrite an active run with this.
export function originalPackingPreview(contract, index) {
  const manifest = resolveOriginalManifest(contract, index);
  if (manifest.status !== 'resolved-original-manifest') throw new Error('original-manifest-unverified');
  return {scope:'original-contract-preview', manifest,
    mission:{id:manifest.missionId, title:'Original contract cargo', cargo:manifest.shipments.map(s => ({
      commodity:s.commodity, scu:s.scu, pickupId:s.pickupId, dropoffId:s.dropoffId,
      boxes:s.boxes.map(b => ({...b})),
    }))}};
}
