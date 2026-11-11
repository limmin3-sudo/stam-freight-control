import { LogLines } from '../../../integration/log/lines.mjs';
import { LogEvidence } from '../../../integration/log/state.mjs';
import { locationIndex } from '../../../integration/log/locations.mjs';
import { inboxCards, withDeliveryTotal } from '../../../integration/inbox-core.mjs';
import { actualQuantity, deliveryGroups } from '../../../delivery-totals.mjs';
import { prepareMissionDb } from '../../../mission-match.mjs';
import locations from '../../../data/log-location-index.json';
import catalog from '../../../data/log-mission-index.json';
import hauling from '../../../data/hauling-missions.json';
import korean from '../../../data/stam-korean.json';
import aiNames from '../../../data/ai-korean.json';

const index=locationIndex(locations);
const points=locations.locations.filter(p=>p.id).map(p=>({...p,uuid:p.id,id:p.system+':'+p.id}));
const db=prepareMissionDb(hauling,{commodities:Object.fromEntries(Object.entries(aiNames.goods||{}).map(([en,ko])=>[ko,en]))});
const cities={Lorville:'hurston',Orison:'crusader',Area18:'arccorp','New Babbage':'microtech'};
const chartIds=new Map(points.map(p=>[p.id,p.system==='stanton' && Object.hasOwn(cities,p.name)?cities[p.name]:p.id]));

function receipt(raw) {
  // A logged goal can cover several pickups. Only accept an unambiguous
  // destination total; preserve unknown per-pickup shares as unknown.
  let draft={cargo:raw.rows};
  for(const group of deliveryGroups(draft)) {
    const hints=(raw.quantityHints||[]).filter(h=>h.dropoffId===group.dropoffId);
    if(hints.length!==1 || !group.dropoffId || !group.rows.every(r=>r.commodity===hints[0].commodity)) continue;
    try { draft=withDeliveryTotal(draft,group.dropoffId,hints[0].scu); } catch { /* Keep unresolved evidence visible. */ }
  }
  const reservations={};
  for(const group of deliveryGroups(draft)) {
    if(group.reservation) reservations[chartIds.get(group.dropoffId)]=group.total;
  }
  const shipments=draft.cargo.map((row,i)=>({
    id:raw.id+'-'+i, cargo:[korean.goods[row.commodity]||aiNames.goods?.[row.commodity]||row.commodity,row.commodity],
    from:chartIds.get(row.pickupId)||'',to:chartIds.get(row.dropoffId)||'',
    scu:actualQuantity(row)?row.scu:0,
    cargoShape:row._cargoShape||row._special,maxBoxSize:row.maxBoxSize,
  }));
  const incomplete=!shipments.length||shipments.some(row=>!row.from||!row.to||!row.cargo[1]||!row.scu&&!reservations[row.to]);
  return {id:raw.id,title:[raw.title,raw.title],shipments,pay:0,rewardUnknown:true,reservations,
    state:raw.conflict?'conflict':raw.ended?'ended':incomplete?'incomplete':'ready',
    hints:(raw.quantityHints||[]).map(h=>({cargo:h.commodity,scu:h.scu,place:chartIds.get(h.dropoffId)||'',name:h.dropoffText}))};
}
self.onmessage=async ({data:file})=>{
  try {
    const evidence=new LogEvidence({locations:index});
    const lines=new LogLines({onLine:(line,lineNumber)=>evidence.ingest(line,{file:'Game.log',line:lineNumber}),onInvalid:code=>evidence.note(code)});
    for(let offset=0;offset<file.size;offset+=262144) {
      lines.write(new Uint8Array(await file.slice(offset,offset+262144).arrayBuffer()));
    }
    lines.finish();
    const result=inboxCards(evidence.snapshot(),points,index,catalog,db);
    self.postMessage({phase:result.blocked?'mixed':'loaded',cards:result.cards.map(receipt)});
  } catch { self.postMessage({phase:'error',cards:[]}); }
};
