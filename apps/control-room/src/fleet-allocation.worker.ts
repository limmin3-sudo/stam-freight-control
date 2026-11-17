import {allocateFleet} from './fleet-allocation';
import {suiteContext} from './trade-suite-runtime.mjs';
self.onmessage=e=>{try{const {market,options,vessels}=e.data;const result=allocateFleet(market,options,vessels,suiteContext,(done,total)=>self.postMessage({progress:{done,total}}));self.postMessage({result});}catch(error){self.postMessage({error:error instanceof Error?error.message:'calculation'});}};
