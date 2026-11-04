// Curated observations, not an SCU-to-box estimate or a rule for every mission.
// The user confirmed repeatability of both types and all three large-type counts
// on 2026-11-03. Only the observed game build is supported. No runtime/user IDs.
const LARGE = '461d27cf-9431-4391-89e9-288b3a424385';
const MEDIUM = '6f207f9c-0575-4a88-82f8-ccc348eab9da';
const BUILD = '12913470';
const OBJECTIVE = '1358ecdf-36d4-41b2-820b-5d403a56b76e';
const rows = [
  {commodityId:'984c2ac5-70dc-43be-85a2-15b8db95dcd2', name:'Ship Ammunition', scu:16, count:4},
  {commodityId:'530da47b-c6bb-4d95-a1ee-23a1e4e27b45', name:'Hydrogen', scu:16, count:4},
  {commodityId:'d5506a24-5729-4354-81fb-0959173357c4', name:'Medical Supplies', scu:2, count:20},
];

export function resolveBoxProfile(contract) {
  const result = (status, extra = {}) => ({status, ...extra});
  if (contract.definitionObservations?.length !== 1 || contract.definitionObservations[0] !== contract.definitionId) return result('definition-unresolved');
  if (![LARGE, MEDIUM].includes(contract.definitionId)) return result('unsupported-type');
  if (contract.gameBuild?.status !== 'known') return result('build-unresolved');
  if (contract.gameBuild.value !== BUILD) return result('unsupported-build');
  if (contract.conflicts?.length) return result('evidence-conflict');
  const evidence = {kind:'user-confirmed-fixed-type', confirmedOn:'2026-11-03', gameBuild:BUILD,
    repeatedCompositionConfirmed:true, allocationVerified:false};
  if (contract.definitionId === MEDIUM) return result('fixed-type-counts-pending', {evidence});

  // These six objective totals were observed for this type. A conflicting or
  // unfamiliar quantity slot suspends the profile; do not explain it away.
  const expected = [32,32,20,32,32,20];
  for (const q of contract.quantityObservations || []) {
    const index = expected.findIndex((_, i) => q.objectiveId === `dropoff_${OBJECTIVE}_${i}`);
    if (index < 0 || q.unit !== 'SCU' || q.total !== expected[index]) return result('quantity-conflict');
  }
  return result('matched-fixed-profile', {
    missionId:contract.missionId, definitionId:LARGE, evidence,
    // Copy per runtime contract. Never pool identical commodities between missions.
    commodities:rows.map(row => ({...row, missionId:contract.missionId, totalScu:row.scu * row.count})),
    totalScu:168, boxCount:28,
  });
}
