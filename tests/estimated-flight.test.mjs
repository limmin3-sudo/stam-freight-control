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
test('route display stays a planning estimate even if old position metadata is supplied',()=>{
  assert.equal(trackingPresentation({kind:'verified',observedAt:Date.now(),continuous:true,sampleCount:3}).title,'항로 안내 대기');
  assert.equal(trackingPresentation({kind:'estimated',arrived:true}).title,'예상 구간 이동 완료');
  assert.equal(trackingPresentation({kind:'estimated',paused:true}).title,'예상 이동 일시정지');
  assert.equal(trackingPresentation({kind:'estimated'}).state,'estimated');
});
