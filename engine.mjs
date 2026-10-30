export const CAPACITY=512;
export const SIZES=[32,24,16,8,4,2,1];
export const BOX_DIMS={1:[1,1,1],2:[1,1,2],4:[2,1,2],8:[2,2,2],16:[2,2,4],24:[2,2,6],32:[2,2,8]};
export const DEFAULTS={quantumSpeed:180000,spool:25,jumpMinutes:8,dockMinutes:3,surfaceMinutes:5,secondsPerBox:25,unknownBox:8,detourFactor:1.15};
export const COLORS=['#57d9db','#ecb969','#a697f4','#eb8fb1','#8cd6a1','#8dbbfa','#e3dd84','#cda17e'];
export function assumedBoxes(scu,maxSize=8){const out=[];for(const size of SIZES.filter(s=>s<=maxSize)){while(scu>=size){out.push(size);scu-=size;}}return out;}
export function boxList(cargo,unknownBox=8){
 if(!Number.isInteger(cargo.scu)||cargo.scu<1||cargo.scu>10000)throw Error('화물 SCU는 1–10,000 사이의 정수여야 해.');
 if(!cargo.boxes?.length)return {boxes:assumedBoxes(cargo.scu,SIZES.includes(cargo.maxBoxSize)?Math.min(unknownBox,cargo.maxBoxSize):unknownBox),estimated:true};
 let total=0,count=0;const boxes=[];for(const b of cargo.boxes){if(!SIZES.includes(b.size)||!Number.isInteger(b.count)||b.count<1||b.count>10000)throw Error('상자 크기 또는 개수가 잘못됐어.');if(SIZES.includes(cargo.maxBoxSize)&&b.size>cargo.maxBoxSize)throw Error('입력한 상자가 미션의 최대 상자 크기보다 커.');total+=b.size*b.count;count+=b.count;if(count>10000)throw Error('상자 개수가 너무 많아.');for(let i=0;i<b.count;i++)boxes.push(b.size);}
 if(total!==cargo.scu)throw Error(`상자 합계 ${total} SCU와 화물 ${cargo.scu} SCU가 달라.`);return {boxes,estimated:false};
}
const orientations=d=>[d,[d[0],d[2],d[1]],[d[1],d[0],d[2]],[d[1],d[2],d[0]],[d[2],d[0],d[1]],[d[2],d[1],d[0]]].filter((v,i,a)=>a.findIndex(w=>w.join()==v.join())===i);
// Sixteen independent 2×2×8-cell planning grids. Physical attachment transforms are schematic.
export function packBoxes(items,fixed=[]){
 const bins=Array.from({length:16},()=>({cells:new Uint8Array(32),boxes:[],used:0}));
 const placed=[...fixed];const sorted=[...items].sort((a,b)=>b.size-a.size||String(a.missionId).localeCompare(String(b.missionId)));
 if([...sorted,...fixed].reduce((a,b)=>a+b.size,0)>CAPACITY)return null;
 for(const p of fixed){const b=bins[p.bin];for(let z=0;z<p.dims[2];z++)for(let y=0;y<p.dims[1];y++)for(let x=0;x<p.dims[0];x++)b.cells[(p.cell[2]+z)*4+(p.cell[1]+y)*2+p.cell[0]+x]=1;b.boxes.push(p);b.used+=p.size;}
 for(const item of sorted){let found=false;
  const order=bins.map((b,index)=>({b,index})).sort((a,b)=>Number(b.b.boxes.some(x=>x.missionId===item.missionId))-Number(a.b.boxes.some(x=>x.missionId===item.missionId))||a.index-b.index);
  outer:for(const {b,index} of order){for(const d of orientations(BOX_DIMS[item.size]||[])){if(d.length!==3)continue;for(let z=0;z<=8-d[2];z++)for(let y=0;y<=2-d[1];y++)for(let x=0;x<=2-d[0];x++){
   const cells=[];let free=true;for(let dz=0;dz<d[2];dz++)for(let dy=0;dy<d[1];dy++)for(let dx=0;dx<d[0];dx++){const idx=(z+dz)*4+(y+dy)*2+x+dx;cells.push(idx);if(b.cells[idx])free=false;}
   if(!free)continue;cells.forEach(c=>b.cells[c]=1);const p={...item,bin:index,cell:[x,y,z],dims:d};b.boxes.push(p);b.used+=item.size;placed.push(p);found=true;break outer;
  }}}
  if(!found)return null;
 }
 return {bins,boxes:placed,used:placed.reduce((a,b)=>a+b.size,0)};
}
export function makeShipments(missions,locationMap,options={}){
 const shipments=[],warnings=[];const ids=new Set();
 for(let mi=0;mi<missions.length;mi++){const m=missions[mi];if(!m.id||ids.has(m.id))throw Error('미션 ID는 비어 있거나 중복될 수 없어.');ids.add(m.id);
  for(let ci=0;ci<m.cargo.length;ci++){const c=m.cargo[ci],a=locationMap.get(c.pickupId),b=locationMap.get(c.dropoffId);if(!a||!b)throw Error(`${m.id}: 픽업지와 배송지를 좌표 목록에서 확정해 줘.`);if(c.pickupId===c.dropoffId)throw Error(`${m.id}: 픽업지와 배송지가 같아.`);
   const {boxes,estimated}=boxList(c,options.unknownBox||8);if(estimated)warnings.push(`${m.id} · ${c.commodity}: 상자 구성 미확인, 최대 ${SIZES.includes(c.maxBoxSize)?Math.min(options.unknownBox||8,c.maxBoxSize):options.unknownBox||8} SCU 조합으로 가정`);
   let pending=[],batch=0;
   const flush=()=>{if(!pending.length)return;shipments.push({id:`${m.id}:${ci}:${batch++}`,missionId:m.id,commodity:c.commodity,pickupId:c.pickupId,dropoffId:c.dropoffId,boxes:pending,scu:pending.reduce((a,b)=>a+b.size,0),color:COLORS[mi%COLORS.length],estimated});pending=[];};
   for(let bi=0;bi<boxes.length;bi++){const item={size:boxes[bi],missionId:m.id,cargoId:ci,boxId:`${m.id}:${ci}:${bi}`,commodity:c.commodity,color:COLORS[mi%COLORS.length]};if(pending.length&&!packBoxes([...pending,item]))flush();pending.push(item);}flush();
  }
 }
 if(shipments.length>32)throw Error('한 번에 32개 이하의 운송 구간으로 나눠 계획해 줘.');return {shipments,warnings:[...new Set(warnings)]};
}
export function distance(a,b){return Math.hypot(...a.position.map((v,i)=>v-b.position[i]));}
function surface(l){return l.type==='LandingZone'||(l.type==='Outpost'&&!/station|clinic|gateway/i.test(l.name));}
export function navigator(data,settings){
 const opt={...DEFAULTS,...settings},byId=new Map(data.locations.map(l=>[l.id,l])),gateIds=[...new Set(data.jumps.flatMap(j=>[j.from,j.to]))],cache=new Map();
 function path(from,to){if(from===to)return {seconds:0,meters:0,nodes:[from],jumps:0};const key=from+'|'+to;if(cache.has(key))return cache.get(key);const a=byId.get(from),b=byId.get(to);if(!a||!b)throw Error('좌표를 찾지 못했어.');
  const nodes=[...new Set([from,to,...gateIds])],dist=new Map(nodes.map(id=>[id,Infinity])),previous=new Map(),open=new Set(nodes);dist.set(from,0);
  while(open.size){const u=[...open].reduce((best,id)=>dist.get(id)<dist.get(best)?id:best);if(!Number.isFinite(dist.get(u)))break;open.delete(u);if(u===to)break;const lu=byId.get(u);
   for(const v of open){const lv=byId.get(v);let cost=Infinity;
    if(lu.system===lv.system)cost=distance(lu,lv)/1000/opt.quantumSpeed*opt.detourFactor+opt.spool;
    else if(data.jumps.some(j=>(j.from===u&&j.to===v)||(j.to===u&&j.from===v)))cost=opt.jumpMinutes*60;
    if(dist.get(u)+cost<dist.get(v)){dist.set(v,dist.get(u)+cost);previous.set(v,u);}
   }
  }
  if(!Number.isFinite(dist.get(to)))throw Error(`${a.system}–${b.system} 사이에 데이터로 확인된 점프 연결이 없어.`);
  const route=[to];while(route[0]!==from)route.unshift(previous.get(route[0]));let meters=0,jumps=0;for(let i=1;i<route.length;i++){const x=byId.get(route[i-1]),y=byId.get(route[i]);if(x.system===y.system)meters+=distance(x,y);else jumps++;}
  const result={seconds:dist.get(to)+(surface(a)?opt.surfaceMinutes*60:0)+(surface(b)?opt.surfaceMinutes*60:0)+opt.dockMinutes*60,meters,nodes:route,jumps};cache.set(key,result);return result;
 }
 return {path,byId};
}
export function planRoute(data,missions,startId,settings={}){
 const opt={...DEFAULTS,...settings},nav=navigator(data,opt);if(!nav.byId.has(startId))throw Error('시작 위치를 선택해 줘.');
 const {shipments,warnings}=makeShipments(missions,nav.byId,opt);if(!shipments.length)throw Error('운송할 화물을 추가해 줘.');
 const n=shipments.length;
 const now=Number.isFinite(settings.nowMs)?settings.nowMs:Date.now(),deadlines=new Map(missions.filter(m=>Number.isFinite(m.deadlineAt)).map(m=>[m.id,(m.deadlineAt-now)/1000]));
 const score=s=>s.cost+s.late.length*1e7;
 let beam=[{status:Array(n).fill(0),at:startId,cost:0,actions:[],packing:packBoxes([]),late:[]}];
 for(let step=0;step<n*2;step++){
  const next=[];
  for(const state of beam){for(let i=0;i<n;i++){const s=shipments[i],st=state.status[i];if(st===2)continue;const status=[...state.status];status[i]=st+1;
   const packed=st===0?packBoxes(s.boxes,state.packing.boxes):packBoxes([],state.packing.boxes.filter(b=>!s.boxes.some(x=>x.boxId===b.boxId)));if(!packed)continue;
   const to=st===0?s.pickupId:s.dropoffId,leg=nav.path(state.at,to);const seconds=leg.seconds+s.boxes.length*opt.secondsPerBox;
   const cost=state.cost+seconds,late=[...state.late];for(const [id,limit]of deadlines){if(!late.includes(id)&&cost>limit&&shipments.some((s,j)=>s.missionId===id&&state.status[j]!==2))late.push(id);}
   next.push({status,at:to,cost,late,packing:packed,actions:[...state.actions,{shipmentId:s.id,shipmentIndex:i,type:st===0?'pickup':'delivery',locationId:to,leg,seconds,packing:packed}]});
  }}
  const unique=new Map();next.sort((a,b)=>score(a)-score(b));for(const state of next){const k=state.status.join('')+'|'+state.at+'|'+state.late.slice().sort().join(',')+'|'+state.packing.boxes.map(b=>b.boxId+':'+b.bin+':'+b.cell.join()).sort().join(';');if(!unique.has(k))unique.set(k,state);if(unique.size>=25)break;}beam=[...unique.values()];if(!beam.length)throw Error('이 상자 구성으로 적재 가능한 경로를 찾지 못했어. 상자 크기를 확인해 줘.');
 }
 const best=beam.sort((a,b)=>score(a)-score(b))[0],status=Array(n).fill(0),visits=[];let elapsed=0,peak=0;
 for(const action of best.actions){status[action.shipmentIndex]=action.type==='pickup'?1:2;const packed=action.packing;elapsed+=action.seconds;peak=Math.max(peak,packed.used);const previous=visits.at(-1);
  const event={...action,missionId:shipments[action.shipmentIndex].missionId,scu:shipments[action.shipmentIndex].scu,commodity:shipments[action.shipmentIndex].commodity};
  if(previous?.locationId===action.locationId){previous.events.push(event);previous.elapsed=elapsed;previous.packing=packed;previous.load=packed.used;previous.seconds+=action.seconds;}
  else visits.push({locationId:action.locationId,events:[event],elapsed,seconds:action.seconds,packing:packed,load:packed.used,leg:action.leg});
 }
 const timing=missions.filter(m=>deadlines.has(m.id)).map(m=>{const finish=visits.filter(v=>v.events.some(e=>e.missionId===m.id&&e.type==='delivery')).at(-1)?.elapsed||0,remaining=deadlines.get(m.id),slack=remaining-finish*1.3;return {missionId:m.id,finish,remaining,slack,risk:finish>remaining?'late':slack<0?'tight':'ok'};});
 for(const t of timing)if(t.risk!=='ok')warnings.push(`${t.missionId}: ${t.risk==='late'?'예상 납품이 제한 시간을 초과해':'시간 여유가 부족할 수 있어'} (남은 ${Math.max(0,Math.round(t.remaining/60))}분 · 납품 약 ${Math.round(t.finish/60)}분 후)`);
 return {visits,shipments,seconds:best.cost,peak,warnings,timing,algorithm:'제한 시간·적재 조건을 확인하는 빔 탐색 · 전역 최적 경로 보장 없음',settings:opt};
}
