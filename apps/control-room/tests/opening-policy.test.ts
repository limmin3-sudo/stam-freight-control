import test from 'node:test';
import assert from 'node:assert/strict';
import {openingEligible} from '../src/opening-policy.ts';
test('opening film is once per tab visit and never blocks a map or flight deep link',()=>{
 for(const hash of ['', '#/', '#/lounge?lang=ko']){assert.equal(openingEligible(hash,null),true);assert.equal(openingEligible(hash,'1'),false);}
 for(const hash of ['#/map?lang=ko','#/mission','#/operations','#/bridge'])assert.equal(openingEligible(hash,null),false);
});
