import locationData from '../../../data/log-location-index.json' with {type:'json'};
import {currentLocationData,currentLocationPoint,personalLocationPoint} from './personal-locations.mjs';
import fleet from '../../../data/ships.json' with {type:'json'};
import korean from '../../../data/stam-korean.json' with {type:'json'};
export type Name = [string,string];
const translations:Record<string,string>=korean.places;
export type Place = string;
const referencePlaces=new Map(locationData.locations.filter(p=>p.id).map(p=>[p.system+':'+p.id,p]));
export function navigablePlace(id:string){const p=currentLocationPoint(id);return !!p&&p.type!=='Star';}
export function hasPlace(id:string){return navigablePlace(id)||referencePlaces.has(id)&&personalLocationPoint(id)?.position!==null;}
export function placeName(id:Place,language:number) {
 const point=currentLocationPoint(id)||personalLocationPoint(id)||referencePlaces.get(id);
 const alias=(point as {aliases?:string[]}|undefined)?.aliases?.find(n=>/[가-힣]/.test(n));
 return point?(language===0?(alias||translations[point.name]||point.name):point.name):(language===0?'거점 미확인':'Unknown stop');
}
// Compatibility exports for older consumers; runtime UI calls the snapshot-aware helpers.
export const places:Record<string,Name>=Object.fromEntries(currentLocationData().locations.map(p=>[p.id,[translations[p.name]||p.name,p.name]]));
for(const [id,p]of referencePlaces)places[id]=[translations[p.name]||p.name,p.name];
for(const id of ['hurston','crusader','arccorp','microtech'])places[id]=[placeName(id,0),placeName(id,1)];
export const navigablePlaces=currentLocationData().locations.filter(p=>p.type!=='Star').map(p=>p.id);
export type Shipment = { id:string; cargo:Name; from:Place; to:Place; scu:number; cargoShape?:string; maxBoxSize?:number; boxes?:{size:number;count:number}[] };
export type Job = { id:string; title:Name; shipments:Shipment[]; pay:number; rewardUnknown?:boolean; signature?:string; reviewedReceipt?:boolean; reservations?:Record<string,number>;
  referenceInfo?:{values:Record<string,unknown>;provenance:Record<string,string[]>;sources:Record<string,{name:string;version:string;url?:string}>};
  mission?:Partial<import('./flight-types').Mission>&Pick<import('./flight-types').Mission,'cargo'>;
  state?:'ready'|'incomplete'|'ended'|'conflict'; hints?:{cargo:string;scu:number;place:string;name?:string}[] };
export function routeReady(job:Job) {
  return job.state!=='ended' && job.state!=='conflict' && job.shipments.length>0 &&
    job.shipments.every(row=>navigablePlace(row.from) && navigablePlace(row.to));
}
type Single = Omit<Shipment,'id'> & { id:string; pay:number };
function singleJob({id,pay,...row}:Single):Job {
  return {id,pay,title:row.cargo,shipments:[{...row,id:id+'-1'}]};
}
export function jobVolume(job:Job) {
  const reserved=job.reservations||{};
  return Object.values(reserved).reduce((sum,n)=>sum+n,0)+job.shipments.reduce((sum,row)=>sum+(Object.hasOwn(reserved,row.to)?0:row.scu),0);
}
export const samples: Job[] = [
  singleJob({id:'ore', cargo:['광석','Ore'], from:'hurston', to:'arccorp', scu:16, pay:32500}),
  singleJob({id:'supply', cargo:['의료 물자','Medical supplies'], from:'arccorp', to:'microtech', scu:8, pay:24000}),
  singleJob({id:'parts', cargo:['기계 부품','Machine parts'], from:'microtech', to:'crusader', scu:24, pay:41000}),
  {id:'outpost', title:['전초기지 보급','Outpost resupply'], pay:68000, shipments:[
    {id:'outpost-1',cargo:['의료 물자','Medical supplies'],from:'hurston',to:'microtech',scu:8},
    {id:'outpost-2',cargo:['의료 물자','Medical supplies'],from:'hurston',to:'crusader',scu:4},
    {id:'outpost-3',cargo:['기계 부품','Machine parts'],from:'arccorp',to:'crusader',scu:12},
  ]},
];
const shipAliases:Record<string,string>={'Cutlass Black':'drake-cutlass-black','C2 Hercules':'crusader-c2-hercules-starlifter'};
export {shipIdFor} from './ship-profile.mjs';
const shipOptions=fleet.map(s=>({id:Object.keys(shipAliases).find(key=>shipAliases[key]===s.id)||s.id,name:s.name,scu:s.grids.reduce((sum,g)=>sum+g.w*g.h*g.l,0)}));
export const ships:Record<string,number>=Object.fromEntries(shipOptions.map(s=>[s.id,s.scu]));
export const shipName=(id:string)=>shipOptions.find(s=>s.id===id)?.name||id;
export type Draft = { locationEdits?:import('./personal-locations.mjs').PersonalLocation[]; received:boolean; jobs:Job[]; start:Place; ship:keyof typeof ships; partner:'operator'|'navigator'; partnerSelected?:boolean; reviewed:boolean; allowUpperBounds?:boolean; customShip?:import('./cargo-plan.mjs').CargoShip };
export const emptyDraft = ():Draft => ({received:false,jobs:[],start:'hurston',ship:'Cutlass Black',partner:'operator',reviewed:false});
export const trialKey = 'stam.mission-console.trial.v1';
export function readDraft():Draft {
  try {
    const value = JSON.parse(sessionStorage.getItem(trialKey) || 'null');
    if (value && hasPlace(value.start) && Object.hasOwn(ships,value.ship) &&
      ['operator','navigator'].includes(value.partner) && Array.isArray(value.jobs)) {
      const jobs:Job[] = value.jobs.map((job:Job|Single)=>'shipments' in job?job:singleJob(job));
      if(jobs.every(job=>typeof job.id==='string' && Array.isArray(job.title) && Number.isFinite(job.pay) &&
        Array.isArray(job.shipments) && job.shipments.length>0 && job.shipments.every(row=>
          row && hasPlace(row.from) && hasPlace(row.to) && Array.isArray(row.cargo) &&
          row.cargo.length===2 && Number.isSafeInteger(row.scu) && (row.scu>0||row.scu===0&&Number.isSafeInteger(job.reservations?.[row.to]))))) return {...value,jobs};
    }
  } catch { /* Storage may be unavailable. */ }
  return emptyDraft();
}
export type Stop = {place:Place; tasks:{job:Job; shipment:Shipment; load:boolean}[]};
// Deliberately simple itinerary for testing the console, not the optimiser:
// handle each contract in list order and merge consecutive calls at the same port.
export function itinerary(d:Draft):Stop[] {
  const stops:Stop[] = [{place:d.start,tasks:[]}];
  for (const job of d.jobs) for (const load of [true,false]) {
    const key=load?'from':'to';
    for(const place of new Set(job.shipments.map(row=>row[key]))) {
      if(stops[stops.length-1]!.place!==place) stops.push({place,tasks:[]});
      for(const shipment of job.shipments.filter(row=>row[key]===place)) {
        stops[stops.length-1]!.tasks.push({job,shipment,load});
      }
    }
  }
  return stops;
}
