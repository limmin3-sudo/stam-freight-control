import base from '../../../data/locations.json' with {type:'json'};
import {readLocationEdits,parseLocationBackup,mergeLocations} from '../../../locations.mjs';

// One validated snapshot is shared by the console. Workers receive it in the draft;
// neither the planner nor a running flight rereads mutable browser settings.
export function locationDataFor(records=[]){
 const edits=parseLocationBackup({format:'sfc-locations-v1',locations:records});
 const candidates=new Map(base.locations.map(p=>[p.id,p]));for(const p of edits)candidates.set(p.id,p);
 for(const p of candidates.values()){
  if(p.position===null)continue;
  const seen=new Set([p.id]);let at=p;
  while(at.parentId){
   const parent=candidates.get(at.parentId);
   if(!parent||parent.position===null||parent.system!==p.system||seen.has(parent.id))throw Error(p.name+': 소속 천체와 좌표를 확인하세요.');
   seen.add(parent.id);at=parent;
  }
 }
 return mergeLocations(base,edits);
}
export function readPersonalLocations(storage=globalThis.localStorage){
 const edits=readLocationEdits(storage);locationDataFor(edits);return edits;
}
let editedById=new Map();
let active={edits:[],data:base},byId=new Map(base.locations.map(p=>[p.id,p]));
export function activateLocations(edits=[]){
 if(JSON.stringify(active.edits)===JSON.stringify(edits))return active.data;
 const data=locationDataFor(edits);active={edits:structuredClone(edits),data};byId=new Map(data.locations.map(p=>[p.id,p]));editedById=new Map(active.edits.map(p=>[p.id,p]));return data;
}
export const currentLocationData=()=>active.data;
export const currentLocationEdits=()=>structuredClone(active.edits);
// Old city shortcuts remain IDs of the same cities even after a personal rename.
const cityNames={hurston:'Lorville',crusader:'Orison',arccorp:'Area18',microtech:'New Babbage'};
const cityIds=Object.fromEntries(Object.entries(cityNames).map(([key,name])=>[key,base.locations.find(p=>p.system==='stanton'&&p.name===name)?.id]));
export const canonicalLocationId=id=>cityIds[id]||id;

export const currentLocationPoint=id=>byId.get(canonicalLocationId(id));
export const personalLocationPoint=id=>editedById.get(canonicalLocationId(id));
