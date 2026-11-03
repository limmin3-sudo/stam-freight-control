const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/;

export function definitionIndex(data) {
  if (data?.schemaVersion !== 1 || data.source !== 'https://api.star-citizen.wiki' ||
      typeof data.version !== 'string' || !Array.isArray(data.definitions)) throw new Error('invalid-catalog');
  const byId = new Map();
  for (const item of data.definitions) {
    if (!uuid.test(item.id || '') || byId.has(item.id) || typeof item.title !== 'string' ||
        typeof item.released !== 'boolean' || typeof item.notForRelease !== 'boolean') throw new Error('invalid-catalog-entry');
    byId.set(item.id, Object.freeze({ ...item, version: data.version }));
  }
  return byId;
}

export function definitionReference(contract, index) {
  if (contract.definitionObservations.length !== 1) return { status: 'conflict', kind: 'definition-reference' };
  const item = index.get(contract.definitionId);
  if (!item) return { status: 'unmatched', kind: 'definition-reference' };
  return { status: 'matched', kind: 'definition-reference', id: item.id, title: item.title,
    version: item.version, released: item.released, notForRelease: item.notForRelease,
    source: `https://api.star-citizen.wiki/api/missions/${item.id}?version=${encodeURIComponent(item.version)}` };
}
