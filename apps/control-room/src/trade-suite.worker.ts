import {calculateSuite} from './trade-suite';
import {suiteContext,packSuite,fittingTradeShips} from './trade-suite-runtime.mjs';
self.onmessage=event=>{try{const {market,options,items,shipId,findFor}=event.data;if(findFor){self.postMessage({ships:fittingTradeShips(findFor)});return;}self.postMessage(items?{packing:packSuite(shipId,items)}:{result:calculateSuite(market,options,suiteContext(options))});}catch(error){self.postMessage({error:error instanceof Error?error.message:'calculation'});}};
