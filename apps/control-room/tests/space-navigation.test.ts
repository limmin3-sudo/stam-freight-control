import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpaceRoute, spaceHash, spaceScreens, parentSpace } from '../src/space-navigation.ts';

test('new arrivals enter the lounge; old console deep links and all languages survive reload', () => {
  assert.deepEqual(parseSpaceRoute(''), { screen: 'lounge', locale: 'ko' });
  for (const screen of spaceScreens) for (const locale of ['ko', 'mix', 'en'] as const) {
    assert.deepEqual(parseSpaceRoute(spaceHash({ screen, locale })), { screen, locale });
  }
  assert.deepEqual(parseSpaceRoute('#/missing?lang=fr'), { screen: 'lounge', locale: 'ko' });
  assert.deepEqual(parseSpaceRoute('#/%zz?lang=en'), { screen: 'lounge', locale: 'en' });
  assert.equal(parentSpace('guide'), 'lounge');
  assert.equal(parentSpace('cinema'), 'lounge');
  assert.equal(parentSpace('map'), 'bridge');
});
