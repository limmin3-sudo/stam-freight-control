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
