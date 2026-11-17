import {tradeShip} from './trade-cargo.mjs';
import {cargoPacking} from './cargo-plan.mjs';
import {BOX_DIMS,isUpright,assumedBoxes} from '../../../engine.mjs';
import {restrictsUpright} from '../../../ships.mjs';
export function tradeCargoPreview({runId,shipId,quantity,boxSize,commodity,destination,mode}){
 if(!Number.isSafeInteger(quantity)||quantity<0||quantity>10000||!BOX_DIMS[boxSize])throw Error('Invalid trade cargo');
 const ship=tradeShip(shipId),capacity=ship.grids.filter(g=>!g.disabled).reduce((s,g)=>s+g.w*g.h*g.l,0);
 if(quantity>capacity)return {ship,packing:null,reason:'capacity'};
 const fixed=[],d=BOX_DIMS[boxSize],orientations=[d,[d[0],d[2],d[1]],[d[1],d[0],d[2]],[d[1],d[2],d[0]],[d[2],d[0],d[1]],[d[2],d[1],d[0]]];
 let remaining=quantity,serial=0;
 const item=size=>({boxId:`trade-preview:${runId}:${mode}:${serial++}`,missionId:`trade-preview:${runId}`,shipmentId:`trade-preview:${runId}:cargo`,dropoffId:destination,commodity,size,color:'#cead6c',estimated:true});
 // Same feasible uniform tiling as the planner, avoiding quadratic searches in large holds.
 for(const [bin,g] of ship.grids.entries()){
  if(g.disabled||boxSize>(g.maxBoxSize??32))continue;
  const slots=v=>Math.floor(g.w/v[0])*Math.floor(g.h/v[1])*Math.floor(g.l/v[2]);
  const dims=orientations.filter(v=>!restrictsUpright(ship,g,boxSize)||!isUpright(v)).sort((a,b)=>slots(b)-slots(a))[0];
  if(!dims)continue;const [w,h,l]=dims;
  for(let z=0;z+l<=g.l;z+=l)for(let y=0;y+h<=g.h;y+=h)for(let x=0;x+w<=g.w;x+=w){if(remaining<boxSize)break;fixed.push({...item(boxSize),bin,cell:[x,y,z],dims:[...dims]});remaining-=boxSize;}
 }
 let packed;
 if(remaining){const sizes=assumedBoxes(remaining,Math.min(boxSize,16));packed=cargoPacking(ship,sizes.map(item),fixed);}
 else packed={boxes:fixed,used:quantity};
 if(!packed)return {ship,packing:null,reason:'fit'};
 return {ship,reason:null,packing:{boxes:packed.boxes,used:packed.used,capacity,bins:ship.grids.map((_,i)=>({used:packed.boxes.filter(b=>b.bin===i).reduce((s,b)=>s+b.size,0)}))}};
}
