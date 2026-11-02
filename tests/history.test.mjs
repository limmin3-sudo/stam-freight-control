import test from 'node:test';
import assert from 'node:assert/strict';
import {addRecord,summarize} from '../history.mjs';

test('a run finished again after undo replaces its record; totals and per-ship stats add up', ()=>{
  let list=[];
  list=addRecord(list,{id:'p1|1',ship:'MISC Hull B',reward:500000,scu:200,seconds:3600,missions:[{},{}]});
  list=addRecord(list,{id:'p2|2',ship:'Drake Caterpillar',reward:300000,scu:100,seconds:1800,missions:[{}]});
  list=addRecord(list,{id:'p1|1',ship:'MISC Hull B',reward:520000,scu:200,seconds:3700,missions:[{},{}]});
  assert.equal(list.length,2);assert.equal(list[0].reward,520000);
  const s=summarize(list);
  assert.deepEqual([s.runs,s.reward,s.scu,s.seconds,s.missions],[2,820000,300,5500,3]);
  assert.equal(Math.round(s.perHour),Math.round(820000/(5500/3600)));
  assert.equal(s.byShip.get('MISC Hull B').reward,520000);
});

import {clearHistory,formatHistoryDistance,HISTORY_KEY} from '../history.mjs';
test('distance totals exclude unknown legacy distances and undo replacements do not double-count',()=>{
 let records=[{id:'old',reward:30,seconds:5},{id:'new',reward:70,seconds:10,distanceMeters:1000}];
 records=addRecord(records,{id:'new',reward:80,seconds:12,distanceMeters:2500});
 const totals=summarize(records);assert.equal(totals.reward,110);assert.equal(totals.distanceMeters,2500);assert.equal(totals.distanceRuns,1);assert.equal(totals.runs,2);
 assert.equal(formatHistoryDistance(null),'—');assert.equal(formatHistoryDistance(1e9),'1 Gm');
});
test('reset clears only completed history and reports storage failures',()=>{
 const values=new Map([[HISTORY_KEY,'[{"id":"past"}]'],['vh-missions','current'],['sfc-run','active']]);
 clearHistory({setItem:(k,v)=>values.set(k,v)});assert.equal(values.get(HISTORY_KEY),'[]');assert.equal(values.get('vh-missions'),'current');assert.equal(values.get('sfc-run'),'active');
 assert.throws(()=>clearHistory({setItem:()=>{throw Error('storage full');}}),/storage full/);
});
