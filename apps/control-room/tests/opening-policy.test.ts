import test from 'node:test';
import assert from 'node:assert/strict';
import {openingEligible} from '../src/opening-policy.ts';

test('first departure opens only on a fresh site visit without a direct route', () => {
  for (const hash of ['', '#/', '#/?lang=en']) {
    assert.equal(openingEligible(hash, null), true);
    assert.equal(openingEligible(hash, '1'), false);
    assert.equal(openingEligible(hash, null, '1'), false);
  }
  for (const hash of ['#/division', '#/division?lang=en', '#/lounge?lang=ko', '#/cinema', '#/map?lang=ko', '#/mission', '#/operations',
    '#/bridge', '#/division?lang=ko&facility=trade', '#/division?facility=guide-center&lesson=trade']) {
    assert.equal(openingEligible(hash, null), false);
  }
});
