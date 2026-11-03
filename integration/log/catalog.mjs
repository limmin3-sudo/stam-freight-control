const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/;

// A projection of public definition fields, never an accepted contract manifest.
// Keep repeated orders and Or branches; neither is a duplicate to discard.
export function projectDefinitionRules(data) {
  const order = value => {
    if (value.kind === 'Or') return {kind: 'Or', options: (value.or_options || []).map(group => group.map(order))};
    return {kind: value.kind ?? null, name: value.name ?? null, id: value.uuid ?? null,
      minScu: value.min_scu ?? null, maxScu: value.max_scu ?? null,
      minAmount: value.min_amount ?? null, maxAmount: value.max_amount ?? null,
      maxBoxScu: value.max_container_size ?? null};
  };
  const tokens = data.mission_tokens || {};
  const slots = new Set(Object.keys(tokens).filter(key => /\|Address$/.test(key)));
  for (const match of (data.description || '').matchAll(/\[([A-Za-z\d_]+\|Address)\]/g)) slots.add(match[1]);
  return {orders: (data.hauling_orders || []).map(order),
    locations: [...slots].sort().map(slot => ({slot, candidates: tokens[slot] || []}))};
}

function validateRules(rules) {
  if (!rules || !Array.isArray(rules.orders) || !Array.isArray(rules.locations)) throw new Error('invalid-catalog-rules');
  const nullableText = value => value === null || typeof value === 'string';
  const nullableNumber = value => value === null || Number.isFinite(value);
  const visit = (orders, depth = 0) => {
    if (depth > 8 || !Array.isArray(orders)) throw new Error('invalid-catalog-orders');
    for (const o of orders) {
      if (o?.kind === 'Or') {
        if (!Array.isArray(o.options)) throw new Error('invalid-catalog-options');
        o.options.forEach(group => visit(group, depth + 1));
      } else if (!o || !['kind','name','id'].every(key => nullableText(o[key])) ||
          !['minScu','maxScu','minAmount','maxAmount','maxBoxScu'].every(key => nullableNumber(o[key]))) {
        throw new Error('invalid-catalog-order');
      }
    }
  };
  visit(rules.orders);
  if (!rules.locations.every(l => typeof l.slot === 'string' && Array.isArray(l.candidates) && l.candidates.every(c => typeof c === 'string'))) {
    throw new Error('invalid-catalog-locations');
  }
}

export function definitionQuantity(order) {
  if (!['Resource', 'Entity', 'MissionItem'].includes(order.kind)) return {status: 'review', unit: null};
  const unit = order.kind === 'Resource' ? 'SCU' : '개체';
  const min = unit === 'SCU' ? order.minScu : order.minAmount;
  const max = unit === 'SCU' ? order.maxScu : order.maxAmount;
  // The provider turns a zero/absent bound into null and displays the remaining
  // bound as one value. Retain that distinction instead of declaring it fixed.
  if (min === null && Number.isFinite(max) && max > 0) return {status: 'single-bound', value: max, unit};
  if (max === null && Number.isFinite(min) && min > 0) return {status: 'single-bound', value: min, unit};
  if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) {
    return min === max ? {status: 'equal-bounds', value: min, unit} : {status: 'range', min, max, unit};
  }
  return {status: 'unknown', unit};
}

export function summarizeDefinitionOrders(orders) {
  const groups = new Map(), choices = [];
  for (const order of orders) {
    if (order.kind === 'Or') { choices.push(order.options.map(summarizeDefinitionOrders)); continue; }
    const key = JSON.stringify(order);
    if (!groups.has(key)) groups.set(key, {order, occurrences: 0, quantity: definitionQuantity(order)});
    groups.get(key).occurrences++;
  }
  return {groups: [...groups.values()], choices};
}

export function definitionIndex(data) {
  if (data?.schemaVersion !== 1 || data.source !== 'https://api.star-citizen.wiki' ||
      typeof data.version !== 'string' || !Array.isArray(data.definitions)) throw new Error('invalid-catalog');
  const byId = new Map();
  for (const item of data.definitions) {
    if (!uuid.test(item.id || '') || byId.has(item.id) || typeof item.title !== 'string' ||
        typeof item.released !== 'boolean' || typeof item.notForRelease !== 'boolean') throw new Error('invalid-catalog-entry');
    if (item.rules !== undefined) validateRules(item.rules);
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
    rules: item.rules ?? null,
    source: `https://api.star-citizen.wiki/api/missions/${item.id}?version=${encodeURIComponent(item.version)}` };
}
