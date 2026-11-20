import test from 'node:test';
import assert from 'node:assert/strict';
import {readContractFields,spokenJob,spokenScu,startsSpokenContract} from '../src/spoken-contract.ts';

test('a spoken request can start a dialogue before supplying its four fields',()=>{
 assert.ok(startsSpokenContract('나 미션 추가 하고싶어,'));
 assert.deepEqual(readContractFields('나 미션 추가 하고싶어,'),{});
 assert.equal(startsSpokenContract('받은 미션 추가'),false);
 assert.deepEqual(readContractFields('허스턴에서 티타늄 40scu실어서 오리슨가는거야','from'),{from:'허스턴',cargo:'티타늄',quantity:'40',to:'오리슨'});
 assert.deepEqual(readContractFields('새 미션 등록 픽업지 로어빌 배송지 오리슨 품목 티타늄 수량 사십 SCU'),{from:'로어빌',to:'오리슨',cargo:'티타늄',quantity:'사십 SCU'});
 assert.deepEqual(readContractFields('허스턴에서 티타늄 사십 에스씨유 실었어','from'),{from:'허스턴',cargo:'티타늄',quantity:'사십'});
 assert.deepEqual(readContractFields('로어빌에서','from'),{from:'로어빌'});
});
test('spoken total uses the manual entry limits and preserves Korean cargo names and unknown reward',()=>{
 for(const value of ['사십','40 SCU','사십 에스씨유'])assert.equal(spokenScu(value),40);
 for(const value of ['-1','1.5','10001','백백','영'])assert.equal(spokenScu(value),null);
 const job=spokenJob('a','b','티타늄',40);assert.deepEqual(job.shipments[0]?.cargo,['티타늄','Titanium']);
 assert.equal(job.rewardUnknown,true);assert.equal(job.shipments[0]?.boxes,undefined);
});
