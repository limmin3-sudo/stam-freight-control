import {contractLocations} from './locations.mjs';
export const receptionActive=c=>c.status!=='end-observed'&&c.participation?.state!=='left-observed';
// Presentation of existing evidence only. No new inference or planning authority.
export function contractReception(c,readiness,catalog,locations){
 const closed=!receptionActive(c),conflict=!!c.conflicts?.length,preview=readiness?.preview;
 const stage=closed?'closed':conflict?'conflict':!readiness?.ready?'waiting':preview.partial?'partial':readiness.reservation?'reserved':'ready';
 const label={closed:'종료·참여 이탈 기록',conflict:'기록 확인 필요',waiting:'추가 정보 대기',partial:'일부 화물 연결',reserved:'배송지별 공간 준비',ready:'적재 명세 연결'}[stage];
 const items=[],definitions=c.definitionObservations||[];
 items.push({name:'계약 유형',state:definitions.length===1&&catalog?.has(c.definitionId)?'linked':'waiting',text:definitions.length===1&&catalog?.has(c.definitionId)?'공개 유형 ID와 연결했습니다.':'유형 ID 또는 공개 목록을 확인하고 있습니다.'});
 const compared=contractLocations({...c,markerObservations:c.markerObservations||[],quantityObservations:c.quantityObservations||[],definitionObservations:definitions},locations);
 for(const [role,name] of [['pickup','픽업 지점'],['dropoff','배송 지점']]){
  const markers=compared.objectives.filter(o=>o.role===role),matched=markers.filter(o=>o.status==='coordinate-match'&&!o.quantityConflict);
  const names=[...new Set(matched.map(o=>o.candidates[0].name))];
  items.push({name,state:markers.length&&matched.length===markers.length?'linked':'waiting',text:markers.length?`${markers.length}개 목표 중 ${matched.length}개 지점 연결${names.length?' · '+names.join(', '):''}`:'목표 지점 기록을 기다리고 있습니다.'});
 }
 const cargo=preview?.mission.cargo||[];
 items.push({name:'품목·총량',state:cargo.length?(preview.partial?'partial':'linked'):'waiting',text:cargo.length?`${preview.partial?'확인된 일부 화물':'연결된 화물'} ${cargo.reduce((n,r)=>n+r.scu,0)} SCU · ${cargo.length}개 항목`:'품목·수량과 배송 목표를 함께 대조하고 있습니다.'});
 const boxes=cargo.length&&cargo.every(r=>r.boxes?.length);
 items.push({name:'상자 구성',state:boxes?'linked':'waiting',text:boxes?'검증된 유형의 상자 구성을 연결했습니다.':'자동 연결된 상자 구성은 없습니다. 공간 가이드를 쓰거나 화물 확인에서 직접 지정할 수 있습니다.'});
 return {stage,label,items,note:closed?'새 기록이 와도 이 계약을 자동으로 다시 선택하지 않습니다.':conflict?'서로 다른 기록을 임의로 합치지 않습니다.':preview?.partial?'표시된 화물 외에 누락된 목표가 있을 수 있어 전체 항로는 보류합니다.':readiness?.ready?'이 정보는 원래 계약 수요입니다. 실제 적재·배송 상태는 별도로 확인합니다.':'새 기록은 같은 계약에 자동으로 이어집니다. 계약을 포기하거나 다시 받을 필요는 없습니다.'};
}
export function receptionDetails(reception,id){
 const root=document.createElement('details');root.className='contract-reception';root.dataset.reception=id;root.dataset.stage=reception.stage;
 const summary=document.createElement('summary');summary.textContent='수신 정보 · '+reception.label;root.append(summary);
 for(const item of reception.items){const row=document.createElement('p');row.dataset.state=item.state;const name=document.createElement('strong');name.textContent=item.name+' · ';row.append(name,document.createTextNode(item.text));root.append(row);}
 const note=document.createElement('p');note.className='detail';note.textContent=reception.note;root.append(note);return root;
}
