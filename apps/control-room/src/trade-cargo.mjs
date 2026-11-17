import {cargoShips,cargoShip} from './cargo-plan.mjs';
import {restrictsUpright} from '../../../ships.mjs';
import {BOX_DIMS,isUpright} from '../../../engine.mjs';
export {cargoShips as tradeShips,cargoShip as tradeShip};
// Homogeneous box tiling in the existing stacking frame. It is a feasible empty-grid
// lower bound, not an arbitrary SCU total or a claim about occupied cargo holds.
export function tradeBoxCapacity(ship,size){
 const d=BOX_DIMS[size];if(!d)return 0;
 const orientations=[d,[d[0],d[2],d[1]],[d[1],d[0],d[2]],[d[1],d[2],d[0]],[d[2],d[0],d[1]],[d[2],d[1],d[0]]];
 return ship.grids.filter(g=>!g.disabled&&size<=(g.maxBoxSize??32)).reduce((sum,g)=>sum+Math.max(0,...orientations.filter(v=>!restrictsUpright(ship,g,size)||!isUpright(v)).map(([w,h,l])=>Math.floor(g.w/w)*Math.floor(g.h/h)*Math.floor(g.l/l)))*size,0);
}
