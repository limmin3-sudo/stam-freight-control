import library from './data/receipt-catalogs.json' with {type:'json'};

const {values}=library;
const placesCache=new WeakMap();
const key=s=>String(s||'').normalize('NFKC').toLowerCase().trim().replace(/[’]/g,"'");
const cityAirports=new Map(Object.entries({'teasa spaceport':'lorville','riker memorial spaceport':'area18','august dunlow spaceport':'orison','new babbage interstellar spaceport':'new babbage'}));
export function placeResolver(places){
 if(placesCache.has(places))return placesCache.get(places);
 const names=new Map(),memo=new Map();
 for(const point of places){
  if(['Star','Planet','Moon','Asteroid'].includes(point.type))continue;
  for(const name of [point.uuid,point.id,point.name,...(point.aliases||[])]){
   const label=key(name);if(!label)continue;
   if(!names.has(label))names.set(label,new Set());
   names.get(label).add(point.id);
  }
 }
 const resolve=name=>{
  if(memo.has(name))return memo.get(name);
  // Wiki labels often qualify an exact terminal, e.g. "Ruin Station above Pyro VI".
  const label=key(name),site=label.replace(/\s+(?:above\s+.+|at the l[1-5] lagrange of\s+.+)$/i,'');
  const ids=names.get(label)||names.get(cityAirports.get(site)||site);
  const id=ids?.size===1?[...ids][0]:null;
  memo.set(name,id);return id;
 };
 placesCache.set(places,resolve);return resolve;
}

export function receiptBuildVersion(build){
 return library.builds[build]?.version.toUpperCase();
}
function unpackSlots(packed){
 if(!packed)return null;
 const slots={items:values[packed.items],fixed:values[packed.fixed]};
 for(const role of ['pickup','dropoff']){
  slots[role]=(packed[role]||[]).map(i=>values[i]);
  slots[role+'Orders']=(packed[role+'Orders']||[]).map(i=>i==null?null:values[i]);
 }
 return slots;
}
export function exactFreightReference(catalog,contract){
 if(catalog?.sourceName!=='SCMDB'||!catalog.version||!contract.definitionId||contract.gameBuild?.status!=='known')return null;
 const build=library.builds[contract.gameBuild.value],id=contract.definitionId.toLowerCase();
 if(!build||!Object.hasOwn(build.defs,id)&&!Object.hasOwn(build.wikiSlots,id))return null;
 const record=values[build.defs[id]],slots=unpackSlots(values[build.wikiSlots[id]]);
 let definition=null;
 if(record){
  const pools=values[record.pools].map(p=>({...p,candidates:values[p.candidates]}));
  definition={id,title:record.title,giver:record.giver,rank:record.rank,templateNames:record.templateNames,released:true,
   quantityVersion:build.version,rulesSource:record.wiki?'wiki':'scmdb',rules:{orders:values[record.orders],pools,
    objectiveOrderIndicesVerified:record.verified,objectiveIdsFromMarkers:!record.wiki,haulingObjectives:values[record.objectives]||[]}};
 }
 const pairs=(values[build.routes[id]]||[]).map(i=>values[i].map(group=>values[group]));
 return {definition,pairs,slots,build,hasScmdb:Object.hasOwn(build.routes,id),metadata:record?.metadata===undefined?null:values[record.metadata]};
}

export function referenceStops(reference,places,{pickups=[],dropoffs=[]}={}){
 const resolve=placeResolver(places);
 const roleNames=['pickup','dropoff'],observed=[pickups,dropoffs];
 const candidates=reference.pairs.filter(pair=>pair.every((names,i)=>{
  if(!observed[i].length)return true;
  const ids=names.map(resolve);
  return !ids.length||ids.includes(null)||observed[i].every(id=>ids.includes(id));
 }));
 const stops={pickup:[],dropoff:[]},fixed={pickup:'',dropoff:''};
 if(reference.pairs.length&&!candidates.length){
  // SCMDB aliases can aggregate a different region. An independent Wiki
  // itinerary is usable only when its own address pools cover the observed stops.
  const compatible=roleNames.every((role,i)=>{
   const wikiIds=new Set((reference.slots?.[role]||[]).flat().map(resolve));
   return observed[i].every(id=>wikiIds.has(id));
  });
  if(!compatible)return {stops,fixed,ordered:()=>''};
 }
 for(const [i,role] of roleNames.entries()){
  const wiki=(reference.slots?.[role]||[]).map(group=>group.map(resolve));
  const scm=candidates.map(p=>p[i].map(resolve));
  const allKnown=groups=>groups.length>0&&groups.every(g=>g.length>0&&g.every(Boolean));
  const scmIds=allKnown(scm)?new Set(scm.flat()):null;
  const knownWiki=wiki.filter(g=>g.length>0&&g.every(Boolean));
  const wikiIds=allKnown(wiki)?new Set(wiki.flat()):null;
  const combined=scmIds&&wikiIds?new Set([...scmIds].filter(id=>wikiIds.has(id))):scmIds||wikiIds;
  if(combined?.size===1){
   const [id]=combined;
   const contradicts=knownWiki.some(group=>!group.includes(id));
   const plausibleWiki=!wiki.length||!wiki.flat().some(Boolean)||wiki.flat().includes(id);
   if(!contradicts&&plausibleWiki&&(!observed[i].length||observed[i].every(v=>v===id)))fixed[role]=id;
  }
  // A partial list of Wiki tokens on a multi-stop side need not cover all
  // orders. Keep mandatory singleton slots as visits, never split the load.
  for(const group of knownWiki){
   const ids=new Set(group),[id]=ids;
   if(ids.size===1&&(!observed[i].length||wiki.length>1||observed[i].includes(id))&&(!scmIds||scmIds.has(id)))stops[role].push(id);
  }
  if(fixed[role])stops[role].push(fixed[role]);
  stops[role]=[...new Set(stops[role])];
 }
 function ordered(role,order,orders){
  const slots=reference.slots,items=slots?.items;
  if(!order||!items||orders.length!==items.length||!orders.every((o,i)=>key(o.name)===key(items[i])))return '';
  const slot=slots[role+'Orders']?.[orders.indexOf(order)];
  if(slot==null)return '';
  const ids=new Set(slot.map(resolve)),[id]=ids;
  if(ids.size!==1||!id)return '';
  const i=role==='pickup'?0:1;
  if(candidates.length&&!candidates.some(pair=>{
   const ids=pair[i].map(resolve);return !ids.length||ids.includes(null)||ids.includes(id);
  }))return '';
  return id;
 }
 return {stops,fixed,ordered};
}

export function wikiFixedQuantity(reference,order,orders){
 const slots=reference?.slots;
 if(!slots||reference.build.wikiVersion.split('.').at(-1)!==reference.build.version.split('.').at(-1)||order.kind!=='Resource')return '';
 const items=slots.items,n=slots.fixed?.[orders.indexOf(order)];
 if(!items||items.length!==orders.length||!orders.every((o,i)=>key(o.name)===key(items[i]))||!Number.isSafeInteger(n)||n<=0)return '';
 if(order.minScu>0&&n<order.minScu||order.maxScu>0&&n>order.maxScu)return '';
 return n;
}
