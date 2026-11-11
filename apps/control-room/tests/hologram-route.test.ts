import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {displayRoute} from '../src/hologram-route.ts';

test('display routes stay straight when clear and bend outside an obstructing world',()=>{
 const from=new Vector3(-3,0,0),to=new Vector3(3,0,0),world={center:new Vector3(),radius:1};
 const unobstructed=displayRoute(from,to,[]);assert.equal(unobstructed.length,2);
 const path=displayRoute(from,to,[world]);assert.ok(path.length>2);
 assert.deepEqual(path[0],from);assert.deepEqual(path.at(-1),to);
 for(let i=1;i<path.length;i++){const a=path[i-1]!,b=path[i]!,ab=b.clone().sub(a);const t=Math.max(0,Math.min(1,world.center.clone().sub(a).dot(ab)/ab.lengthSq()));assert.ok(a.clone().addScaledVector(ab,t).distanceTo(world.center)>=world.radius);}
 // The display path must not mutate inputs used by canonical route data.
 assert.deepEqual(from.toArray(),[-3,0,0]);assert.deepEqual(to.toArray(),[3,0,0]);
});
test('unresolvable visual segments fail closed rather than cutting through an object',()=>{
 assert.deepEqual(displayRoute(new Vector3(),new Vector3(3,0,0),[{center:new Vector3(),radius:1}]),[]);
});
