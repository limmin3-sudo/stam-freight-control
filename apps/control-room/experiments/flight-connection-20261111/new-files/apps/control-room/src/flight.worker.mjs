import {calculateFlight} from './flight-engine.mjs';
self.onmessage=({data})=>{
 try{self.postMessage({plan:calculateFlight(data.draft,data.context)});}
 catch(error){self.postMessage({error:error.message||'항로를 계산하지 못했습니다.'});}
};
