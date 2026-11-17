import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrew,changeCrew,crewTotals,crewSettlement,validateCrew} from '../crew-trade.mjs';
const start=()=>createCrew({id:'fleet',ownerUid:'a',name:'Captain',title:'Trade',capacity:8});
const change=(op,c)=>changeCrew(op,c,'a');
const member={uid:'b',name:'Pilot',ship:'Hull B',capacity:8,role:'pilot',active:true};
const assignment={id:'cargo',uid:'b',commodityId:1,from:1,to:2,planned:8,boxSize:2};
const event=(op,kind,amount,quantity=0,memberUid='b')=>change(op,{kind:'event',event:{id:'event-'+op.revision,kind,memberUid,amount,quantity,assignmentId:'cargo',note:'test'}});
function funded(){let op=change(start(),{kind:'member',member});op=change(op,{kind:'assignment',assignment});op=event(op,'capital',6000,0,'a');return event(op,'capital',4000);}
test('partial sale costs, funding, expense and capital-weighted settlement conserve exact money',()=>{
 let op=funded();op=event(op,'buy',8000,8);op=event(op,'sell',3000,2);op=event(op,'expense',300,0,'a');
 assert.equal(crewTotals(op).realized,700);assert.equal(crewTotals(op).remainingCost,6000);assert.equal(crewTotals(op).cash,4700);
 op=change(op,{kind:'review'});assert.throws(()=>change(op,{kind:'settle',id:'s'}),/crew-remaining/);
 op=event(op,'sell',9000,6);const result=crewSettlement(op);assert.deepEqual(result.payouts.map(p=>p.payout),[8220,5480]);assert.equal(result.net,3700);
 op=change(op,{kind:'settle',id:'s'});assert.equal(op.phase,'settled');assert.throws(()=>change(op,{kind:'undo'}),/crew-closed/);assert.equal(validateCrew(op),op);
});
test('custom profit ratios preserve contributed principal; losses always use contribution ratio',()=>{
 let op=funded();op=event(op,'buy',8000,8);op=event(op,'sell',12000,8);op=change(op,{kind:'shares',mode:'custom',shares:{a:2500,b:7500}});
 assert.deepEqual(crewSettlement(op).payouts.map(p=>[p.principal,p.profit]),[[6000,1000],[4000,3000]]);
 op=event(op,'expense',5000,0,'a');assert.deepEqual(crewSettlement(op).payouts.map(p=>[p.principal,p.loss,p.profit]),[[5400,600,0],[3600,400,0]]);
 assert.throws(()=>change(op,{kind:'shares',mode:'custom',shares:{a:3000,b:3000}}),/crew-shares/);
});
test('largest-remainder allocation conserves cents even at extreme supported capital',()=>{
 let op=change(start(),{kind:'member',member});op=change(op,{kind:'assignment',assignment});op=event(op,'capital',999999999999,0,'a');op=event(op,'capital',999999999998);op=event(op,'buy',1,8);op=event(op,'sell',2,8);
 const s=crewSettlement(op);assert.equal(s.payouts.reduce((n,p)=>n+p.payout,0),s.cash);assert.equal(s.payouts.reduce((n,p)=>n+p.profit,0),1);
});
test('overspending, overselling, wrong owner, overcapacity and fractional boxes are rejected without mutating input',()=>{
 const op=funded(),before=JSON.stringify(op);assert.throws(()=>event(op,'buy',10001,8),/crew-capital/);assert.throws(()=>event(op,'buy',100,1),/crew-cargo/);assert.throws(()=>event(op,'sell',100,2),/crew-quantity/);assert.throws(()=>changeCrew(op,{kind:'undo'},'b'),/crew-permission/);
 let bought=event(op,'buy',8000,8);assert.throws(()=>change(bought,{kind:'member',member:{...member,capacity:2}}),/crew-capacity/);assert.throws(()=>change(bought,{kind:'assignment',assignment:{...assignment,planned:10}}),/crew-assignment-started/);assert.equal(JSON.stringify(op),before);
});
test('undo retains audit event; settlement needs review and validates the frozen payout',()=>{
 let op=funded();op=event(op,'buy',8000,8);op=change(op,{kind:'undo'});assert.equal(crewTotals(op).cash,10000);assert.ok(op.events.at(-1).voidedAt);assert.throws(()=>change(op,{kind:'settle',id:'s'}),/crew-review/);op=change(op,{kind:'review'});op=change(op,{kind:'settle',id:'s'});const altered=structuredClone(op);altered.settlement.value.payouts[0].payout++;assert.throws(()=>validateCrew(altered),/crew-settlement/);
});
test('loss removes cargo at remaining historical cost, without inventing proceeds',()=>{
 let op=funded();op=event(op,'buy',8000,8);op=event(op,'loss',0,2);assert.equal(crewTotals(op).realized,-2000);assert.equal(crewTotals(op).cash,2000);op=event(op,'sell',6000,6);assert.equal(crewSettlement(op).payouts.reduce((n,p)=>n+p.loss,0),2000);
});
