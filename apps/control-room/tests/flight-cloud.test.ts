import test from 'node:test';import assert from 'node:assert/strict';
import {emptyDraft,samples} from '../src/mission-trial.ts';
import {calculateFlight} from '../src/flight-engine.mjs';
import {blankRun,startRun,completeStep} from '../src/flight-session.ts';
import type {Session} from '../src/flight-session.ts';
import {encodeCloudFlight,decodeCloudFlight} from '../src/flight-cloud-codec.ts';
import type {CloudHeader} from '../src/service-account.mjs';
function fixture(partner:'operator'|'navigator'):Session{const draft={...emptyDraft(),partner,jobs:[samples[0]!]},plan=calculateFlight(draft);const run=completeStep(plan,completeStep(plan,startRun(blankRun(plan),1000),2000),3000);run.since=null;return {version:1,draft,plan,run};}
const header=(value:{bytes:number;digest:string;payload:string}):CloudHeader=>({format:1,revision:1,updatedAt:1,device:'Test',parts:1,encoding:'gzip-base64',bytes:value.bytes,encodedBytes:value.payload.length,digest:value.digest});
test('cloud roundtrip preserves both roles, cargo coordinates, progress and paused timer',async()=>{for(const partner of ['operator','navigator'] as const){const original=fixture(partner),copy=structuredClone(original),encoded=await encodeCloudFlight(original);const restored=await decodeCloudFlight({header:header(encoded),payload:encoded.payload});assert.deepEqual(original,copy);assert.deepEqual(restored.run?.aboard,original.run?.aboard);assert.equal(restored.run?.index,original.run?.index);assert.equal(restored.run?.since,null);assert.deepEqual(restored.plan,JSON.parse(JSON.stringify(original.plan)));assert.equal(restored.draft.partner,partner);}});
test('corrupt digests and decompression lengths fail before restoration',async()=>{const encoded=await encodeCloudFlight(fixture('navigator'));await assert.rejects(decodeCloudFlight({header:{...header(encoded),digest:'0'.repeat(64)},payload:encoded.payload}),/무결성/);await assert.rejects(decodeCloudFlight({header:{...header(encoded),bytes:10},payload:encoded.payload}),/크기/);});
test('a flight larger than one Firestore document roundtrips without dropping metadata',async()=>{
 const {randomBytes}=await import('node:crypto');const original=fixture('navigator');
 original.draft.jobs[0]!.referenceInfo={values:{description:randomBytes(950000).toString('base64')},provenance:{description:['synthetic']},sources:{synthetic:{name:'Synthetic test',version:'test'}}};
 const encoded=await encodeCloudFlight(original);assert.ok(encoded.payload.length>1000000);
 const restored=await decodeCloudFlight({header:header(encoded),payload:encoded.payload});assert.deepEqual(restored.draft.jobs[0]!.referenceInfo,original.draft.jobs[0]!.referenceInfo);
});
