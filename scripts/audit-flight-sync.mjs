// Reproduce the current storage boundary without a real account or writes to user storage.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {SYNC_KEYS,snapshot,applySnapshot,changedKeys,cleanValue,remoteIsNewer} from '../sync.mjs';
const out=process.env.STAM_QA_OUTPUT||'/tmp/stam-account-audit';await mkdir(out,{recursive:true});
const key='stam.control-room.flight.v1',previous='stam.control-room.flight.previous.v1',inbox='stam.receipt-inbox.v1';
const m=new Map([[key,'synthetic current flight'],[previous,'synthetic previous flight'],['sfc-history','[]'],['sfc-location-overrides-v1','{"format":"sfc-locations-v1","locations":[]}']]);
const storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
const guest=snapshot(storage);assert(!Object.hasOwn(guest,key));assert(!Object.hasOwn(guest,previous));assert(SYNC_KEYS.includes('sfc-history'));assert(SYNC_KEYS.includes('sfc-location-overrides-v1'));assert(!SYNC_KEYS.includes(inbox));
applySnapshot(storage,{'sfc-history':'[{"id":"account-b"}]'});assert.equal(storage.getItem(key),'synthetic current flight');assert.equal(storage.getItem(previous),'synthetic previous flight');
const prior={'vh-storage-note':'retained cloud value'};storage.setItem('vh-storage-note','x'.repeat(950000));
const tooBig=snapshot(storage);assert(!Object.hasOwn(tooBig,'vh-storage-note'));assert(changedKeys(prior,tooBig).includes('vh-storage-note'));
const unicode='가'.repeat(400000);assert.equal(cleanValue('vh-storage-note',unicode),unicode);assert(Buffer.byteLength(unicode,'utf8')>1048576);
assert.equal(remoteIsNewer(100,100),false);assert.equal(remoteIsNewer(99,100),false);
const result={reproduced:true,scope:'pure local-storage model; no network',syncKeys:SYNC_KEYS,consoleFlightSynced:false,previousConsoleBackupSynced:false,transientInboxSynced:false,completedHistorySynced:true,personalLocationsSynced:true,accountApplyRetainsCurrentFlight:true,accountApplyRetainsPreviousFlight:true,oversizeClassifiedAsMissingAndChanged:true,characterLimitAcceptsOversizeUtf8Bytes:Buffer.byteLength(unicode,'utf8'),clockRevisionEqualityAndRegressionUndetected:true};
await writeFile(out+'/storage-audit.json',JSON.stringify(result,null,2)+'\n');console.log(result);
