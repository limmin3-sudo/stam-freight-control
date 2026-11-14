import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDraft,samples} from '../src/mission-trial.ts';
import {draftCargoShip} from '../src/ship-profile.mjs';
import {capacity,cargoShip} from '../src/cargo-plan.mjs';
import {calculateFlight} from '../src/flight-engine.mjs';
import {blankRun,startRun,completeStep,contextOf} from '../src/flight-session.ts';

test('mission profile and actual planner agree on disabled grids, restored settings and explicit re-enable',()=>{
 const draft={...emptyDraft(),partner:'navigator' as const,jobs:[samples[0]!]};
 const base=draftCargoShip(draft),disabled=[base.grids[0]!.id];
 assert.equal(capacity(base),46);
 assert.equal(capacity(draftCargoShip(draft,disabled)),40);
 const plan=calculateFlight(draft,{disabledGrids:disabled});
 assert.equal(plan.capacity,40);
 assert.ok(plan.visits.flatMap(v=>v.packing.boxes).every(b=>b.bin!==0));
 const restored={...draft,settings:{disabledGrids:{[base.id]:disabled}}};
 assert.equal(capacity(draftCargoShip(restored)),calculateFlight(restored).capacity);
 assert.equal(capacity(draftCargoShip(restored,[])),46);
 assert.equal(calculateFlight(restored,{disabledGrids:[]}).capacity,46);
 assert.equal(capacity(draftCargoShip({...draft,ship:'C2 Hercules'})),696);
 assert.equal(capacity(draftCargoShip(draft,base.grids.map(g=>g.id))),0);
 assert.equal(calculateFlight({...draft,partner:'operator'},{disabledGrids:disabled}).capacity,null);
});

test('custom profiles including a preset ID retain dimensions, disabled flags and attachment frames',()=>{
 const base=cargoShip('misc-hull-b');
 const customShip={...base,name:'Restored profile',grids:base.grids.slice(0,2).map((g,i)=>({...g,disabled:i===0}))};
 const draft={...emptyDraft(),partner:'navigator' as const,ship:base.id,customShip,jobs:[samples[0]!]};
 const before=JSON.stringify(customShip);
 const selected=draftCargoShip(draft);
 assert.equal(selected.grids.length,2);
 assert.equal(capacity(selected),32);
 assert.equal(calculateFlight(draft).capacity,32);
 assert.equal(capacity(draftCargoShip(draft,[])),64);
 assert.deepEqual(selected.grids.map(g=>g._world),customShip.grids.map(g=>g._world));
 assert.equal(JSON.stringify(customShip),before);
});

test('remaining route keeps disabled bins and exact aboard cargo coordinates and ownership',()=>{
 const draft={...emptyDraft(),partner:'navigator' as const,jobs:[samples[0]!]};
 const disabledGrids=[draftCargoShip(draft).grids[0]!.id];
 const plan=calculateFlight(draft,{disabledGrids});
 const run=completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000);
 assert.equal(run.aboard.reduce((n,b)=>n+b.size,0),16);
 const before=JSON.stringify(run);
 const next=calculateFlight(draft,{...contextOf(run),disabledGrids:plan.ship.grids.filter(g=>g.disabled).map(g=>g.id)});
 assert.equal(next.capacity,40);
 assert.deepEqual(next.initialPacking.boxes,run.aboard);
 assert.equal(JSON.stringify(run),before);
});
