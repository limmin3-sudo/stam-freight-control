import test from 'node:test';
import assert from 'node:assert/strict';
import {isOpeningReplay, openingEligible, openingReplayHash} from '../src/opening-policy.ts';

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

test('the service centre can request the welcome page explicitly', () => {
  for (const locale of ['ko', 'en', 'mix'] as const) {
    const hash = openingReplayHash(locale);
    assert.equal(isOpeningReplay(hash), true);
    assert.equal(openingEligible(hash, null), false);
  }
  assert.equal(isOpeningReplay('#/service?lang=ko'), false);
  assert.equal(isOpeningReplay('#/service?lang=ko&opening=1'), false);
  assert.equal(isOpeningReplay('#/division?lang=ko&opening=replay'), false);
});
