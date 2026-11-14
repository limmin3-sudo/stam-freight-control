// Presentation adapter only: keep the production packing engine and ownership rules.
import presets from '../../../data/ships.json' with {type:'json'};
import {DEFAULT_SHIP,withStacking,validateShip,capacity,selectShipGrids} from '../../../ships.mjs';
import {packBoxes,assumedBoxes,COLORS} from '../../../engine.mjs';
export const cargoShips=presets.map(s=>withStacking(validateShip(s.id===DEFAULT_SHIP.id?{...s,...DEFAULT_SHIP}:s)));
export {capacity};
export function cargoShip(id,disabled=[]){
 const ship=cargoShips.find(s=>s.id===id);
 if(!ship)throw Error('Unknown cargo profile');
 return selectShipGrids(ship,disabled);
}
export function demoCargo(){
 return [16,8,8,4,2,1,1].map((size,i)=>({boxId:`sample:${i}`,missionId:i<3?'sample-a':'sample-b',shipmentId:i<3?'sample-a:1':'sample-b:1',dropoffId:i<3?'arccorp':'microtech',commodity:i<3?'Medical supplies':'Machine parts',size,color:COLORS[i<3?0:1]}));
}
// A trial manifest has totals, not confirmed box counts. Caller must explicitly
// choose an estimate. Never pack unresolved pickup shares as confirmed cargo.
export function manifestCargo(draft,pickup){
 const boxes=[],unresolved=[];const destinations=[...new Set(draft.jobs.flatMap(j=>j.shipments.map(s=>s.to)))];
 for(const job of draft.jobs)for(const row of job.shipments){
  if(row.from!==pickup)continue;
  if((job.state&&job.state!=='ready')||!Number.isSafeInteger(row.scu)||row.scu<=0||Object.hasOwn(job.reservations||{},row.to)||row.cargoShape==='unknown'||(row.maxBoxSize!=null&&![1,2,4,8,16,24,32].includes(row.maxBoxSize))||(/cryo[ -]?pods?/i.test(row.cargo[1])&&row.cargoShape!=='cryopod')){
   unresolved.push({missionId:job.id,shipmentId:row.id});continue;
  }
  const explicit=row.boxes||[];
  if(explicit.length && (explicit.some(b=>![1,2,4,8,16,24,32].includes(b.size)||!Number.isSafeInteger(b.count)||b.count<1)||explicit.reduce((n,b)=>n+b.size*b.count,0)!==row.scu)){
   unresolved.push({missionId:job.id,shipmentId:row.id});continue;
  }
  const sizes=row.cargoShape==='cryopod'?Array(row.scu).fill(1):explicit.length?explicit.flatMap(b=>Array(b.count).fill(b.size)):assumedBoxes(row.scu,Math.min(8,row.maxBoxSize||8));
  sizes.forEach((size,i)=>boxes.push({boxId:JSON.stringify([job.id,row.id,i]),missionId:job.id,shipmentId:row.id,dropoffId:row.to,commodity:row.cargo[1],size,color:COLORS[destinations.indexOf(row.to)%COLORS.length],estimated:!explicit.length&&row.cargoShape!=='cryopod',...(row.cargoShape==='cryopod'?{_cargoShape:'cryopod'}:{})}));
 }
 return {boxes,unresolved};
}
export function cargoPacking(ship,items,fixed=[]){
 if(new Set([...items,...fixed].map(b=>b.boxId)).size!==items.length+fixed.length)throw Error('Duplicate cargo identity');
 return packBoxes(items,fixed,ship);
}
// Convert the packer's attachment-frame centre to world space, exactly once.
export function cargoWorldCenter(grid,box){
 const p=box.cell.map((v,i)=>v+box.dims[i]/2-[grid.w,grid.h,grid.l][i]/2);
 const [a,b,c]=(grid.rotation||[0,0,0]).map(v=>v*Math.PI/180);
 // Three Euler XYZ uses Rx * Ry * Rz: rotate Z, then Y, then X.
 let [x,y,z]=p;
 [x,y]=[x*Math.cos(c)-y*Math.sin(c),x*Math.sin(c)+y*Math.cos(c)];
 [x,z]=[x*Math.cos(b)+z*Math.sin(b),-x*Math.sin(b)+z*Math.cos(b)];
 [y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
 return [x+grid.x+grid.w/2,y+grid.y+grid.h/2,z+grid.z+grid.l/2];
}

export const cargoPreferenceEvent='stam:cargo-preferences';
export const cargoPreferenceKey='stam.cargo-preview.v1';
export function readCargoPreferences(){
 try{const p=JSON.parse(sessionStorage.getItem(cargoPreferenceKey)||'null');
  if(!p||typeof p.shipId!=='string'||!p.shipId)return null;
  const disabled=Object.fromEntries(Object.entries(p.disabled||{}).filter(([,ids])=>Array.isArray(ids)).map(([id,ids])=>[id,[...new Set(ids.filter(value=>typeof value==='string'))]]));
  return {shipId:p.shipId,disabled};
 }catch{return null;}
}
export function saveCargoPreferences(value){try{sessionStorage.setItem(cargoPreferenceKey,JSON.stringify(value));window.dispatchEvent(new Event(cargoPreferenceEvent));}catch{}}
