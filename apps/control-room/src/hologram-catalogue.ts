import data from '../../../data/log-location-index.json' with {type:'json'};
import {hologramScale,type HologramPoint} from './hologram-layout.ts';
export type SystemId='stanton'|'pyro'|'nyx';
// User-confirmed palette, 2026-11-11. Nyx is teal, not the retired violet theme.
export const systemThemes={
 stanton:{name:'Stanton',ko:'스탠턴',color:'#589bff',background:[.22,.45,1],star:'#ffe0a3'},
 pyro:{name:'Pyro',ko:'파이로',color:'#e6a64b',background:[1,.47,.12],star:'#ffc06a'},
 nyx:{name:'Nyx',ko:'닉스',color:'#58d8c6',background:[.13,.85,.67],star:'#ffe4af'},
} as const;
export function markerKind(p:HologramPoint){
 if(/^[A-Z]{3}-L\d/.test(p.name))return 'lagrange';
 if(/Gateway/.test(p.name))return 'gateway';
 if(/^Comm Array/.test(p.name))return 'relay';
 return 'station';
}
export function isBody(p:{type:string}){return p.type==='Star'||p.type==='Planet';}
export function systemPoints(system:SystemId, stops?:readonly {id:string}[]):HologramPoint[]{
 return data.locations.filter(p=>p.id&&p.system===system&&(isBody(p)||p.type.startsWith('Manmade')||stops?.some(stop=>stop.id===system+':'+p.id))).map(p=>({id:system+':'+p.id,name:p.name,type:p.type,parentId:p.parentId?system+':'+p.parentId:null,position:p.position}));
}
export function displayScale(system:SystemId){return system==='stanton'?1e10:Math.max(...systemPoints(system).map(p=>Math.hypot(...p.position)))/4.35;}
// Pure presentation layout. Lagrange stations orbit the STAR: never snap them to
// the star's surface. Moon-linked stations retain their source direction relative
// to the planet, without requiring an invented moon or changing canonical data.
export function displayPositions(system:SystemId, stops?:readonly {id:string}[]){
 const points=systemPoints(system,stops),scale=displayScale(system),positions=new Map<string,[number,number,number]>();
 const raw=(p:{position:number[]}):[number,number,number]=>[p.position[0]!/scale,p.position[2]!/scale,-p.position[1]!/scale];
 const offset=(a:number[],b:number[])=>a.map((v,i)=>v-b[i]!);
 const move=(center:number[],direction:number[],distance:number):[number,number,number]=>{const len=Math.hypot(...direction)||1;return [0,1,2].map(i=>center[i]!+direction[i]!/len*distance) as [number,number,number];};
 for(const p of points.filter(isBody)){let v=raw(p);const min=.4+displayRadius(p)+.1;if(p.type==='Planet'&&Math.hypot(...v)<min)v=move([0,0,0],v,min);positions.set(p.id,v);}
 for(const p of points.filter(p=>p.type==='Planet')){const parent=points.find(q=>q.id===p.parentId&&q.type==='Planet');if(parent)positions.set(p.id,move(positions.get(parent.id)!,offset(raw(p),raw(parent)),displayRadius(parent)*2.2));}
 const source=data.locations.filter(p=>p.system===system);
 for(const p of points.filter(p=>!isBody(p))){
  let parent=source.find(q=>system+':'+q.id===p.parentId);
  const visited=new Set<string>();
  while(parent&&parent.id&&!['Star','Planet'].includes(parent.type)&&!visited.has(parent.id)){visited.add(parent.id);parent=source.find(q=>q.id===parent!.parentId);}
  if(!parent||parent.type==='Star'){positions.set(p.id,raw(p));continue;}
  const planet=points.find(q=>q.id===system+':'+parent!.id)!;
  const direction=offset(raw(p),raw(parent)),distance=Math.hypot(...direction),radius=displayRadius(planet);
  if(!distance)direction[0]=1;
  positions.set(p.id,move(positions.get(planet.id)!,direction,Math.max(distance,radius*1.85)));
 }
 return positions;
}
export function displayRadius(p:HologramPoint){
 if(p.type==='Star')return hologramScale.star;
 const sizes:Record<string,number>={...hologramScale,'Pyro V':.196,'Pyro IV':.07,'Nyx III':.189};
 return p.type==='Planet'?sizes[p.name]??.133:.02;
}
