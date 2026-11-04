import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startPlanningTask,warmPlanningWorker} from '../integration/log/planning-task.mjs';
function harness(){
 let now=0,n=0;const timers=new Map(),phases=[],sent=[];
 const worker={terminate(){this.terminated=true;},postMessage(m){sent.push(m);}};
 const task=startPlanningTask({id:7,input:{cargo:'fixture'},guidanceEvidence:['evidence'],createWorker:()=>worker,onPhase:p=>phases.push(p),setTimer:(fn,ms)=>{timers.set(++n,{at:now+ms,fn});return n;},clearTimer:id=>timers.delete(id)});
 const emit=data=>worker.onmessage?.({data});
 const advance=ms=>{now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}};
 return {task,worker,emit,advance,phases,sent,timers};
}
test('worker preparation does not consume calculation deadline; plan is sent only once after ready',async()=>{
 const h=harness();h.advance(7900);assert.equal(h.sent.length,0);h.emit({type:'ready'});h.emit({type:'ready'});assert.equal(h.sent.length,1);
 h.advance(7900);h.emit({id:7,type:'result',result:{boxes:28},hashPending:true});h.advance(1000);h.emit({id:7,type:'fingerprint',planHash:'a'.repeat(64)});
 assert.deepEqual(await h.task.promise,{result:{boxes:28},planHash:'a'.repeat(64),hashError:null});assert.deepEqual(h.phases,['prepare','calculate','fingerprint']);assert.equal(h.timers.size,0);assert.equal(h.worker.terminated,true);
});
test('optional hash timeout or worker crash preserves computed route but cannot resume a saved leg',async()=>{
 for(const mode of ['timeout','error','bad-hash']){const h=harness();h.emit({type:'ready'});h.emit({id:7,type:'result',result:{route:[1,2]},hashPending:true});
 if(mode==='timeout')h.advance(2000);else if(mode==='error')h.worker.onerror();else h.emit({id:7,type:'fingerprint',planHash:'invalid'});
 const out=await h.task.promise;assert.deepEqual(out.result,{route:[1,2]});assert.equal(out.planHash,null);assert.match(out.hashError,/첫 구간/);assert.equal(h.timers.size,0);}
});
test('preparation and computation failures are distinct and never return a partial plan',async()=>{
 const preparing=harness();preparing.advance(8000);assert.match((await preparing.task.promise).error,/준비/);
 const calculating=harness();calculating.emit({type:'ready'});calculating.advance(8000);assert.match((await calculating.task.promise).error,/8초/);
 const broken=harness();broken.worker.postMessage=()=>{throw Error('clone');};broken.emit({type:'ready'});assert.match((await broken.task.promise).error,/전달/);
});
test('cancelled and foreign messages cannot restart, replace or settle a newer calculation',async()=>{
 const h=harness();h.emit({type:'ready'});h.emit({id:8,type:'result',result:{bad:true},hashPending:false});
 const late=h.worker.onmessage;h.task.cancel();late({data:{id:7,type:'result',result:{bad:true}}});h.advance(20000);
 assert.deepEqual(await h.task.promise,{cancelled:true});assert.equal(h.timers.size,0);assert.equal(h.worker.onmessage,null);
 const next=harness();next.emit({type:'ready'});next.emit({id:7,type:'result',result:{good:true},hashPending:false});assert.deepEqual(await next.task.promise,{result:{good:true},planHash:null});
});
test('a worker prepared before WebGL starts retains readiness and is used once',async()=>{
 const listeners=new Map(),sent=[];let terminated=0;
 const worker={addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k),postMessage:m=>sent.push(m),terminate:()=>terminated++};
 const warm=warmPlanningWorker(()=>worker);listeners.get('message')({data:{type:'ready'}});
 const task=startPlanningTask({id:1,input:{cargo:66},createWorker:()=>warm.take()});
 assert.equal(sent.length,1);assert.equal(sent[0].input.cargo,66);assert.equal(listeners.size,0);
 worker.onmessage({data:{id:1,type:'result',result:{totalScu:66},hashPending:false}});assert.equal((await task.promise).result.totalScu,66);assert.equal(terminated,1);
 warm.dispose();assert.equal(terminated,1);
 const unused=warmPlanningWorker(()=>worker);unused.dispose();assert.equal(terminated,2);assert.equal(listeners.size,0);
});
