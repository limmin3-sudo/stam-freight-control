import {upperBoundDraft,upperBoundReady,cardCertainty} from '../../../integration/inbox-core.mjs';
import {deliveryGroups,missionSCU,quantitiesReady} from '../../../delivery-totals.mjs';

// Reuse the original evidence rules. Never promote a catalogue ceiling to an actual quantity.
export function quantityPlan(mission,allowUpperBounds=true){
 const planned=allowUpperBounds?upperBoundDraft(mission):structuredClone(mission);
 const card={rows:planned.cargo,deliveryTotals:planned._deliveryTotals,destinationBoxes:planned.destinationBoxes};
 const places=planned.cargo.flatMap(row=>[{id:row.pickupId},{id:row.dropoffId}]);
 const ready=quantitiesReady(planned)||allowUpperBounds&&upperBoundReady(card,places);
 return {mission:planned,ready,certainty:ready?cardCertainty(card):'unavailable',scu:missionSCU(planned),
  deliveries:deliveryGroups(planned).map(group=>({id:group.dropoffId,total:group.scu,confirmed:group.total!==null||!group.unknown.length,unknown:!!group.unknown.length}))};
}
