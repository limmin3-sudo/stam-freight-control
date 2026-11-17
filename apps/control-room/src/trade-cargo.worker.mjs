import {tradeCargoPreview} from './trade-cargo-preview.mjs';
self.onmessage=event=>{try{self.postMessage({result:tradeCargoPreview(event.data)});}catch{self.postMessage({error:'preview'});}};
