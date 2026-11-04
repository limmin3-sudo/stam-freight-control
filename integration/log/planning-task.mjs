// One worker per calculation; no polling. Keep optional resume work out of the route deadline.
export function startPlanningTask({id,input,guidanceEvidence,createWorker,onPhase=()=>{},
  setTimer=setTimeout,clearTimer=clearTimeout,limits={prepare:8000,calculate:8000,fingerprint:2000}}) {
  let worker,timer,phase='prepare',finished=false,result,resolve;
  const promise=new Promise(done=>{resolve=done;});
  const finish=outcome=>{
    if(finished)return;finished=true;clearTimer(timer);
    if(worker){worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;worker.terminate();}
    resolve(outcome);
  };
  const hashUnavailable='이전 안내 구간을 대조하지 못했습니다. 계산한 항로는 사용할 수 있으며 첫 구간부터 안내합니다.';
  const arm=next=>{
    phase=next;clearTimer(timer);onPhase(next);
    timer=setTimer(()=>phase==='fingerprint'?finish({result,planHash:null,hashError:'이전 안내 구간을 대조하지 못했습니다. 계산한 항로는 사용할 수 있으며 첫 구간부터 안내합니다.'}):finish({error:phase==='prepare'?'계산 준비가 지연되고 있습니다. 잠시 후 다시 계산해 주세요. 로그 감시는 계속됩니다.':'항로·적재 계산이 8초를 넘었습니다. 계약 수와 화물칸 설정을 확인한 뒤 다시 계산해 주세요.'}),limits[next]);
  };
  try {
    worker=createWorker();arm('prepare');
    worker.onerror=worker.onmessageerror=()=>phase==='fingerprint'?finish({result,planHash:null,hashError:hashUnavailable}):finish({error:'항로 계산을 마치지 못했습니다. 다시 계산해 주세요. 로그 감시는 계속됩니다.'});
    worker.onmessage=({data})=>{
      if(finished)return;
      if(data?.type==='ready'&&phase==='prepare'){
        arm('calculate');
        try{worker.postMessage({id,input,guidanceEvidence});}catch{finish({error:'계산할 화물을 전달하지 못했습니다. 다시 시도해 주세요.'});}
        return;
      }
      if(data?.id!==id)return;
      if(data.type==='error'){if(phase==='fingerprint')finish({result,planHash:null,hashError:hashUnavailable});else finish({error:data.error});return;}
      if(data.type==='result'&&phase==='calculate'){
        result=data.result;
        if(data.hashPending)arm('fingerprint');else finish({result,planHash:null});
      }else if(data.type==='fingerprint'&&phase==='fingerprint'){
        const valid=typeof data.planHash==='string'&&/^[a-f0-9]{64}$/.test(data.planHash);
        finish({result,planHash:valid?data.planHash:null,hashError:valid?null:hashUnavailable});
      }
    };
  }catch{finish({error:'계산 작업을 시작하지 못했습니다. 다시 계산해 주세요. 로그 감시는 계속됩니다.'});}
  return {promise,cancel:()=>finish({cancelled:true})};
}
