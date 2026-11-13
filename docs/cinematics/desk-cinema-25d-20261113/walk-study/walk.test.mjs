import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../../../apps/control-room/node_modules/three/build/three.module.js';
import {walkAt,footAt,walkDuration,legReferences} from './walk-solver.mjs';
import {createPhotoWalkRig} from './photo-walk-rig.js';
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

test('three steps alternate and finish with both feet on the ground',()=>{
 const landings=[];let before=[footAt(0,0),footAt(0,1)];
 for(let t=.001;t<=walkDuration()+.0001;t+=.001){const now=[footAt(t,0),footAt(t,1)];for(let i=0;i<2;i++)if(before[i].swing&&!now[i].swing)landings.push(i);before=now;}
 assert.deepEqual(landings,[1,0,1]);
 assert.ok(walkAt(walkDuration()).legs.every(l=>!l.foot.swing&&l.foot.toe[1]===0));
});
test('a planted foot stays fixed while the body advances; bones do not stretch',()=>{
 for(let t=0;t<walkDuration()-.005;t+=.005){
  const current=walkAt(t);for(let i=0;i<2;i++){
   const a=current.legs[i],b=footAt(t+.001,i);
   assert.ok(a.reachError<.001,`unreachable leg ${i} at ${t}`);
   assert.ok(Math.abs(distance(a.hip,a.knee)-a.l1)<.001);
   assert.ok(Math.abs(distance(a.knee,a.ankle)-a.l2)<.001);
   if(!a.foot.swing&&!b.swing&&a.foot.cycle===b.cycle){assert.ok(distance(a.foot.toe,b.toe)<.0001);assert.equal(a.foot.toe[1],0);}
  }
 }
});
test('rendered skeleton puts toes at the same contact targets and retains upper-body image UVs',()=>{
 const texture=new THREE.Texture();texture.image={width:887,height:1774};const rig=createPhotoWalkRig(THREE,texture);
 const originalUV=Array.from(rig.body.geometry.attributes.uv.array);
 for(const t of [0,.08,.3,.7,1.2,1.8,walkDuration()]){
  const pose=rig.update(t);
  for(let i=0;i<2;i++){
   const leg=rig.legs[i],matrix=new THREE.Matrix4().multiplyMatrices(leg.ankle.matrixWorld,leg.mesh.skeleton.boneInverses[2]);
   const actual=new THREE.Vector3(...legReferences[i].toe,0).applyMatrix4(matrix);
   assert.ok(distance(actual.toArray(),pose.legs[i].foot.toe)<.001);
  }
  assert.deepEqual(Array.from(rig.body.geometry.attributes.uv.array),originalUV);
  assert.equal(rig.body.material.map,texture);assert.deepEqual(rig.body.scale.toArray(),[1,1,1]);
 }
 rig.dispose();texture.dispose();
});
