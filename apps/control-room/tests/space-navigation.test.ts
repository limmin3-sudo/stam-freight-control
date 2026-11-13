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

test('Archive mission subpage preserves locale and rejects unrelated room views',()=>{
 for(const locale of ['ko','mix','en'] as const){
  const route={screen:'information' as const,locale,view:'missions' as const};
  assert.deepEqual(parseSpaceRoute(spaceHash(route)),route);
 }
 assert.deepEqual(parseSpaceRoute('#/service?lang=ko&view=missions'),{screen:'service',locale:'ko'});
 assert.deepEqual(parseSpaceRoute('#/information?lang=en&view=unknown'),{screen:'information',locale:'en'});
 assert.equal(spaceHash({screen:'lounge',locale:'ko',view:'missions'}),'#/lounge?lang=ko');
});
