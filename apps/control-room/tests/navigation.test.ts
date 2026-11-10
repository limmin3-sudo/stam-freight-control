import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeHash, stations } from '../src/navigation.ts';

test('every console and display language survives reloadable hash navigation', () => {
  for (const screen of ['bridge', ...stations] as const) {
    for (const locale of ['ko', 'mix', 'en'] as const) {
      const route = { screen, locale };
      assert.deepEqual(parseRoute(routeHash(route)), route);
    }
  }
});

test('unknown routes and malformed languages fall back without navigation outside the bridge', () => {
  for (const hash of ['', '#/missing?lang=fr', '#/https://example.com', '#/%zz?lang=%zz']) {
    assert.deepEqual(parseRoute(hash), { screen: 'bridge', locale: 'ko' });
  }
  assert.deepEqual(parseRoute('#/missing?lang=en'), { screen: 'bridge', locale: 'en' });
});
