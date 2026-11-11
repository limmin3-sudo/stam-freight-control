import {calculateFlight} from './flight-engine.mjs';
import {importSavedFlight} from './saved-flight.mjs';
self.onmessage=({data})=>{
 try{self.postMessage(data.saved?{session:importSavedFlight(data.saved)}:{plan:calculateFlight(data.draft,data.context)});}
 catch(error){self.postMessage({error:error.message||'항로를 계산하지 못했습니다.'});}
};
