import test from 'node:test';
import assert from 'node:assert/strict';
import {createEstimatedFlight,trackingPresentation} from '../integration/log/estimated-flight.mjs';

test('estimated movement pauses, resumes and stops at one planned visit without mutating route evidence',()=>{
  let now=1000;const leg=Object.freeze({nodes:Object.freeze(['start','gate','target']),seconds:10});
  const flight=createEstimatedFlight(leg,()=>now);
  now=3500;assert.equal(flight.snapshot().progress,.25);assert.equal(flight.snapshot().from,'start');
  flight.togglePause();now=30000;assert.equal(flight.snapshot().progress,.25);
  flight.togglePause();now=32500;assert.equal(flight.snapshot().from,'gate');
  now=40000;assert.equal(flight.snapshot().arrived,true);assert.equal(flight.snapshot().progress,1);
  assert.deepEqual(leg,{nodes:['start','gate','target'],seconds:10});
});
test('unknown or invalid travel time cannot silently become an estimated flight',()=>{
  for(const seconds of [0,-1,NaN,Infinity,undefined])assert.throws(()=>createEstimatedFlight({nodes:['a','b'],seconds}));
  assert.throws(()=>createEstimatedFlight({nodes:['a'],seconds:1}));
});
test('sync badge requires fresh verified position, never just logs, elapsed time or estimates',()=>{
  const now=10000;
  assert.equal(trackingPresentation({kind:'verified',observedAt:9000,now}).state,'synced');
  for(const input of [{kind:'estimated',observedAt:9000},{kind:'log',observedAt:9000},{kind:'verified',observedAt:4000},{kind:'verified',observedAt:11000},{kind:'verified'}])
    assert.notEqual(trackingPresentation({...input,now}).state,'synced');
  assert.equal(trackingPresentation({kind:'estimated',arrived:true}).title,'위치 확인 대기');
});
