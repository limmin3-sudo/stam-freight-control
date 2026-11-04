import {checkedCargoRecord,cargoFrame} from './retained-cargo.mjs';
import {packBoxes} from '../../engine.mjs';
import {ACCOUNT_META} from '../../sync.mjs';
export function cargoRowsFor(previews,contracts){
 const byId=new Map(contracts.map(c=>[c.missionId,c]));
 return previews.flatMap(p=>p.mission.cargo.map((row,index)=>{
  const c=byId.get(p.mission.id),key=row.key||`${p.mission.id}:cargo:${index}`;
  const identity=JSON.stringify([p.mission.id,c?.definitionId,c?.gameBuild?.status,c?.gameBuild?.value,row.commodity,row.scu,row.pickupId||null,row.dropoffId,row.maxBoxSize,row.parts||null,row.boxes||[],...(row._cargoShape?[row._cargoShape]:[])]);
  return {key,missionId:p.mission.id,index,identity,scu:row.scu,pickupId:row.pickupId||null,dropoffId:row.dropoffId,commodity:row.commodity};
 }));
}
export function attachCargoRows(result,rows){
 if(result.packing)for(const b of result.packing.boxes){
  const row=rows.find(r=>r.missionId===b.missionId&&(b.shipmentId===r.key||b.cargoId===r.index));
  if(row)b.rowKey=row.key;
 }
 return {...result,cargoRows:rows};
}
function cleanRecord(raw){
 if(!Array.isArray(raw?.rows)||raw.rows.length>64||!Array.isArray(raw.boxes)||!raw.boxes.length||raw.boxes.length>2048)throw Error('저장된 화물 정보를 확인해 주세요.');
 const rows=raw.rows.map(r=>{
  if(typeof r.key!=='string'||r.key.length>600||typeof r.identity!=='string'||r.identity.length>5000||!Number.isSafeInteger(r.scu)||r.scu<1||r.scu>10000)throw Error('저장된 화물 정보를 확인해 주세요.');
  return {key:r.key,identity:r.identity,scu:r.scu};
 });
 if(new Set(rows.map(r=>r.key)).size!==rows.length)throw Error('화물 항목이 중복됐습니다.');
 // Delivered boxes may share a former cell; validate each separately. Only
 // currently aboard boxes must coexist in the hold.
 const cleaned=raw.boxes.map(b=>{
  if(!['aboard','delivered'].includes(b.state)||!rows.some(r=>r.key===b.rowKey)||(b.state==='delivered'&&b.reservation))throw Error('화물 상태를 확인해 주세요.');
  const c=checkedCargoRecord({...raw,boxes:[b]}).boxes[0];return {...c,color:/^#[0-9a-f]{6}$/i.test(b.color)?b.color:c.color,retained:false,aboard:b.state==='aboard',rowKey:b.rowKey,state:b.state};
 });
 checkedCargoRecord({...raw,boxes:cleaned.filter(b=>b.state==='aboard')});
 const {ship}=checkedCargoRecord({...raw,boxes:[cleaned[0]]});
 if(cleaned.length>2048||new Set(cleaned.map(b=>b.boxId)).size!==cleaned.length)throw Error('저장된 상자 목록을 확인해 주세요.');
 for(const row of rows)if(cleaned.filter(b=>b.rowKey===row.key).reduce((n,b)=>n+b.size,0)>row.scu)throw Error('기록한 화물이 계약 수량을 넘습니다.');
 return {id:raw.id,title:raw.title,ship:ship||raw.ship,rows,boxes:cleaned};
}
export function createCargoContinuity(storage){
 const owner=()=>{try{return JSON.parse(storage?.getItem(ACCOUNT_META)||'null')?.uid||'guest';}catch{return 'guest';}};
 const initial=owner(),key='stam-cargo-continuity-v1:'+encodeURIComponent(initial);let records=[],error=null;
 try{const raw=storage?.getItem(key);if(raw){if(raw.length>1800000)throw Error();const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.records)||data.records.length>128)throw Error();records=data.records.map(cleanRecord);if(new Set(records.map(r=>r.id)).size!==records.length)throw Error();}}
 catch{error='적재 상태 기록을 읽지 못했습니다. 기록을 복구하기 전에는 다시 배치하지 않습니다.';}
 const check=()=>{if(owner()!==initial)throw Error('계정이 바뀌었습니다. 화면을 새로 열어 주세요.');if(error)throw Error(error);};
 const commit=next=>{check();const raw=JSON.stringify({version:1,records:next});if(raw.length>1800000||next.length>128)throw Error('적재 상태 기록이 많습니다. 완료한 운송 기록을 정리해 주세요.');try{if(!storage)throw Error();storage.setItem(key,raw);}catch{throw Error('적재 상태를 저장하지 못했습니다. 기존 배치를 유지합니다.');}records=next;};
 return {
  snapshot(){try{check();return {records:structuredClone(records),error:null};}catch(e){return {records:[],error:e.message};}},
  lock(plan,ids){
   check();if(!plan?.packing||!ids.length||new Set(ids).size!==ids.length)throw Error('실려 있는 화물을 선택해 주세요.');
   const selected=ids.map(id=>plan.packing.boxes.find(b=>b.boxId===id&&!b.retained));
   if(selected.some(b=>!b?.rowKey))throw Error('화물 정보를 확인한 뒤 다시 선택해 주세요.');
   const next=structuredClone(records);
   for(const id of new Set(selected.map(b=>b.missionId))){
    let r=next.find(r=>r.id===id);if(r&&cargoFrame(r.ship)!==cargoFrame(plan.ship))throw Error('기록한 함선과 화물칸을 먼저 확인해 주세요.');
    if(!r){r={id,title:plan.contracts.find(c=>c.id===id)?.title||'계약',ship:plan.ship,rows:[],boxes:[]};next.push(r);}
    for(const b of selected.filter(b=>b.missionId===id)){
     const row=plan.cargoRows.find(r=>r.key===b.rowKey),known=r.rows.find(r=>r.key===b.rowKey);
     if(!row||known&&known.identity!==row.identity)throw Error('화물 정보가 바뀌었습니다. 적재 상태를 먼저 확인해 주세요.');
     if(!known)r.rows.push({key:row.key,identity:row.identity,scu:row.scu});
     const old=r.boxes.find(x=>x.boxId===b.boxId);if(old?.state==='delivered')throw Error('배송을 기록한 상자를 다시 적재할 수 없습니다.');
     if(old&&(JSON.stringify([old.bin,old.cell,old.dims])!==JSON.stringify([b.bin,b.cell,b.dims])))throw Error('이미 기록한 화물의 위치가 달라졌습니다.');
     if(!old)r.boxes.push({...b,state:'aboard'});
    }
   }
   const cleaned=next.map(cleanRecord),aboard=cleaned.filter(r=>r.ship.id===plan.ship.id).flatMap(r=>r.boxes.filter(b=>b.state==='aboard'));
   if(!packBoxes([],aboard,plan.ship))throw Error('실린 화물의 위치가 겹칩니다.');commit(cleaned);
  },
  deliver(ids,locationId){
   check();if(!ids.length||new Set(ids).size!==ids.length)throw Error('배송한 상자를 선택해 주세요.');
   const boxes=records.flatMap(r=>r.boxes);if(ids.some(id=>!boxes.some(b=>b.boxId===id&&b.state==='aboard'&&!b.reservation&&b.dropoffId===locationId)))throw Error('실물 구성이 확인된 적재 상자만 배송 처리할 수 있습니다.');
   commit(records.map(r=>({...r,boxes:r.boxes.map(b=>ids.includes(b.boxId)?{...b,state:'delivered',aboard:false}:b)})));
  },
  undoDelivery(ids,ship){
   check();if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!records.some(r=>r.boxes.some(b=>b.boxId===id&&b.state==='delivered'))))throw Error('되돌릴 배송 기록을 선택해 주세요.');
   if(!ship||records.some(r=>r.boxes.some(b=>ids.includes(b.boxId))&&(r.ship.id!==ship.id||cargoFrame(r.ship)!==cargoFrame(ship))))throw Error('기록된 함선과 화물칸을 확인해 주세요.');
   const next=records.map(r=>({...r,boxes:r.boxes.map(b=>ids.includes(b.boxId)?{...b,state:'aboard',aboard:true}:b)})).map(cleanRecord);
   if(!packBoxes([],next.filter(r=>r.ship.id===ship.id).flatMap(r=>r.boxes.filter(b=>b.state==='aboard')),ship))throw Error('이전 적재 위치와 현재 사용 구역을 확인해 주세요.');
   for(const r of next){const aboard=next.filter(x=>x.ship.id===r.ship.id).flatMap(x=>x.boxes.filter(b=>b.state==='aboard'));if(!packBoxes([],aboard,r.ship))throw Error('이전에 기록한 자리에 다른 화물이 있습니다. 실제 위치를 먼저 확인해 주세요.');}commit(next);
  },
  clearCorrupt(){if(!error)throw Error('손상된 기록이 없습니다. 계약별로 화물을 정리해 주세요.');const previous=error;error=null;try{commit([]);}catch(e){error=previous;throw e;}},
  forget(id){check();commit(records.filter(r=>r.id!==id));}
 };
}
// Reconcile saved positions with fresh, derived cargo rows. Missing contracts
// keep occupying space; a missing log event never means cargo disappeared.
export function applyCargoContinuity(groups,rows,ship,records=[],excluded=[]){
 if(!Array.isArray(records)||records.length>128)throw Error('저장된 적재 상태를 확인해 주세요.');
 const ignored=new Set(excluded.map(r=>r.id)),fixed=[],progress=new Map();
 for(const raw of records){
  if(ignored.has(raw.id))continue;const r=cleanRecord(raw);
  if(r.ship.id!==ship.id){if(rows.some(row=>row.missionId===r.id))throw Error('이 계약의 적재 상태가 다른 함선에 남아 있습니다.');continue;}
  if(cargoFrame(r.ship)!==cargoFrame(ship))throw Error('적재 후 화물칸 구성이 바뀌었습니다. 위치를 확인해 주세요.');
  for(const old of r.rows){
   const row=rows.find(row=>row.key===old.key),boxes=r.boxes.filter(b=>b.rowKey===old.key);
   if(!row){if(rows.some(row=>row.missionId===r.id))throw Error('기록된 화물 항목이 계약에서 바뀌었습니다.');fixed.push(...boxes.filter(b=>b.state==='aboard'));continue;}
   if(row.identity!==old.identity)throw Error('적재 후 화물 정보가 바뀌었습니다. 기존 위치를 먼저 확인해 주세요.');
   const group=groups.find(g=>g.key===row.key);if(!group)throw Error('화물 배치를 대조하지 못했습니다.');
   for(const b of boxes){
    if(b.reservation){
     let left=b.size;const replacement=[];
     for(const item of group.items){if(!item.reservation)throw Error('가이드 영역이 실물 상자로 바뀌었습니다. 위치를 다시 확인해 주세요.');const used=Math.min(left,item.size);left-=used;let rest=item.size-used;for(const size of [32,16,8,4,2,1])while(rest>=size){replacement.push({...item,size,boxId:item.boxId+':rest:'+replacement.length});rest-=size;}}
     if(left)throw Error('예약한 공간이 남은 수량을 넘습니다.');group.items=replacement;
    }else{const i=group.items.findIndex(item=>!item.reservation&&item.size===b.size);if(i<0)throw Error('기록한 실물 상자와 현재 구성이 다릅니다.');group.items.splice(i,1);}
    if(b.state==='aboard')fixed.push(b);
   }
   progress.set(row.key,{picked:!boxes.some(b=>b.reservation)&&boxes.reduce((n,b)=>n+b.size,0)===row.scu,delivered:boxes.filter(b=>b.state==='delivered').reduce((n,b)=>n+b.size,0)===row.scu,deliveredScu:boxes.filter(b=>b.state==='delivered').reduce((n,b)=>n+b.size,0)});
  }
 }
 // Generated IDs may have become occupied IDs; keep all new IDs disjoint.
 const used=new Set(fixed.map(b=>b.boxId));for(const g of groups)for(const b of g.items){while(used.has(b.boxId))b.boxId+=':pending';used.add(b.boxId);}
 if(fixed.length>2048||new Set(fixed.map(b=>b.boxId)).size!==fixed.length||!packBoxes([],fixed,ship))throw Error('실려 있는 화물의 위치나 사용 구역을 확인해 주세요.');
 return {fixed,progress:Object.fromEntries(progress)};
}
