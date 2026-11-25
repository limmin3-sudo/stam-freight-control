import test from 'node:test';
import assert from 'node:assert/strict';
import {contractReadAssist,receiptCategory} from '../integration/log/read-assist.mjs';

const card=id=>({id,state:'incomplete',shipments:[{from:'a',to:'',cargo:['Waste'],scu:22}]});

test('batch missing fields by receipt after enrichment and never interrupt for a finished or complete haul',()=>{
 const notices=[],assist=contractReadAssist(n=>notices.push(n));
 const a=card('a'),b=card('b'),closed={...a,id:'c',state:'ended'};
 assist.review([a,b,closed]);assist.review([a,b,closed]);
 assert.deepEqual(notices,[{id:'a',labelKo:'Waste 22 SCU',labelEn:'Waste 22 SCU',code:'missing',fields:['destination'],count:2,armed:false}]);
 assist.review([{...b,shipments:[{...b.shipments[0],scu:0,to:'b'}],reservations:{b:22}}]);
 assert.equal(notices.length,1);
});

test('unclassified events remain reviewable and only blocked freight triggers a per-card alert',()=>{
 const messages=[],assist=contractReadAssist(n=>messages.push(n));
 const unknown={id:'u',state:'incomplete',shipments:[],title:['블랙박스','Black box']};
 const training={...unknown,id:'t',title:['전투 실전훈련 - 시나리오 #5','Combat training']};
 const stopOnly={...card('route'),observedStops:{pickup:['a'],dropoff:['b']}};
 const quantity={...card('quantity'),shipments:[{from:'a',to:'b',cargo:['Iron'],scu:0}]};
 assert.equal(receiptCategory(unknown),'unknown');assert.equal(receiptCategory(training),'other');
 const stop=assist.wait(()=>{});assert.equal(assist.armed(),true);
 assist.review([training,unknown,stopOnly,quantity]);assert.deepEqual(messages,[]);
 const first=card('first'),second={...card('second'),shipments:[{from:'',to:'b',cargo:['Ore'],scu:10}]};
 assist.review([first]);assist.review([first,second]);assist.review([first,second]);
 assert.deepEqual(messages.map(m=>[m.id,m.fields,m.armed]),[['first',['destination'],true],['second',['pickup'],true]]);
 stop();assert.equal(assist.armed(),false);
});

test('tap wakes only one live picker; late readers, repeated taps and superseded results cannot select a different contract',()=>{
 const notices=[],assist=contractReadAssist(n=>notices.push(n.code)),reads=[];
 assist.wait(()=>assert.fail('stopped reader'))();
 assist.tap();assert.deepEqual(notices,['setup']);
 assist.wait(id=>reads.push(id));assist.wait(id=>reads.push(id));assist.tap();assist.tap();
 assert.deepEqual(reads,[1]);assert.deepEqual(notices,['setup','busy']);
 assist.feedback({read:1,code:'partial'});assist.tap();assist.feedback({read:1,code:'complete'});
 assist.feedback({read:2,code:'choose'});
 assert.deepEqual(reads,[1,2]);assert.deepEqual(notices,['setup','busy','partial','choose']);
});
