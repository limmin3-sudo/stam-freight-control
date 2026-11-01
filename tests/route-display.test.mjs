import test from 'node:test';import assert from 'node:assert/strict';
import {mapLocationName,jumpSegments,activeSystemLinks} from '../route-display.mjs';
const locations=[
 {id:'a',name:'Orison',system:'stanton',type:'LandingZone'},
 {id:'g1',name:'Pyro Gateway',system:'stanton',type:'Manmade'},
 {id:'j1',name:'Pyro Jump Point',system:'stanton',type:'Anomaly'},
 {id:'j2',name:'Stanton Jump Point',system:'pyro',type:'Anomaly'},
 {id:'g2',name:'Stanton Gateway',system:'pyro',type:'Manmade'},
 {id:'b',name:'Sunset Mesa',system:'pyro',type:'Outpost'}
],byId=new Map(locations.map(l=>[l.id,l])),leg={nodes:locations.map(l=>l.id),jumps:1};
test('map station names retain only Lagrange codes while canonical data stays intact',()=>{
 for(const name of ['MIC-L1 Shallow Frontier Station','ARC-L4 Faint Glen Station','CRU-L4 Shallow Fields Station','HUR-L2 Faithful Dream Station']){const original={name};assert.equal(mapLocationName(original),name.split(' ')[0]);assert.equal(original.name,name);}
 assert.equal(mapLocationName({name:'Everus Harbor'}),'Everus Harbor');assert.equal(mapLocationName({name:'Pyro Gateway'}),'Pyro Gateway');
});
test('gateway approach and actual system jump form one ordered transit group',()=>{
 assert.deepEqual(jumpSegments(leg,byId),[{fromSystem:'stanton',toSystem:'pyro',entryId:'g1',exitId:'g2',entryName:'Pyro Gateway',exitName:'Stanton Gateway'}]);
 assert.deepEqual(jumpSegments({nodes:['a','g1'],jumps:0},byId),[]);
});
test('galaxy has no links without a cross-system route and shows only used pairs',()=>{
 assert.equal(activeSystemLinks(null,byId).size,0);assert.equal(activeSystemLinks({visits:[{leg:{nodes:['a','g1']}}]},byId).size,0);
 const route={visits:[{leg},{leg:{nodes:[...leg.nodes].reverse()}}]};assert.deepEqual([...activeSystemLinks(route,byId)],['pyro|stanton']);
});
