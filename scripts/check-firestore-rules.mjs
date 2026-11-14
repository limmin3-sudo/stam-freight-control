// Run only against a local demo emulator. Never connects to the production project.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {writeAccount,readAccount} from '../account-sync-transport.mjs';
const require=createRequire((process.env.STAM_FIREBASE_QA_ROOT||'/tmp/stam-firestore-qa')+'/package.json');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const F=require('firebase/firestore');
const env=await initializeTestEnvironment({projectId:'demo-stam-sync',firestore:{host:'127.0.0.1',port:8089,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});
const checks=[];const pass=s=>checks.push(s);
try{
 await env.clearFirestore();const db=env.authenticatedContext('a').firestore(),f={...F,db};
 await assertSucceeds(writeAccount(f,'a',{revision:0,updatedAt:0},['vh-missions'],{'vh-missions':'[]'},{now:100,items:['initial']}));pass('new account transaction creates head and state atomically');
 const batch=F.writeBatch(db);batch.set(F.doc(db,'users/a'),{updatedAt:200},{merge:true});batch.set(F.doc(db,'users/a/state/vh-missions'),{value:'legacy overwrite',updatedAt:200});await assertFails(batch.commit());pass('legacy batch without revision advancement denied');
 await assertFails(F.setDoc(F.doc(db,'users/a/state/vh-missions'),{value:'bypass',updatedAt:100}));await assertFails(F.deleteDoc(F.doc(db,'users/a/state/vh-missions')));await assertFails(F.deleteDoc(F.doc(db,'users/a')));pass('standalone state write/delete and head deletion denied');
 const wrong=F.writeBatch(db);wrong.set(F.doc(db,'users/a'),{revision:2,updatedAt:101});wrong.set(F.doc(db,'users/a/state/vh-missions'),{value:'mismatched',updatedAt:999});await assertFails(wrong.commit());pass('state timestamp must match the transaction head');
 const expected=(await readAccount(f,'a')).stamp;
 const races=await Promise.allSettled([writeAccount(f,'a',expected,['vh-missions'],{'vh-missions':'left'},{now:1}),writeAccount(f,'a',expected,['vh-missions'],{'vh-missions':'right'},{now:90000})]);
 assert.equal(races.filter(r=>r.status==='fulfilled').length,1);assert.equal(races.find(r=>r.status==='rejected').reason.code,'stam/conflict');pass('real SDK transactions accept one concurrent writer irrespective of client clock');
 const b=env.authenticatedContext('b').firestore();await assertFails(F.getDoc(F.doc(b,'users/a')));await assertFails(F.getDoc(F.doc(b,'users/a/state/vh-missions')));await assertFails(F.setDoc(F.doc(b,'users/a'),{revision:3,updatedAt:999999}));pass('cross-account reads and writes denied');
 await env.withSecurityRulesDisabled(async ctx=>{await F.setDoc(F.doc(ctx.firestore(),'users/old'),{updatedAt:99});await F.setDoc(F.doc(ctx.firestore(),'users/old/state/vh-missions'),{value:'legacy',updatedAt:99});});
 const old={...F,db:env.authenticatedContext('old').firestore()};await assertSucceeds(writeAccount(old,'old',{revision:0,updatedAt:99},['vh-missions'],{'vh-missions':'migrated'},{now:1}));assert.equal((await readAccount(old,'old')).stamp.revision,1);pass('existing timestamp-only account migrates without deleting data');
 const stamp=(await readAccount(f,'a')).stamp;await assertSucceeds(writeAccount(f,'a',stamp,['vh-missions'],{}));assert.equal((await readAccount(f,'a')).snap['vh-missions'],undefined);pass('intentional deletion succeeds only with matching revision');
 const anon=env.unauthenticatedContext().firestore();await assertSucceeds(F.addDoc(F.collection(anon,'feedback'),{kind:'feedback',text:'synthetic test',contact:'',lang:'ko',at:F.serverTimestamp(),uid:null,page:null,image:null}));await assertFails(F.getDocs(F.collection(anon,'feedback')));pass('feedback remains write-only, including guests');
 console.log(JSON.stringify({passed:true,emulator:true,productionRequests:0,checks},null,2));
}finally{await env.cleanup();}
