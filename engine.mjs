import {replayManualStops} from './manual-route.mjs';
import {planActionRoute} from './route-search.mjs';
import {remainingTravelEstimate} from './route-estimate.mjs';
import {destinationGroups} from './recipes.mjs';
import {quantumSeconds,surfaceSeconds,spaceApproachSeconds} from './travel.mjs';
import {DEFAULT_SHIP,validateShip,capacity} from './ships.mjs';
export const CAPACITY=512;
export const SIZES=[32,24,16,8,4,2,1];
export const BOX_DIMS={1:[1,1,1],2:[1,1,2],4:[2,1,2],8:[2,2,2],16:[2,2,4],24:[2,2,6],32:[2,2,8]};
export const DEFAULTS={quantumSpeed:180000,spool:25,jumpMinutes:8,dockMinutes:3,surfaceMinutes:5,surfaceDistanceKm:30,secondsPerBox:25,unknownBox:8,detourFactor:1.15};
export const COLORS=['#57d9db','#ecb969','#a697f4','#eb8fb1','#8cd6a1','#8dbbfa','#e3dd84','#cda17e'];
export function assumedBoxes(scu,maxSize=8){const out=[];for(const size of SIZES.filter(s=>s<=maxSize)){while(scu>=size){out.push(size);scu-=size;}}return out;}
export function boxList(cargo,unknownBox=8){
 if(!Number.isInteger(cargo.scu)||cargo.scu<1||cargo.scu>10000)throw Error('화물 SCU는 1–10,000 사이 정수만 가능합니다.');
 if(!cargo.boxes?.length)return {boxes:assumedBoxes(cargo.scu,SIZES.includes(cargo.maxBoxSize)?Math.min(unknownBox,cargo.maxBoxSize):unknownBox),estimated:true};
 let total=0,count=0;const boxes=[];for(const b of cargo.boxes){if(!SIZES.includes(b.size)||!Number.isInteger(b.count)||b.count<1||b.count>10000)throw Error('상자 크기 또는 개수가 잘못됐습니다.');if(SIZES.includes(cargo.maxBoxSize)&&b.size>cargo.maxBoxSize)throw Error('입력한 상자가 미션의 최대 상자 크기보다 커.');total+=b.size*b.count;count+=b.count;if(count>10000)throw Error('상자 개수가 너무 많아.');for(let i=0;i<b.count;i++)boxes.push(b.size);}
 if(total!==cargo.scu)throw Error(`상자 합계 ${total} SCU와 화물 ${cargo.scu} SCU가 달라.`);return {boxes,estimated:false};
}
// A grid may forbid standing a box on end (long axis vertical), e.g. Hull B panels reject upright 16 SCU containers.
export const isUpright=d=>d[1]>Math.min(d[0],d[2]);
const orientations=d=>[d,[d[0],d[2],d[1]],[d[1],d[0],d[2]],[d[1],d[2],d[0]],[d[2],d[0],d[1]],[d[2],d[1],d[0]]].filter((v,i,a)=>a.findIndex(w=>w.join()==v.join())===i);
// Packing works per grid (independent cargo grids). Each placed box keeps {bin, cell, dims}.
// Group nearby cargo by destination and compact into free cells in automatic mode.
// An explicit shareGrids:false keeps dedicated mission grids; box ownership never merges.
export const ACCESS_SIDES=['rear','front','left','right','external'];
export function shipAccess(ship){return ACCESS_SIDES.includes(ship.access)?ship.access:/hull[ -]?b\b/i.test(ship.name||'')||ship.id==='misc-hull-b'?'external':'rear';}
export function sharesGrids(ship){return typeof ship.shareGrids==='boolean'?ship.shareGrids:true;}
function makeBins(ship){return ship.grids.map(grid=>({grid,cells:new Uint8Array(grid.w*grid.h*grid.l),boxes:[],used:0}));}
function occupy(b,cell,d,check){const g=b.grid,[x,y,z]=cell;if(x<0||y<0||z<0||x+d[0]>g.w||y+d[1]>g.h||z+d[2]>g.l)return false;for(let k=0;k<d[2];k++)for(let j=0;j<d[1];j++)for(let i=0;i<d[0];i++){const n=((z+k)*g.h+y+j)*g.w+x+i;if(b.cells[n])return false;}if(!check)for(let k=0;k<d[2];k++)for(let j=0;j<d[1];j++)for(let i=0;i<d[0];i++)b.cells[((z+k)*g.h+y+j)*g.w+x+i]=1;return true;}
// Supported = resting on the grid floor or fully on top of other boxes (no floating boxes).
function supported(b,cell,d){if(cell[1]===0)return true;const g=b.grid,y=cell[1]-1;for(let k=0;k<d[2];k++)for(let i=0;i<d[0];i++)if(!b.cells[((cell[2]+k)*g.h+y)*g.w+cell[0]+i])return false;return true;}
function sameGroup(p,item,share=false){return (share||p.missionId===item.missionId)&&(p.dropoffId||'')===(item.dropoffId||'');}
// Depth of a placed box from the loading side, in SCU cells (0 = right at the door / outer face).
export function boxDepth(ship,p,bounds=shipBounds(ship)){const g=ship.grids[p.bin],a=shipAccess(ship),x0=g.x+p.cell[0],x1=x0+p.dims[0],z0=g.z+p.cell[2],z1=z0+p.dims[2];
 if(a==='rear')return bounds.maxZ-z1;if(a==='front')return z0-bounds.minZ;if(a==='left')return x0-bounds.minX;if(a==='right')return bounds.maxX-x1;
 // external (Hull B): reached from the outward face of each grid.
 if(g._stack==='out')return g.h-(p.cell[1]+p.dims[1]);const outward=g.x+g.w/2<0?-1:1;return outward<0?p.cell[0]:g.w-(p.cell[0]+p.dims[0]);}
export function shipBounds(ship){let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(const g of ship.grids){minX=Math.min(minX,g.x);maxX=Math.max(maxX,g.x+g.w);minZ=Math.min(minZ,g.z);maxZ=Math.max(maxZ,g.z+g.l);}return {minX,maxX,minZ,maxZ};}
export function packBoxes(items,fixed=[],ship=DEFAULT_SHIP,opts={}){
 const bins=makeBins(ship);const limit=capacity(ship);const placed=[...fixed];
 if([...items,...fixed].reduce((a,b)=>a+b.size,0)>limit)return null;
 for(const p of fixed){const b=bins[p.bin];if(!b||!p.dims||!p.cell||p.size>b.grid.maxBoxSize||!occupy(b,p.cell,p.dims))return null;b.boxes.push(p);b.used+=p.size;}
 const share=opts.share??sharesGrids(ship),ranked=!opts.dense&&items.some(it=>Number.isFinite(it.rank)),bounds=shipBounds(ship),maxDepth=Math.max(1,shipAccess(ship)==='external'?2:shipAccess(ship)==='left'||shipAccess(ship)==='right'?bounds.maxX-bounds.minX:bounds.maxZ-bounds.minZ);
 // Later deliveries first, so they end up deep inside; biggest boxes first within the same delivery.
 const sorted=[...items].sort((a,b)=>(ranked?(b.rank??0)-(a.rank??0):0)||b.size-a.size||String(a.missionId).localeCompare(String(b.missionId)));
 for(const item of sorted){let best=null;
  const order=bins.map((b,index)=>({b,index,own:b.boxes.some(p=>sameGroup(p,item,share)),other:b.boxes.some(p=>!sameGroup(p,item,share))})).filter(o=>item.size<=o.b.grid.maxBoxSize&&(share||!o.other)).sort((a,b)=>Number(b.own)-Number(a.own)||(share?Number(b.b.used>0)-Number(a.b.used>0):Number(a.other)-Number(b.other))||a.index-b.index);
  search:for(const {b,index,own,other} of order){const grid=b.grid;
   for(const d of orientations(BOX_DIMS[item.size]||[])){if(d.length!==3)continue;if(grid.noUpright?.includes(item.size)&&isUpright(d))continue;
    for(let z=0;z<=grid.l-d[2];z++)for(let y=0;y<=grid.h-d[1];y++)for(let x=0;x<=grid.w-d[0];x++){const cell=[x,y,z];if(!occupy(b,cell,d,true)||!supported(b,cell,d))continue;
     if(!ranked){best={index,cell,d};break search;}
     const depth=boxDepth(ship,{bin:index,cell,dims:d},bounds),target=(item.rank??0)*maxDepth,score=Math.abs(depth-target)*10+y*.5+(opts.zones?.get(item.dropoffId)?.has(index)===false?100:0)+(share?(own?(other?5:0):other?60:25):(own?0:other?6:2))+index*.01+(x%d[0]?4:0)+(z%d[2]?4:0)+(y%d[1]?4:0);
     if(!best||score<best.score)best={score,index,cell,d};}}}
  if(!best&&ranked)return packBoxes(items,fixed,ship,{...opts,dense:true});
  if(!best)return share||!sharesGrids(ship)||opts.noFallback?null:packBoxes(items,fixed,ship,{...opts,share:true});
  const b=bins[best.index];occupy(b,best.cell,best.d);const p={...item,bin:best.index,cell:best.cell,dims:best.d};b.boxes.push(p);b.used+=item.size;placed.push(p);}
 return {bins,capacity:limit,shipId:ship.id,boxes:placed,used:placed.reduce((a,b)=>a+b.size,0),shared:share};
}
// Boxes that must be moved before `box` can come out: closer to the door on the same grid (overlapping
// cross-section along the access axis) or stacked on top of it.
export function blockersOf(ship,box,aboard,bounds=shipBounds(ship)){const a=shipAccess(ship),out=[],ov=(a0,a1,b0,b1)=>a0<b1&&b0<a1;
 for(const o of aboard){if(o.boxId===box.boxId||o.bin!==box.bin)continue;const [bx,by,bz]=box.cell,[ox,oy,oz]=o.cell,[bw,bh,bl]=box.dims,[ow,oh,ol]=o.dims;
  const above=oy>=by+bh&&ov(bx,bx+bw,ox,ox+ow)&&ov(bz,bz+bl,oz,oz+ol);
  const inFront=boxDepth(ship,o,bounds)<boxDepth(ship,box,bounds)&&ov(by,by+bh,oy,oy+oh)&&(a==='left'||a==='right'||a==='external'?ov(bz,bz+bl,oz,oz+ol):ov(bx,bx+bw,ox,ox+ow));
  if(above||inFront)out.push(o);}
 return out;}
export function makeShipments(missions,locationMap,options={}){
 const shipments=[],warnings=[];const ids=new Set(),ship=validateShip(options.ship||DEFAULT_SHIP);
 for(let mi=0;mi<missions.length;mi++){const original=missions[mi],aggregated=[];for(const group of destinationGroups(original)){const confirmed=original.destinationBoxes?.find(b=>b.pickupId===group.pickupId&&b.dropoffId===group.dropoffId);if(confirmed?.boxes?.length){if(group.cargo.some(c=>!Number.isInteger(c.scu)||c.scu<=0))throw Error(original.id+': 배송 수량을 먼저 입력하세요.');aggregated.push({commodity:group.cargo.map(c=>c.commodity).join(' / ')+' (배송지 묶음)',scu:group.scu,pickupId:group.pickupId,dropoffId:group.dropoffId,boxes:confirmed.boxes});}else aggregated.push(...group.cargo);}const m={...original,cargo:aggregated};if(!m.id||ids.has(m.id))throw Error('미션 ID가 비어 있거나 중복됐습니다.');ids.add(m.id);
  for(let ci=0;ci<m.cargo.length;ci++){const c=m.cargo[ci],a=locationMap.get(c.pickupId),b=locationMap.get(c.dropoffId);if(!a||!b)throw Error(`${m.id}: 픽업지와 배송지를 목록에서 선택하세요.`);if(c.pickupId===c.dropoffId)throw Error(`${m.id}: 픽업지와 배송지가 같아.`);
   const {boxes,estimated}=boxList(c,options.unknownBox||8);if(estimated)warnings.push(`${m.id} · ${c.commodity}: 상자 구성 미확인, 최대 ${SIZES.includes(c.maxBoxSize)?Math.min(options.unknownBox||8,c.maxBoxSize):options.unknownBox||8} SCU 조합으로 가정`);
   let pending=[],batch=0;
   const flush=()=>{if(!pending.length)return;shipments.push({id:`${m.id}:${ci}:${batch++}`,missionId:m.id,commodity:c.commodity,pickupId:c.pickupId,dropoffId:c.dropoffId,boxes:pending,scu:pending.reduce((a,b)=>a+b.size,0),color:COLORS[mi%COLORS.length],estimated});pending=[];};
   for(let bi=0;bi<boxes.length;bi++){const item={size:boxes[bi],missionId:m.id,dropoffId:c.dropoffId,pickupId:c.pickupId,cargoId:ci,boxId:`${m.id}:${ci}:${bi}`,commodity:c.commodity,color:COLORS[mi%COLORS.length]};if(!packBoxes([item],[],ship))throw Error(`${m.id}: ${item.size} SCU 상자는 ${ship.name}의 어느 그리드에도 들어가지 않습니다.`);if(pending.length&&!packBoxes([...pending,item],[],ship))flush();pending.push(item);}flush();
  }
 }
 if(shipments.length>64)throw Error('운송 구간은 한 번에 64개까지 계산할 수 있습니다.');return {shipments,warnings:[...new Set(warnings)]};
}
export function distance(a,b){return Math.hypot(...a.position.map((v,i)=>v-b.position[i]));}
function surface(l){return l.type==='LandingZone'||(l.type==='Outpost'&&!/station|clinic|gateway/i.test(l.name));}
// Gateway station that serves a jump point: its parent when that is a station, otherwise the nearest '… Gateway' in the system.
const gatewayCache=new WeakMap();
function gatewayOf(jp,data=gatewayOf.data){const cache=gatewayCache.get(data)||new Map();gatewayCache.set(data,cache);if(cache.has(jp.id))return cache.get(jp.id);let best=null,bd=1e9;for(const l of data.locations)if(l.system===jp.system&&l.type==='Manmade'&&/Gateway/i.test(l.name)){const d=distance(l,jp);if(d<bd){bd=d;best=l.id;}}cache.set(jp.id,bd<1e9?best:null);return cache.get(jp.id);}
export function navigator(data,settings){gatewayOf.data=data;
 const opt={...DEFAULTS,...settings},byId=new Map(data.locations.map(l=>[l.id,l])),gateIds=[...new Set(data.jumps.flatMap(j=>[j.from,j.to]))],cache=new Map();
 function path(from,to){if(from===to)return {seconds:0,meters:0,nodes:[from],jumps:0};const key=from+'|'+to;if(cache.has(key))return cache.get(key);const a=byId.get(from),b=byId.get(to);if(!a||!b)throw Error('좌표를 찾지 못했습니다.');
  const nodes=[...new Set([from,to,...gateIds])],dist=new Map(nodes.map(id=>[id,Infinity])),previous=new Map(),open=new Set(nodes);dist.set(from,0);
  while(open.size){const u=[...open].reduce((best,id)=>dist.get(id)<dist.get(best)?id:best);if(!Number.isFinite(dist.get(u)))break;open.delete(u);if(u===to)break;const lu=byId.get(u);
   for(const v of open){const lv=byId.get(v);let cost=Infinity;
    if(lu.system===lv.system)cost=quantumSeconds(distance(lu,lv)*opt.detourFactor,opt)+opt.spool;
    else if(data.jumps.some(j=>(j.from===u&&j.to===v)||(j.to===u&&j.from===v)))cost=opt.jumpMinutes*60;
    if(dist.get(u)+cost<dist.get(v)){dist.set(v,dist.get(u)+cost);previous.set(v,u);}
   }
  }
  if(!Number.isFinite(dist.get(to)))throw Error(`${a.system}–${b.system} 사이 점프 연결을 데이터에서 찾지 못했습니다.`);
  const raw=[to];while(raw[0]!==from)raw.unshift(previous.get(raw[0]));let meters=0,jumps=0;for(let i=1;i<raw.length;i++){const x=byId.get(raw[i-1]),y=byId.get(raw[i]);if(x.system===y.system)meters+=distance(x,y);else jumps++;}
  // System changes go through the gateway station next to each jump point (e.g. Pyro Gateway → jump → Stanton Gateway).
  const route=[];for(let i=0;i<raw.length;i++){const id=raw[i],l=byId.get(id),gate=l?.isGateway?gatewayOf(l):null,next=byId.get(raw[i+1]),prev=byId.get(raw[i-1]);
   if(gate&&next&&next.system!==l.system&&route.at(-1)!==gate)route.push(gate);route.push(id);if(gate&&prev&&prev.system!==l.system&&raw[i+1]!==gate)route.push(gate);}
  const gateways=route.filter(id=>byId.get(id)?.type==='Manmade'&&/Gateway/i.test(byId.get(id).name)).map(id=>byId.get(id).name);const result={gateways,seconds:dist.get(to)+(surface(a)?surfaceSeconds(opt):spaceApproachSeconds(opt))+(surface(b)?surfaceSeconds(opt):spaceApproachSeconds(opt))+opt.dockMinutes*60,meters,nodes:route,jumps};cache.set(key,result);return result;
 }
 return {path,byId};
}
export function planRoute(data,missions,startId,settings={}){
 const opt={...DEFAULTS,...settings,startId,ship:validateShip(settings.ship||DEFAULT_SHIP)},nav=navigator(data,opt);if(!nav.byId.has(startId))throw Error('출발 위치를 선택하세요.');
 const {shipments,warnings}=makeShipments(missions,nav.byId,opt);if(!shipments.length)throw Error('운송할 화물을 추가하세요.');
 const n=shipments.length;
 const now=Number.isFinite(settings.nowMs)?settings.nowMs:Date.now(),deadlines=new Map(missions.filter(m=>Number.isFinite(m.deadlineAt)).map(m=>[m.id,(m.deadlineAt-now)/1000]));
 const score=s=>s.cost+s.late.length*1e7;
 const bounds0=shipBounds(opt.ship);
 // Resume support: shipments already picked up / delivered, and where the aboard boxes currently sit.
 const resume=settings.resume||null,startStatus=Array(n).fill(0);let startPacking=packBoxes([],[],opt.ship);
 if(resume){const picked=new Set(resume.picked||[]),delivered=new Set(resume.delivered||[]);shipments.forEach((s,i)=>{if(delivered.has(s.id))startStatus[i]=2;else if(picked.has(s.id))startStatus[i]=1;});
  const aboardIds=new Set(shipments.filter((s,i)=>startStatus[i]===1).flatMap(s=>s.boxes.map(b=>b.boxId))),known=new Map((resume.aboard||[]).map(b=>[b.boxId,b]));
  const fixed=[...aboardIds].map(id=>known.get(id)).filter(Boolean);startPacking=fixed.length===aboardIds.size?packBoxes([],fixed.map(b=>({...b,...shipments.flatMap(s=>s.boxes).find(x=>x.boxId===b.boxId),bin:b.bin,cell:b.cell,dims:b.dims})),opt.ship):null;
  if(!startPacking)startPacking=packBoxes(shipments.filter((s,i)=>startStatus[i]===1).flatMap(s=>s.boxes),[],opt.ship);if(!startPacking)throw Error('지금 실린 화물이 이 함선 그리드에 들어가지 않습니다. 함선 설정을 확인하세요.');
  if(startStatus.every(x=>x===2))throw Error('남은 운송이 없습니다. 모든 배송을 마쳤습니다.');}
 // The shared stop search looks ahead to the complete route. Validate every proposed
 // pickup against the real grids before using it; aboard boxes remain fixed.
 const initial={status:startStatus,at:startId,cost:0,actions:[],packing:startPacking,late:[]};
 function advance(state,i,ship=opt.ship,waypointId=null){if(i===null){const leg=nav.path(state.at,waypointId);return {...state,at:waypointId,cost:state.cost+leg.seconds,actions:[...state.actions,{type:'waypoint',locationId:waypointId,leg,seconds:leg.seconds,packing:state.packing}]};}const s=shipments[i],st=state.status[i];if(st===2)return null;const status=[...state.status];status[i]=st+1;
  const packed=st===0?packBoxes(s.boxes.map(b=>({...b,rank:0})),state.packing.boxes,ship):packBoxes([],state.packing.boxes.filter(b=>!s.boxes.some(x=>x.boxId===b.boxId)),ship);if(!packed)return null;
  const to=st===0?s.pickupId:s.dropoffId,leg=nav.path(state.at,to);let moves=0;if(st===1){const leaving=new Set(s.boxes.map(b=>b.boxId)),stay=state.packing.boxes.filter(b=>!leaving.has(b.boxId)&&b.dropoffId!==s.dropoffId);for(const b of state.packing.boxes)if(leaving.has(b.boxId))moves+=blockersOf(opt.ship,b,stay,bounds0).length;}
  const seconds=leg.seconds+s.boxes.length*opt.secondsPerBox+moves*opt.secondsPerBox*2;
  const cost=state.cost+seconds+(opt.avoidFirst&&!state.actions.length&&to===opt.avoidFirst?1e6:0),late=[...state.late];for(const [id,limit]of deadlines){if(!late.includes(id)&&cost>limit&&shipments.some((s,j)=>s.missionId===id&&state.status[j]!==2))late.push(id);}
  return {status,at:to,cost,late,packing:packed,actions:[...state.actions,{shipmentId:s.id,shipmentIndex:i,type:st===0?'pickup':'delivery',locationId:to,leg,seconds,packing:packed}]};
 }
 const manual=Array.isArray(opt.manualStops),manualBest=manual?replayManualStops(opt.manualStops,shipments,nav,initial,(state,i,id)=>advance(state,i,opt.ship,id)):null;
 const proposed=manual?null:planActionRoute(shipments,startId,nav,{initialStatus:startStatus});
 let candidate=proposed?initial:null;
 for(const action of proposed?.actions||[]){candidate=advance(candidate,action.shipmentIndex);if(!candidate)break;}
 if(proposed&&!candidate){
  let sharingWouldFit=false;
  if(!sharesGrids(opt.ship)){let shared=initial;for(const action of proposed.actions){shared=advance(shared,action.shipmentIndex,{...opt.ship,shareGrids:true});if(!shared)break;}sharingWouldFit=!!shared;}
  warnings.push(sharingWouldFit?'미션별 전용 그리드 때문에 화물을 나눠 운송합니다. 함선 설정의 「여러 미션이 한 그리드 공유 → 공유 허용」을 선택하면 화물 소유권을 유지하면서 함께 실을 수 있습니다.':'현재 함선 용량·상자 크기·그리드 조건에 맞춰 화물을 나눠 운송하도록 계산했습니다.');
 }
 // Deadlines and an explicitly deferred first stop still use the constrained search.
 let best=manualBest||candidate,usedStopSearch=!!candidate;
 if(!manual&&(!candidate||deadlines.size||opt.avoidFirst)){
  const estimate=remainingTravelEstimate(shipments,nav),remainingWork=status=>shipments.reduce((sum,s,i)=>sum+(2-status[i])*s.boxes.length*opt.secondsPerBox,0);
  let beam=[initial];const steps=startStatus.reduce((a,x)=>a+2-x,0);
  for(let step=0;step<steps;step++){
   const next=[];for(const state of beam){const successors=[];for(let i=0;i<n;i++){const nextState=advance(state,i);if(nextState)successors.push(nextState);}
    const system=nav.byId.get(state.at).system,canCollectHere=!deadlines.size&&!opt.avoidFirst&&successors.some(s=>s.actions.at(-1).type==='pickup'&&nav.byId.get(s.at).system===system);
    // Cross only after gathering the remaining local pickups that actually fit.
    const here=successors.filter(s=>s.at===state.at),deliveriesHere=here.filter(s=>s.actions.at(-1).type==='delivery');
    // Finish this stop before leaving: unload, then collect every shipment that fits.
    next.push(...(deliveriesHere.length?deliveriesHere:here.length?here:successors.filter(s=>!canCollectHere||nav.byId.get(s.at).system===system)));}
   const unique=new Map();for(const state of next)state.estimate=score(state)+estimate(state.status,state.at)+remainingWork(state.status);
   next.sort((a,b)=>a.estimate-b.estimate||score(a)-score(b));
   for(const state of next){const k=state.status.join('')+'|'+state.at+'|'+state.late.slice().sort().join(',')+'|'+state.packing.boxes.map(b=>b.boxId+':'+b.bin+':'+b.cell.join()).sort().join(';');if(!unique.has(k))unique.set(k,state);if(unique.size>=40)break;}
   beam=[...unique.values()];if(!beam.length){if(candidate)break;throw Error('이 상자 구성으로 실을 수 있는 경로를 찾지 못했습니다. 상자 크기를 확인하세요.');}
  }
  const searched=beam.filter(s=>s.status.every(x=>x===2)).sort((a,b)=>score(a)-score(b))[0];
  if(searched&&(!best||score(searched)<score(best))){best=searched;usedStopSearch=false;}
 }
 const status=Array(n).fill(0),visits=[];let elapsed=0,peak=startPacking.used;
 // Replay the chosen route with delivery-aware placement: boxes delivered later go deeper, early ones near the door/top.
 const deliveries=best.actions.filter(a=>a.type==='delivery'),deliveryStep=new Map(),stops=[...new Set(deliveries.map(a=>a.locationId))];
 for(const a of deliveries)deliveryStep.set(a.shipmentIndex,stops.indexOf(a.locationId));
 const rankOf=i=>stops.length>1?deliveryStep.get(i)/(stops.length-1):0;let replay=startPacking,replayed=[];
 // Lay out everything as if it were all aboard at once, grouped by destination, and reserve those grids per destination.
 const picked=[...new Set(best.actions.filter(a=>a.type==='pickup').map(a=>a.shipmentIndex))],full=packBoxes(picked.flatMap(i=>shipments[i].boxes.map(b=>({...b,rank:rankOf(i)}))),startPacking.boxes,opt.ship),zones=full&&new Map();
 if(full)for(const b of full.boxes)(zones.get(b.dropoffId)||zones.set(b.dropoffId,new Set()).get(b.dropoffId)).add(b.bin);
 for(const a of best.actions){if(a.type==='waypoint'){replayed.push(replay);continue;}const s=shipments[a.shipmentIndex];replay=a.type==='pickup'?packBoxes(s.boxes.map(b=>({...b,rank:rankOf(a.shipmentIndex)})),replay.boxes,opt.ship,{zones}):packBoxes([],replay.boxes.filter(b=>!s.boxes.some(x=>x.boxId===b.boxId)),opt.ship);if(!replay){replayed=null;break;}replayed.push(replay);}
 const blockedCount=packs=>{let total=0,prev=startPacking;best.actions.forEach((a,i)=>{if(a.type==='delivery'){const leaving=new Set(shipments[a.shipmentIndex].boxes.map(b=>b.boxId)),stay=prev.boxes.filter(b=>!leaving.has(b.boxId)&&b.dropoffId!==shipments[a.shipmentIndex].dropoffId);for(const b of prev.boxes)if(leaving.has(b.boxId))total+=blockersOf(opt.ship,b,stay,bounds0).length;}prev=packs[i];});return total;};
 if(replayed&&blockedCount(replayed)<=blockedCount(best.actions.map(a=>a.packing))){let prev=startPacking;best.actions.forEach((a,i)=>{if(a.type==='waypoint'){a.packing=replayed[i];prev=a.packing;return;}const s=shipments[a.shipmentIndex];let moves=0;if(a.type==='delivery'){const leaving=new Set(s.boxes.map(b=>b.boxId)),stay=prev.boxes.filter(b=>!leaving.has(b.boxId)&&b.dropoffId!==s.dropoffId);for(const b of prev.boxes)if(leaving.has(b.boxId))moves+=blockersOf(opt.ship,b,stay,bounds0).length;}a.seconds=a.leg.seconds+s.boxes.length*opt.secondsPerBox+moves*opt.secondsPerBox*2;a.packing=replayed[i];prev=a.packing;});}
 for(const action of best.actions){if(action.shipmentIndex!=null)status[action.shipmentIndex]=action.type==='pickup'?1:2;const packed=action.packing;elapsed+=action.seconds;peak=Math.max(peak,packed.used);const previous=visits.at(-1);
  const shipment=shipments[action.shipmentIndex],event={...action,missionId:shipment?.missionId||'',scu:shipment?.scu||0,commodity:shipment?.commodity||'경유'};
  if(previous?.locationId===action.locationId){previous.events.push(event);previous.elapsed=elapsed;previous.packing=packed;previous.load=packed.used;previous.seconds+=action.seconds;}
  else visits.push({locationId:action.locationId,events:[event],elapsed,seconds:action.seconds,packing:packed,load:packed.used,leg:action.leg});
 }
 for(const v of visits)if(v.events.some(e=>e.type!=='waypoint'))v.events=v.events.filter(e=>e.type!=='waypoint');
 const bounds=shipBounds(opt.ship);
 visits.forEach((v,vi)=>{const before=vi?visits[vi-1].packing:startPacking,leaving=new Set(v.events.filter(e=>e.type==='delivery').flatMap(e=>shipments[e.shipmentIndex].boxes.map(b=>b.boxId)));
  v.blocked=[];for(const box of before.boxes.filter(b=>leaving.has(b.boxId))){const blockers=blockersOf(opt.ship,box,before.boxes.filter(o=>!leaving.has(o.boxId)),bounds);if(blockers.length)v.blocked.push({boxId:box.boxId,missionId:box.missionId,size:box.size,blockers:blockers.map(o=>({boxId:o.boxId,missionId:o.missionId,size:o.size}))});}
  const arriving=new Set(v.events.filter(e=>e.type==='pickup').flatMap(e=>shipments[e.shipmentIndex].boxes.map(b=>b.boxId)));
  v.loadOrder=v.packing.boxes.filter(b=>arriving.has(b.boxId)).sort((a,b)=>boxDepth(opt.ship,b,bounds)-boxDepth(opt.ship,a,bounds)||a.cell[1]-b.cell[1]).map(b=>b.boxId);
  if(v.blocked.length)warnings.push(`${vi+1}번 거점 하역: 다른 화물 ${new Set(v.blocked.flatMap(x=>x.blockers.map(o=>o.boxId))).size}상자를 먼저 옮겨야 할 수 있습니다 (출입구 쪽 또는 위에 적재됨).`);});
 // In game the contract completes once every delivery is done; returning is optional (settings.includeReturn).
 const returnIds=opt.includeReturn?[...new Set(missions.map(m=>m.returnId).filter(Boolean))]:[];let last=best.at;for(const id of returnIds){if(!nav.byId.has(id))throw Error('복귀 위치를 확인하세요.');const leg=nav.path(last,id);elapsed+=leg.seconds;const event={type:'return',missionId:missions.filter(m=>m.returnId===id).map(m=>m.id).join(', '),scu:0,commodity:'복귀',shipmentId:'return:'+id};visits.push({locationId:id,events:[event],elapsed,seconds:leg.seconds,packing:packBoxes([],[],opt.ship),load:0,leg});last=id;}
 const timing=missions.filter(m=>deadlines.has(m.id)).map(m=>{const finish=visits.filter(v=>v.events.some(e=>(e.missionId===m.id&&e.type==='delivery')||(e.type==='return'&&v.locationId===m.returnId))).at(-1)?.elapsed||0,remaining=deadlines.get(m.id),slack=remaining-finish*1.3;return {missionId:m.id,finish,remaining,slack,risk:finish>remaining?'late':slack<0?'tight':'ok'};});
 for(const t of timing)if(t.risk!=='ok')warnings.push(`${t.missionId}: ${t.risk==='late'?'예상 납품이 제한 시간 초과':'시간 여유 부족 가능'} (남은 ${Math.max(0,Math.round(t.remaining/60))}분 · 납품 약 ${Math.round(t.finish/60)}분 후)`);
 return {initialPacking:startPacking,capacity:capacity(opt.ship),ship:opt.ship,access:shipAccess(opt.ship),visits,shipments,seconds:elapsed,peak,warnings,timing,manual,algorithm:manual?'직접 수정한 방문 순서 · 픽업·배송·적재 검증':usedStopSearch?'행성계 픽업 묶음 · 거점 방문 시간 최적화 · 적재 검증 (전체 제약의 전역 최적 보장 없음)':'남은 이동 시간·제한 시간·적재 조건을 확인하는 빔 탐색 · 전역 최적 경로 보장 없음',settings:opt};
}
