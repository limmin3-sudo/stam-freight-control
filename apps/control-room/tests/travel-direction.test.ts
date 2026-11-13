import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isReturnTravel} from '../src/travel-direction.ts';

test('rooms and consoles pull back to a hub; gate and console entry stay forward',()=>{
 for(const room of ['information','service','cinema'] as const) assert.equal(isReturnTravel(room,'lounge'),true);
 for(const console of ['mission','map','operations'] as const) assert.equal(isReturnTravel(console,'bridge'),true);
 assert.equal(isReturnTravel('bridge','lounge'),true);
 assert.equal(isReturnTravel('lounge','bridge'),false);
 assert.equal(isReturnTravel('lounge','information'),false);
 assert.equal(isReturnTravel('bridge','map'),false);
 assert.equal(isReturnTravel('mission','operations'),false);
});
