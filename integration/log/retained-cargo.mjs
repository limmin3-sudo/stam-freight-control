import {BOX_DIMS,packBoxes} from '../../engine.mjs';
import {validateShip,withStacking} from '../../ships.mjs';
import {ACCOUNT_META} from '../../sync.mjs';
export const cargoFrame=raw=>{const s=withStacking(validateShip(raw));return JSON.stringify([s.id,s.grids.map(({disabled,name,...g})=>g)]);};
export function checkedCargoRecord(record){
 if(!record||typeof record.id!=='string'||!record.id||record.id.length>160||typeof record.title!=='string'||record.title.length>240||!Array.isArray(record.boxes)||record.boxes.length>2048)throw Error('남은 화물 기록을 확인해 주세요.');
 if(!record.boxes.length)return {id:record.id,title:record.title,boxes:[],...(record.review===true?{review:true}:{}),...(record.unlocated===true?{unlocated:true}:{})};
 const ship=withStacking(validateShip(record.ship)),ids=new Set();
 const boxes=record.boxes.map(b=>{
  const pod=b._cargoShape==='cryopod',knownShape=b._cargoShape===undefined||pod;
  const validShape=pod?b.size===1&&['[1,0.5,2]','[2,0.5,1]'].includes(JSON.stringify(b.dims)):
   BOX_DIMS[b.size]&&Array.isArray(b.dims)&&JSON.stringify([...b.dims].sort((a,b)=>a-b))===JSON.stringify([...BOX_DIMS[b.size]].sort((a,b)=>a-b));
  if(!knownShape||!validShape||b.missionId!==record.id||typeof b.boxId!=='string'||b.boxId.length>400||ids.has(b.boxId)||!Number.isInteger(b.bin)||!ship.grids[b.bin]||!Array.isArray(b.cell)||b.cell.length!==3||b.cell.some((n,i)=>!Number.isInteger(n*(pod&&i===1?2:1))||n<0))throw Error('남은 화물의 위치와 크기를 확인해 주세요.');
  ids.add(b.boxId);return {boxId:b.boxId,missionId:record.id,shipmentId:String(b.shipmentId||'').slice(0,400),commodity:String(b.commodity||'').slice(0,160),dropoffId:String(b.dropoffId||'').slice(0,160),size:b.size,...(pod?{_cargoShape:'cryopod'}:{}),bin:b.bin,cell:[...b.cell],dims:[...b.dims],reservation:!!b.reservation,retained:true,color:'#d99d62'};
 });
 if(!packBoxes([],boxes,ship))throw Error('남은 화물 위치가 겹치거나 화물칸을 벗어납니다.');
 return {id:record.id,title:record.title,ship,boxes,...(record.review===true?{review:true}:{})};
}
export function fixedRetained(rawShip,records=[]){
 const ship=withStacking(validateShip(rawShip)),fixed=[];
 if(!Array.isArray(records)||records.length>256)throw Error('남은 화물 기록을 확인해 주세요.');
 for(const raw of records){const r=checkedCargoRecord(raw);if(r.review)throw Error('종료된 계약의 화물이 남아 있는지 확인해 주세요.');if(r.unlocated)throw Error('함선에 남은 화물의 위치를 먼저 확인해 주세요.');if(!r.boxes.length||r.ship.id!==ship.id)continue;
  if(cargoFrame(r.ship)!==cargoFrame(ship))throw Error('남은 화물을 기록한 뒤 화물칸 구성이 바뀌었습니다. 위치를 먼저 확인해 주세요.');
  fixed.push(...r.boxes);
 }
 if(new Set(fixed.map(b=>b.boxId)).size!==fixed.length||fixed.length>2048||!packBoxes([],fixed,ship))throw Error('남은 화물의 위치 또는 사용 구역을 확인해 주세요.');
 return fixed;
}
export function createRetainedCargo(storage){
 const owner=()=>{try{return JSON.parse(storage?.getItem(ACCOUNT_META)||'null')?.uid||'guest';}catch{return 'guest';}};
 const initialOwner=owner(),key='stam-retained-cargo-v1:'+encodeURIComponent(initialOwner);let records=[],error=null;
 try{const raw=storage?.getItem(key);if(raw){if(raw.length>1500000)throw Error();const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.records)||data.records.length>256)throw Error();records=data.records.map(checkedCargoRecord);if(new Set(records.map(r=>r.id)).size!==records.length)throw Error();}}
 catch{error='저장된 남은 화물을 읽지 못했습니다. 기록을 확인하기 전에는 적재를 다시 계산하지 않습니다.';}
 const commit=next=>{
  if(owner()!==initialOwner)throw Error('계정이 바뀌었습니다. 화면을 새로 열어 주세요.');
  const text=JSON.stringify({version:1,records:next});if(text.length>1500000||next.length>256)throw Error('남은 화물 기록이 많습니다. 정리된 화물부터 확인해 주세요.');
  if(!storage)throw Error('이 브라우저에 화물 상태를 저장할 수 없습니다.');
  try{storage.setItem(key,text);}catch{throw Error('화물 상태를 저장하지 못했습니다. 계약과 적재 공간을 유지합니다.');}
  records=next;error=null;
 };
 return {
  snapshot:()=>({records:structuredClone(records),error}),
  exclude(id,title,ship,boxes,unlocated=false){if(error)throw Error(error);const r=checkedCargoRecord({id,title:String(title||'계약').slice(0,240),ship,boxes,unlocated});const next=[...records.filter(r=>r.id!==id),r];if(boxes.length)fixedRetained(ship,next.filter(r=>!r.unlocated&&!r.review));commit(next);},
  markReview(id,title,ship,boxes=[]){if(error)throw Error(error);if(records.some(r=>r.id===id))return;commit([...records,checkedCargoRecord({id,title:String(title||'계약').slice(0,240),ship,boxes,review:true,unlocated:!boxes.length})]);},
  release(id){if(error)throw Error(error);commit(records.map(r=>r.id===id?{id:r.id,title:r.title,boxes:[]}:r));},
  restore(id){if(error)throw Error(error);if(records.find(r=>r.id===id)?.boxes.length||records.find(r=>r.id===id)?.unlocated||records.find(r=>r.id===id)?.review)throw Error('함선에 남은 화물을 먼저 확인해 주세요.');commit(records.filter(r=>r.id!==id));},
  clearCorrupt(){commit([]);},
 };
}
