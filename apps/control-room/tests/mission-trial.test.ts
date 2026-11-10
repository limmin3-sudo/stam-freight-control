import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDraft, itinerary, jobVolume, samples } from '../src/mission-trial.ts';

test('split deliveries retain contract ownership, quantities and unload destinations', () => {
  const contract = samples.find(sample=>sample.id==='outpost')!;
  const other = samples.find(sample=>sample.id==='supply')!;
  const jobs = [contract,other];
  const stops = itinerary({...emptyDraft(),jobs});
  assert.deepEqual(stops.map(s=>s.place), ['hurston','arccorp','microtech','crusader','arccorp','microtech']);
  assert.equal(jobVolume(contract),24);
  for (const job of jobs) for (const row of job.shipments) {
    const movements=stops.flatMap(stop=>stop.tasks.filter(t=>t.job.id===job.id && t.shipment.id===row.id)
      .map(t=>[stop.place,t.load,t.shipment.scu]));
    assert.deepEqual(movements,[[row.from,true,row.scu],[row.to,false,row.scu]]);
  }
});
