import {validateShip} from '../ships.mjs';
export const gridSource='https://raw.githubusercontent.com/AquatikJustice/SuperCargo/main/src/shared/cargoGrids.ts';
export function reconcileCommunityGrids(ships,text){
 const upstream=new Map();for(const match of text.matchAll(/^ {2}("(?:[^"\\]|\\.)*"): (\{.*\}),?$/gm))upstream.set(JSON.parse(match[1]),JSON.parse(match[2]));
 if(upstream.size<ships.length*.8)throw Error('Incomplete community grid source');
 const changes=[],unresolved=[],next=ships.map(ship=>{
  if(ship.layout==='reference-hull'){unresolved.push({id:ship.id,reason:'verified local hull layout override preserved'});return ship;}
  if(ship.source!=='SuperCargo cargoGrids.ts (community reference)')return ship;
  const source=upstream.get(ship.name.replace(/ \(화물 모듈 장착 시\)$/,''));if(!source){unresolved.push({id:ship.id,reason:'not present in community source'});return ship;}
  const loadable=source.grids.filter(g=>g.autoLoad!==false),base=loadable.filter(g=>!g.moduleId),grids=base.length?base:loadable;
  if(grids.length!==ship.grids.length||grids.some(g=>!ship.grids.some(old=>old.id===g.id)||g.floor&&g.floor!=='y-')){unresolved.push({id:ship.id,reason:'grid identity/attachment changed; layout needs review'});return ship;}
  const updated={...ship,layout:source.layout,grids:ship.grids.map(old=>{const g=grids.find(g=>g.id===old.id);return {...old,w:g.w,h:g.h,l:g.l,x:g.x,y:g.y,z:g.z,rotation:Array.isArray(g.rot)?g.rot:[0,0,0],...(g.maxSize?{maxBoxSize:Math.max(...[1,2,4,8,16,24,32].filter(size=>size<=g.maxSize))}:{})};})};
  validateShip(updated);if(JSON.stringify(updated)!==JSON.stringify(ship))changes.push(ship.id);return updated;
 });
 return {ships:next,changes,unresolved};
}
