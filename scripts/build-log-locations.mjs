// Project public API positions only. No game files, translations or user logs.
import {readFile, writeFile, rename, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {locationIndex, LOCATION_SOURCE} from '../integration/log/locations.mjs';

const {values} = parseArgs({options: {input: {type: 'string'}, output: {type: 'string'}, 'retrieved-at': {type: 'string'}}});
if (!values.input || !values.output || !values['retrieved-at']) throw new Error('Required: --input <public-response.json> --output <file.json> --retrieved-at <ISO timestamp>');
const raw = await readFile(values.input);
const {data: rows} = JSON.parse(raw);
const data = {schemaVersion: 1, source: LOCATION_SOURCE, units: 'meters',
  // This endpoint does NOT implement the version query parameter. Never borrow
  // the missions API's version or claim this response is a pinned game build.
  version: null, retrievedAt: values['retrieved-at'],
  sourceSha256: createHash('sha256').update(raw).digest('hex'),
  attribution: 'Star Citizen Wiki API / Cloud Imperium Games',
  scope: 'Public coordinate snapshot; parent-relative surface matches only. No runtime zone IDs or cargo allocations.',
  locations: rows.map(p => ({id: p.uuid || null, name: p.name, system: p.system, type: p.type,
    parentId: p.parent_uuid ?? null, position: [p.x, p.y, p.z]}))};
const index = locationIndex(data);
const temp = `${values.output}.${process.pid}.tmp`;
try {
  await writeFile(temp, JSON.stringify(data) + '\n', {flag: 'wx'});
  await rename(temp, values.output);
} finally { await rm(temp, {force: true}); }
console.log(`Public locations: ${data.locations.length}; parent-relative entries: ${index.indexed}`);
