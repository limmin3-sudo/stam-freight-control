import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planRoute as rawPlan} from '../engine.mjs';
import {planRoute,planRoutesOnly,withDeparture,currentPosition} from '../route-departure.mjs';
import {stepNumbers} from '../route-display.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/locations.json',import.meta.url))),id=n=>data.locations.find(l=>l.name===n).id;
const start=id('New Babbage'),pickup=id('Orison'),dropoff=id('Orbituary');
const missions=[{id:'origin-check',cargo:[{commodity:'Organics',scu:64,pickupId:pickup,dropoffId:dropoff,maxBoxSize:8,_maxBoxSource:'wiki',boxes:[]}]}];
test('departure is step 1 and the original travel leg, packing and navigator order stay intact',()=>{
 const raw=rawPlan(data,missions,start,{routePolicy:'batch'}),p=planRoute(data,missions,start,{routePolicy:'batch'});
 assert.equal(p.visits[0].locationId,start);assert.equal(p.visits[0].events[0].type,'departure');
 assert.equal(p.visits[1].locationId,pickup);assert.deepEqual(p.visits[1].leg.nodes,[start,pickup]);assert.ok(p.visits[1].leg.meters>0);
 assert.deepEqual(p.visits.slice(1),raw.visits);assert.equal(p.seconds,raw.seconds);assert.deepEqual(p.shipments,raw.shipments);
 assert.equal(stepNumbers(p.visits,new Map(data.locations.map(l=>[l.id,l]))).stop[0],1);
 assert.strictEqual(withDeparture(p),p);
});
test('simple routes and operator routes also retain departure and the first leg',()=>{
 for(const planner of [planRoute,planRoutesOnly]){const p=planner(data,missions,start,{routePolicy:'delivery-first'});assert.equal(p.visits[0].locationId,start);assert.equal(p.visits[1].leg.nodes[0],start);}
});
test('replanning before the first pickup uses the actual origin, not the pickup',()=>{
 const p=planRoute(data,missions,start);assert.equal(currentPosition({log:[],startId:pickup},p),start);
 assert.equal(currentPosition({log:[{locationId:start}],startId:start},p),start);
 assert.equal(currentPosition({log:[{locationId:start},{jump:0,locationId:'exit'}],startId:start},p),'exit');
 assert.equal(currentPosition({log:[{locationId:start}],positionId:'relocated'},p),'relocated');
 const first=p.visits[1],resume={picked:first.events.map(e=>e.shipmentId),delivered:[],aboard:first.packing.boxes};
 const raw=rawPlan(data,missions,pickup,{resume}),continued=planRoute(data,missions,pickup,{resume});
 assert.deepEqual(continued.visits,raw.visits);assert.deepEqual(continued.initialPacking,first.packing);
});
