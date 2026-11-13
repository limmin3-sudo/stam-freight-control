import {intelRecords,companyKey,intelQuantity,intelOrders,intelReward,intelBox,intelPlaces,orderQuantity,filterIntel} from '../../../intel-model.mjs';
let pending;
export function loadMissionArchive(){
 if(!pending)pending=Promise.all([
  new URL('../../../data/hauling-missions.json',import.meta.url),
  new URL('../../../data/log-mission-index.json',import.meta.url),
  new URL('../../../data/mission-details.json',import.meta.url),
  new URL('../../../data/ai-korean.json',import.meta.url),
 ].map(async url=>{const response=await fetch(url);if(!response.ok)throw Error('Mission reference unavailable');return response.json();})).then(([db,index,details,labels])=>{
  const records=intelRecords(db,index,details),itemLabel=name=>labels.goods?.[name]||name;
  const views=new Map();
  const present=record=>{if(views.has(record.id))return views.get(record.id);const view={id:record.id,title:record.title,giver:record.giver,rank:record.rank,type:record.info?.values?.type||'',
   quantity:intelQuantity(record),reward:intelReward(record),box:intelBox(record),
   orders:intelOrders(record).map(order=>({name:order.name,label:itemLabel(order.name),count:order.count,quantity:orderQuantity(order),maxBoxScu:order.maxBoxScu})),
   pickup:intelPlaces(record,'pickup'),dropoff:intelPlaces(record,'dropoff'),ids:record.ids,
   description:record.info?.values?.description||'',illegal:record.info?.values?.illegal===true,
   sources:[...new Set(Object.values(record.info?.provenance||{}).flat())],
  };views.set(record.id,view);return view;};
  return {version:db.meta?.version||'',wikiVersion:db.meta?.supplementalSources?.wiki?.version||'',definitions:db.missions.length,total:records.length,
   companies:[...new Map(records.map(record=>[companyKey(record.giver),{value:companyKey(record.giver),label:record.giver||'Unknown'}])).values()],
   ranks:[...new Set(records.map(record=>record.rank))].sort((a,b)=>(a<0?999:a)-(b<0?999:b)),
   types:[...new Set(records.map(record=>record.info?.values?.type).filter(Boolean))].sort(),
   filter:options=>filterIntel(records,{...options,itemLabel}).map(present),
  };
 }).catch(error=>{pending=null;throw error;});
 return pending;
}
