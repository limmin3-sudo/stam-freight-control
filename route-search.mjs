import {betterTravel} from './route-cost.mjs';
// Prefer one visit per stop for acyclic pickup/delivery problems up to 16 stops.
// Small cyclic problems use action-state search when revisits are necessary. It keeps
// shipment actions separate while batching work at a shared pickup or destination.
// Callers must replay capacity, packing and handling constraints.
// Larger cyclic/over-limit problems return null for the caller feasible fallback.
// "exact" is conditional on cross-system batching and, for stop-subset mode,
// one visit per location; action-state mode permits revisits.
export function planActionRoute(shipments,startId,nav,{collectBeforeCross=true,initialStatus=[]}={}){
 const active=shipments.map((s,i)=>({s,i,status:initialStatus[i]??0})).filter(x=>x.status!==2);
 if(!active.length)return {actions:[],seconds:0,exact:true,batching:false,method:'action-state'};
 const ids=[...new Set(active.flatMap(({s,status})=>status===1?[s.dropoffId]:[s.pickupId,s.dropoffId]))];
 if(ids.some(id=>!id))return null;
 const revisitFallback=()=>active.length<=7?actionStateRoute(active,ids,startId,nav,collectBeforeCross):null;
 if(ids.length>16)return revisitFallback();
 const n=ids.length,index=new Map(ids.map((id,i)=>[id,i])),base=Array(n).fill(0);
 for(const {s,status} of active)if(status===0&&s.pickupId!==s.dropoffId)base[index.get(s.dropoffId)]|=1<<index.get(s.pickupId);
 const acyclic=req=>{let done=0;for(let step=0;step<n;step++){const i=req.findIndex((r,i)=>!(done&(1<<i))&&(r&done)===r);if(i<0)return false;done|=1<<i;}return true;};
 if(!acyclic(base))return revisitFallback();
 let req=[...base],batching=false;
 if(collectBeforeCross&&nav.byId){const groups=new Map();
  for(const {s,status} of active){const a=nav.byId.get(s.pickupId)?.system,b=nav.byId.get(s.dropoffId)?.system;if(!a||!b||a===b)continue;
   const key=JSON.stringify([a,b]),g=groups.get(key)||{pickups:0,deliveries:new Set()};if(status===0)g.pickups|=1<<index.get(s.pickupId);g.deliveries.add(index.get(s.dropoffId));groups.set(key,g);}
  for(const g of groups.values())for(const d of g.deliveries)req[d]|=g.pickups&~(1<<d);
  if(acyclic(req))batching=req.some((r,i)=>r!==base[i]);else req=[...base];
 }
 const total=1<<n,full=total-1,cost=new Float64Array(total*n).fill(Infinity),meters=new Float64Array(total*n).fill(Infinity),jumps=new Uint16Array(total*n).fill(65535),previous=new Int8Array(total*n).fill(-1);
 const travel=ids.map(a=>ids.map(b=>nav.path(a,b)));
 const start=index.get(startId),workAtStart=start!==undefined&&req[start]===0;
 // Do not leave an available starting pickup behind just to call a later return
 // a single visit. Incoming cargo may make that return genuinely necessary.
 const readyAtStart=active.some(({s,status})=>status===0?s.pickupId===startId:s.dropoffId===startId);
 if(readyAtStart&&start!==undefined&&req[start]!==0)return revisitFallback();
 for(let i=0;i<n;i++)if(req[i]===0&&(!workAtStart||i===start)){const leg=nav.path(startId,ids[i]),idx=(1<<i)*n+i;cost[idx]=leg.seconds;meters[idx]=leg.meters||0;jumps[idx]=leg.jumps||0;}
 for(let mask=1;mask<total;mask++){
  const eligible=[];for(let next=0;next<n;next++)if(!(mask&(1<<next))&&(req[next]&mask)===req[next])eligible.push(next);
  if(!eligible.length)continue;
  for(let last=0;last<n;last++){const before=cost[mask*n+last];if(!Number.isFinite(before))continue;
   for(const next of eligible){const dest=(mask|(1<<next))*n+next,leg=travel[last][next],value=before+leg.seconds,m=meters[mask*n+last]+(leg.meters||0),j=jumps[mask*n+last]+(leg.jumps||0);if(betterTravel(j,m,value,jumps[dest],meters[dest],cost[dest])){cost[dest]=value;meters[dest]=m;jumps[dest]=j;previous[dest]=last;}}}
 }
 let last=0;for(let i=1;i<n;i++)if(betterTravel(jumps[full*n+i],meters[full*n+i],cost[full*n+i],jumps[full*n+last],meters[full*n+last],cost[full*n+last]))last=i;
 const seconds=cost[full*n+last];if(!Number.isFinite(seconds))return null;
 const order=[];let mask=full;while(last>=0){order.push(ids[last]);const p=previous[mask*n+last];mask&=~(1<<last);last=p;}order.reverse();
 const actions=[],status=shipments.map((_,i)=>initialStatus[i]??0);
 for(const locationId of order){
  // Unload existing cargo before loading at the same stop. Same-stop shipments
  // are picked up and then delivered, retaining their independent identity.
  for(const {s,i} of active)if(status[i]===1&&s.dropoffId===locationId){actions.push({shipmentIndex:i,type:'delivery',locationId});status[i]=2;}
  for(const {s,i} of active)if(status[i]===0&&s.pickupId===locationId){actions.push({shipmentIndex:i,type:'pickup',locationId});status[i]=1;}
  for(const {s,i} of active)if(status[i]===1&&s.dropoffId===locationId){actions.push({shipmentIndex:i,type:'delivery',locationId});status[i]=2;}
 }
 if(active.some(({i})=>status[i]!==2))return null;
 return {actions,seconds,exact:true,batching,method:'stop-subset'};
}


// Status 0→1→2 is monotonic, so ternary state codes form a topological order.
// Unlike stop-subset search this can revisit a location after another pickup.
function actionStateRoute(active,ids,startId,nav,collectBeforeCross){
 const count=active.length,n=ids.length,width=n+1,power=active.map((_,i)=>3**i),total=3**count,full=total-1;
 const initial=active.reduce((sum,x,i)=>sum+x.status*power[i],0),cost=new Float64Array(total*width).fill(Infinity),meters=new Float64Array(total*width).fill(Infinity),jumps=new Uint16Array(total*width).fill(65535),revisits=new Uint8Array(total*width).fill(255),prevCode=new Int32Array(total*width).fill(-1),prevAt=new Int8Array(total*width).fill(-1);
 const groups=new Map(),prerequisites=active.map(()=>[]);let batching=false;
 if(collectBeforeCross&&nav.byId){for(let i=0;i<count;i++){const s=active[i].s,a=nav.byId.get(s.pickupId)?.system,b=nav.byId.get(s.dropoffId)?.system;if(!a||!b||a===b)continue;const key=JSON.stringify([a,b]),g=groups.get(key)||[];g.push(i);groups.set(key,g);}
  for(const g of groups.values()){for(const i of g)prerequisites[i]=g;batching ||= g.length>1&&g.some(i=>active[i].status===0);}}
 const decode=code=>power.map(p=>Math.floor(code/p)%3);
 const transition=(code,locationId)=>{const status=decode(code),actions=[];let next=code;
  const deliver=()=>{for(let i=0;i<count;i++)if(status[i]===1&&active[i].s.dropoffId===locationId&&prerequisites[i].every(j=>status[j]>0)){status[i]=2;next+=power[i];actions.push({shipmentIndex:active[i].i,type:'delivery',locationId});}};
  deliver();for(let i=0;i<count;i++)if(status[i]===0&&active[i].s.pickupId===locationId){status[i]=1;next+=power[i];actions.push({shipmentIndex:active[i].i,type:'pickup',locationId});}deliver();return {next,actions};};
 const travel=[...ids,startId].map(a=>ids.map(b=>nav.path(a,b)));cost[initial*width+n]=0;meters[initial*width+n]=0;jumps[initial*width+n]=0;revisits[initial*width+n]=0;
 for(let code=initial;code<total;code++){
  const transitions=ids.map(id=>transition(code,id)),status=decode(code);
  const visited=new Set([startId]);active.forEach(({s},i)=>{if(status[i]>0)visited.add(s.pickupId);if(status[i]===2)visited.add(s.dropoffId);});
  for(let at=0;at<width;at++){const before=cost[code*width+at];if(!Number.isFinite(before))continue;
   const here=at===n?ids.indexOf(startId):at,workHere=here>=0&&transitions[here].next!==code;
   for(let dest=0;dest<n;dest++){const {next}=transitions[dest];if(next===code||workHere&&dest!==here)continue;
    const idx=next*width+dest,leg=travel[at][dest],value=before+leg.seconds,m=meters[code*width+at]+(leg.meters||0),j=jumps[code*width+at]+(leg.jumps||0),repeat=revisits[code*width+at]+Number(dest!==here&&visited.has(ids[dest]));
    if(repeat<revisits[idx]||repeat===revisits[idx]&&betterTravel(j,m,value,jumps[idx],meters[idx],cost[idx])){cost[idx]=value;meters[idx]=m;jumps[idx]=j;revisits[idx]=repeat;prevCode[idx]=code;prevAt[idx]=at;}}}
 }
 let at=0;for(let i=1;i<n;i++)if(revisits[full*width+i]<revisits[full*width+at]||revisits[full*width+i]===revisits[full*width+at]&&betterTravel(jumps[full*width+i],meters[full*width+i],cost[full*width+i],jumps[full*width+at],meters[full*width+at],cost[full*width+at]))at=i;
 const seconds=cost[full*width+at];if(!Number.isFinite(seconds))return null;
 const batches=[];let code=full;while(code!==initial){const idx=code*width+at,previous=prevCode[idx];if(previous<0)return null;batches.push(transition(previous,ids[at]).actions);at=prevAt[idx];code=previous;}
 return {actions:batches.reverse().flat(),seconds,exact:true,batching,method:'action-state'};
}
