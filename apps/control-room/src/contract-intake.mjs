import {createOCRReader, parseMissionText, splitMissionText} from '../../../ocr.mjs';
import {deliveryGroups} from '../../../delivery-totals.mjs';
import locations from '../../../data/locations.json' with {type:'json'};

export {createOCRReader};
export function textContracts(text) {
  return splitMissionText(text).map(source=>{
    const parsed=parseMissionText(source,locations.locations);
    const id=parsed.missionId||crypto.randomUUID();
    const title=parsed.title||parsed.company||'—';
    const reservations=Object.fromEntries(deliveryGroups(parsed).filter(group=>group.reservation).map(group=>[group.dropoffId,group.total]));
    return {id,title:[title,title],pay:parsed.reward,rewardUnknown:!parsed.rewardKnown,reservations,shipments:parsed.cargo.map((row,i)=>({
      id:id+'-'+i,cargo:[row.commodity,row.commodity],from:row.pickupId,to:row.dropoffId,scu:row._scuAssumed?0:row.scu||0,maxBoxSize:row.maxBoxSize
    }))};
  });
}

export {reviewReceipt} from './receipt-edit.mjs';
