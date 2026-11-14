import {withDeliveryTotal} from '../../../integration/inbox-core.mjs';
import {actualQuantity, deliveryGroups, quantitiesReady} from '../../../delivery-totals.mjs';
import {boxList} from '../../../engine.mjs';
import {canonicalLocationId as routeId} from './personal-locations.mjs';

// The old workbench can store one box configuration for a whole delivery.
export function reservationBoxes(job){
  return Object.fromEntries(Object.keys(job.reservations||{}).map(place=>[
    place,job.mission?.destinationBoxes?.find(g=>g.pickupId==null && g.dropoffId===routeId(place))?.boxes||[]
  ]));
}

export function reviewReceipt(source,form,allowUnknown=false,groupBoxes=reservationBoxes(form)) {
  if(!source || !['ready','incomplete'].includes(source.state) || source.id!==form.id || source.signature!==form.signature)
    throw Error('수신 기록이 바뀌었습니다. 수신함에서 계약을 다시 확인하세요.');
  const original=source.mission || {
    id:source.id, cargo:source.shipments.map(row=>({
      commodity:row.cargo[1],pickupId:routeId(row.from),dropoffId:routeId(row.to),
      scu:row.scu||null,boxes:row.boxes,maxBoxSize:row.maxBoxSize,_cargoShape:row.cargoShape
    }))
  };
  const byRow=new Map(source.shipments.map((row,i)=>[row.id,{row,cargo:original.cargo[i]}]));
  const changedGroups=new Set(), changedDestinations=new Set();
  const mark=cargo=>{
    changedGroups.add(JSON.stringify([cargo.pickupId,cargo.dropoffId]));
    changedDestinations.add(cargo.dropoffId);
  };
  const cargo=form.shipments.map(row=>{
    const before=byRow.get(row.id);
    byRow.delete(row.id);
    const next={...before?.cargo,commodity:row.cargo[1],pickupId:routeId(row.from),dropoffId:routeId(row.to)};
    if(!before || before.row.scu!==row.scu){
      next.scu=row.scu||null;
      next._scuEstimated=false;next._scuAssumed=false;
    }
    next.boxes=row.boxes||[];
    if(next.boxes.length){
      if(next._cargoShape==='cryopod' && next.boxes.some(b=>b.size!==1))throw Error('냉동 포드는 1 SCU 규격입니다.');
      boxList(next);
    }
    if(!before || before.row.scu!==row.scu || before.row.from!==row.from || before.row.to!==row.to ||
      JSON.stringify(before.row.boxes||[])!==JSON.stringify(next.boxes)){
      if(before)mark(before.cargo);
      mark(next);
    }
    return next;
  });
  for(const removed of byRow.values())mark(removed.cargo);
  for(const place of new Set([...Object.keys(source.reservations||{}),...Object.keys(form.reservations||{})])){
    if(source.reservations?.[place]!==form.reservations?.[place])changedDestinations.add(routeId(place));
  }
  let mission={...original,title:form.title[1],reward:form.pay,_rewardKnown:!form.rewardUnknown,cargo,
    _deliveryTotals:(original._deliveryTotals||[]).filter(t=>!changedDestinations.has(t.dropoffId)),
    destinationBoxes:(original.destinationBoxes||[]).filter(g=>g.pickupId==null
      ?!changedDestinations.has(g.dropoffId):!changedGroups.has(JSON.stringify([g.pickupId,g.dropoffId])))};
  const reservations={};
  for(const [place,total] of Object.entries(form.reservations||{})){
    const id=routeId(place);
    if(!mission.cargo.some(row=>row.dropoffId===id))continue;
    try{mission=withDeliveryTotal(mission,id,total);}
    catch{throw Error('배송 총량과 픽업 수량이 맞는지 확인하세요.');}
    const group=deliveryGroups(mission).find(g=>g.dropoffId===id);
    if(group?.total!==total)throw Error('배송 총량과 픽업 수량이 맞는지 확인하세요.');
    if(group.reservation){
      reservations[place]=total;
      // While pickup shares are unknown the planner packs this destination as one lot.
      if(group.indices.some(i=>form.shipments[i].boxes?.length &&
        JSON.stringify(form.shipments[i].boxes)!==JSON.stringify(source.shipments.find(r=>r.id===form.shipments[i].id)?.boxes)))
        throw Error('픽업별 수량이 미확인인 배송지는 배송 총량의 상자 규격을 입력하세요.');
      const boxes=groupBoxes[place]||[];
      mission.destinationBoxes=mission.destinationBoxes.filter(g=>g.pickupId!=null || g.dropoffId!==id);
      if(boxes.length){
        if(group.rows.some(row=>row._cargoShape==='cryopod') && boxes.some(b=>b.size!==1))throw Error('냉동 포드는 1 SCU 규격입니다.');
        boxList({scu:total,boxes});
        mission.destinationBoxes.push({pickupId:null,dropoffId:id,boxes,origin:'manual'});
      }
    }
  }
  const ready=quantitiesReady(mission);
  if(!mission.cargo.length||!allowUnknown&&!ready)throw Error('픽업 수량 또는 배송지별 총량을 입력하세요.');
  return {...form,mission,state:ready?'ready':'incomplete',reviewedReceipt:true,reservations,shipments:form.shipments.map((row,i)=>({
    ...row,scu:actualQuantity(mission.cargo[i])?mission.cargo[i].scu:0
  }))};
}
