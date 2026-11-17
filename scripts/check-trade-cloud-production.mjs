// Opt-in production rules probe using isolated temporary accounts, never user records.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {FIREBASE_CONFIG as config} from '../firebase-config.mjs';
import {readTradeSnapshot,encodeTradeSnapshot,decodeTradeSnapshot} from '../apps/control-room/src/trade-cloud-codec.ts';
if(process.env.STAM_PRODUCTION_QA!=='approved')throw Error('explicit-production-qa-required');
const support=createRequire(import.meta.url)('/workspace/.stam-firebase-auth/test-support.cjs');
if(support.identities().length)throw Error('clean-up-previous-test-first');
const out='docs/release-300-20261117';await mkdir(out,{recursive:true});
const checks=[],base=`https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`,name=`projects/${config.projectId}/databases/(default)/documents`;
async function request(url,token,body){const r=await fetch(url,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});return {status:r.status,body:await r.json()};}
const auth=(action,body)=>request('https://identitytoolkit.googleapis.com/v1/accounts:'+action+'?key='+config.apiKey,null,body);
async function create(){const email='stamqa_'+randomBytes(12).toString('hex')+'@example.invalid',password=randomBytes(32).toString('base64url');const r=await auth('signUp',{email,password,returnSecureToken:true});assert.equal(r.status,200,'temporary auth creation');const identity={uid:r.body.localId,email,idToken:r.body.idToken,apiKey:config.apiKey};support.record(identity);return {...identity,password};}
const fields=value=>Object.fromEntries(Object.entries(value).map(([k,v])=>[k,typeof v==='string'?{stringValue:v}:{integerValue:String(v)}]));
const decode=doc=>Object.fromEntries(Object.entries(doc.fields).map(([k,v])=>[k,v.stringValue??Number(v.integerValue)]));
let failure=null,cleanup;
try{
 const a=await create(),b=await create(),owner='account:'+a.uid,head=`users/${a.uid}/trade/current`,part=head+'/parts/0';
 const snapshot=readTradeSnapshot({getItem:()=>null},owner);snapshot.suite.favorites=[1];const encoded=await encodeTradeSnapshot(snapshot);
 const stamp=Date.now(),header=revision=>({format:1,revision,updatedAt:stamp+revision,device:'isolated release QA',parts:1,digest:encoded.digest,bytes:encoded.bytes,encodedBytes:encoded.payload.length,encoding:'gzip-base64'});
 const commit=(revision,token=a.idToken)=>request(base+':commit',token,{writes:[{update:{name:name+'/'+head,fields:fields(header(revision))}},{update:{name:name+'/'+part,fields:fields({revision,value:encoded.payload})}}]});
 assert.equal((await request(base+'/'+head,a.idToken)).status,404);
 assert.equal((await commit(1)).status,200);checks.push('New owner trade snapshot and chunk commit succeeds under published rules');
 const login=await auth('signInWithPassword',{email:a.email,password:a.password,returnSecureToken:true});assert.equal(login.status,200);
 const headRead=await request(base+'/'+head,login.body.idToken),partRead=await request(base+'/'+part,login.body.idToken);assert.equal(headRead.status,200);assert.equal(partRead.status,200);
 assert.deepEqual(await decodeTradeSnapshot({header:decode(headRead.body),payload:decode(partRead.body).value},owner),snapshot);checks.push('Independent sign-in restores an identical compressed trade snapshot');
 assert.equal((await request(base+'/'+head,b.idToken)).status,403);assert.equal((await request(base+'/'+part,b.idToken)).status,403);assert.equal((await request(base+'/'+head,null)).status,403);checks.push('Other account and anonymous reads remain denied');
 assert.equal((await request(base+':commit',a.idToken,{writes:[{update:{name:name+'/'+part,fields:fields({revision:1,value:'AAAA'})}}]})).status,403);checks.push('Standalone chunk overwrite is denied');
 const raced=await Promise.all([commit(2),commit(2,login.body.idToken)]);assert.equal(raced.filter(r=>r.status===200).length,1);assert.equal((await commit(1)).status,403);checks.push('Two same-revision writers have one winner; stale revisions are denied');
 assert.equal((await request(base+`/users/${a.uid}/flight/current`,a.idToken)).status,404);checks.push('Trade operations do not create or change the separate freight snapshot');
}catch(e){failure={name:e.name,message:e.message.slice(0,160)};}
finally{cleanup=await support.clear();await writeFile(out+'/trade-production-check.json',JSON.stringify({passed:!failure,checkedAt:new Date().toISOString(),realProduction:true,transport:'Auth and Firestore REST over verified HTTPS',checks,cleanup,...(failure?{failure}:{}),realUserRecordsAccessed:false,googlePopupTested:false},null,2)+'\n');}
if(failure)throw Error('Production trade verification failed; sanitized report saved');console.log(JSON.stringify({passed:true,checks,cleanup}));
