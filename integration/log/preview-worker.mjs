import {calculatePreview} from './preview-packing.mjs';
import {guidanceFingerprint} from './guidance-store.mjs';
self.onmessage=async({data})=>{
  try {
    const result=calculatePreview(data.input),hashPending=!!data.guidanceEvidence;
    // Transfer the large plan once. Resume hashing has its own short deadline.
    self.postMessage({id:data.id,type:'result',result,hashPending});
    if(hashPending){
      let planHash=null;
      try{planHash=await guidanceFingerprint(result,data.guidanceEvidence);}catch{}
      self.postMessage({id:data.id,type:'fingerprint',planHash});
    }
  }catch(error){self.postMessage({id:data.id,type:'error',error:error.message});}
};
self.postMessage({type:'ready'});
