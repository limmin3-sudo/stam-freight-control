import drives from '../../../data/quantum-drives.json' with {type:'json'};
import {compatibleQuantumDrives,resolveQuantumDrive} from '../../../quantum.mjs';
import {quantumFlightSeconds} from '../../../travel.mjs';
import {navigator as createNavigator,BOX_DIMS,isUpright} from '../../../engine.mjs';
import {restrictsUpright} from '../../../ships.mjs';
import {tradeAtlas,resolveTradeTerminal} from './trade-navigation.mjs';
import {tradeShip,tradeShips} from './trade-cargo.mjs';
export function suiteDrives(shipId){return compatibleQuantumDrives(drives,drives.profiles[shipId]).map(d=>({id:d.id,name:d.name,version:d.version}));}
// Deterministic feasible packing, not a maximum-capacity proof. Cell occupancy is shared
// across all commodities and sizes. No boxes from a player's freight manifest are touched.
export function packSuite(shipId,items){
 const ship=tradeShip(shipId),bins=ship.grids.map(g=>new Uint8Array(g.w*g.h*g.l)),boxes=[];
 if(items.some(i=>!BOX_DIMS[i.boxSize]||!Number.isInteger(i.quantity)||i.quantity<0||i.quantity%i.boxSize))return null;
 const capacity=ship.grids.filter(g=>!g.disabled).reduce((s,g)=>s+g.w*g.h*g.l,0),used=items.reduce((s,i)=>s+i.quantity,0);
 if(used>capacity)return null;
 for(const item of [...items].sort((a,b)=>b.boxSize-a.boxSize)){
  let count=item.quantity/item.boxSize;const d=BOX_DIMS[item.boxSize],all=[d,[d[0],d[2],d[1]],[d[1],d[0],d[2]],[d[1],d[2],d[0]],[d[2],d[0],d[1]],[d[2],d[1],d[0]]];
  for(let bin=0;bin<ship.grids.length&&count;bin++){
   const g=ship.grids[bin];if(g.disabled||item.boxSize>(g.maxBoxSize??32))continue;
   const dims=all.filter((v,i)=>all.findIndex(a=>a.join()===v.join())===i&&(!restrictsUpright(ship,g,item.boxSize)||!isUpright(v))).sort((a,b)=>Math.floor(g.w/b[0])*Math.floor(g.h/b[1])*Math.floor(g.l/b[2])-Math.floor(g.w/a[0])*Math.floor(g.h/a[1])*Math.floor(g.l/a[2]));
   const index=(x,y,z)=>(z*g.h+y)*g.w+x;
   for(let y=0;y<g.h&&count;y++)for(let z=0;z<g.l&&count;z++)for(let x=0;x<g.w&&count;x++){
    if(bins[bin][index(x,y,z)])continue;
    for(const [w,h,l] of dims){if(x+w>g.w||y+h>g.h||z+l>g.l)continue;let free=true;
     for(let dz=0;dz<l&&free;dz++)for(let dy=0;dy<h&&free;dy++)for(let dx=0;dx<w;dx++)if(bins[bin][index(x+dx,y+dy,z+dz)]){free=false;break;}
     if(!free)continue;
     for(let dz=0;dz<l;dz++)for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)bins[bin][index(x+dx,y+dy,z+dz)]=1;
     boxes.push({boxId:`suite:${boxes.length}`,missionId:'trade-suite',shipmentId:`trade:${item.commodityId}`,dropoffId:'trade',commodity:item.name||String(item.commodityId),size:item.boxSize,color:['#cead6c','#57cbd4','#b4a2de','#9bc588'][item.commodityId%4],estimated:true,bin,cell:[x,y,z],dims:[w,h,l]});count--;break;
    }
   }
  }if(count)return null;
 }
 return {ship,packing:{boxes,used,capacity,bins:ship.grids.map((_,i)=>({used:boxes.filter(b=>b.bin===i).reduce((s,b)=>s+b.size,0)}))}};
}
export function suiteContext(options){
 const ship=tradeShip(options.shipId);if(options.capacity>ship.grids.filter(g=>!g.disabled).reduce((s,g)=>s+g.w*g.h*g.l,0))throw Error('capacity');
 const nav=createNavigator(tradeAtlas,{}),points=new Map(tradeAtlas.locations.map(p=>[p.id,p]));
 const profile=drives.profiles[options.shipId];const drive=resolveQuantumDrive(drives,profile,{driveMode:options.driveId?'catalog':'factory',driveId:options.driveId}).drive;
 if(options.driveId&&!suiteDrives(options.shipId).some(d=>d.id===options.driveId))throw Error('drive');
 const routes=new Map(),packing=new Map();
 return {route(a,b){const key=`${a.id}:${b.id}`;if(routes.has(key))return routes.get(key);let result=null;
  const from=resolveTradeTerminal(a),to=resolveTradeTerminal(b);
  if(from&&to)try{const path=nav.path(from.point.id,to.point.id);let meters=0,seconds=drive?0:null,jumps=0;const systems=[];
   for(let i=0;i<path.nodes.length;i++){const p=points.get(path.nodes[i]);if(systems.at(-1)!==p.system)systems.push(p.system);if(!i)continue;const q=points.get(path.nodes[i-1]);if(p.system!==q.system){jumps++;continue;}const distance=Math.hypot(...p.position.map((v,j)=>v-q.position[j]));meters+=distance;if(seconds!==null)seconds+=quantumFlightSeconds(distance,drive)+(distance?(drive.spool||0)+(drive.cooldown||0):0);}
   result={meters,seconds,jumps,systems,...(drive?{drive:{name:drive.name,version:drive.version??profile.version??null}}:{})};
  }catch{}routes.set(key,result);return result;
 },pack(items){const totals=new Map();for(const i of items)totals.set(i.boxSize,(totals.get(i.boxSize)||0)+i.quantity);const key=[...totals].sort((a,b)=>b[0]-a[0]).map(a=>a.join(':')).join(',');if(!packing.has(key))packing.set(key,!!packSuite(options.shipId,items));return packing.get(key);}};
}

export function fittingTradeShips(items){
 const quantity=items.reduce((n,i)=>n+i.quantity,0);if(!quantity||quantity>10000||items.length>100)return [];
 return tradeShips.flatMap(ship=>{const capacity=ship.grids.filter(g=>!g.disabled).reduce((n,g)=>n+g.w*g.h*g.l,0);return capacity>=quantity&&packSuite(ship.id,items)?[{id:ship.id,name:ship.name,capacity}]:[];}).sort((a,b)=>a.capacity-b.capacity||a.name.localeCompare(b.name));
}
