import {calculatePreview} from './preview-packing.mjs';
import {guidanceFingerprint} from './guidance-store.mjs';
self.onmessage=async({data})=>{
  try {
    const result=calculatePreview(data.input);let planHash=null,hashError=null;
    // Reuse the planning worker: canonicalizing large packing frames must not stall the UI.
    if(data.guidanceEvidence)try{planHash=await guidanceFingerprint(result,data.guidanceEvidence);}catch(e){hashError=e.message;}
    self.postMessage({id:data.id,result,planHash,hashError});
  }catch(error){self.postMessage({id:data.id,error:error.message});}
};
