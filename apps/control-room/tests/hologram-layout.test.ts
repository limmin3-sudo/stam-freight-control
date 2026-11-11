import test from 'node:test';
import assert from 'node:assert/strict';
import {OrthographicCamera,Vector3} from 'three';
import {bodyRadius,hologramFrame,hologramPoints,mapPosition,bridgePartners,bridgePatches} from '../src/hologram-layout.ts';

test('readable shared map scale keeps the sun larger than every world without dominating the system',()=>{
 const star=hologramPoints.find(p=>p.type==='Star')!;
 const planets=hologramPoints.filter(p=>p.type==='Planet');
 assert.equal(planets.length,4);
 const largest=Math.max(...planets.map(bodyRadius));
 assert.ok(bodyRadius(star)>largest);
 assert.ok(bodyRadius(star)<=largest*2.2);
 assert.equal(bodyRadius(planets.find(p=>p.name==='Crusader')!),largest);
 const innerOrbit=Math.min(...planets.map(p=>Math.hypot(...mapPosition(p))));
 assert.ok(bodyRadius(star)<innerOrbit/3,'the sun must not fill the inner orbit');
});
test('station and planet identities retain canonical coordinates, independent of readable glyph sizes',()=>{
 assert.equal(new Set(hologramPoints.map(p=>p.id)).size,hologramPoints.length);
 for(const p of hologramPoints){const [x,y,z]=mapPosition(p);assert.ok(p.id.startsWith('stanton:'));assert.equal(x,p.position[0]!/1e10);assert.equal(y,p.position[2]!/1e10);assert.equal(z,-p.position[1]!/1e10);
  if(p.type==='Manmade')assert.ok(hologramPoints.some(parent=>parent.id===p.parentId&&parent.type==='Planet'));
 }
});
test('central partner layout preserves a clear corridor and background patches stay bounded',()=>{
 const a=bridgePartners.operator,b=bridgePartners.navigator;
 assert.ok(a.x<50&&b.x>50);assert.equal(a.height,b.height);
 // Full image width is half character height. Preserve a corridor even at their widest transparent bounds.
 const halfWidth=a.height*941/1672/4;
 assert.ok(a.x+halfWidth<50&&b.x-halfWidth>50);
 for(const patch of bridgePatches){assert.ok(patch.x>=0&&patch.y>=0&&patch.x+patch.width<=1672&&patch.y+patch.height<=941);}
});

test('overview frame contains every planet including the outer world in the wide bridge viewport',()=>{
 for(const aspect of [2.5,1.8,.9]){
  const height=Math.max(hologramFrame.minimumHeight,hologramFrame.width/aspect);
  const camera=new OrthographicCamera(-height*aspect/2,height*aspect/2,height/2,-height/2,.01,100);
  camera.position.set(...hologramFrame.tilt);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  for(const p of hologramPoints.filter(p=>p.type==='Planet'||p.type==='Star')){
   const position=new Vector3(...mapPosition(p)).project(camera),r=bodyRadius(p);
   assert.ok(Math.abs(position.y)+2*r/height<1,`${p.name} must fit vertically at ${aspect}`);
   assert.ok(Math.abs(position.x)+2*r/(height*aspect)<1,`${p.name} must fit horizontally at ${aspect}`);
  }
 }
});
