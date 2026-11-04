import test from 'node:test';import assert from 'node:assert/strict';
import {createPositionFeed,parsePositionPaste,systemReferencePosition} from '../integration/log/position-feed.mjs';
test('showlocation input requires an explicit system and does not accept mission marker or overlay coordinates',()=>{
  assert.deepEqual(parsePositionPaste('Coordinates: x:12850457093 y:0 z:-1.25','stanton'),{system:'stanton',position:[12850457093,0,-1.25],frame:'game-system-m'});
  assert.deepEqual(parsePositionPaste(' coordinates: X:+1.25e+3, y:-.5 z:0.0 \n','pyro').position,[1250,-.5,0]);
  for(const input of ['position [x: 1, y: 2, z: 3]','Zone: SolarSystem Pos: 1km 2km 3m','x:1 y:2 z:3','Coordinates: x:NaN y:2 z:3','Coordinates: x:1e999 y:0 z:0','Coordinates: x:1 y:2 z:3 trailing log'])
    assert.throws(()=>parsePositionPaste(input,'stanton'));
  assert.throws(()=>parsePositionPaste('Coordinates: x:1 y:2 z:3',''));
});
test('last confirmed place and pasted coordinates retain distinct evidence without invented freshness or map transform',()=>{
  let now=1000;const locations=[{id:'a',name:'Place A',system:'stanton'}],feed=createPositionFeed({locations,now:()=>now}),received=[];
  const unsubscribe=feed.subscribe(value=>received.push(value));
  assert.throws(()=>feed.confirmPlace('other'));assert.equal(feed.snapshot(),null);
  const place=feed.confirmPlace('a');assert.equal(place.confirmedAt,1000);assert.equal(place.source,'user-confirmed');
  place.name='mutated';assert.equal(feed.snapshot().name,'Place A');now=2000;
  const coordinates=feed.receiveCoordinates('Coordinates: x:1 y:2 z:3','pyro');
  assert.equal(coordinates.observedAt,null);assert.equal(coordinates.receivedAt,2000);assert.equal(coordinates.mapping,'reference-system');assert.equal(coordinates.liveVerified,false);assert.equal(coordinates.surfaceCalibrated,false);
  assert.equal(coordinates.locationId,undefined);assert.equal(coordinates.kind,'coordinates');
  feed.clear();assert.equal(received.at(-1),null);unsubscribe();feed.confirmPlace('a');assert.equal(received.length,4);
});

test('Pyro game coordinates rotate back to the reference system without changing source data or z',()=>{
 const input=[34178602716.244999,40592012681.869659,5875.998474],copy=[...input];
 const point=systemReferencePosition('pyro',input),reference=[-37609223453.247,37435743642.387,6727.803];
 assert.ok(Math.hypot(...point.map((n,i)=>n-reference[i]))<4000);
 assert.equal(point[2],input[2]);assert.deepEqual(input,copy);
 assert.deepEqual(systemReferencePosition('stanton',input),input);
 assert.deepEqual(systemReferencePosition('nyx',input),input);
});
test('companion samples update the chart once but never imply continuous or surface-calibrated tracking',()=>{
 const feed=createPositionFeed({now:()=>1000000}),point={source:'showlocation-clipboard',receivedAt:1000000,position:[1,2,3],system:'stanton'};let changes=0;feed.subscribe(()=>changes++);
 feed.receiveCompanion(point);feed.receiveCompanion(point);assert.equal(changes,2);assert.equal(feed.snapshot().liveVerified,false);
 feed.receiveCompanion({...point,receivedAt:1});assert.equal(changes,2);
 feed.receiveCompanion({...point,source:'arbitrary'});assert.equal(changes,2);
});
