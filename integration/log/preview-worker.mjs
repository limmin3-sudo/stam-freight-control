import {calculatePreview} from './preview-packing.mjs';
self.onmessage=({data})=>{
  try {self.postMessage({id:data.id,result:calculatePreview(data.input)});}
  catch(error){self.postMessage({id:data.id,error:error.message});}
};
