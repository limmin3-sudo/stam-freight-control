import test from 'node:test';
import assert from 'node:assert/strict';
import source from '../../../data/log-location-index.json' with {type:'json'};
import {systemPoints,systemThemes,displayScale,displayPositions,displayRadius,markerKind,isBody,type SystemId} from '../src/hologram-catalogue.ts';

test('system switching preserves sourced coordinates and system-scoped identities',()=>{
 for(const system of ['stanton','pyro','nyx'] as SystemId[]){const points=systemPoints(system);assert.equal(points.filter(p=>p.type==='Star').length,1);assert.ok(displayScale(system)>0);
  for(const point of points){const original=source.locations.find(p=>p.system===system&&system+':'+p.id===point.id);assert.ok(original);assert.deepEqual(point.position,original.position);assert.equal(point.name,original.name);}
 }
 assert.equal(systemPoints('pyro').filter(p=>p.type==='Planet').length,6);
 assert.equal(systemPoints('nyx').filter(p=>p.type==='Planet').length,3);
});
test('latest palette keeps Stanton blue, Pyro amber and Nyx teal',()=>{
 const {stanton,pyro,nyx}=systemThemes;
 assert.ok(stanton.background[2]>stanton.background[1]&&stanton.background[1]>stanton.background[0]);
 assert.ok(pyro.background[0]>pyro.background[1]&&pyro.background[1]>pyro.background[2]);
 assert.ok(nyx.background[1]>nyx.background[2]&&nyx.background[2]>nyx.background[0]);
});

test('every sourced station is retained, including Lagrange facilities and moon-linked stations',()=>{
 for(const system of ['stanton','pyro','nyx'] as SystemId[]){
  const points=systemPoints(system),stations=source.locations.filter(p=>p.system===system&&p.type.startsWith('Manmade'));
  assert.equal(points.filter(p=>!isBody(p)).length,stations.length);
  for(const station of stations)assert.ok(points.some(p=>p.id===system+':'+station.id),station.name);
 }
 const stanton=systemPoints('stanton');
 assert.equal(stanton.filter(p=>markerKind(p)==='lagrange').length,18);
 for(const name of ['Grim HEX','Covalex Shipping Hub Gundo','HUR-L1 Green Glade Station','MIC-L5 Modern Icarus Station'])assert.ok(stanton.some(p=>p.name===name));
});
test('Lagrange stations retain stellar orbits, while orbital facilities clear exaggerated planet surfaces',()=>{
 for(const system of ['stanton','pyro','nyx'] as SystemId[]){
  const points=systemPoints(system),positions=displayPositions(system),scale=displayScale(system);
  for(const point of points){const pos=positions.get(point.id);assert.ok(pos&&pos.every(Number.isFinite),point.name);}
  for(const point of points.filter(p=>!isBody(p))){
   const parent=points.find(q=>q.id===point.parentId),pos=positions.get(point.id)!;
   if(parent?.type==='Star')assert.deepEqual(pos,[point.position[0]!/scale,point.position[2]!/scale,-point.position[1]!/scale],point.name+' must not collapse onto the star');
   if(parent?.type==='Planet'){const center=positions.get(parent.id)!;assert.ok(Math.hypot(...pos.map((n,i)=>n-center[i]!))>displayRadius(parent)*1.7,point.name+' must clear its planet');}
  }
 }
});
