import {patch,type MarketSnapshot,type Terminal,type Quote} from './trade-data.ts';
export type TradeMode='direct'|'buyers'|'destination'|'loop'|'chain';
export type TradeGoal='profit'|'time'|'capital'|'roi';
export type CargoLot={lotId?:string;commodityId:number;quantity:number;boxSize:number;ownership:'owned'|'stolen'|'unknown';cost:number|null};
export type SuiteOptions={mode:TradeMode;goal:TradeGoal;shipId:string;originId:number;destinationId:number;budget:number;reservePercent:number;reserveEnabled:boolean;capacity:number;scope:'intrasystem'|'interstellar';maxLegs:number;detourPercent:number;reinvest:boolean;mixed:boolean;maxAgeHours:number;commodityIds:number[];excludeCommodityIds:number[];excludeTerminalIds:number[];system:string;faction:string;facilities:string[];maxBoxSize:number;minStock:number;maxDistanceGm:number;allowWait:boolean;restockScuPerMinute:number;maxWaitMinutes:number;loading:'manual'|'auto';handlingMinutes:number;feePerScu:number;fixedCosts:number;fuelCostPerGm:number;approachMinutes:number;jumpMinutes:number;driveId:string;nearbyGm:number;priceBasis:'reported'|'weekly';stockBasis:'reported'|'weekly';excludeSystems:string[];excludeFactions:string[];excludePlanets:string[];cargo:CargoLot[];waypoints?:number[]};
export type RouteMetric={meters:number;seconds:number|null;jumps:number;systems:string[];drive?:{name:string;version:string|null}};
export type PackedItem={commodityId:number;quantity:number;boxSize:number};
export type SuiteContext={route:(from:Terminal,to:Terminal)=>RouteMetric|null;pack:(items:PackedItem[])=>boolean};
export type TradeLine=PackedItem&{quantityLimit?:'capital'|'capacity'|'stock'|'demand'|'packing';lotId?:string;name:string;buy:number;sell:number;purchase:number;revenue:number;buyAt:string|null;sellAt:string|null;available:number;demand:number;ownership:CargoLot['ownership'];costKnown:boolean;buySource?:'UEX'|'personal'|'holding';sellSource?:'UEX'|'personal'};
export type SuiteLeg={originId:number;destinationId:number;lines:TradeLine[];purchase:number;revenue:number;costs:number;profit:number;seconds:number|null;meters:number;waitMinutes:number;systems:string[];drive?:{name:string;version:string|null};empty:boolean};
export type SuiteRoute={id:string;splitSale?:boolean;legs:SuiteLeg[];profit:number;purchase:number;costs:number;cash:number;reserve:number;seconds:number|null;profitPerHour:number|null;roi?:number|null;unsold:CargoLot[];warnings:string[]};
export type SuiteResult={routes:SuiteRoute[];rejected:Record<string,number>;examined:number;approximate:boolean;error:string|null};
export const defaultSuiteOptions:SuiteOptions={mode:'direct',goal:'profit',shipId:'',originId:0,destinationId:0,budget:0,reservePercent:0,reserveEnabled:false,capacity:0,scope:'intrasystem',maxLegs:3,detourPercent:25,reinvest:true,mixed:true,maxAgeHours:24,commodityIds:[],excludeCommodityIds:[],excludeTerminalIds:[],system:'',faction:'',facilities:[],maxBoxSize:32,minStock:0,maxDistanceGm:0,allowWait:false,restockScuPerMinute:0,maxWaitMinutes:0,loading:'manual',handlingMinutes:10,feePerScu:0,fixedCosts:0,fuelCostPerGm:0,approachMinutes:5,jumpMinutes:5,waypoints:[],driveId:'',nearbyGm:0,priceBasis:'reported',stockBasis:'reported',excludeSystems:[],excludeFactions:[],excludePlanets:[],cargo:[]};
const sizes=[32,24,16,8,4,2,1],cents=(n:number)=>Math.round(n*100),safe=(n:number,max=1e12)=>Number.isFinite(n)&&n>=0&&n<=max;
export function validateSuiteOptions(o:SuiteOptions){
 if(!o||!['direct','buyers','destination','loop','chain'].includes(o.mode)||!['profit','time','capital','roi'].includes(o.goal)||!['intrasystem','interstellar'].includes(o.scope)||!['manual','auto'].includes(o.loading)||typeof o.shipId!=='string'||!o.shipId||o.shipId.length>200||!Number.isSafeInteger(o.originId)||o.originId<1||!Number.isSafeInteger(o.destinationId)||o.destinationId<0||!Number.isInteger(o.capacity)||o.capacity<1||o.capacity>10000||!Number.isInteger(o.maxLegs)||o.maxLegs<1||o.maxLegs>5||!sizes.includes(o.maxBoxSize))throw Error('inputs');
 for(const k of ['budget','reservePercent','maxAgeHours','detourPercent','minStock','maxDistanceGm','restockScuPerMinute','maxWaitMinutes','handlingMinutes','feePerScu','fixedCosts','fuelCostPerGm','approachMinutes','jumpMinutes','nearbyGm'] as const)if(!(k==='reservePercent'&&!o.reserveEnabled)&&!safe(o[k]))throw Error('inputs');
 if(o.reserveEnabled&&o.reservePercent>100||o.maxAgeHours>8760||o.maxAgeHours<=0||o.detourPercent>1000||o.maxWaitMinutes>1440||o.handlingMinutes>1440||o.approachMinutes>1440||o.jumpMinutes>1440||o.mode!=='buyers'&&o.budget<=0||o.mode==='destination'&&!o.destinationId)throw Error('inputs');
 for(const k of ['commodityIds','excludeCommodityIds','excludeTerminalIds'] as const)if(!Array.isArray(o[k])||o[k].length>1000||o[k].some(id=>!Number.isSafeInteger(id)||id<1))throw Error('inputs');
 if(!['reported','weekly'].includes(o.priceBasis)||!['reported','weekly'].includes(o.stockBasis)||[o.excludeSystems,o.excludeFactions,o.excludePlanets].some(a=>!Array.isArray(a)||a.length>1000||a.some(v=>typeof v!=='string'||v.length>200)))throw Error('inputs');
 if(o.waypoints!==undefined&&(!Array.isArray(o.waypoints)||o.waypoints.length>5||o.waypoints.some(n=>!Number.isSafeInteger(n)||n<1)||o.mode==='chain'&&o.waypoints.length>o.maxLegs))throw Error('inputs');
 if(['reinvest','mixed','allowWait','reserveEnabled'].some(k=>typeof o[k as keyof SuiteOptions]!=='boolean')||['system','faction','driveId'].some(k=>typeof o[k as keyof SuiteOptions]!=='string'))throw Error('inputs');
 if(!Array.isArray(o.facilities)||o.facilities.some(x=>!['dock','loadingDock','elevator','auto','space','ground','refuel','monitored','nqa','hidden','player'].includes(x)))throw Error('inputs');
 if(!Array.isArray(o.cargo)||o.cargo.length>100||o.cargo.some(l=>!Number.isSafeInteger(l.commodityId)||l.commodityId<1||!Number.isInteger(l.quantity)||l.quantity<1||!sizes.includes(l.boxSize)||l.quantity%l.boxSize!==0||!['owned','stolen','unknown'].includes(l.ownership)||l.cost!==null&&!safe(l.cost))||o.cargo.reduce((s,l)=>s+l.quantity,0)>o.capacity||new Set(o.cargo.filter(l=>l.lotId).map(l=>l.lotId)).size!==o.cargo.filter(l=>l.lotId).length||o.cargo.some(l=>l.lotId!==undefined&&(typeof l.lotId!=='string'||!l.lotId||l.lotId.length>200))||o.mode==='buyers'&&!o.cargo.length)throw Error('cargo');
}
export function suiteTerminalIssue(t:Terminal,o:SuiteOptions){
 if(o.excludeSystems.includes(t.system)||o.excludeFactions.includes(t.faction??'')||o.excludePlanets.includes(t.planet)||o.excludeTerminalIds.includes(t.id)||o.system&&t.system!==o.system||o.faction&&t.faction!==o.faction)return 'location' as const;
 const flags:Record<string,boolean|null|undefined>={dock:t.docking,loadingDock:t.loadingDock,elevator:t.elevator,auto:t.autoLoad,space:t.space,ground:t.ground,refuel:t.refuel,monitored:t.security?.monitored,nqa:t.nqa,hidden:t.hidden,player:t.playerOwned};
 return o.facilities.every(k=>flags[k]===true)&&(!(o.shipId==='misc-hull-c')||t.loadingDock===true)&&(o.loading!=='auto'||t.autoLoad===true)?null:'facilities';
}
export function suiteTerminalAllowed(t:Terminal,o:SuiteOptions){
 return suiteTerminalIssue(t,o)===null;
}
export function terminalIssueLabel(issue:NonNullable<ReturnType<typeof suiteTerminalIssue>>,en:boolean){
 const labels={
  location:['지역·거점 조건 제외','Excluded by location filters'],
  facilities:['함선·시설 조건 불충족','Ship or facility mismatch'],
 };
 return labels[issue][en?1:0];
}
export function suiteQuoteAllowed(q:Quote,version:string,o:SuiteOptions,now:number){return patch(q.version)===version&&q.updatedAt!==null&&Number.isFinite(Date.parse(q.updatedAt))&&Date.parse(q.updatedAt)<=now+300000&&now-Date.parse(q.updatedAt)<=o.maxAgeHours*3600000;}
const routeScore=(r:SuiteRoute,goal:TradeGoal)=>goal==='time'?(r.profitPerHour??-Infinity):goal==='capital'?-r.purchase:goal==='roi'?(r.roi??-Infinity):r.profit;
export function calculateSuite(data:MarketSnapshot,o:SuiteOptions,ctx:SuiteContext,now=Date.now()):SuiteResult{
 const out:SuiteResult={routes:[],rejected:{},examined:0,approximate:true,error:null},reject=(k:string)=>{out.rejected[k]=(out.rejected[k]??0)+1;};
 try{validateSuiteOptions(o);}catch(e){return {...out,error:(e as Error).message};}
 if(o.cargo.some(l=>!data.commodities.some(c=>c.id===l.commodityId))||!ctx.pack(o.cargo))return {...out,error:'cargo'};
 const origin=data.terminals.find(t=>t.id===o.originId);if(!origin)return {...out,error:'origin'};
 const initialCash=cents(o.budget);
 const goods=new Map(data.commodities.map(c=>[c.id,c])),terms=new Map(data.terminals.map(t=>[t.id,t]));
 const quotes=new Map<number,Quote[]>();for(const original of data.quotes){const q={...original,...(o.priceBasis==='weekly'?{buy:original.averages?.buy??null,sell:original.averages?.sell??null}:{}),...(o.stockBasis==='weekly'?{stock:original.averages?.stock??null,demand:original.averages?.demand??null}:{})};const list=quotes.get(q.terminalId)??[];list.push(q);quotes.set(q.terminalId,list);}
 const terminals=data.terminals.filter(t=>suiteTerminalAllowed(t,o));
 if(o.mode==='direct'&&o.destinationId&&!terminals.some(t=>t.id===o.destinationId)){
  reject('destinationPolicy');return out;
 }
 if(o.mode==='destination'&&!terms.has(o.destinationId))return {...out,error:'connection'};
 if(o.mode==='chain'&&o.waypoints?.some(id=>!terms.has(id)))return {...out,error:'connection'};
 const manual=o.mode==='chain'&&!!o.waypoints?.length;
 const direct=o.mode==='destination'?ctx.route(origin,terms.get(o.destinationId)!):null;
 if(o.mode==='destination'&&(!terms.has(o.destinationId)||!direct))return {...out,error:'connection'};
 const good=(id:number)=>{const c=goods.get(id);return !!c&&(!o.commodityIds.length||o.commodityIds.includes(id))&&!o.excludeCommodityIds.includes(id);};
 const transport=(a:Terminal,b:Terminal)=>{if(a.id===b.id)return null;const m=ctx.route(a,b);if(!m||!safe(m.meters)||m.seconds!==null&&!safe(m.seconds)||o.maxDistanceGm>0&&m.meters>o.maxDistanceGm*1e9)return null;if(o.scope==='intrasystem'&&a.system!==b.system)return null;return m;};
 const costs=(m:RouteMetric,qty:number)=>Math.max(0,Math.ceil((o.fixedCosts+o.fuelCostPerGm*m.meters/1e9+o.feePerScu*qty*(o.mode==='buyers'?1:2))*100-1e-6));
 const legTime=(m:RouteMetric,wait:number,empty=false)=>m.seconds===null?null:m.seconds+60*(o.approachMinutes*2+o.jumpMinutes*m.jumps+(empty?0:o.handlingMinutes*(o.mode==='buyers'?1:2))+wait);
 type State={at:Terminal;cash:number;profit:number;legs:SuiteLeg[];supply:Map<number,number>;demand:Map<number,number>;remaining:CargoLot[]};
 const offers=(state:State,to:Terminal):SuiteLeg[]=>{
  const metric=transport(state.at,to);if(!metric){reject('connection');return [];}
  if(o.mode!=='buyers'&&!suiteTerminalAllowed(state.at,o)){reject('facilities');return [];}
  const buyRows=quotes.get(state.at.id)??[],sellRows=quotes.get(to.id)??[];
  const lines:TradeLine[]=[];
  for(const sell of sellRows){if(!good(sell.commodityId)||!suiteQuoteAllowed(sell,data.liveVersion,o,now)){reject('policyAge');continue;}
   if(!(sell.sell&&sell.demand!==null&&sell.demand>0)){reject('demand');continue;}
   let demand=Math.floor(sell.demand)-(state.demand.get(sell.id)??0);if(demand<=0){reject('demand');continue;}
   if(o.mode==='buyers'){
    for(const lot of state.remaining.filter(l=>l.commodityId===sell.commodityId)){
    if(lot.ownership!=='owned'&&to.nqa!==true){reject('ownership');continue;}
    if(!to.maxContainerScu||lot.boxSize>to.maxContainerScu){reject('containers');continue;}
    const qty=Math.floor(Math.min(lot.quantity,demand)/lot.boxSize)*lot.boxSize;if(!qty)continue;
    const cost=lot.cost===null?0:cents(lot.cost)*qty/lot.quantity;
    lines.push({lotId:lot.lotId,commodityId:lot.commodityId,name:goods.get(lot.commodityId)!.name,quantity:qty,boxSize:lot.boxSize,buy:cost/100/qty,sell:sell.sell,purchase:0,revenue:cents(sell.sell)*qty/100,buyAt:null,sellAt:sell.updatedAt,available:lot.quantity,demand,ownership:lot.ownership,costKnown:lot.cost!==null,buySource:'holding',sellSource:sell.personal?'personal':'UEX'});}continue;
   }
   const buy=buyRows.find(q=>q.commodityId===sell.commodityId);if(!buy||!suiteQuoteAllowed(buy,data.liveVersion,o,now)||!buy.buy||buy.stock===null||buy.stock<o.minStock){reject('supply');continue;}
   if(sell.sell<=buy.buy||cents(buy.buy)<=0)continue;
   let stock=Math.floor(buy.stock)-(state.supply.get(buy.id)??0);
   if(o.allowWait&&o.restockScuPerMinute>0&&stock<o.capacity){const extra=Math.min(o.capacity-stock,Math.floor(o.restockScuPerMinute*o.maxWaitMinutes));if(extra>0){stock+=extra;}}
   if(stock<=0){reject('supply');continue;}
   const spend=Math.max(0,Math.min(state.cash,o.reinvest?state.cash:initialCash)-costs(metric,0));
   const unit=cents(buy.buy)+Math.ceil(o.feePerScu*200),raw=Math.min(o.capacity,stock,demand,Math.floor(spend/unit));
   const allowed=sizes.filter(s=>buy.containers.includes(s)&&s<=o.maxBoxSize&&s<=(state.at.maxContainerScu??0)&&s<=(to.maxContainerScu??0));
   if(!raw){reject('capital');continue;}
   if(!allowed.length){reject('containers');continue;}
   for(const size of allowed){let qty=Math.floor(raw/size)*size;while(qty>0&&!ctx.pack([{commodityId:buy.commodityId,quantity:qty,boxSize:size}]))qty-=size;
    if(qty<=0){reject('containers');continue;}
    const quantityLimit=qty<raw?'packing':raw===o.capacity?'capacity':raw===stock?'stock':raw===demand?'demand':'capital';
    lines.push({quantityLimit,commodityId:buy.commodityId,name:goods.get(buy.commodityId)!.name,quantity:qty,boxSize:size,buy:buy.buy,sell:sell.sell,purchase:cents(buy.buy)*qty/100,revenue:cents(sell.sell)*qty/100,buyAt:buy.updatedAt,sellAt:sell.updatedAt,available:stock,demand,ownership:'owned',costKnown:true,buySource:buy.personal?'personal':'UEX',sellSource:sell.personal?'personal':'UEX'});
   }
  }
  const make=(items:TradeLine[]):SuiteLeg|null=>{const totals=new Map<number,number>();for(const l of items)totals.set(l.commodityId,(totals.get(l.commodityId)??0)+l.quantity);
   if(items.some(l=>(totals.get(l.commodityId)??0)>Math.min(o.mode==='buyers'?Infinity:l.available,l.demand)))return null;
   let waiting=0;if(o.mode!=='buyers'&&o.allowWait&&o.restockScuPerMinute>0)for(const [id,qty] of totals){const q=buyRows.find(q=>q.commodityId===id)!;waiting=Math.max(waiting,Math.max(0,qty-Math.max(0,(q.stock??0)-(state.supply.get(q.id)??0)))/o.restockScuPerMinute);}
   const qty=items.reduce((s,l)=>s+l.quantity,0);if(!qty||!ctx.pack(items))return null;const purchase=items.reduce((s,l)=>s+cents(l.purchase),0),revenue=items.reduce((s,l)=>s+cents(l.revenue),0),fee=costs(metric,qty),basis=o.mode==='buyers'?items.reduce((s,l)=>s+Math.round(l.buy*l.quantity*100),0):purchase;
   if([purchase,revenue,fee,basis].some(n=>!Number.isSafeInteger(n)||Math.abs(n)>1e14)){reject('amount');return null;}
   if(o.mode==='buyers'&&state.cash-fee+revenue<0){reject('capital');return null;}
   if(o.mode!=='buyers'&&(purchase+fee>Math.min(state.cash,o.reinvest?state.cash:initialCash)||revenue-purchase-fee<=0))return null;
   return {originId:state.at.id,destinationId:to.id,lines:items,purchase:purchase/100,revenue:revenue/100,costs:fee/100,profit:(revenue-basis-fee)/100,meters:metric.meters,seconds:legTime(metric,waiting),waitMinutes:waiting,systems:metric.systems,...(metric.drive?{drive:metric.drive}:{}),empty:false};};
  const results=lines.map(l=>make([l])).filter((l):l is SuiteLeg=>!!l);
  if(o.mixed&&lines.length>1){for(const rank of [(l:TradeLine)=>l.sell-l.buy,(l:TradeLine)=>(l.sell-l.buy)/Math.max(l.buy,.01)]){
   const basket:TradeLine[]=[];let used=0,spent=0;const picked=new Map<string,number>();
   for(const l of [...lines].sort((a,b)=>rank(b)-rank(a))){const key=l.lotId??String(l.commodityId),existing=picked.get(key)??0,commodityUsed=basket.filter(x=>x.commodityId===l.commodityId).reduce((s,x)=>s+x.quantity,0);let qty=Math.floor(Math.min(l.quantity,l.available-existing,l.demand-commodityUsed,o.capacity-used)/l.boxSize)*l.boxSize;
    while(qty>0){const item={...l,quantity:qty,purchase:cents(l.buy)*qty/100,revenue:cents(l.sell)*qty/100};if(o.mode==='buyers')item.purchase=0;
     if((o.mode==='buyers'||spent+cents(item.purchase)+costs(metric,used+qty)<=Math.min(state.cash,o.reinvest?state.cash:initialCash))&&ctx.pack([...basket,item])){basket.push(item);used+=qty;spent+=cents(item.purchase);picked.set(key,existing+qty);break;}qty-=l.boxSize;
    }
   }
   const mixed=make(basket);if(mixed)results.push(mixed);
  }}return results;
 };
 const emit=(state:State)=>{
  if(o.scope==='interstellar'&&!state.legs.some(l=>new Set(l.systems.map(s=>s.toLowerCase())).size>1))return;
  const seconds=state.legs.some(l=>l.seconds===null)?null:state.legs.reduce((s,l)=>s+l.seconds!,0),profit=state.profit/100;
  const basis=state.legs.reduce((s,l)=>s+l.lines.reduce((n,x)=>n+x.buy*x.quantity,0),0),roi=o.mode==='buyers'&&o.cargo.some(l=>l.cost===null)||basis<=0?null:profit/basis;
  const route:SuiteRoute={roi,id:state.legs.map(l=>`${l.originId}-${l.destinationId}:`+l.lines.map(x=>`${x.commodityId}/${x.quantity}/${x.boxSize}/${x.lotId??''}`).join(',')).join('|'),legs:state.legs,profit,purchase:state.legs.reduce((s,l)=>s+l.purchase,0),costs:state.legs.reduce((s,l)=>s+l.costs,0),cash:state.cash/100,reserve:0,seconds,profitPerHour:seconds&&seconds>0?profit*3600/seconds:null,unsold:state.remaining,warnings:['community','timeAssumptions','boundedSearch',...(state.legs.some(l=>[l.originId,l.destinationId].some(id=>patch(terms.get(id)?.version)!==data.liveVersion))?['oldFacilities']:[]),...(state.legs.some(l=>l.drive&&patch(l.drive.version)!==data.liveVersion)?['oldDrive']:[]),...(o.priceBasis==='weekly'||o.stockBasis==='weekly'?['weeklyAverage']:[]),...(!o.feePerScu&&!o.fixedCosts&&!o.fuelCostPerGm?['noCostsEntered']:[]),...(o.allowWait?['restockAssumption']:[]),...(o.mode==='buyers'&&o.cargo.some(l=>l.cost===null)?['unknownCost']:[])]};
  if(o.goal==='roi'&&route.roi===null){reject('costUnknown');return;}
  if(o.goal==='time'&&route.profitPerHour===null){reject('timeUnknown');return;}out.routes.push(route);
 };
 let frontier:State[]=[{at:origin,cash:initialCash,profit:0,legs:[],supply:new Map(),demand:new Map(),remaining:structuredClone(o.cargo).map((l,i)=>({...l,lotId:l.lotId??`source:${i}`}))}];
 if(o.nearbyGm>0&&o.mode!=='buyers'&&!manual)for(const t of terminals){if(t.id===origin.id||t.system!==origin.system)continue;const m=transport(origin,t);if(!m||m.meters>o.nearbyGm*1e9)continue;const fee=costs(m,0);if(initialCash-fee<=0)continue;frontier.push({at:t,cash:initialCash-fee,profit:-fee,legs:[{originId:origin.id,destinationId:t.id,lines:[],purchase:0,revenue:0,costs:fee/100,profit:-fee/100,seconds:legTime(m,0,true),meters:m.meters,waitMinutes:0,systems:m.systems,...(m.drive?{drive:m.drive}:{}),empty:true}],supply:new Map(),demand:new Map(),remaining:[]});}
 const depth=manual?o.waypoints!.length:o.mode==='direct'?1:o.maxLegs;
 for(let step=0;step<depth&&frontier.length;step++){
  const next:State[]=[];
  for(const state of frontier){for(const to of terminals){
   if(to.id===state.at.id||manual&&to.id!==o.waypoints![step])continue;
   if(o.mode==='direct'&&o.destinationId&&to.id!==o.destinationId)continue;
   if(o.mode==='direct'&&o.scope==='interstellar'&&to.system===origin.system)continue;
   if(out.examined>=16000){reject('searchBound');break;}out.examined++;
   const options=offers(state,to);
   if(!options.length&&(manual||state.legs.length>0)&&(manual||o.mode==='loop'&&to.id===origin.id||o.mode==='destination'&&to.id===o.destinationId)){
    const m=transport(state.at,to);if(m){const fee=costs(m,0);if(state.cash-fee>=0)options.push({originId:state.at.id,destinationId:to.id,lines:[],purchase:0,revenue:0,costs:fee/100,profit:-fee/100,seconds:legTime(m,0,true),meters:m.meters,waitMinutes:0,systems:m.systems,...(m.drive?{drive:m.drive}:{}),empty:true});}
   }
   for(const leg of options){const s:State={at:to,cash:state.cash-cents(leg.purchase)-cents(leg.costs)+cents(leg.revenue),profit:state.profit+cents(leg.profit),legs:[...state.legs,leg],supply:new Map(state.supply),demand:new Map(state.demand),remaining:structuredClone(state.remaining)};
    for(const line of leg.lines){const buy=(quotes.get(state.at.id)??[]).find(q=>q.commodityId===line.commodityId),sell=(quotes.get(to.id)??[]).find(q=>q.commodityId===line.commodityId)!;if(buy&&o.mode!=='buyers')s.supply.set(buy.id,(s.supply.get(buy.id)??0)+line.quantity);s.demand.set(sell.id,(s.demand.get(sell.id)??0)+line.quantity);
     if(o.mode==='buyers'){const lot=s.remaining.find(l=>l.lotId===line.lotId)!;if(lot.cost!==null)lot.cost=(cents(lot.cost)-Math.round(cents(lot.cost)*line.quantity/lot.quantity))/100;lot.quantity-=line.quantity;}
    }s.remaining=s.remaining.filter(l=>l.quantity>0);
    if(o.mode==='destination'&&direct){const tail=to.id===o.destinationId?{meters:0}:ctx.route(to,terms.get(o.destinationId)!);if(!tail||s.legs.reduce((sum,l)=>sum+l.meters,0)+tail.meters>direct.meters*(1+o.detourPercent/100)+1){reject('detour');continue;}}
    const done=manual&&step===depth-1||o.mode==='direct'||o.mode==='loop'&&to.id===origin.id||o.mode==='destination'&&to.id===o.destinationId||o.mode==='buyers'&&!s.remaining.length;
    if(done||o.mode==='chain'&&!manual||o.mode==='buyers')emit(s);if(!done)next.push(s);
   }
  }}
  next.sort((a,b)=>o.goal==='capital'?a.legs.reduce((s,l)=>s+l.purchase,0)-b.legs.reduce((s,l)=>s+l.purchase,0):o.goal==='roi'?b.profit/Math.max(1,b.legs.reduce((s,l)=>s+cents(l.purchase),0))-a.profit/Math.max(1,a.legs.reduce((s,l)=>s+cents(l.purchase),0)):o.goal==='time'?b.profit/Math.max(1,b.legs.reduce((s,l)=>s+(l.seconds??1e12),0))-a.profit/Math.max(1,a.legs.reduce((s,l)=>s+(l.seconds??1e12),0)):b.profit-a.profit);
  // Keep different terminal states so a high-profit cul-de-sac does not erase all destination paths.
  const counts=new Map<number,number>();frontier=next.filter(s=>{const n=counts.get(s.at.id)??0;counts.set(s.at.id,n+1);return n<2;}).slice(0,20);
 }
 const unique=new Map(out.routes.map(r=>[r.id,r]));out.routes=[...unique.values()].sort((a,b)=>routeScore(b,o.goal)-routeScore(a,o.goal)||b.profit-a.profit).slice(0,100);return out;
}
