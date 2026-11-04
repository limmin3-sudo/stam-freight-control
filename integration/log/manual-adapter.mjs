import {contractLocations} from './locations.mjs';
import {previewReadiness} from './preview-packing.mjs';

// Translate evidence into the original planner's input, never its calculated route.
// Runtime IDs retain ownership even when two contracts have the same definition.
export function manualContract(contract,catalog,locations,mapData){
 const id=contract.missionId;
 const base={id,title:contract.title||'운송 계약'};
 if(contract.conflicts?.length)return {...base,state:'blocked',reason:'계약 기록이 서로 다릅니다. 접수 내역을 확인해 주세요.'};
 if(contract.status==='end-observed'||contract.participation?.state==='left-observed')return {...base,state:'ended',reason:'종료·참여 이탈 기록이 있습니다. 남은 화물은 별도 확인이 필요합니다.'};
 if(!['acceptance-observed','participation-observed'].includes(contract.status))return {...base,state:'pending',reason:'본인의 계약 수락을 확인하고 있습니다.'};
 const result=previewReadiness(contract,catalog,locations);
 if(!result.ready)return {...base,state:'pending',reason:result.label};
 if(result.reservation)return {...base,state:'pending',reason:'품목·총량·배송지 수신 완료 · 픽업별 화물 배분 확인 중',
  cargo:result.preview.mission.cargo.map(c=>({commodity:c.commodity,scu:c.scu,dropoffId:c.dropoffId}))};
 const input=result.preview.mission;
 const markers=contractLocations(contract,locations).objectives;
 const mapId=(id,role)=>{
  const candidates=markers.filter(m=>m.role===role&&m.status==='coordinate-match').flatMap(m=>m.candidates).filter(p=>p.id===id);
  const keys=new Set(candidates.map(p=>`${p.system}:${p.id}`));
  if(keys.size!==1)return null;
  const matches=(mapData?.locations||[]).filter(p=>keys.has(p.id)&&p.uuid===id);
  return matches.length===1?matches[0].id:null;
 };
 const cargo=input.cargo.map(c=>({commodity:c.commodity,scu:c.scu,pickupId:mapId(c.pickupId,'pickup'),dropoffId:mapId(c.dropoffId,'dropoff'),
  boxes:c.boxes.map(b=>({size:b.size,count:b.count})),...(c.maxBoxSize?{maxBoxSize:c.maxBoxSize}:{})}));
 if(!cargo.length||cargo.some(c=>!c.pickupId||!c.dropoffId||!Number.isSafeInteger(c.scu)||c.scu<1))return {...base,state:'pending',reason:'픽업·배송별 화물 정보를 확인하고 있습니다.'};
 return {...base,state:'ready',mission:{id,title:base.title,company:'',reward:0,cargo,
  _logImport:{version:1,definitionId:contract.definitionId,build:contract.gameBuild?.value||null,basis:result.preview.scope}}};
}

// Existing/user-edited missions are never replaced by a subsequent observation.
export function receptionChanges(snapshot,existing,catalog,locations,{active=false,mapData,handled=new Set(),deferred=new Set()}={}){
 if(snapshot.identity?.mixedPlayers)return {rows:[],add:[],blocked:'여러 플레이어의 기록이 섞여 있습니다. 현재 Game.log를 다시 연결해 주세요.'};
 const current=new Set(existing.map(m=>m.id));
 const rows=(snapshot.contracts||[]).map(c=>{
  const row=manualContract(c,catalog,locations,mapData);
  return {...row,present:current.has(row.id),deferred:deferred.has(row.id),handled:handled.has(row.id)};
 });
 return {rows,add:active?[]:rows.filter(r=>r.state==='ready'&&!r.present&&!r.deferred&&!r.handled).map(r=>r.mission),blocked:null};
}
