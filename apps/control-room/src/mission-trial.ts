import locationData from '../../../data/log-location-index.json' with {type:'json'};
import korean from '../../../data/stam-korean.json' with {type:'json'};
type Name = [string,string];
export const places:Record<string,Name> = {
  hurston: ['로빌', 'Lorville'], crusader: ['오리슨', 'Orison'],
  arccorp: ['에어리어 18', 'Area18'], microtech: ['뉴 배비지', 'New Babbage'],
};
const translations:Record<string,string>=korean.places;
for(const point of locationData.locations) {
  if(point.id) places[point.system+':'+point.id]=[translations[point.name]||point.name,point.name];
}
export type Place = string;
export function placeName(id:Place,language:number) {
  return places[id]?.[language] ?? (language===0?'거점 미확인':'Unknown stop');
}
export type Shipment = { id:string; cargo:Name; from:Place; to:Place; scu:number; cargoShape?:string; maxBoxSize?:number };
export type Job = { id:string; title:Name; shipments:Shipment[]; pay:number; rewardUnknown?:boolean; reservations?:Record<string,number>;
  state?:'ready'|'incomplete'|'ended'|'conflict'; hints?:{cargo:string;scu:number;place:string;name?:string}[] };
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
export const ships = { 'Cutlass Black':46, 'C2 Hercules':696 };
export type Draft = { received:boolean; jobs:Job[]; start:Place; ship:keyof typeof ships; partner:'operator'|'navigator'; reviewed:boolean };
export const emptyDraft = ():Draft => ({received:false,jobs:[],start:'hurston',ship:'Cutlass Black',partner:'operator',reviewed:false});
export const trialKey = 'stam.mission-console.trial.v1';
export function readDraft():Draft {
  try {
    const value = JSON.parse(sessionStorage.getItem(trialKey) || 'null');
    if (value && Object.hasOwn(places,value.start) && Object.hasOwn(ships,value.ship) &&
      ['operator','navigator'].includes(value.partner) && Array.isArray(value.jobs)) {
      const jobs:Job[] = value.jobs.map((job:Job|Single)=>'shipments' in job?job:singleJob(job));
      if(jobs.every(job=>typeof job.id==='string' && Array.isArray(job.title) && Number.isFinite(job.pay) &&
        Array.isArray(job.shipments) && job.shipments.length>0 && job.shipments.every(row=>
          row && Object.hasOwn(places,row.from) && Object.hasOwn(places,row.to) && Array.isArray(row.cargo) &&
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
