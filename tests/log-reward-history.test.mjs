import test from 'node:test';
import assert from 'node:assert/strict';
import {rewardDate,rewardKind,rewardPage,rewardExport} from '../integration/log/reward-history.mjs';
const id='11111111-1111-4111-8111-111111111111';
const rows=Array.from({length:121},(_,n)=>({at:new Date(2026,10,n<60?3:4,12,0,n%60).toISOString(),amount:n+1,notificationId:String(n),missionId:n%3===0?id:null,linkedMissionId:n%3===1?id:null}));
test('ledger pages cover every observation once and totals use the full filtered set',()=>{
 const seen=[];for(let page=0;page<3;page++){const v=rewardPage(rows,{page});assert.ok(v.rows.length<=50);assert.equal(v.count,121);assert.equal(v.total,7381);seen.push(...v.rows.map(r=>r.notificationId));}
 assert.equal(new Set(seen).size,121);assert.equal(rewardPage(rows,{page:99}).page,2);assert.equal(rewardPage([]).pages,1);assert.equal(rewardPage([]).total,0);
});
test('local-calendar dates and assignment filters never claim unassigned payouts as contract income',()=>{
 assert.equal(rewardDate(rows[0].at),'2026-11-03');
 for(const kind of ['log-id','manual','unassigned']){const v=rewardPage(rows,{kind});assert.ok(v.rows.every(r=>rewardKind(r)===kind));assert.equal(v.storedTotal,7381);}
 const v=rewardPage(rows,{from:'2026-11-04',to:'2026-11-04'});assert.equal(v.count,61);
 assert.throws(()=>rewardPage(rows,{from:'2026-11-05',to:'2026-11-03'}));assert.throws(()=>rewardPage(rows,{kind:'confirmed-income'}));
});
test('payout export includes the full ledger, excluding runtime titles, paths and identity fields',()=>{
 const data=JSON.parse(rewardExport(rows.map(r=>({...r,title:'private title',source:{path:'private path'},playerId:'private player'}))));
 assert.equal(data.records.length,121);assert.equal(data.currency,'aUEC');assert.deepEqual(data.records,rows);assert.ok(!JSON.stringify(data).includes('private'));assert.equal(data.format,'stam-payout-observations');
});
