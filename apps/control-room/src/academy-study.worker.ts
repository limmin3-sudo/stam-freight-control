import {compareAcademyCase} from './academy-study';
self.onmessage=event=>{try{self.postMessage({result:compareAcademyCase(event.data)});}catch(error){self.postMessage({error:error instanceof Error?error.message:'calculation'});}};
