// Build from separately downloaded public Wiki API responses; no game/localization extraction.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { definitionIndex, projectDefinitionRules } from '../integration/log/catalog.mjs';

const { values } = parseArgs({ options: { cache: { type: 'string' }, index: { type: 'string' }, output: { type: 'string' } } });
if (!values.cache || !values.index || !values.output) throw new Error('Required: --cache <public-api-directory> --index <public-catalog-index.json> --output <file.json>');
const input = JSON.parse(await readFile(values.index, 'utf8'));
const versions = new Set(input.map(r => r.version));
if (versions.size !== 1) throw new Error('mixed-catalog-versions');
const definitions = [];
for (const row of input) {
  if (!/^[a-f\d-]{36}$/.test(row.definition_id)) throw new Error('invalid-definition-id');
  const { data } = JSON.parse(await readFile(resolve(values.cache, row.definition_id + '.json'), 'utf8'));
  if (data.uuid !== row.definition_id || data.version !== row.version) throw new Error('catalog-response-mismatch');
  definitions.push({ id: data.uuid, title: data.title, parents: row.representative_ids,
    released: data.released, notForRelease: data.not_for_release, rules: projectDefinitionRules(data) });
}
definitions.sort((a, b) => a.id.localeCompare(b.id));
const data = { schemaVersion: 1, source: 'https://api.star-citizen.wiki', version: [...versions][0],
  scope: 'Public has_hauling representatives and variants, including mission items and unreleased variants. Definition identities, order bounds and location candidates; NOT runtime manifests or actual box distributions.', definitions };
definitionIndex(data);
await writeFile(values.output, JSON.stringify(data) + '\n');
console.log(`Public definition references: ${definitions.length}`);
