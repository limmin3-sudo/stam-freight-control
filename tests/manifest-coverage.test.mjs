import test from 'node:test';import assert from 'node:assert/strict';
import {completeDemand} from '../integration/log/manifest-coverage.mjs';
import {parseLogLine} from '../integration/log/parser.mjs';
const orders=[{kind:'Resource',name:'Pollen',minScu:33,maxScu:33},{kind:'Resource',name:'Pollen',minScu:33,maxScu:33}];
const slots=[{slot:'Location|Address',candidates:['A']},{slot:'Destination|Address',candidates:['B']}];
const objectives=[{role:'pickup',status:'coordinate-match',candidates:[{name:'A'}]},{role:'dropoff',status:'coordinate-match',candidates:[{name:'B'}]}];
test('full fixed demand plus every address allows a guide route without guessing individual boxes',()=>{
 const rows=[{commodity:'Pollen',scu:66}];assert.equal(completeDemand(orders,slots,rows,objectives),true);
 assert.equal(completeDemand(orders,slots,[{commodity:'Pollen',scu:33}],objectives),false);
 assert.equal(completeDemand(orders,slots,rows,objectives.slice(1)),false);
 assert.equal(completeDemand([{...orders[0],minScu:null}],slots,rows,objectives),false);
 assert.equal(completeDemand([{kind:'Or',options:[orders]}],slots,rows,objectives),false);
});
test('cryopod count is an explicit entity count, not an SCU conversion for arbitrary entities',()=>{
 const line='<2026-11-04T10:00:00.000Z> [Notice] <SHUDEvent_OnNotification> Added notification "New Objective: Deliver 0/12 CryoPods to B: " [1] to queue. MissionId: [11111111-1111-4111-8111-111111111111], ObjectiveId: [dropoff_example]';
 const parsed=parseLogLine(line,{});assert.equal(parsed.event.unit,'count');assert.equal(parsed.event.total,12);
 assert.notEqual(parseLogLine(line.replace('CryoPods','Decari Pods'),{}).event?.type,'quantity-observed');
 assert.equal(completeDemand([{kind:'Entity',name:'CryoPod',minAmount:12,maxAmount:12}],slots,[{commodity:'CryoPod',scu:12}],objectives),true);
 assert.equal(completeDemand([{kind:'Entity',name:'Decari Pod',minAmount:12,maxAmount:12}],slots,[{commodity:'Decari Pod',scu:12}],objectives),false);
});
