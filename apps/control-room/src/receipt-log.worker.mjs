import { LogLines } from '../../../integration/log/lines.mjs';
import { LogEvidence } from '../../../integration/log/state.mjs';
import { index,projectReceipts } from '../../../integration/log/project-receipts.mjs';
async function project(snapshot){self.postMessage(await projectReceipts(snapshot));}
let stream=null,offset=0,tail='';
function reset(){
  const evidence=new LogEvidence({locations:index});
  const lines=new LogLines({onLine:(line,lineNumber)=>evidence.ingest(line,{file:'Game.log',line:lineNumber}),onInvalid:code=>evidence.note(code)});
  stream={evidence,lines};offset=0;tail='';
}
self.onmessage=async ({data})=>{
  const live=data.live===true,file=live?data.file:data;
  try{
    if(data.snapshot){
      const snapshot=data.snapshot;
      if(snapshot.schemaVersion!==1||!Array.isArray(snapshot.contracts)||!Array.isArray(snapshot.candidates))throw Error('invalid-snapshot');
      await project(snapshot);return;
    }
    const prior=offset<=file.size?await file.slice(Math.max(0,offset-128),offset).text():null;
    if(!live||!stream||prior!==tail)reset();
    while(offset<file.size){
      const bytes=new Uint8Array(await file.slice(offset,offset+262144).arrayBuffer());
      stream.lines.write(bytes);offset+=bytes.length;
    }
    if(live)tail=await file.slice(Math.max(0,offset-128),offset).text();else stream.lines.finish();
    await project(stream.evidence.snapshot());
  }catch(error){
    stream=null;offset=0;tail='';
    const fileUnavailable=!data.snapshot&&['NotReadableError','NotFoundError','SecurityError','NotAllowedError'].includes(error?.name);
    self.postMessage({phase:'error',cards:[],fileUnavailable});
  }
};
