// Public world coordinates -> parent-relative coordinates. This is a coordinate
// match, not a runtime zone-ID registry, shipment allocation or ship position.
export const LOCATION_SOURCE = 'https://api.star-citizen.wiki/api/locations/positions';
export const POSITION_EPSILON_METERS = 0.01;
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/;
const vector = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
const identity = p => `${p.system}:${p.id}`;
const cell = p => p.map(n => Math.floor(n / POSITION_EPSILON_METERS));
const near = (a, b) => Math.hypot(...a.map((n, i) => n - b[i])) <= POSITION_EPSILON_METERS;

export function locationIndex(data) {
  if (data?.schemaVersion !== 1 || data.source !== LOCATION_SOURCE || data.units !== 'meters' ||
      data.version !== null || !Number.isFinite(Date.parse(data.retrievedAt)) ||
      !/^[a-f\d]{64}$/.test(data.sourceSha256 || '') || !Array.isArray(data.locations) ||
      data.locations.length > 100_000) throw new Error('invalid-location-catalog');
  const byId = new Map(), buckets = new Map();
  for (const p of data.locations) {
    if (!p || !(p.id === null || uuid.test(p.id || '')) || !(p.parentId === null || uuid.test(p.parentId || '')) ||
        !['name', 'system', 'type'].every(k => typeof p[k] === 'string' && p[k].length > 0) ||
        !vector(p.position)) throw new Error('invalid-location-entry');
    if (p.id === null) continue;
    const key = identity(p);
    if (!byId.has(key)) byId.set(key, []);
    byId.get(key).push(p);
  }
  let indexed = 0;
  for (const p of data.locations) {
    const parents = byId.get(`${p.system}:${p.parentId}`);
    // Only this surface frame is supported by the observed logs. Missing or
    // multiply instantiated parents cannot define a reliable reference frame.
    if (parents?.length !== 1 || !['Planet', 'Moon'].includes(parents[0].type)) continue;
    const parent = parents[0];
    const position = p.position.map((n, i) => n - parent.position[i]);
    if (Math.hypot(...position) <= POSITION_EPSILON_METERS) continue;
    const key = cell(position).join(',');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({id: p.id, name: p.name, system: p.system,
      parentId: parent.id, parentName: parent.name, position,
      multipleInstances: p.id === null || byId.get(identity(p)).length !== 1});
    indexed++;
  }
  function match(position) {
    if (!vector(position)) return {status: 'invalid', candidates: []};
    const base = cell(position), matches = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const key = [base[0] + x, base[1] + y, base[2] + z].join(',');
      for (const p of buckets.get(key) || []) if (near(position, p.position)) matches.push({
        ...p, residualMeters: Math.hypot(...position.map((n, i) => n - p.position[i])),
      });
    }
    matches.sort((a, b) => identity(a).localeCompare(identity(b)));
    return {status: matches.length === 1 && !matches[0].multipleInstances ? 'coordinate-match'
      : matches.length ? 'ambiguous' : 'unmatched', candidates: matches};
  }
  return {match, indexed, metadata: {source: data.source, retrievedAt: data.retrievedAt,
    version: null, sourceSha256: data.sourceSha256, toleranceMeters: POSITION_EPSILON_METERS}};
}

export function contractLocations(contract, index) {
  if (!index) return {status: 'catalog-unavailable', objectives: []};
  const groups = new Map();
  for (const m of contract.markerObservations) {
    if (m.missionId !== contract.missionId) continue;
    if (!groups.has(m.objectiveId)) groups.set(m.objectiveId, []);
    groups.get(m.objectiveId).push(m);
  }
  const objectives = [...groups].map(([objectiveId, markers]) => {
    const first = markers[0];
    const conflict = contract.definitionObservations.length !== 1 || markers.some(m =>
      m.definitionId !== contract.definitionId || m.role !== first.role || !vector(m.position) ||
      !vector(first.position) || !near(m.position, first.position));
    const result = conflict ? {status: 'marker-conflict', candidates: []} : index.match(first.position);
    const quantities = contract.quantityObservations.filter(q => q.missionId === contract.missionId && q.objectiveId === objectiveId);
    return {objectiveId, role: first.role, ...result,
      observations: markers.map(m => ({at: m.at, source: m.source})),
      // Exact objective IDs only: never propagate one marker to neighbouring
      // suffixes, similarly named commodities or another instance of the type.
      quantities, quantityConflict: new Set(quantities.map(q => q.total)).size > 1};
  });
  return {status: 'compared', metadata: index.metadata, objectives};
}
