import test from 'node:test';import assert from 'node:assert/strict';
import {packBoxes,makeShipments} from '../engine.mjs';
import {groupConfiguration,wikiConfiguration} from '../cargo-summary.mjs';
import {saveDestinationRecipe,fillDestinationRecipes,useWikiConfiguration,destinationGroups} from '../recipes.mjs';
const ship={id:'test',name:'Test',shareGrids:true,grids:[{name:'Hold',w:1,h:2,l:2,x:0,y:0,z:0,maxBoxSize:2}]};
const pod=i=>({boxId:'pod'+i,missionId:'pods',dropoffId:'d',size:1,_cargoShape:'cryopod'});
const crate={boxId:'crate',missionId:'crate',dropoffId:'d',size:2};
test('two 1 SCU pods stack into a standard 2 SCU envelope; normal cargo can rest on the pair',()=>{
 const pair=packBoxes([pod(0),pod(1)],[],ship);assert.equal(pair.used,2);assert.deepEqual(pair.boxes.map(b=>b.dims),[[1,.5,2],[1,.5,2]]);assert.deepEqual(pair.boxes.map(b=>b.cell[1]),[0,.5]);
 const loaded=packBoxes([crate],pair.boxes,ship);assert.ok(loaded);assert.equal(loaded.boxes.find(b=>b.boxId==='crate').cell[1],1);assert.equal(loaded.used,4);
});
test('an odd pod cannot support a normal box, even though SCU capacity remains',()=>{
 const one=packBoxes([pod(0)],[],ship);assert.equal(one.used,1);assert.equal(packBoxes([crate],one.boxes,ship),null);
 const three=packBoxes([pod(0),pod(1),pod(2)],[],{...ship,grids:[{...ship.grids[0],h:3}]});assert.equal(packBoxes([crate],three.boxes,{...ship,grids:[{...ship.grids[0],h:3}]}),null);
});
test('a normal crate cannot bridge unequal pod and crate heights',()=>{
 const wide={...ship,grids:[{...ship.grids[0],w:2,maxBoxSize:4}]};
 const fixed=[{...pod(0),bin:0,cell:[0,0,0],dims:[1,.5,2]},{...crate,bin:0,cell:[1,0,0],dims:[1,1,2]}];
 assert.equal(packBoxes([{...crate,boxId:'wide',size:4}],fixed,wide),null);
});
test('four pods remain four owned 1 SCU items, not one 4 SCU crate or four 2 SCU crates',()=>{
 const cargo={commodity:'CryoPod',scu:4,pickupId:'p',dropoffId:'d',_cargoShape:'cryopod',_boxesOrigin:'pod-profile',boxes:[{size:1,count:4}]},m={id:'pods',cargo:[cargo],destinationBoxes:[{pickupId:'p',dropoffId:'d',boxes:[{size:4,count:1}],origin:'template'}]};
 const {shipments}=makeShipments([m],new Map([['p',{}],['d',{}]]),{ship});const boxes=shipments.flatMap(s=>s.boxes);assert.equal(boxes.length,4);assert.ok(boxes.every(b=>b.size===1&&b._cargoShape==='cryopod'));assert.equal(new Set(boxes.map(b=>b.boxId)).size,4);
 const layout=groupConfiguration(m,destinationGroups(m)[0]);assert.equal(layout.basis,'entity');assert.deepEqual(layout.boxes,[{size:1,count:4}]);
});
test('choosing wiki layout bypasses old recipes for this contract without deleting them',()=>{
 const m={id:'recipe',cargo:[{commodity:'Souvenirs',scu:2,pickupId:'p',dropoffId:'d',maxBoxSize:2,_maxBoxSource:'wiki',boxes:[]}]},g=destinationGroups(m)[0],recipes=saveDestinationRecipe({},m,g,[{size:1,count:2}],'v');
 const saved=fillDestinationRecipes(recipes,m,'v');assert.equal(groupConfiguration(saved,g).estimated,false);
 assert.deepEqual(wikiConfiguration(saved,g).boxes,[{size:2,count:1}]);
 const reset=fillDestinationRecipes(recipes,useWikiConfiguration(saved,g),'v');assert.equal(reset.destinationBoxes.length,0);assert.deepEqual(groupConfiguration(reset,destinationGroups(reset)[0]).boxes,[{size:2,count:1}]);assert.equal(Object.keys(recipes).length,1);assert.equal(fillDestinationRecipes(recipes,m,'v').destinationBoxes.length,1);
});
