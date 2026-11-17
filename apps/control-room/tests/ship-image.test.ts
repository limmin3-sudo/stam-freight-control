import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {shipImageRecord} from '../src/ship-image.ts';
const catalog=JSON.parse(readFileSync(new URL('../src/ship-image-catalog.json',import.meta.url),'utf8'));
const fleet=JSON.parse(readFileSync(new URL('../../../data/ships.json',import.meta.url),'utf8'));
test('every supported ship has a local, traceable image with the recorded content hash',()=>{
 assert.equal(catalog.ships.length,fleet.length);
 for(const ship of fleet){
  const image=shipImageRecord(ship.id);assert.ok(image,ship.id);
  const bytes=readFileSync(new URL('../src/assets/ships/'+image.file,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),image.sha256);
  assert.ok(image.sourceUrl.startsWith('https://'));assert.ok(bytes.length>1000);
 }
});
test('legacy selected-ship aliases resolve; unknown custom vessels never show another ship',()=>{
 assert.equal(shipImageRecord('Cutlass Black')?.id,'drake-cutlass-black');
 assert.equal(shipImageRecord('C2 Hercules')?.id,'crusader-c2-hercules-starlifter');
 assert.equal(shipImageRecord('custom-ship'),undefined);
 assert.equal(shipImageRecord('rsi-constellation-phoenix-emerald')?.sourceName,'Constellation Phoenix Emerald');
});
