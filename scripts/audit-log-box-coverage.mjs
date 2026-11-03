// Audit the public definition catalog; never generates or approves box recipes.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {definitionIndex,definitionQuantity} from '../integration/log/catalog.mjs';

const raw = await readFile(new URL('../data/log-mission-index.json',import.meta.url));
const data = JSON.parse(raw);
const index = definitionIndex(data);
const counts = {}, matrix = {}, rows = [];
for (const d of index.values()) {
  const orders = d.rules?.orders || [];
  const resourceOnly = orders.length > 0 && orders.every(o => o.kind === 'Resource');
  const quantities = resourceOnly ? orders.map(definitionQuantity) : [];
  const single = resourceOnly && quantities.every(q => ['single-bound','equal-bounds'].includes(q.status) && Number.isSafeInteger(q.value));
  const variable = resourceOnly && quantities.some(q => q.status === 'range');
  const caps = resourceOnly && orders.every(o => [1,2,4,8,16,24,32].includes(o.maxBoxScu));
  let category;
  if (!orders.length) category = 'no-orders';
  else if (orders.some(o => o.kind === 'Or')) category = 'choice-orders';
  else if (!resourceOnly) category = 'special-or-mixed-orders';
  else if (!caps) category = 'unsupported-box-limit';
  else if (variable) category = 'variable-scu-with-box-limits';
  else if (single) category = 'single-value-scu-with-box-limits';
  else category = 'unknown-scu';
  counts[category] = (counts[category] || 0) + 1;
  if (resourceOnly) {
    const key = `${single ? 'single-value' : variable ? 'variable' : 'unknown'} / ${caps ? 'supported-limit' : 'unsupported-limit'}`;
    matrix[key] = (matrix[key] || 0) + 1;
  }
  rows.push([d.id,d.title,category,orders.length,d.released,d.notForRelease,
    resourceOnly ? orders.map(o => o.maxBoxScu ?? 'unknown').join('|') : '',
    'unverified',`https://api.star-citizen.wiki/api/missions/${d.id}?version=${encodeURIComponent(data.version)}`]);
}
const summary = {schemaVersion:1, source:data.source, version:data.version,
  inputSha256:createHash('sha256').update(raw).digest('hex'), definitionCount:index.size,
  scope:data.scope, mutuallyExclusiveCategories:counts, resourceOnlyMatrix:matrix,
  exactBoxRecipesVerifiedByThisAudit:0,
  caveats:[
    'The public hauling representative/variant catalog is not guaranteed to contain every active in-game hauling definition.',
    'Single-value means API presentation, not proof of fixed quantity across instances. Null bounds must not be converted to zero.',
    'Unsupported box limit includes -1; no default, inheritance or maximum-32 rule is assumed.',
    'No recipe counts or shipment allocation are derived. Public order occurrences are not individual boxes.',
    'A valid exact recipe needs compatible build, verified generation rules and resolved runtime variable inputs.',
  ]};
const quote = value => '"'+String(value).replaceAll('"','""')+'"';
const header=['definition_id','title','category','top_level_order_count','released','not_for_release','box_limits_scu_in_order','exact_recipe_status','source'];
const csv=[header,...rows].map(row=>row.map(quote).join(',')).join('\n')+'\n';
await mkdir(new URL('../docs/audits/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/audits/mission-box-coverage.csv',import.meta.url),csv);
await writeFile(new URL('../docs/audits/mission-box-coverage.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({definitions:index.size,categories:counts,resourceOnlyMatrix:matrix,verifiedRecipes:0}));
