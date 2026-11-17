import {useEffect,useId,useRef,useState} from 'react';
import {spaceConfig} from './space-config';
import {divisionFacilities} from './division-facilities';
import {frameGuideShot,sceneSize,type CameraFrame,type GuideShot} from './guide-scene-camera';
import divisionImage from './assets/division/overview-approved.png';
import cleanPlate from './assets/control-room-clean-plate.png';
import {bridgePatches} from './hologram-layout';
import operator from './assets/operator-identity-v2.png';
import navigator from './assets/navigator-standing.png';
import './guide-scene.css';

// A photo stage with a moving camera, independent character layers and a
// contour spotlight. No extra WebGL context, perpetual RAF or flight storage.
export function GuideScene({shot,label,motion}:{shot:GuideShot;label:string;motion:boolean}){
 const host=useRef<HTMLDivElement>(null),world=useRef<SVGSVGElement>(null),camera=useRef<CameraFrame|null>(null);
 const mask=useId().replaceAll(':',''),[failed,setFailed]=useState(false),[loadedSource,setLoadedSource]=useState('');
 const source=shot.plate??(shot.scene==='division'?divisionImage:spaceConfig.scenes[shot.scene].image);
 const contour=shot.scene==='division'?divisionFacilities.find(f=>f.id===shot.target)?.contour:spaceConfig.scenes[shot.scene].targets.find(t=>t.id===shot.target)?.contour;
 const focus=shot.focus??[50,48],spot=!!contour;
 useEffect(()=>{let active=true;setFailed(false);const urls=[source,...(shot.scene==='bridge'&&!shot.plate?[cleanPlate,operator,navigator]:[])];void Promise.all(urls.map(url=>{const image=new Image();image.src=url;return image.decode();})).then(()=>{if(active)setLoadedSource(source);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[source,shot.scene,shot.plate]);
 useEffect(()=>{
  const node=host.current,stage=world.current;if(!node||!stage||loadedSource!==source)return;
  let raf=0,stopped=false;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const paint=(frame:CameraFrame)=>{camera.current=frame;stage.style.transform=`translate3d(${frame.x}px,${frame.y}px,0) scale(${frame.scale})`;};
  const settle=()=>{cancelAnimationFrame(raf);paint(frameGuideShot(shot,node.clientWidth,node.clientHeight));node.dataset.moving='false';};
  const move=()=>{
   cancelAnimationFrame(raf);const target=frameGuideShot(shot,node.clientWidth,node.clientHeight);
   const from=camera.current??frameGuideShot({...shot,zoom:1,focus:[50,48]},node.clientWidth,node.clientHeight);
   if(!motion||media.matches||document.hidden){settle();return;}
   const start=performance.now();node.dataset.moving='true';
   const tick=(now:number)=>{if(stopped)return;const t=Math.min(1,(now-start)/1900),ease=t*t*(3-2*t);paint({x:from.x+(target.x-from.x)*ease,y:from.y+(target.y-from.y)*ease,scale:from.scale+(target.scale-from.scale)*ease});if(t<1)raf=requestAnimationFrame(tick);else node.dataset.moving='false';};
   raf=requestAnimationFrame(tick);
  };
  move();let lastWidth=node.clientWidth,lastHeight=node.clientHeight;
  const resize=new ResizeObserver(()=>{if(lastWidth===node.clientWidth&&lastHeight===node.clientHeight)return;lastWidth=node.clientWidth;lastHeight=node.clientHeight;settle();});resize.observe(node);
  const hidden=()=>{if(document.hidden)settle();};
  media.addEventListener('change',settle);document.addEventListener('visibilitychange',hidden);
  return()=>{stopped=true;cancelAnimationFrame(raf);resize.disconnect();media.removeEventListener('change',settle);document.removeEventListener('visibilitychange',hidden);};
 },[shot,motion,loadedSource,source]);
 return <div ref={host} className="guide-scene" data-scene={shot.scene} data-target={shot.target??'overview'} data-motion={motion} data-failed={failed} data-ready={loadedSource===source} aria-busy={loadedSource!==source&&!failed} role="img" aria-label={label}>
  <svg ref={world} className="guide-scene-world" viewBox={`0 0 ${sceneSize.width} ${sceneSize.height}`} width={sceneSize.width} height={sceneSize.height} aria-hidden="true">
   <defs><mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941"><rect width="1672" height="941" fill="white"/>{contour&&<path d={contour} fill="black"/>}</mask><filter id={`${mask}-feather`}><feGaussianBlur stdDeviation="5"/></filter><mask id={`${mask}-seats`} maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941">{bridgePatches.map((p,i)=><rect key={i} x={p.x} y={p.y} width={p.width} height={p.height} rx={p.radius} fill="white" filter={`url(#${mask}-feather)`}/>)}</mask></defs>
   <image href={source} width="1672" height="941" onError={()=>setFailed(true)}/>
   {shot.scene==='bridge'&&!shot.plate&&<image href={cleanPlate} width="1672" height="941" mask={`url(#${mask}-seats)`}/>}
   {spot&&<rect className="guide-scene-shade" width="1672" height="941" mask={`url(#${mask})`}/>}
   {shot.scene==='bridge'&&!shot.target&&<g className="guide-scene-people"><image href={operator} x="431" y="405" width="208" height="405"/><image href={navigator} x="1033" y="405" width="208" height="405"/></g>}
   {spot&&<g key={shot.target} className="guide-scene-marker" transform={`translate(${focus[0]*16.72} ${focus[1]*9.41})`}><circle r="9"/><circle r="3" fill="currentColor" stroke="none"/><path d="M0 -14 V-45 L25 -63 H92"/></g>}
  </svg>
  <div className="guide-scene-vignette" aria-hidden="true"/>
 </div>;
}
