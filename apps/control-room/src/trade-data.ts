// UEX reference data only. No accepted contracts, cargo or account state are written.
export type Raw = Record<string,unknown>;
export type Commodity={id:number;code?:string;name:string;kind:string;illegal:boolean|null;hazards:string[];riskKnown:boolean};
export type Terminal={id:number;name:string;system:string;planet:string;location:string;version:string|null;updatedAt:string|null;maxContainerScu:number|null;elevator:boolean|null;docking:boolean|null;autoLoad:boolean|null;playerOwned:boolean|null;loadingDock?:boolean|null;faction?:string;space?:boolean|null;ground?:boolean|null;refuel?:boolean|null;nqa?:boolean|null;hidden?:boolean|null;security?:{monitored:boolean|null;armistice:boolean|null;source:string;updatedAt:string|null}|null};
export type Quote={id:number;commodityId:number;terminalId:number;buy:number|null;sell:number|null;stock:number|null;demand:number|null;version:string|null;updatedAt:string|null;containers:number[];personal?:boolean;averages?:{buy:number|null;sell:number|null;stock:number|null;demand:number|null};range?:{buyMin:number|null;buyMax:number|null;sellMin:number|null;sellMax:number|null};};
export type MarketSnapshot={schema:1;source:'UEX';retrievedAt:string;liveVersion:string;commodities:Commodity[];terminals:Terminal[];quotes:Quote[];coverage:{rawCommodities:number;rawTerminals:number;rawQuotes:number;excludedQuotes:number;queriedTerminals:number};evidence:{url:string;sha256:string;checkedAt:string;rows:number}[]};
export const tradeApi='https://api.uexcorp.uk/2.0/';
export const flag=(v:unknown):boolean|null=>v===1||v===true?true:v===0||v===false?false:null;
const number=(v:unknown):number|null=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const id=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0?v:null;
const text=(v:unknown)=>typeof v==='string'?v.trim():'';
const stamp=(v:unknown,now:number)=>typeof v==='number'&&v>0&&v*1000<=now+300000?new Date(v*1000).toISOString():null;
export const patch=(v:unknown)=>text(v).match(/^\d+\.\d+\.\d+(?=$|[-.])/i)?.[0]??null;
function rows(input:unknown):Raw[]{if(!Array.isArray(input)||input.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw Error('Invalid source rows');return input as Raw[];}
function unique<T extends {id:number}>(items:T[]){if(new Set(items.map(r=>r.id)).size!==items.length)throw Error('Duplicate source identifiers');return items;}
export function normalizeMarket(input:{commodities:unknown;terminals:unknown;quotes:unknown;liveVersion:string;retrievedAt:string;queriedTerminals:number;sites?:{stations?:unknown;outposts?:unknown;cities?:unknown};evidence?:MarketSnapshot['evidence']}):MarketSnapshot{
 const now=Date.parse(input.retrievedAt);if(!Number.isFinite(now)||!/^\d+\.\d+\.\d+$/.test(input.liveVersion))throw Error('Invalid snapshot metadata');
 const cr=rows(input.commodities),tr=rows(input.terminals),qr=rows(input.quotes);
 if(!cr.length||!tr.length)throw Error('Empty reference catalogue');
 const commodities=unique(cr.filter(r=>flag(r.is_available_live)===true&&flag(r.is_visible)===true).map(r=>{
  if(!id(r.id)||!text(r.name))throw Error('Invalid commodity identity');
  const hazards=['is_volatile_qt','is_volatile_time','is_explosive','is_buggy'];return {id:r.id as number,name:text(r.name),...(text(r.code)?{code:text(r.code)}:{}),kind:text(r.kind),illegal:flag(r.is_illegal),hazards:hazards.filter(k=>flag(r[k])===true),riskKnown:hazards.every(k=>flag(r[k])!==null)};
 }));
 const sites={stations:rows(input.sites?.stations??[]),outposts:rows(input.sites?.outposts??[]),cities:rows(input.sites?.cities??[])};
 const security=(r:Raw)=>{
  for(const [field,kind,endpoint] of [['id_space_station','stations','space_stations'],['id_outpost','outposts','outposts'],['id_city','cities','cities']] as const){
   if(!id(r[field]))continue;const matches=sites[kind].filter(s=>s.id===r[field]&&flag(s.is_available_live)===true&&flag(s.is_visible)===true&&flag(s.is_decommissioned)!==true);
   if(matches.length!==1)return null;const site=matches[0]!;return {monitored:flag(site.is_monitored),armistice:flag(site.is_armistice),source:tradeApi+endpoint+'?id='+site.id,updatedAt:stamp(site.date_modified,now)};
  }return null;
 };
 const terminals=unique(tr.filter(r=>flag(r.is_available_live)===true&&flag(r.is_visible)===true&&r.type==='commodity').map(r=>{
  if(!id(r.id)||!text(r.name))throw Error('Invalid terminal identity');
  return {id:r.id as number,name:text(r.name),system:text(r.star_system_name),planet:text(r.planet_name),location:text(r.space_station_name)||text(r.city_name)||text(r.outpost_name)||text(r.displayname),version:text(r.game_version)||null,updatedAt:stamp(r.date_modified,now),maxContainerScu:number(r.max_container_size)||null,elevator:flag(r.has_freight_elevator),docking:flag(r.has_docking_port),autoLoad:flag(r.is_auto_load),playerOwned:flag(r.is_player_owned),loadingDock:flag(r.has_loading_dock),faction:text(r.faction_name),space:id(r.id_space_station)?true:id(r.id_city)||id(r.id_outpost)?false:null,ground:id(r.id_city)||id(r.id_outpost)?true:id(r.id_space_station)?false:null,refuel:flag(r.is_refuel),nqa:flag(r.is_nqa),hidden:flag(r.is_visible)===false,security:security(r)};
 }));
 const cs=new Set(commodities.map(c=>c.id)),ts=new Set(terminals.map(t=>t.id));
 const quotes=unique(qr.filter(r=>cs.has(r.id_commodity as number)&&ts.has(r.id_terminal as number)).map(r=>{
  if(!id(r.id))throw Error('Invalid quote identity');
  return {id:r.id as number,commodityId:r.id_commodity as number,terminalId:r.id_terminal as number,buy:number(r.price_buy)||null,sell:number(r.price_sell)||null,stock:number(r.scu_buy),demand:number(r.scu_sell),version:text(r.game_version)||null,updatedAt:stamp(r.date_modified,now),averages:{buy:number(r.price_buy_avg_week)||null,sell:number(r.price_sell_avg_week)||null,stock:number(r.scu_buy_avg_week),demand:number(r.scu_sell_avg_week)},range:{buyMin:number(r.price_buy_min_week)||null,buyMax:number(r.price_buy_max_week)||null,sellMin:number(r.price_sell_min_week)||null,sellMax:number(r.price_sell_max_week)||null},containers:text(r.container_sizes).split(',').map(Number).filter(v=>[1,2,4,8,16,24,32].includes(v))};
 }));
 if(new Set(quotes.map(q=>`${q.terminalId}:${q.commodityId}`)).size!==quotes.length)throw Error('Duplicate commodity/terminal pair');
 if(input.queriedTerminals!==terminals.length)throw Error('Incomplete terminal coverage');
 return {schema:1,source:'UEX',retrievedAt:input.retrievedAt,liveVersion:input.liveVersion,commodities,terminals,quotes,coverage:{rawCommodities:cr.length,rawTerminals:tr.length,rawQuotes:qr.length,excludedQuotes:qr.length-quotes.length,queriedTerminals:input.queriedTerminals},evidence:input.evidence??[]};
}
export type Freshness='current'|'old-patch'|'stale'|'unknown';
// A record modification date is not proof of a new in-game observation.
export function quoteFreshness(q:Quote,liveVersion:string,now=Date.now()):Freshness{
 if(!patch(q.version)||!q.updatedAt||!Number.isFinite(Date.parse(q.updatedAt))||Date.parse(q.updatedAt)>now+300000)return 'unknown';
 if(patch(q.version)!==liveVersion)return 'old-patch';
 return now-Date.parse(q.updatedAt)>24*60*60*1000?'stale':'current';
}
export function commodityAllowed(c:Commodity,legality:string,risk:string){
 const legal=legality==='all'||(legality==='known'?c.illegal!==null:c.illegal===false);
 const safe=risk==='all'||(risk==='known'?c.riskKnown:c.riskKnown&&c.hazards.length===0);
 return legal&&safe;
}
export function validateSnapshot(value:unknown):MarketSnapshot{
 const d=value as MarketSnapshot;
 if(!d||d.schema!==1||d.source!=='UEX'||!Number.isFinite(Date.parse(d.retrievedAt))||!/^\d+\.\d+\.\d+$/.test(d.liveVersion)||!Array.isArray(d.commodities)||!Array.isArray(d.terminals)||!Array.isArray(d.quotes)||!d.commodities.length||!d.terminals.length||!Array.isArray(d.evidence))throw Error('Invalid market snapshot');
 unique(d.commodities);unique(d.terminals);unique(d.quotes);
 const cs=new Set(d.commodities.map(c=>c.id)),ts=new Set(d.terminals.map(t=>t.id));
 if(d.commodities.some(c=>!id(c.id)||!text(c.name)||!Array.isArray(c.hazards)||typeof c.riskKnown!=='boolean'||![true,false,null].includes(c.illegal))||d.terminals.some(t=>!id(t.id)||!text(t.name))||d.quotes.some(q=>!id(q.id)||!cs.has(q.commodityId)||!ts.has(q.terminalId)||[q.buy,q.sell,q.stock,q.demand].some(v=>v!==null&&number(v)===null)||!Array.isArray(q.containers)))throw Error('Invalid market references');
 if(d.coverage?.queriedTerminals!==d.terminals.length)throw Error('Incomplete market snapshot');return d;
}
