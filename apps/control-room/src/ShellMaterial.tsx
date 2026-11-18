import {useId,useLayoutEffect,useRef} from 'react';
import glass from './assets/navigation/shell-top-glass.png';
import gunmetal from './assets/navigation/shell-side-gunmetal.png';
import ornament from './assets/navigation/shell-gold-ornament.png';

/** A clean material asset, with no baked-in controls or room screenshot.
 * The corner and edge heights stay fixed; the plain strips fill the existing
 * navigation area without setting the dimensions of the live scene.
 * A single casting spans the header and console surround. The header uses a
 * straight diagonal material boundary; the sidebar ends the housing in a straight step.
 * The material stays in the chrome and never covers the scene aperture. */
export function ShellMaterial(){
 const root=useRef<HTMLDivElement>(null);
 const goldClip=useId();
 useLayoutEffect(()=>{
  const material=root.current,shell=material?.closest('.space-experience');
  const sidebar=shell?.querySelector<HTMLElement>('.space-sidebar');
  const console=shell?.querySelector<HTMLElement>('.pilot-desk');
  const destination=shell?.querySelector<HTMLElement>('.space-division-button');
  const caption=shell?.querySelector<HTMLElement>('.space-sidebar-caption');
  const header=shell?.querySelector<HTMLElement>('.space-topbar');
  if(!material||!sidebar||!console||!destination||!header)return;
  let frame=0;
  const align=()=>{
   frame=0;
   if(window.innerWidth<=760)return;
   const bottom=console.getBoundingClientRect().bottom;
   const next=(caption??destination).getBoundingClientRect().top;
   const height=Math.max(0,(bottom+next)/2-header.getBoundingClientRect().bottom);
   material.style.setProperty('--shell-connector-height',`${height}px`);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(align);};
  const observer=new ResizeObserver(schedule);
  observer.observe(console);observer.observe(sidebar);observer.observe(header);
  sidebar.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);align();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);sidebar.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
 },[]);
 const pieces=[
  ['top','0 0 1530 102',glass,1536,1024],
  ['top-end','1530 0 6 102',glass,1536,1024],
  ['join','0 0 216 102',ornament,1536,1024],
  ['sweep','216 0 504 102',ornament,1536,1024],
  ['connector','0 102 216 300',ornament,1536,1024],
  ['side','0 0 384 1528',gunmetal,1024,1536],
  ['side-end','0 1528 384 8',gunmetal,1024,1536],
 ] as const;
 return <div ref={root} className="shell-material" aria-hidden="true">
  {pieces.map(([part,viewBox,source,width,height])=><svg key={part} className={`shell-piece shell-${part}`} viewBox={viewBox} preserveAspectRatio="none" focusable="false">
   {part==='sweep'&&<defs><clipPath id={goldClip} clipPathUnits="userSpaceOnUse"><polygon points="216,0 670,0 663,10 539,98 536,102 216,102"/></clipPath></defs>}
   <image clipPath={part==='sweep'?`url(#${goldClip})`:undefined} href={source} x="0" y="0" width={width} height={height}/>
  </svg>)}
 </div>;
}
