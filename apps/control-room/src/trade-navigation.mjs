import base from '../../../data/locations.json' with {type:'json'};
import {navigator as createNavigator} from '../../../engine.mjs';
import {tradeShip} from './trade-cargo.mjs';
export const tradeAtlas=base;
const normal=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
// The bundled atlas is immutable. Keep every match so ambiguous names remain unresolved.
const locationsByName=new Map();
for(const point of base.locations){
 const key=point.system.toLowerCase()+':'+normal(point.name);
 const matches=locationsByName.get(key);
 if(matches)matches.push(point);
 else locationsByName.set(key,[point]);
}
export function resolveTradeTerminal(terminal,atlas=base){
 if(!terminal?.system)return null;
 const system=terminal.system.toLowerCase();
 const facility=String(terminal.location||'').replace(/\s*\(([^)]+)\)$/, (all,name)=>name.toLowerCase()===system?'':all);
 const names=[facility,String(terminal.name||'').replace(/^Admin\s*-\s*/,'')].filter(Boolean);
 for(const name of names){
  const normalized=normal(name);
  const matches=atlas===base ? locationsByName.get(system+':'+normalized)??[]
    : atlas.locations.filter(p=>p.system.toLowerCase()===system&&normal(p.name)===normalized);
  // Never resolve an ambiguous primary name by switching to a weaker alias.
  if(matches.length>1)return null;
  if(matches.length===1){const p=matches[0];if(p.position?.length!==3||p.position.some(n=>!Number.isFinite(n)))return null;return {point:p,match:name,terminalId:terminal.id};}
 }
 return null;
}
export function tradeNavigation(plan,market,atlas=base){
 const result={origin:null,destination:null,route:null,reason:null,version:atlas.meta.version};
 for(const key of ['origin','destination']){
  const terminal=market.terminals.find(t=>t.id===plan[key].id&&t.name===plan[key].name);
  result[key]=terminal?resolveTradeTerminal(terminal,atlas):null;
 }
 if(!result.origin||!result.destination)return {...result,reason:'unresolved'};
 const from=result.origin.point,to=result.destination.point;
 if(from.system.toLowerCase()!==plan.systemPath[0]?.toLowerCase()||to.system.toLowerCase()!==plan.systemPath.at(-1)?.toLowerCase())return {...result,reason:'changed'};
 try{
  const path=createNavigator(atlas,{}).path(from.id,to.id),byId=new Map(atlas.locations.map(p=>[p.id,p]));
  const systems=path.nodes.map(id=>byId.get(id)?.system).filter((s,i,list)=>s!==list[i-1]);
  if(systems.join('|').toLowerCase()!==plan.systemPath.join('|').toLowerCase())return {...result,reason:'changed'};
  const empty={boxes:[],used:0,bins:[]};
  const pairs=path.nodes.length===1?[[from.id,from.id]]:path.nodes.slice(1).map((id,i)=>[path.nodes[i],id]);
  const visits=pairs.map(([a,b])=>{
   const p=byId.get(a),q=byId.get(b),jump=p.system!==q.system;
   // Display geometry and sourced jump edges only; no made-up ship drive ETA.
   return {locationId:b,events:[],packing:empty,load:0,seconds:0,elapsed:0,blocked:[],jumps:jump?[{entryId:a,exitId:b,entryName:p.name,exitName:q.name}]:[],leg:{nodes:a===b?[a]:[a,b],meters:jump?0:Math.hypot(...p.position.map((n,i)=>n-q.position[i])),jumps:jump?1:0}};
  });
  result.route={mode:'simple',policy:'trade-reference',startId:from.id,visits,initialPacking:empty,ship:tradeShip(plan.ship.id),points:atlas.locations,seconds:0,peak:0,capacity:plan.ship.capacity,driveName:null,warnings:[]};
 }catch{return {...result,reason:'connection'};}
 return result;
}
