import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceDraft,practiceJobs} from '../src/guide-practice.ts';
import {jobVolume} from '../src/mission-trial.ts';
import {calculateFlight} from '../src/flight-engine.mjs';
import {blankRun,startRun,completeStep,undoStep} from '../src/flight-session.ts';

test('confirmed Hull B exercise has independent copies of the six resolved contracts, 363 SCU and no real instance ids',()=>{
 const a=practiceJobs(),b=practiceJobs();assert.equal(a.length,6);assert.equal(a.reduce((n,j)=>n+jobVolume(j),0),363);
 assert.equal(new Set(a.flatMap(j=>j.shipments.map(s=>s.id))).size,a.flatMap(j=>j.shipments).length);
 assert(a.every(j=>j.id.startsWith('practice-')&&j.rewardUnknown&&!j.signature));
 a[0]!.shipments[0]!.scu=900;assert.equal(b[0]!.shipments[0]!.scu,2);assert.deepEqual(practiceDraft().jobs,[]);
});
for(const partner of ['navigator','operator'] as const)test(`practice ${partner}: calculated cross-system run finishes with independent ownership and supports undo`,()=>{
 const draft={...practiceDraft(),partner,jobs:practiceJobs()},before=JSON.stringify(draft),plan=calculateFlight(draft);
 assert.equal(JSON.stringify(draft),before);assert.equal(plan.ship.id,'misc-hull-b');assert.equal(plan.mode,partner==='operator'?'simple':'detail');
 assert(plan.visits.some(v=>v.jumps.length));if(partner==='navigator'){assert.equal(plan.peak,363);assert.equal(plan.capacity,512);}
 let run=startRun(blankRun(plan),1000),actions=0;
 while(!run.finished&&actions<100){run=completeStep(plan,run,2000+actions++*1000);}
 assert(run.finished);assert.equal(run.aboard.length,0);assert.equal(run.index,plan.visits.length);assert(actions>plan.visits.length);
 assert(!undoStep(run).finished);assert.equal(practiceDraft().jobs.length,0);
});
