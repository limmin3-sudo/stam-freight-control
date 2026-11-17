import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpaceRoute, spaceHash, spaceScreens, parentSpace } from '../src/space-navigation.ts';

test('new arrivals enter the division; old console deep links and all languages survive reload', () => {
  assert.deepEqual(parseSpaceRoute(''), { screen: 'division', locale: 'ko' });
  for (const screen of spaceScreens) for (const locale of ['ko', 'mix', 'en'] as const) {
    assert.deepEqual(parseSpaceRoute(spaceHash({ screen, locale })), { screen, locale });
  }
  assert.deepEqual(parseSpaceRoute('#/missing?lang=fr'), { screen: 'division', locale: 'ko' });
  assert.deepEqual(parseSpaceRoute('#/%zz?lang=en'), { screen: 'division', locale: 'en' });
  assert.equal(parentSpace('guide'), 'lounge');
  assert.equal(parentSpace('cinema'), 'lounge');
  assert.equal(parentSpace('map'), 'bridge');
});

test('Archive mission subpage preserves locale and rejects unrelated room views',()=>{
 for(const locale of ['ko','mix','en'] as const)for(const view of ['missions','ships','cargo'] as const){
  const route={screen:'information' as const,locale,view};
  assert.deepEqual(parseSpaceRoute(spaceHash(route)),route);
 }
 assert.deepEqual(parseSpaceRoute('#/service?lang=ko&view=missions'),{screen:'service',locale:'ko'});
 assert.deepEqual(parseSpaceRoute('#/information?lang=en&view=unknown'),{screen:'information',locale:'en'});
 assert.equal(spaceHash({screen:'lounge',locale:'ko',view:'missions'}),'#/lounge?lang=ko');
});

 test('service section deep links survive reload without leaking to other rooms',()=>{
 for(const locale of ['ko','mix','en'] as const) for(const serviceView of ['account','history','feedback','updates','manual'] as const){
  const route={screen:'service' as const,locale,serviceView};assert.deepEqual(parseSpaceRoute(spaceHash(route)),route);
 }
 assert.deepEqual(parseSpaceRoute('#/service?lang=ko&section=unknown'),{screen:'service',locale:'ko'});
 assert.equal(spaceHash({screen:'lounge',locale:'en',serviceView:'history'}),'#/lounge?lang=en');
 });

test('planned facility links stay on the division, preserve language and reject unrelated selections',()=>{
 for(const locale of ['ko','mix','en'] as const)for(const facility of ['trade','guide-center'] as const){
  const route={screen:'division' as const,locale,facility};assert.deepEqual(parseSpaceRoute(spaceHash(route)),route);
 }
 assert.deepEqual(parseSpaceRoute('#/division?lang=ko&facility=expansion-a'),{screen:'division',locale:'ko'});
 assert.deepEqual(parseSpaceRoute('#/mission?lang=en&facility=trade'),{screen:'mission',locale:'en'});
 assert.equal(spaceHash({screen:'lounge',locale:'en',facility:'trade'}),'#/lounge?lang=en');
});

test('lobby room links preserve locale and reject rooms belonging to another facility',()=>{
 for(const locale of ['ko','en','mix'] as const){
  const route={screen:'division' as const,locale,facility:'trade' as const,lobbyRoom:'market' as const};
  assert.deepEqual(parseSpaceRoute(spaceHash(route)),route);
  assert.deepEqual(parseSpaceRoute(`#/division?lang=${locale}&facility=guide-center&room=market`),{screen:'division',locale,facility:'guide-center'});
  assert.equal(spaceHash({...route,screen:'mission'}),`#/mission?lang=${locale}`);
 }
 assert.deepEqual(parseSpaceRoute('#/division?room=education'),{screen:'division',locale:'ko'});
 assert.deepEqual(parseSpaceRoute('#/division?facility=trade&room=unknown'),{screen:'division',locale:'ko',facility:'trade'});
});

test('trade advisor scope is preserved only inside trade planning',()=>{
 const route=parseSpaceRoute('#/division?lang=ko&facility=trade&room=planning&advisor=interstellar');assert.equal(route.tradeScope,'interstellar');assert.match(spaceHash(route),/advisor=interstellar/);
 assert.equal(parseSpaceRoute('#/division?facility=guide-center&room=education&advisor=interstellar').tradeScope,undefined);
 assert.equal(parseSpaceRoute('#/division?facility=trade&room=planning&advisor=invalid').tradeScope,undefined);
});
