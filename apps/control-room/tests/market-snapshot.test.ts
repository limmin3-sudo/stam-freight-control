import test from 'node:test';
import assert from 'node:assert/strict';
import {marketRefreshInterval,marketSnapshotLoader} from '../src/market-snapshot.ts';
import type {MarketSnapshot} from '../src/trade-data.ts';

test('an open board shares one request per hour, and a failed collection keeps the last prices and timestamps',async()=>{
 let clock=Date.parse('2026-11-25T06:00:00Z'),reads=0,failed=false;
 const snapshot=(at:number)=>({retrievedAt:new Date(at).toISOString()}) as MarketSnapshot;
 const first=snapshot(clock);let latest=first;
 const load=marketSnapshotLoader(async()=>{reads++;if(failed)throw Error('offline');return latest;},async()=>assert.fail('unexpected fallback'),()=>clock);
 assert.deepEqual(await Promise.all([load(),load()]),[first,first]);
 clock+=marketRefreshInterval-1;
 assert.equal(await load(),first);assert.equal(reads,1);
 clock++;latest=snapshot(clock);assert.equal(await load(),latest);assert.equal(reads,2);
 clock+=marketRefreshInterval;failed=true;
 assert.equal(await load(),latest);assert.equal(reads,3);
 clock+=60000;assert.equal(await load(),latest);assert.equal(reads,3);
 clock+=4*60000;failed=false;latest=snapshot(clock);assert.equal(await load(),latest);assert.equal(reads,4);
});
test('a delayed feed does not replace a newer bundled snapshot',async()=>{
 const clock=Date.now(),at=(n:number)=>({retrievedAt:new Date(n).toISOString()}) as MarketSnapshot;
 const bundled=at(clock-10000),old=at(clock-2*marketRefreshInterval);
 const load=marketSnapshotLoader(async()=>old,async()=>bundled,()=>clock);
 assert.equal(await load(),bundled);
});
