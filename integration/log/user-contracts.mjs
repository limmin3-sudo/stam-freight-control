import {ACCOUNT_META} from '../../sync.mjs';
const sizes=[1,2,4,8,16,24,32];
const idPattern=/^(?:manual:)?[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export const userContractScope=c=>JSON.stringify([c.missionId,c.definitionId||null,c.gameBuild?.status||null,c.gameBuild?.value||null]);
export function checkedUserContract(raw){
 if(!idPattern.test(raw?.id||'')||!text(raw.title,200)||!Array.isArray(raw.rows)||!raw.rows.length||raw.rows.length>64||!Number.isFinite(Date.parse(raw.updatedAt)))throw Error('계약 이름과 화물 항목을 확인해 주세요.');
 const manual=raw.id.startsWith('manual:');
 if(!manual&&!text(raw.binding,800))throw Error('연결할 계약을 다시 선택해 주세요.');
 const rows=raw.rows.map(r=>{
  if(r._cargoShape!==undefined&&r._cargoShape!=='cryopod')throw Error('지원하는 화물 형태를 선택해 주세요.');
  const pod=r._cargoShape==='cryopod';
  if(!text(r.commodity,120)||!Number.isSafeInteger(r.scu)||r.scu<1||r.scu>10000||!text(r.dropoffId,160)||!Array.isArray(r.pickupIds)||!r.pickupIds.length||r.pickupIds.length>12||r.pickupIds.some(id=>!text(id,160)||id===r.dropoffId)||new Set(r.pickupIds).size!==r.pickupIds.length)throw Error('품목·총 SCU·픽업·배송지를 확인해 주세요.');
  const boxes=r.boxes||[];if(!Array.isArray(boxes)||boxes.length>sizes.length||new Set(boxes.map(b=>b.size)).size!==boxes.length||boxes.some(b=>!sizes.includes(b.size)||!Number.isSafeInteger(b.count)||b.count<1||b.count>2048))throw Error('상자 크기와 개수를 확인해 주세요.');
  if(pod&&(r.scu>2048||boxes.some(b=>b.size!==1)))throw Error('냉동포드는 개당 1 SCU로 계산합니다. 포드 수량을 확인해 주세요.');
  if(boxes.length&&(boxes.reduce((n,b)=>n+b.size*b.count,0)!==r.scu||boxes.reduce((n,b)=>n+b.count,0)>2048))throw Error('상자 합계가 화물 수량과 다릅니다.');
  return {commodity:r.commodity.trim(),scu:r.scu,pickupIds:[...r.pickupIds],dropoffId:r.dropoffId,boxes:boxes.map(b=>({size:b.size,count:b.count})),...(pod?{_cargoShape:'cryopod'}:{})};
 });
 return {id:raw.id,title:raw.title.trim(),binding:manual?null:raw.binding,updatedAt:raw.updatedAt,rows};
}
export function mergeUserContracts(contracts,pending,records){
 const result=contracts.map(c=>({...c})),waiting=new Map((pending||[]).map(c=>[c.missionId,c]));
 for(const r of records){
  let c=result.find(c=>c.missionId===r.id)||waiting.get(r.id);
  if(!c&&!r.id.startsWith('manual:'))continue; // A missing live contract is not resurrected by a saved correction.
  if(c&&r.binding!==userContractScope(c))continue;
  if(!c)c={missionId:r.id,title:r.title,status:'user-entered',acceptedAt:null,participation:{state:'unconfirmed'},conflicts:[],definitionObservations:[],markerObservations:[],quantityObservations:[]};
  const merged={conflicts:[],definitionObservations:[],markerObservations:[],quantityObservations:[],...c,userManifest:r};
  const i=result.findIndex(c=>c.missionId===r.id);if(i<0)result.push(merged);else result[i]=merged;
 }
 return result;
}
export function userContractPreview(contract,index){
 const r=checkedUserContract(contract.userManifest);
 if(r.id!==contract.missionId||contract.conflicts?.length||contract.status==='end-observed'||contract.participation?.state==='left-observed'||!r.id.startsWith('manual:')&&r.binding!==userContractScope(contract))throw Error('계약 상태가 바뀌었습니다. 입력한 화물을 다시 확인해 주세요.');
 for(const row of r.rows)for(const id of [...row.pickupIds,row.dropoffId])if(!index?.get(id))throw Error('픽업·배송 지점을 정확히 선택해 주세요.');
 return {scope:'destination-space-reservation',userEntered:true,partial:false,
  mission:{id:r.id,title:r.title,cargo:r.rows.map((row,i)=>({key:`${r.id}:user:${i}`,commodity:row.commodity,scu:row.scu,dropoffId:row.dropoffId,pickupId:row.pickupIds.length===1?row.pickupIds[0]:null,parts:[row.scu],maxBoxSize:row._cargoShape==='cryopod'?1:32,boxes:row._cargoShape==='cryopod'?[{size:1,count:row.scu}]:row.boxes,boxSource:row._cargoShape==='cryopod'||row.boxes.length?'user':'estimate',...(row._cargoShape?{_cargoShape:row._cargoShape}:{})}))},
  visitRequirements:{complete:true,pickups:[...new Set(r.rows.flatMap(row=>row.pickupIds))],deliveries:[...new Set(r.rows.map(row=>row.dropoffId))]},
  evidence:{allocation:'user-confirmed-stops-and-totals',boxComposition:r.rows.every(row=>row.boxes.length||row._cargoShape==='cryopod')?'user-entered':'estimated-space-only'},currentInventoryVerified:false,remainingCargoVerified:false};
}
export function createUserContracts(storage){
 const owner=()=>JSON.parse(storage?.getItem(ACCOUNT_META)||'null')?.uid||'guest';let initial,key,raw=null,records=[],error=null;
 try{initial=owner();key='stam-user-contracts-v1:'+encodeURIComponent(initial);raw=storage?.getItem(key)||null;if(raw){if(raw.length>512000)throw Error();const parsed=JSON.parse(raw);if(parsed.version!==1||!Array.isArray(parsed.records)||parsed.records.length>128)throw Error();records=parsed.records.map(checkedUserContract);if(new Set(records.map(r=>r.id)).size!==records.length)throw Error();}}
 catch{error='보관한 수동 계약을 읽지 못했습니다. 백업을 확인해 주세요.';}
 function check(){if(error)throw Error(error);if(owner()!==initial)throw Error('계정이 바뀌었습니다. 화면을 다시 열어 주세요.');if(storage&&(storage.getItem(key)||null)!==raw)throw Error('다른 창에서 계약이 바뀌었습니다. 화면을 다시 열어 주세요.');}
 function commit(next){check();const value=JSON.stringify({version:1,records:next});if(next.length>128||value.length>512000)throw Error('수동 계약 보관 공간이 부족합니다. 사용하지 않는 계약을 정리해 주세요.');if(!storage)throw Error('브라우저 저장 공간을 사용할 수 없습니다.');try{storage.setItem(key,value);}catch{throw Error('계약을 저장하지 못했습니다. 이전 기록을 유지합니다.');}raw=value;records=next;}
 return {snapshot(){try{check();return {records:structuredClone(records),error:null};}catch(e){return {records:[],error:e.message};}},save(value){const r=checkedUserContract(value);commit([...records.filter(p=>p.id!==r.id),r]);return r;},remove(id){commit(records.filter(r=>r.id!==id));}};
}
