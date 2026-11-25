import test from 'node:test';
import assert from 'node:assert/strict';
import {contractReadAssist} from '../integration/log/read-assist.mjs';

const card=id=>({id,state:'incomplete',shipments:[{from:'a',to:'',cargo:['Waste'],scu:22}]});

test('batch missing fields by receipt after enrichment and never interrupt for a finished or complete haul',()=>{
 const notices=[],assist=contractReadAssist(n=>notices.push(n));
 const a=card('a'),b=card('b'),closed={...a,id:'c',state:'ended'};
 assist.review([a,b,closed]);assist.review([a,b,closed]);
 assert.deepEqual(notices,[{code:'missing',fields:['destination'],count:2,armed:false}]);
 assist.review([{...b,shipments:[{...b.shipments[0],scu:0,to:'b'}],reservations:{b:22}}]);
 assert.equal(notices.length,1);
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
