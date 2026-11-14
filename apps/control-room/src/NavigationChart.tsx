import {useEffect,useRef,useState} from 'react';
import type {StarMap} from '../../../starmap.mjs';
import type {FlightPlan,Point} from './flight-types';
import type {Locale} from './navigation';
import {currentLocationData} from './personal-locations.mjs';
import {chartAppearance} from './chart-appearance';

export type ChartCommand={serial:number;kind:'focus'|'leg'|'home'|'top'|'galaxy'|'system'|'zoom';id?:string;value?:number};
export function NavigationChart({locale,plan,index=0,command,orbits=true,quality,look='physical',onSelect}:{locale:Locale;plan:FlightPlan|null;index?:number;command?:ChartCommand;orbits?:boolean;quality?:string;look?:'physical'|'hologram';onSelect?:(point:Point)=>void}){
 const locations=currentLocationData();
 const host=useRef<HTMLDivElement>(null),map=useRef<StarMap|null>(null),latest=useRef({plan,index,onSelect,orbits,quality});latest.current={plan,index,onSelect,orbits,quality};
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{
  let cancelled=false,appearance:ReturnType<typeof chartAppearance>|undefined;
  setReady(false);setFailed(false);
  void Promise.all([import('../../../starmap.mjs'),Promise.all([document.fonts.load('500 14px SUIT'),document.fonts.load('500 14px BarlowAirReview')])]).then(([{createStarMap}])=>{
   if(cancelled||!host.current)return;
   try{
    appearance=chartAppearance(locale,look);
    const view=createStarMap(host.current,null,locations,p=>latest.current.onSelect?.(p),appearance);map.current=view;
    view.setRoute(latest.current.plan,latest.current.index);view.setOrbits(latest.current.orbits);
    // A console without a quality control inherits the renderer's saved choice.
    if(latest.current.quality)view.setQuality(latest.current.quality);
    const start=locations.locations.find(p=>p.id===latest.current.plan?.startId)?.system;if(start)view.setSystem(start);
    setReady(true);
   }catch(error){console.error('Navigation chart failed',error);setFailed(true);}
  }).catch(()=>{if(!cancelled)setFailed(true);});
  return()=>{cancelled=true;map.current?.dispose();map.current=null;appearance?.dispose();};
 },[locale,look,locations]);
 useEffect(()=>{map.current?.setRoute(plan,index);},[plan,index]);
 useEffect(()=>{map.current?.setOrbits(orbits);},[orbits]);
 useEffect(()=>{if(quality)map.current?.setQuality(quality);},[quality]);
 useEffect(()=>{
  const view=map.current;if(!view||!command||!ready)return;
  if(command.kind==='focus'&&command.id)view.focus(command.id);
  else if(command.kind==='leg')view.focusLeg(command.value||0);
  else if(command.kind==='system'&&command.id)view.setSystem(command.id);
  else if(command.kind==='home'||command.kind==='top')view.home(command.kind==='top');
  else if(command.kind==='galaxy')view.galaxy();
  else if(command.kind==='zoom')view.zoomBy(command.value||1);
 },[command,ready]);
 return <div onPointerDownCapture={e=>{if(e.target instanceof HTMLCanvasElement)e.currentTarget.focus({preventScroll:true});}} className="navigation-chart" tabIndex={0} role="region" aria-label={locale==='en'?'Interactive 3D map':'조작 가능한 입체지도'} data-ready={ready}>
  <div className="navigation-chart-canvas" ref={host}/>
  {(!ready||failed)&&<p className="chart-loading" role={failed?'alert':'status'}>{failed?(locale==='en'?'3D map unavailable. The stop list remains available.':'입체지도를 표시할 수 없습니다. 방문 순서는 계속 확인할 수 있습니다.'):(locale==='en'?'Preparing navigation…':'입체지도 준비 중…')}</p>}
 </div>;
}
