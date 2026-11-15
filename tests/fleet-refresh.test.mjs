import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,rename} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {versionedUrl,readWikiPages,selectVehicle,driveFromItem,publishFiles} from '../scripts/refresh-fleet.mjs';
const version='4.10.3-LIVE.13165946';
test('every fleet page stays pinned and rejects incomplete, repeated or mixed-version data',async()=>{
 const urls=[],pages=[{data:[{uuid:'a',version}],meta:{current_page:1,total:2},links:{next:'https://api.star-citizen.wiki/api/vehicles?page%5Bnumber%5D=2'}},{data:[{uuid:'b',version}],meta:{current_page:2,total:2},links:{next:null}}];
 const get=async url=>{urls.push(url);return pages[Number(new URL(url).searchParams.get('page[number]')||1)-1];};
 assert.equal((await readWikiPages('vehicles',version,get)).length,2);assert.ok(urls.every(url=>new URL(url).searchParams.get('version')===version));
 pages[1].data[0].version='4.10.2-LIVE.12881860';await assert.rejects(readWikiPages('vehicles',version,get),/Mixed version/);
 pages[1].data[0]={uuid:'a',version};await assert.rejects(readWikiPages('vehicles',version,get),/Incomplete/);
 assert.throws(()=>versionedUrl('https://example.com/api/vehicles',version),/origin/);
});
test('fleet identity never substitutes a similarly named variant and drive values cannot be invented',()=>{
 const index=[{uuid:'a',slug:'one',name:'Ship'},{uuid:'b',slug:'two',name:'Ship'}];
 assert.equal(selectVehicle({id:'local',name:'Ship'},index,{sourceUrl:'https://api.star-citizen.wiki/api/vehicles/b?version=old'}).uuid,'b');
 assert.throws(()=>selectVehicle({id:'local',name:'Ship'},index),/ambiguous/);
 assert.throws(()=>driveFromItem({name:'Missing',uuid:'x',type:'QuantumDrive',version},version),/Incomplete/);
});
test('a failed multi-file publish restores the original performance, drive and lookup files',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'stam-fleet-'));try{
  await writeFile(path.join(directory,'performance'),'old performance');await writeFile(path.join(directory,'quantum'),'old quantum');
  let n=0;await assert.rejects(publishFiles(directory,{performance:'new performance',quantum:'new quantum',audit:'new audit'},{renameImpl:async(a,b)=>{if(++n===2)throw Error('disk error');await rename(a,b);}}),/disk error/);
  assert.equal(await readFile(path.join(directory,'performance'),'utf8'),'old performance');assert.equal(await readFile(path.join(directory,'quantum'),'utf8'),'old quantum');await assert.rejects(readFile(path.join(directory,'audit')),/ENOENT/);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('a removed variant retains its exact old drive choices rather than silently using current base-ship values',async()=>{
 const {compatibleQuantumDrives,resolveQuantumDrive}=await import('../quantum.mjs');
 const old={id:'same-id',name:'Factory',size:2,version:'old',maxSpeed:100},current={...old,version,maxSpeed:200};
 const profile={updateStatus:'retained',factoryDrive:old,factoryDriveId:old.id,cachedDrives:[old],compatibleDriveIds:[old.id],minDriveSize:2,maxDriveSize:2,editable:true};
 assert.equal(compatibleQuantumDrives({drives:[current]},profile)[0].maxSpeed,100);
 assert.equal(resolveQuantumDrive({drives:[current]},profile,{driveMode:'catalog',driveId:old.id}).drive.version,'old');
});

test('community geometry refresh preserves IDs, user restrictions and saved ship snapshots',async()=>{
 const {reconcileCommunityGrids}=await import('../scripts/fleet-grids.mjs');
 const ship={id:'cargo',name:'Cargo',source:'SuperCargo cargoGrids.ts (community reference)',grids:[{id:'hold',w:2,h:2,l:4,x:0,y:0,z:0,maxBoxSize:16,noUpright:[2],disabled:true}]};
 const before=structuredClone(ship),upstream={layout:'datamine',grids:[{id:'hold',w:2,h:2,l:4,x:1,y:0,z:0}]};
 const result=reconcileCommunityGrids([ship],'  "Cargo": '+JSON.stringify(upstream)+',');
 assert.deepEqual(ship,before);assert.equal(result.ships[0].grids[0].x,1);assert.deepEqual(result.ships[0].grids[0].noUpright,[2]);assert.equal(result.ships[0].grids[0].disabled,true);
 upstream.grids[0].id='renamed';const unresolved=reconcileCommunityGrids([ship],'  "Cargo": '+JSON.stringify(upstream)+',');assert.deepEqual(unresolved.ships[0],ship);assert.equal(unresolved.unresolved.length,1);
});

test('reference hull corrections are not reset to upstream schematic coordinates',async()=>{
 const {reconcileCommunityGrids}=await import('../scripts/fleet-grids.mjs');
 const ship={id:'corrected',name:'Corrected',layout:'reference-hull',source:'SuperCargo cargoGrids.ts (community reference)',grids:[{id:'g',w:2,h:2,l:4,x:-2,y:0,z:2,maxBoxSize:16}]};
 const result=reconcileCommunityGrids([ship],'  "Corrected": '+JSON.stringify({layout:'datamine',grids:[{...ship.grids[0],x:0,z:0}]})+',');
 assert.deepEqual(result.ships[0],ship);assert.equal(result.changes.length,0);
});
