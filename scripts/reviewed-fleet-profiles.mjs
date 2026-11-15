// Reviewed game measurements and schematic arrangements, not copied ship meshes.
// See docs/function-review-20261114/fleet-support/README.md for source reconciliation.
import {validateShip,capacity} from '../ships.mjs';
const wiki='https://api.star-citizen.wiki/api/vehicles/';
const patch='https://robertsspaceindustries.com/en/comm-link/Patch-Notes/21429-Star-Citizen-Alpha-4103';
const diagram='https://ratjack.net/Star-Citizen/Cargo-Grids/CargoGrids4103.pdf';
const arrangement='https://sc-cargo.space/';
const grid=(id,name,w,h,l,x,z,maxBoxSize=32)=>({id,name,w,h,l,x,y:0,z,maxBoxSize,rotation:[0,0,0]});
const hangar=()=>[grid('rear-left','Hangar · Left',2,4,4,2,0,16),grid('rear-right','Hangar · Right',2,4,4,14,0,16)];
export const REVIEWED_PROFILES=[
 {id:'anvil-liberator',name:'Anvil Liberator',vehicleId:'609ce4ca-0f46-44a5-b6d3-2c2f87417126',scu:400,grids:[grid('garage-b','Garage B · 128 SCU',8,4,4,0,0),grid('garage-a','Garage A · 192 SCU',8,4,6,0,6),grid('hangar','Hangar · 80 SCU',4,4,5,0,15,16)]},
 {id:'rsi-galaxy',name:'RSI Galaxy',vehicleId:'01051d26-084e-4b4f-9566-ebd2251db0aa',scu:64,grids:hangar()},
 {id:'rsi-galaxy-cargo',name:'RSI Galaxy (Cargo Module)',vehicleId:'e50eb3fc-bbc1-4baf-8878-8e8ca7e832ce',scu:720,grids:[...hangar(),grid('module-left','Cargo Module · Left',4,4,16,0,8),grid('module-lift','Cargo Module · Lift',6,2,12,6,8),grid('module-right','Cargo Module · Right',4,4,16,14,8)]},
 {id:'rsi-galaxy-medical',name:'RSI Galaxy (Medical Module)',vehicleId:'42724505-2d5b-41ec-adb1-e4c2ee4e855c',scu:68,grids:[...hangar(),grid('medical-store','Medical Module · Storage',2,2,1,2,7,4)]},
];
const shapes=grids=>grids.map(g=>[g.w,g.h,g.l].sort((a,b)=>a-b).join('x')).sort();
function verify(ship,row,scu){
 const source=(row.cargo_grids||[]).map(g=>({w:g.width/1.25,h:g.height/1.25,l:g.length/1.25}));
 if(row.cargo_capacity!==scu||capacity(ship)!==scu||JSON.stringify(shapes(ship.grids))!==JSON.stringify(shapes(source)))throw Error('Reviewed grid measurements changed: '+ship.id);
 validateShip(ship);
}
export function applyReviewedProfiles(ships,index){
 const next=ships.map(s=>structuredClone(s)),byId=new Map(next.map(s=>[s.id,s])),applied=[];
 const stamp=(ship,row)=>({...ship,wikiVehicleId:row.uuid,layout:'reviewed-schematic',source:'Wiki dimensions / reviewed cargo layout',sourceUrl:wiki+row.uuid+'?version='+encodeURIComponent(row.version),reviewedLayout:{version:row.version,arrangement,diagram,releaseSource:patch,spacing:'schematic; not measured hull attachment coordinates'}});
 for(const spec of REVIEWED_PROFILES){
  const row=index.find(r=>r.uuid===spec.vehicleId);if(!row)throw Error('Reviewed released ship missing: '+spec.id);
  let ship=byId.get(spec.id);
  // Keep subsequent local corrections. Revalidate geometry instead of resetting it every day.
  if(!ship)ship={id:spec.id,name:spec.name,grids:structuredClone(spec.grids)};
  if(spec.id==='rsi-galaxy-medical')ship.grids.find(g=>g.id==='medical-store').maxBoxSize=4;
  verify(ship,row,spec.scu);const updated=stamp(ship,row);if(byId.has(spec.id))next[next.findIndex(s=>s.id===spec.id)]=updated;else next.push(updated);applied.push(spec.id);
 }
 const hammer=next.find(s=>s.id==='aegis-hammerhead'),hammerRow=index.find(r=>r.uuid==='395f30ae-f930-4929-b881-d711fde7e70f');
 if(hammer&&hammerRow){
  if(hammer.grids.length!==1||hammer.grids[0].id!=='hold')throw Error('Unexpected Hammerhead local layout');
  const updated=stamp({...hammer,grids:[{...hammer.grids[0],w:4,h:2,l:8,maxBoxSize:32}]},hammerRow);verify(updated,hammerRow,64);next[next.indexOf(hammer)]=updated;applied.push(hammer.id);
 }
 const iron=next.find(s=>s.id==='drake-ironclad'),ironRow=index.find(r=>r.uuid==='c42bf65e-f3f2-4234-8c19-8276bfd5de3a');
 if(iron&&ironRow){
  const secure=[['secure-hold-1','Secure · Front left',17,0],['secure-hold-2','Secure · Front right',20,0],['secure-hold-center','Secure · Centre',23,0],['secure-hold-3','Secure · Rear left',17,3],['secure-hold-4','Secure · Rear right',23,3]];
  const grids=[...iron.grids];for(const [id,name,x,z] of secure){const old=grids.find(g=>g.id===id);if(old)old.maxBoxSize=1;else grids.push(grid(id,name,2,2,2,x,z,1));}
  const updated=stamp({...iron,grids},ironRow);verify(updated,ironRow,2200);next[next.indexOf(iron)]=updated;applied.push(iron.id);
 }
 const cat=next.find(s=>s.id==='drake-caterpillar'),catRow=index.find(r=>r.uuid===cat?.wikiVehicleId)||index.find(r=>r.class_name==='DRAK_Caterpillar');
 if(cat&&catRow){
  const updated=stamp({...cat,grids:cat.grids.map(g=>g.id==='bay-1-1'?{...g,w:5,h:3,l:4,maxBoxSize:16}:g.id==='drak-caterpillar-cargo-inventory-module-ladder-1'?{...g,w:5,h:2,l:2,x:1,y:0,z:5,maxBoxSize:16}:/walkway|ladder|bay-5-3/.test(g.id)?{...g,maxBoxSize:2}:{...g,maxBoxSize:24})},catRow);
  verify(updated,catRow,576);next[next.indexOf(cat)]=updated;applied.push(cat.id);
 }
 const idris=next.find(s=>s.id==='aegis-idris-p'),idrisRow=index.find(r=>r.uuid===idris?.wikiVehicleId)||index.find(r=>r.class_name==='AEGS_Idris_P');
 if(idris&&idrisRow){
  const grids=idris.grids.map(g=>({...g,maxBoxSize:g.id.startsWith('hangar-')?16:g.id.startsWith('cargo-room-small-')?1:g.id==='cargo-room-medium'?2:g.maxBoxSize}));
  for(const id of ['bay-3-1','bay-3-2']){const g=grids.find(g=>g.id===id);if(!g)throw Error('Idris bay identity changed');if(g.l===4){g.l=2;grids.push({...g,id:id+'-rear',name:g.name+' · Rear',z:g.z+2});}}
  const updated=stamp({...idris,grids},idrisRow);verify(updated,idrisRow,1374);next[next.indexOf(idris)]=updated;applied.push(idris.id);
 }
 const syulen=next.find(s=>s.id==='gatac-syulen'),syulenRow=index.find(r=>r.uuid===syulen?.wikiVehicleId)||index.find(r=>r.class_name==='GAMA_Syulen');
 if(syulen&&syulenRow){
  const grids=syulen.grids.length===1?Array.from({length:6},(_,i)=>grid('slot-'+(i+1),'Cargo slot '+(i+1),1,1,1,(i%3)*2,Math.floor(i/3)*2,1)):syulen.grids;
  const updated=stamp({...syulen,grids},syulenRow);verify(updated,syulenRow,6);next[next.indexOf(syulen)]=updated;applied.push(syulen.id);
 }
 return {ships:next,applied};
}
