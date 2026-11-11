import test from 'node:test';
import assert from 'node:assert/strict';
import {cargoShip,cargoPacking,cargoWorldCenter,manifestCargo,demoCargo} from '../src/cargo-plan.mjs';
import {emptyDraft,samples} from '../src/mission-trial.ts';

test('estimated cargo retains independent contract, shipment and box identity without changing input',()=>{
 const job=samples[0]!;
 const draft={...emptyDraft(),jobs:[job,{...job,id:'second-contract'}]};
 const before=JSON.stringify(draft);const {boxes}=manifestCargo(draft,'hurston');
 assert.equal(boxes.length,4);assert.equal(new Set(boxes.map(b=>b.boxId)).size,4);
 assert.deepEqual(new Set(boxes.map(b=>b.missionId)),new Set([job.id,'second-contract']));
 assert.ok(boxes.every(b=>b.estimated));assert.equal(JSON.stringify(draft),before);
});
test('unknown shares and conflicted receipts are excluded, never turned into confirmed boxes',()=>{
 const job=samples[0]!;
 const d={...emptyDraft(),jobs:[{...job,reservations:{arccorp:16}},{...job,id:'conflict',state:'conflict' as const}]};
 const result=manifestCargo(d,'hurston');assert.equal(result.boxes.length,0);assert.equal(result.unresolved.length,2);
});
test('disabled grids and aboard coordinates survive the presentation adapter',()=>{
 const ship=cargoShip('misc-hull-b');const items=demoCargo();
 const first=cargoPacking(ship,items)!;assert.ok(first);
 const fixed={...first.boxes[0]!,aboard:true};
 const next=cargoPacking(ship,items.filter(b=>b.boxId!==fixed.boxId),[fixed])!;
 assert.deepEqual(next.boxes.find(b=>b.boxId===fixed.boxId),fixed);
 const disabled=cargoShip(ship.id,[ship.grids[fixed.bin]!.id]);
 assert.equal(cargoPacking(disabled,[],[fixed]),null);
 assert.ok(cargoPacking(disabled,items)!.boxes.every(b=>b.bin!==fixed.bin));
});
test('downward and outward attachment transforms preserve physical grid centres and direction',()=>{
 for(const id of ['misc-hull-b','argo-raft','drake-golem-ox']){
  const ship=cargoShip(id);const packing=cargoPacking(ship,[demoCargo()[5]!])!;assert.ok(packing);
  const box=packing.boxes[0]!;const g=ship.grids[box.bin]!;const p=cargoWorldCenter(g,box);
  assert.ok(g._stack);assert.ok(p.every(Number.isFinite));
  if(g._stack==='down')assert.ok(p[1]!>g.y+g.h/2);
  else {const mid=g.x+g.w/2;assert.ok(mid<0?p[0]!>mid:p[0]!<mid);}
 }
});
test('cryopods remain 1 SCU with half-height footprints and cannot prop an ordinary crate on an odd pod',()=>{
 const ship=cargoShip('drake-cutlass-black');
 const pod={...demoCargo()[5]!,_cargoShape:'cryopod'};
 const packed=cargoPacking(ship,[pod])!;
 assert.equal(packed.used,1);assert.equal(packed.boxes[0]!.dims[1],.5);
 assert.equal(packed.boxes[0]!.dims.reduce((a,b)=>a*b,1),1);
});

test('confirmed cryopod profiles and SCMDB size limits survive manifest conversion',()=>{
 const job=samples[0]!;
 const d={...emptyDraft(),jobs:[{...job,shipments:[{...job.shipments[0]!,cargo:['냉동 포드','CryoPod'] as [string,string],cargoShape:'cryopod',scu:3}]}]};
 const pods=manifestCargo(d,'hurston').boxes;
 assert.equal(pods.length,3);assert.ok(pods.every(b=>b.size===1&&b._cargoShape==='cryopod'));
 const ordinary={...d,jobs:[{...job,shipments:[{...job.shipments[0]!,maxBoxSize:2}]}]};
 assert.ok(manifestCargo(ordinary,'hurston').boxes.every(b=>b.size<=2));
 const missing={...d,jobs:[{...d.jobs[0]!,shipments:[{...d.jobs[0]!.shipments[0]!,cargoShape:undefined}]}]};
 assert.equal(manifestCargo(missing,'hurston').boxes.length,0);
});
test('an odd half-height pod cannot support ordinary crates',()=>{
 const base=cargoShip('drake-cutlass-black');
 const ship={...base,grids:[{...base.grids[0]!,w:1,h:2,l:2,x:0,y:0,z:0,rotation:[0,0,0]}]};
 const pod={...demoCargo()[5]!,_cargoShape:'cryopod'};
 const first=cargoPacking(ship,[pod])!;
 const ordinary={...demoCargo()[6]!,boxId:'ordinary'};
 assert.equal(cargoPacking(ship,[ordinary],first.boxes),null);
 const pair=cargoPacking(ship,[{...pod,boxId:'pod-two'}],first.boxes)!;
 assert.ok(cargoPacking(ship,[ordinary],pair.boxes));
});
