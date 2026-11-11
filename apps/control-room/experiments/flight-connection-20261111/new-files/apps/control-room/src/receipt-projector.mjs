import { locationIndex } from '../../../integration/log/locations.mjs';
import { inboxCards, withDeliveryTotal, cardReady } from '../../../integration/inbox-core.mjs';
import { actualQuantity, deliveryGroups } from '../../../delivery-totals.mjs';
import { prepareMissionDb } from '../../../mission-match.mjs';
import locations from '../../../data/log-location-index.json' with {type:'json'};
import catalog from '../../../data/log-mission-index.json' with {type:'json'};
import hauling from '../../../data/hauling-missions.json' with {type:'json'};
import korean from '../../../data/stam-korean.json' with {type:'json'};
import aiNames from '../../../data/ai-korean.json' with {type:'json'};

const index=locationIndex(locations);
const points=locations.locations.filter(p=>p.id).map(p=>({...p,uuid:p.id,id:p.system+':'+p.id}));
const db=prepareMissionDb(hauling,{commodities:Object.fromEntries(Object.entries(aiNames.goods||{}).map(([en,ko])=>[ko,en]))});
export function receipt(raw) {
  // A logged goal can cover several pickups. Only accept an unambiguous
  // destination total; preserve unknown per-pickup shares as unknown.
  let draft={id:raw.id,title:raw.title,company:raw.company||'',reward:0,_rewardKnown:false,cargo:structuredClone(raw.rows),_logInbox:{version:1,signature:raw.signature}};
  for(const group of deliveryGroups(draft)) {
    const hints=(raw.quantityHints||[]).filter(h=>h.dropoffId===group.dropoffId);
    if(hints.length!==1 || !group.dropoffId || !group.rows.every(r=>r.commodity===hints[0].commodity)) continue;
    try { draft=withDeliveryTotal(draft,group.dropoffId,hints[0].scu); } catch { /* Keep unresolved evidence visible. */ }
  }
  const reservations={};
  for(const group of deliveryGroups(draft)) {
    if(group.reservation) reservations[group.dropoffId]=group.total;
  }
  const shipments=draft.cargo.map((row,i)=>({
    id:raw.id+'-'+i, cargo:[korean.goods[row.commodity]||aiNames.goods?.[row.commodity]||row.commodity,row.commodity],
    from:row.pickupId||'',to:row.dropoffId||'',
    scu:actualQuantity(row)?row.scu:0,
  }));
  const incomplete=!cardReady({...raw,rows:draft.cargo,deliveryTotals:draft._deliveryTotals},points);
  return {id:raw.id,title:[raw.title,raw.title],shipments,pay:0,rewardUnknown:true,reservations,mission:draft,
    state:raw.conflict?'conflict':raw.ended?'ended':incomplete?'incomplete':'ready',
    hints:(raw.quantityHints||[]).map(h=>({cargo:h.commodity,scu:h.scu,place:h.dropoffId||'',name:h.dropoffText}))};
}

export function projectSnapshot(snapshot){const result=inboxCards(snapshot,points,index,catalog,db);return {phase:result.blocked?'mixed':'loaded',cards:result.cards.map(receipt)};}
